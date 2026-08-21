/**
 * POST /api/acquisition/enrich
 * -----------------------------------------------------------------------------
 * ONE CHUNK PER REQUEST. The client calls this in a loop until hasMore is false.
 *
 * WHY. The previous version ran the whole batch inside a single request, held
 * every result in memory, and wrote once at the end. It exceeded Vercel's 300s
 * ceiling and was killed — which threw away the entire batch after the API calls
 * had already been paid for. That happened live: ~2M input tokens and 52 web
 * searches burned, zero rows written.
 *
 * Raising the plan does not fix it. Pro is 800s, and 258 records at 10–20s each
 * needs 1,000–1,700s — still a timeout, just a later one. Chunking with a write
 * before every return is the fix, and it works on any plan.
 *
 * Resume is free: an enriched row drops out of the candidate pool, so calling
 * again continues where it stopped. An interrupted run is re-run by clicking.
 *
 * This is also the only place ANTHROPIC_API_KEY is read. It is passed to the
 * enrichment modules as an argument and never reaches the browser.
 */
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase-server";
import {
  runFooterChunk, runAiChunk, runFullChunk,
  runAiEnrichment, runFullEnrichment,
  countFooterRemaining, countAiRemaining,
} from "@/lib/acquisition/enrich-api";

// A chunk lands far inside this. The ceiling is a backstop, not the budget.
export const maxDuration = 300;
export const dynamic = "force-dynamic";

type Mode = "footer" | "ai" | "full";

export async function POST(req: NextRequest) {
  const supabase = createClient();

  // Middleware already redirects signed-out browsers, but an API route must not
  // depend on that.
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  let body: {
    mode?: Mode; ids?: string[]; dryRun?: boolean;
    onlyUnresolved?: boolean; chunkSize?: number;
  };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Bad request body." }, { status: 400 }); }

  const mode: Mode = body.mode === "ai" || body.mode === "full" ? body.mode : "footer";
  const ids = Array.isArray(body.ids) && body.ids.length ? body.ids : undefined;
  const chunkSize = body.chunkSize && body.chunkSize > 0
    ? Math.min(body.chunkSize, 100) : undefined;

  const apiKey = process.env.ANTHROPIC_API_KEY || "";
  // The free pass must run with no key configured and must never call the API.
  if (mode !== "footer" && !apiKey) {
    return NextResponse.json({
      error: "ANTHROPIC_API_KEY is not set. Add it in Vercel → Settings → Environment " +
             "Variables and redeploy. The free “Find from websites” pass works without it.",
    }, { status: 503 });
  }

  try {
    /* ---------- dry run: answer immediately, spend nothing ---------- */
    if (body.dryRun) {
      if (mode === "footer") {
        const remaining = await countFooterRemaining(supabase, ids);
        return NextResponse.json({ dryRun: true, mode, remaining, free: true });
      }
      if (mode === "ai") {
        const r = await runAiEnrichment(supabase, apiKey, {
          ids, dryRun: true, onlyUnresolved: body.onlyUnresolved !== false,
        });
        return NextResponse.json({
          dryRun: true, mode, ai: r, combined: r,
          remaining: await countAiRemaining(supabase, ids),
        });
      }
      const r = await runFullEnrichment(supabase, apiKey, { ids, dryRun: true });
      return NextResponse.json({
        dryRun: true, mode, footer: r.footer, ai: r.ai, combined: r.combined,
        remaining: (await countFooterRemaining(supabase, ids)) + (await countAiRemaining(supabase, ids)),
      });
    }

    /* ---------- one chunk, written before it returns ---------- */
    if (mode === "footer") {
      const r = await runFooterChunk(supabase, { ids, chunkSize });
      return NextResponse.json({ ...r, mode, phase: "footer" });
    }
    if (mode === "ai") {
      const r = await runAiChunk(supabase, apiKey, { ids, chunkSize });
      return NextResponse.json({ ...r, mode, phase: "ai" });
    }
    const r = await runFullChunk(supabase, apiKey, { ids });
    return NextResponse.json({ ...r, mode });
  } catch (e: any) {
    // Whatever this chunk managed to write is already committed — the loop can
    // be restarted and will pick up from there.
    return NextResponse.json(
      { error: e?.message || "Enrichment failed." }, { status: 500 });
  }
}
