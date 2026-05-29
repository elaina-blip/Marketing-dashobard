import { createClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

// Ensures Mon/Wed/Fri posting tasks exist for the next ROLL_WEEKS weeks,
// for every company x platform. Idempotent: skips dates already present.
const PLATFORMS = ["Facebook", "Instagram", "TikTok", "LinkedIn"];
const POST_DOW = [1, 3, 5]; // Sun=0 ... Mon=1, Wed=3, Fri=5
const ROLL_WEEKS = 8;
const PHASE = "Recurring — Content Posting (Mon/Wed/Fri)";

function iso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function GET() {
  const supabase = createClient();

  // who are we generating for
  const { data: companies } = await supabase.from("companies").select("id");
  if (!companies?.length) return NextResponse.json({ error: "no companies" }, { status: 400 });

  // existing recurring rows in the window, to avoid duplicates
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
    for (const c of companies) {
      for (const platform of PLATFORMS) {
        const key = `${c.id}|${platform}|${ds}`;
        if (seen.has(key)) continue;
        rows.push({
          company_id: c.id, track: "paid_social", phase: PHASE,
          title: `Publish post — ${platform}`, platform, recurring: true,
          priority: "medium", cadence: "weekly", status: "not_started", deadline: ds,
        });
      }
    }
  }

  if (rows.length) await supabase.from("tasks").insert(rows);
  return NextResponse.json({ created: rows.length, weeks: ROLL_WEEKS });
}
