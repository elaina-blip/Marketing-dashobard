import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Called by Vercel Cron (see vercel.json). Regenerates the rolling window of
// Mon/Wed/Fri posting tasks. Uses the service-role key (server-only) so it works
// without a logged-in user, and is guarded by CRON_SECRET.
const PLATFORMS = ["Facebook", "Instagram", "TikTok", "LinkedIn"];
const POST_DOW = [1, 3, 5]; // Mon, Wed, Fri
const ROLL_WEEKS = 8;
const PHASE = "Recurring — Content Posting (Mon/Wed/Fri)";

function iso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function GET(request: Request) {
  // Auth: Vercel Cron sends "Authorization: Bearer <CRON_SECRET>"
  const auth = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!svcKey) return NextResponse.json({ error: "service key not configured" }, { status: 500 });

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, svcKey, {
    auth: { persistSession: false },
  });

  const { data: companies } = await supabase.from("companies").select("id");
  if (!companies?.length) return NextResponse.json({ error: "no companies" }, { status: 400 });

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const end = new Date(today); end.setDate(end.getDate() + ROLL_WEEKS * 7);

  const { data: existing } = await supabase
    .from("tasks").select("company_id,platform,deadline")
    .eq("recurring", true).gte("deadline", iso(today)).lte("deadline", iso(end));
  const seen = new Set((existing || []).map((r: any) => `${r.company_id}|${r.platform}|${r.deadline}`));

  const rows: any[] = [];
  for (let d = new Date(today); d < end; d.setDate(d.getDate() + 1)) {
    if (!POST_DOW.includes(d.getDay())) continue;
    const ds = iso(d);
    for (const c of companies)
      for (const platform of PLATFORMS) {
        if (seen.has(`${c.id}|${platform}|${ds}`)) continue;
        rows.push({ company_id: c.id, track: "paid_social", phase: PHASE,
          title: `Publish post — ${platform}`, platform, recurring: true,
          priority: "medium", cadence: "weekly", status: "not_started", deadline: ds });
      }
  }
  if (rows.length) await supabase.from("tasks").insert(rows);
  return NextResponse.json({ created: rows.length, ranAt: new Date().toISOString() });
}
