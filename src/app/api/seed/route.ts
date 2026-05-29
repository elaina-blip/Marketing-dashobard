import { createClient as createServer } from "@/lib/supabase-server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// One-click seed: loads SEO + Paid/Social masters for all 3 companies, then
// generates the first rolling window of recurring posts. Safe to call repeatedly
// (skips if master tasks already exist). Requires a logged-in allow-listed user.
const PLATFORMS = ["Facebook", "Instagram", "TikTok", "LinkedIn"];
const POST_DOW = [1, 3, 5];
const ROLL_WEEKS = 8;
const PHASE = "Recurring — Content Posting (Mon/Wed/Fri)";
const COMPANIES = ["aps", "ads", "tgr"];

function iso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function POST() {
  // gate: must be a signed-in, allow-listed user
  const userClient = createServer();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "not signed in" }, { status: 401 });
  const { data: allowed } = await userClient.from("allowed_users").select("email").limit(1);
  if (!allowed) return NextResponse.json({ error: "not allowed" }, { status: 403 });

  // writes use service role if available (bypasses RLS cleanly); else the user client
  const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const db = svcKey
    ? createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, svcKey, { auth: { persistSession: false } })
    : userClient;

  // don't double-seed
  const { count } = await db.from("tasks").select("*", { count: "exact", head: true }).eq("recurring", false);
  if ((count || 0) > 0) return NextResponse.json({ ok: true, skipped: true, message: "Already seeded." });

  // load masters bundled in the app
  const SEO = JSON.parse(readFileSync(join(process.cwd(), "scripts", "_seo.json"), "utf8"));
  const PAID = JSON.parse(readFileSync(join(process.cwd(), "scripts", "_paid.json"), "utf8"));

  const masters: any[] = [];
  for (const c of COMPANIES) {
    let order = 0;
    for (const [phase, items] of SEO)
      for (const [title, priority, cadence] of items)
        masters.push({ company_id: c, track: "seo", phase, title, priority, cadence,
          status: "not_started", recurring: false, sort_order: order++ });
    for (const [phase, items] of PAID)
      for (const [title, priority, cadence] of items)
        masters.push({ company_id: c, track: "paid_social", phase, title, priority, cadence,
          status: "not_started", recurring: false, sort_order: order++ });
  }
  const { error: e1 } = await db.from("tasks").insert(masters);
  if (e1) return NextResponse.json({ error: e1.message }, { status: 500 });

  // first batch of recurring posts
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const end = new Date(today); end.setDate(end.getDate() + ROLL_WEEKS * 7);
  const posts: any[] = [];
  for (let d = new Date(today); d < end; d.setDate(d.getDate() + 1)) {
    if (!POST_DOW.includes(d.getDay())) continue;
    const ds = iso(d);
    for (const c of COMPANIES)
      for (const platform of PLATFORMS)
        posts.push({ company_id: c, track: "paid_social", phase: PHASE,
          title: `Publish post — ${platform}`, platform, recurring: true,
          priority: "medium", cadence: "weekly", status: "not_started", deadline: ds });
  }
  if (posts.length) await db.from("tasks").insert(posts);

  return NextResponse.json({ ok: true, masters: masters.length, posts: posts.length });
}
