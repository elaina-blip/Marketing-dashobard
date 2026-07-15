import { NextResponse } from "next/server";
import { createClient as createServer } from "@/lib/supabase-server";
import { adminDb } from "@/lib/oauth-config";

// ============================================================================
// POST /api/integrations/upload   → parse a weekly report CSV the user uploads
//                                    and write its rows into provider_metrics,
//                                    so the Dashboard/reports populate WITHOUT
//                                    needing a live OAuth connection.
//
// This is the manual counterpart to /api/integrations/demo: instead of
// generating sample numbers, it ingests real numbers you export weekly.
//
// Expected CSV columns (header row required, case-insensitive, any order):
//   provider   — one of: search_console, ga4, gtm, google_ads, meta,
//                linkedin, ahrefs, crm
//   metric     — e.g. sessions, clicks, impressions, spend, leads,
//                conversions, followers, engagements  (free text; lowercased)
//   date       — the metric date, YYYY-MM-DD  (also accepts MM/DD/YYYY)
//   value      — a number  (commas, $ and % are stripped)
//
// Behaviour:
//   • Rows upsert on (provider, metric, metric_date, dims={}) so re-uploading
//     the same week overwrites cleanly instead of double-counting.
//   • Every provider that appears in the file is marked connected with an
//     account_label of "Weekly upload" and last_synced_at = now.
//   • A live OAuth sync, if ever configured, overwrites these rows normally.
//
// Gated to a signed-in, allow-listed user. All writes use the service-role key.
// ============================================================================

const VALID_PROVIDERS = new Set([
  "search_console", "ga4", "gtm", "google_ads", "meta", "linkedin", "ahrefs", "crm",
]);

// Accept a few friendly aliases so exports don't have to match exactly.
const PROVIDER_ALIASES: Record<string, string> = {
  searchconsole: "search_console", "search console": "search_console", gsc: "search_console",
  analytics: "ga4", ga: "ga4", "analytics 4": "ga4", "google analytics": "ga4",
  tagmanager: "gtm", "tag manager": "gtm",
  googleads: "google_ads", "google ads": "google_ads", ads: "google_ads",
  instagram: "meta", facebook: "meta", ig: "meta", fb: "meta", "meta (ig + fb)": "meta",
  "linkedin pages": "linkedin", li: "linkedin",
  semrush: "ahrefs", ahrefs: "ahrefs",
};

function normProvider(raw: string): string | null {
  const k = raw.trim().toLowerCase();
  if (VALID_PROVIDERS.has(k)) return k;
  if (PROVIDER_ALIASES[k]) return PROVIDER_ALIASES[k];
  return null;
}

function normDate(raw: string): string | null {
  const s = raw.trim();
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // MM/DD/YYYY or M/D/YYYY
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const [, mm, dd, yyyy] = m;
    return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
  }
  // Fallback: let Date try, then reformat
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  return null;
}

function normValue(raw: string): number | null {
  const cleaned = raw.replace(/[$,%\s]/g, "");
  if (cleaned === "") return null;
  const n = Number(cleaned);
  return isNaN(n) ? null : n;
}

// Minimal, dependency-free CSV parser that handles quoted fields and commas.
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let field = "", row: string[] = [], inQuotes = false;
  const pushField = () => { row.push(field); field = ""; };
  const pushRow = () => { pushField(); rows.push(row); row = []; };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") pushField();
      else if (c === "\r") { /* ignore */ }
      else if (c === "\n") pushRow();
      else field += c;
    }
  }
  // last field/row if the file doesn't end with a newline
  if (field.length > 0 || row.length > 0) pushRow();
  return rows.filter(r => r.some(cell => cell.trim() !== ""));
}

export async function POST(req: Request) {
  // Gate: signed-in allow-listed user only.
  const userClient = createServer();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "not signed in" }, { status: 401 });
  const { data: allowed } = await userClient.from("allowed_users").select("email").limit(1);
  if (!allowed || !allowed.length) return NextResponse.json({ error: "not allowed" }, { status: 403 });

  let db;
  try { db = adminDb(); }
  catch (e: any) { return NextResponse.json({ error: String(e?.message || e) }, { status: 500 }); }

  // Read the uploaded file (multipart/form-data, field name "file").
  let text: string;
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "no file uploaded (expected form field 'file')" }, { status: 400 });
    }
    text = await (file as File).text();
  } catch (e: any) {
    return NextResponse.json({ error: "could not read upload: " + String(e?.message || e) }, { status: 400 });
  }

  const grid = parseCsv(text);
  if (grid.length < 2) {
    return NextResponse.json({ error: "CSV appears empty or has no data rows" }, { status: 400 });
  }

  // Map header names to column indexes.
  const header = grid[0].map(h => h.trim().toLowerCase());
  const col = (name: string) => header.indexOf(name);
  const iProvider = col("provider");
  const iMetric = col("metric");
  const iDate = header.indexOf("date") >= 0 ? header.indexOf("date") : header.indexOf("metric_date");
  const iValue = col("value");
  const missing = [
    iProvider < 0 ? "provider" : null,
    iMetric < 0 ? "metric" : null,
    iDate < 0 ? "date" : null,
    iValue < 0 ? "value" : null,
  ].filter(Boolean);
  if (missing.length) {
    return NextResponse.json(
      { error: `CSV missing required column(s): ${missing.join(", ")}. Expected: provider, metric, date, value.` },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();
  const rows: { provider: string; metric: string; metric_date: string; value: number; dims: any; updated_at: string }[] = [];
  const errors: string[] = [];
  const providersSeen = new Set<string>();

  for (let r = 1; r < grid.length; r++) {
    const line = grid[r];
    const provider = normProvider(line[iProvider] ?? "");
    const metric = (line[iMetric] ?? "").trim().toLowerCase();
    const date = normDate(line[iDate] ?? "");
    const value = normValue(line[iValue] ?? "");

    if (!provider) { errors.push(`Row ${r + 1}: unknown provider "${(line[iProvider] ?? "").trim()}"`); continue; }
    if (!metric) { errors.push(`Row ${r + 1}: missing metric`); continue; }
    if (!date) { errors.push(`Row ${r + 1}: bad date "${(line[iDate] ?? "").trim()}"`); continue; }
    if (value === null) { errors.push(`Row ${r + 1}: bad value "${(line[iValue] ?? "").trim()}"`); continue; }

    providersSeen.add(provider);
    rows.push({ provider, metric, metric_date: date, value, dims: {}, updated_at: now });
  }

  if (!rows.length) {
    return NextResponse.json({ error: "No valid rows found.", details: errors.slice(0, 20) }, { status: 400 });
  }

  try {
    // Upsert in chunks; unique key (provider, metric, metric_date, dims) means a
    // re-upload of the same week overwrites rather than duplicates.
    for (let i = 0; i < rows.length; i += 500) {
      const { error } = await db
        .from("provider_metrics")
        .upsert(rows.slice(i, i + 500), { onConflict: "provider,metric,metric_date,dims" });
      if (error) throw error;
    }
    // Mark each provider that appeared as connected via upload.
    for (const p of providersSeen) {
      await db.from("data_connections").upsert({
        provider: p, status: "connected", account_label: "Weekly upload",
        last_synced_at: now, error_detail: null, updated_at: now,
      });
    }
    return NextResponse.json({
      ok: true,
      inserted: rows.length,
      providers: Array.from(providersSeen),
      skipped: errors.length,
      details: errors.slice(0, 20),
    });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
