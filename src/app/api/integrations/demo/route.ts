import { NextResponse } from "next/server";
import { createClient as createServer } from "@/lib/supabase-server";
import { adminDb } from "@/lib/oauth-config";

// ============================================================================
// POST /api/integrations/demo   → load realistic SAMPLE data so the dashboard
//                                  is fully populated without a real OAuth app.
// POST /api/integrations/demo?clear=1  → remove all sample data + reset status.
//
// This exists so you can SEE the whole dashboard working end-to-end before the
// real Google/Meta/LinkedIn apps are registered. It marks the sources as
// connected (account_label = "Sample data") and fills provider_metrics with
// ~90 days of plausible numbers. Real OAuth, once configured, overwrites this.
//
// Gated to a signed-in, allow-listed user. All writes use the service-role key.
// ============================================================================

// Which providers get sample data, and which metrics each one produces.
// Values are daily; the generator adds weekday/seasonal wobble so charts look real.
const PROVIDERS: Record<string, { label: string; metrics: { metric: string; base: number; growth: number; jitter: number }[] }> = {
  search_console: { label: "example.com — Sample", metrics: [
    { metric: "clicks",      base: 320,  growth: 1.6, jitter: 0.22 },
    { metric: "impressions", base: 9800, growth: 1.9, jitter: 0.18 },
  ]},
  ga4: { label: "GA4 Property — Sample", metrics: [
    { metric: "sessions",    base: 540,  growth: 1.4, jitter: 0.20 },
    { metric: "conversions", base: 12,   growth: 2.2, jitter: 0.35 },
  ]},
  google_ads: { label: "Ads Account — Sample", metrics: [
    { metric: "spend",       base: 210,  growth: 0.8, jitter: 0.15 },
    { metric: "clicks",      base: 140,  growth: 1.1, jitter: 0.25 },
    { metric: "conversions", base: 8,    growth: 1.7, jitter: 0.40 },
  ]},
  meta: { label: "Meta (IG+FB) — Sample", metrics: [
    { metric: "followers",   base: 40,   growth: 3.0, jitter: 0.50 },  // daily net new
    { metric: "impressions", base: 6400, growth: 1.5, jitter: 0.28 },
    { metric: "engagements", base: 280,  growth: 1.8, jitter: 0.30 },
  ]},
  linkedin: { label: "LinkedIn Page — Sample", metrics: [
    { metric: "followers",   base: 9,    growth: 2.5, jitter: 0.60 },
    { metric: "impressions", base: 1800, growth: 1.6, jitter: 0.30 },
    { metric: "engagements", base: 70,   growth: 1.9, jitter: 0.35 },
  ]},
  crm: { label: "CRM — Sample", metrics: [
    { metric: "leads",       base: 6,    growth: 2.0, jitter: 0.45 },
  ]},
};

const DEMO_KEYS = Object.keys(PROVIDERS);
const DAYS = 90;

function iso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Deterministic-ish pseudo-random so repeated loads look stable-ish but natural.
function wobble(seed: number) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x); // 0..1
}

function buildRows(provider: string) {
  const spec = PROVIDERS[provider];
  const rows: { provider: string; metric: string; metric_date: string; value: number }[] = [];
  const today = new Date(); today.setHours(0, 0, 0, 0);
  for (const m of spec.metrics) {
    for (let i = DAYS - 1; i >= 0; i--) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      const dayIndex = DAYS - 1 - i;                 // 0 (oldest) → DAYS-1 (today)
      const trend = 1 + (m.growth / 100) * dayIndex; // gentle upward trend
      const dow = d.getDay();
      const weekend = dow === 0 || dow === 6 ? 0.72 : 1; // quieter weekends
      const noise = 1 + (wobble(dayIndex + m.base) - 0.5) * 2 * m.jitter;
      let v = m.base * trend * weekend * noise;
      v = m.metric === "spend" ? Math.round(v * 100) / 100 : Math.max(0, Math.round(v));
      rows.push({ provider, metric: m.metric, metric_date: iso(d), value: v });
    }
  }
  return rows;
}

export async function POST(req: Request) {
  // Gate: signed-in allow-listed user only.
  const userClient = createServer();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "not signed in" }, { status: 401 });
  const { data: allowed } = await userClient.from("allowed_users").select("email").limit(1);
  if (!allowed || !allowed.length) return NextResponse.json({ error: "not allowed" }, { status: 403 });

  const url = new URL(req.url);
  const clear = url.searchParams.get("clear") === "1";
  const only = url.searchParams.get("key"); // optional: a single provider key

  let db;
  try { db = adminDb(); }
  catch (e: any) { return NextResponse.json({ error: String(e?.message || e) }, { status: 500 }); }

  const keys = only && DEMO_KEYS.includes(only) ? [only] : DEMO_KEYS;
  const now = new Date().toISOString();

  try {
    if (clear) {
      await db.from("provider_metrics").delete().in("provider", keys);
      for (const k of keys) {
        await db.from("data_connections").upsert({
          provider: k, status: "disconnected", account_label: null,
          last_synced_at: null, error_detail: null, updated_at: now,
        });
      }
      return NextResponse.json({ ok: true, cleared: keys });
    }

    for (const k of keys) {
      // Refresh: clear any prior sample rows for this provider, then insert.
      await db.from("provider_metrics").delete().eq("provider", k);
      const rows = buildRows(k).map(r => ({ ...r, updated_at: now }));
      // insert in chunks to stay well under any payload limits
      for (let i = 0; i < rows.length; i += 500) {
        const { error } = await db.from("provider_metrics").insert(rows.slice(i, i + 500));
        if (error) throw error;
      }
      await db.from("data_connections").upsert({
        provider: k, status: "connected", account_label: PROVIDERS[k].label,
        last_synced_at: now, error_detail: null, updated_at: now,
      });
    }
    return NextResponse.json({ ok: true, connected: keys, days: DAYS, sample: true });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
