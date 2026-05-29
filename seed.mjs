// One-time seed: loads the SEO + Paid/Social masters for all 3 companies.
// Usage:  node scripts/seed.mjs
// Reads NEXT_PUBLIC_SUPABASE_URL and a key from the environment.
// Prefer SUPABASE_SERVICE_ROLE_KEY for seeding (bypasses RLS); falls back to anon.
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dir = dirname(fileURLToPath(import.meta.url));
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) { console.error("Missing Supabase URL/key in env."); process.exit(1); }

const supabase = createClient(url, key, { auth: { persistSession: false } });

const SEO  = JSON.parse(readFileSync(join(__dir, "_seo.json")));
const PAID = JSON.parse(readFileSync(join(__dir, "_paid.json")));
const COMPANIES = ["aps", "ads", "tgr"];

function rowsFor(companyId, track, master) {
  const rows = [];
  let order = 0;
  for (const [phase, items] of master)
    for (const [title, priority, cadence] of items)
      rows.push({ company_id: companyId, track, phase, title, priority, cadence,
        status: "not_started", recurring: false, sort_order: order++ });
  return rows;
}

const all = [];
for (const c of COMPANIES) {
  all.push(...rowsFor(c, "seo", SEO));
  all.push(...rowsFor(c, "paid_social", PAID));
}

// Guard: don't double-seed
const { count } = await supabase.from("tasks").select("*", { count: "exact", head: true }).eq("recurring", false);
if ((count || 0) > 0) {
  console.log(`Tasks already present (${count} master rows). Skipping seed to avoid duplicates.`);
  process.exit(0);
}

const { error } = await supabase.from("tasks").insert(all);
if (error) { console.error("Seed failed:", error.message); process.exit(1); }
console.log(`Seeded ${all.length} master tasks (${COMPANIES.length} companies × ${all.length / COMPANIES.length}).`);
console.log("Now visit /api/generate-posts once to create the recurring posting tasks.");
