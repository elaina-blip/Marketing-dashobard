/**
 * POST /api/acquisition/enrich
 * -----------------------------------------------------------------------------
 * The only place ANTHROPIC_API_KEY is read. It is passed to runAiEnrichment as
 * an argument and never leaves this process — the enrichment modules never touch
 * the environment themselves, which is what keeps them testable.
 *
 * Enrichment runs here rather than in the browser for two reasons: the key must
 * stay server-side, and the footer pass fetches contractor websites directly,
 * which the browser would refuse cross-origin on every single one.
 *
 * A dry run answers as plain JSON. A real run streams NDJSON progress lines and
 * ends with a summary line, because a pass over a few hundred records takes
 * minutes and a silent screen looks broken.
 */
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase-server";
import {
  runFooterEnrichment, runAiEnrichment, runFullEnrichment,
} from "@/lib/acquisition/enrich-api";

// Enrichment is long-running by nature. This is the ceiling Vercel allows on a
// Node function; a run larger than it will be cut off mid-pass, which is why the
// UI batches rather than sending the whole queue at once.
export const maxDuration = 300;
export const dynamic = "force-dynamic";

type Mode = "footer" | "ai" | "full";

export async function POST(req: NextRequest) {
  const supabase = createClient();

  // The middleware already redirects signed-out browsers, but an API route must
  // not rely on that — check the session here too.
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  let body: { mode?: Mode; ids?: string[]; dryRun?: boolean; onlyUnresolved?: boolean; limit?: number };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Bad request body." }, { status: 400 }); }

  const mode: Mode = body.mode === "ai" || body.mode === "full" ? body.mode : "footer";
  const ids = Array.isArray(body.ids) && body.ids.length ? body.ids : undefined;
  const limit = Math.min(Math.max(Number(body.limit) || 100, 1), 500);

  const apiKey = process.env.ANTHROPIC_API_KEY || "";
  // The free pass must run with no key configured and must never call the API.
  if (mode !== "footer" && !apiKey) {
    return NextResponse.json({
      error: "ANTHROPIC_API_KEY is not set. Add it in Vercel → Settings → Environment " +
             "Variables and redeploy. The free “Find from websites” pass works without it.",
    }, { status: 503 });
  }

  /* ---------- dry run: answer immediately, spend nothing ---------- */
  if (body.dryRun) {
    try {
      if (mode === "full") {
        const r = await runFullEnrichment(supabase, apiKey, { ids, aiLimit: limit, dryRun: true });
        return NextResponse.json({ dryRun: true, mode, footer: r.footer, ai: r.ai, combined: r.combined });
      }
      if (mode === "ai") {
        const r = await runAiEnrichment(supabase, apiKey, {
          ids, limit, dryRun: true, onlyUnresolved: body.onlyUnresolved !== false,
        });
        return NextResponse.json({ dryRun: true, mode, ai: r, combined: r });
      }
      // The footer pass costs nothing, so its "dry run" is just the target count.
      const r = await runFooterEnrichment(supabase, { ids, limit: 0 });
      return NextResponse.json({ dryRun: true, mode, footer: r, combined: r });
    } catch (e: any) {
      return NextResponse.json({ error: e?.message || "Could not estimate." }, { status: 500 });
    }
  }

  /* ---------- real run: stream progress ---------- */
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => {
        try { controller.enqueue(encoder.encode(`${JSON.stringify(obj)}\n`)); } catch { /* client left */ }
      };
      try {
        if (mode === "footer") {
          const summary = await runFooterEnrichment(supabase, {
            ids, limit,
            onProgress: (done, total) => send({ phase: "footer", done, total }),
          });
          send({ done: true, mode, footer: summary, combined: summary });
        } else if (mode === "ai") {
          const summary = await runAiEnrichment(supabase, apiKey, {
            ids, limit,
            // false is the "AI search only" button: re-run records the footer
            // pass already resolved, for a second opinion on a bad hit.
            onlyUnresolved: body.onlyUnresolved !== false,
            onProgress: (done, total) => send({ phase: "ai", done, total }),
          });
          send({ done: true, mode, ai: summary, combined: summary });
        } else {
          const r = await runFullEnrichment(supabase, apiKey, {
            ids, footerLimit: limit, aiLimit: limit,
            onProgress: (phase, done, total) => send({ phase, done, total }),
          });
          send({ done: true, mode, footer: r.footer, ai: r.ai, combined: r.combined });
        }
      } catch (e: any) {
        send({ error: e?.message || "Enrichment failed." });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      // Progress lines are useless if a proxy buffers them to the end.
      "X-Accel-Buffering": "no",
    },
  });
}
