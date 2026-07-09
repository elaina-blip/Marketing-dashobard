// ============================================================
//  IMPORT PARSER
//  Turns an uploaded CSV or JSON file into clean, validated task
//  rows ready for importTasks(). Forgiving about column names and
//  value casing, because the file may be hand-made or Claude-made.
// ============================================================

import type { ImportRow } from "@/lib/data";

export type ParsedResult = {
  rows: ImportRow[];                              // valid rows, ready to insert
  errors: { line: number; message: string }[];   // per-row problems (skipped)
  warnings: { line: number; message: string }[]; // per-row fixes we applied
};

// ---- Helpers (function declarations → hoisted, safe to use below) ----
function norm(s: any): string { return String(s ?? "").trim(); }
function key(s: any): string { return norm(s).toLowerCase().replace(/[^a-z0-9]/g, ""); }

// Rebuild an alias map so its keys are stripped the same way lookups are,
// so "Alliance Permitting", "alliance_permitting", etc. all resolve.
function byKey<T>(m: Record<string, T>): Record<string, T> {
  const out: Record<string, T> = {};
  for (const [k, v] of Object.entries(m)) out[key(k)] = v;
  return out;
}

// ---- Reference values (kept in sync with the app) ----
// Friendly aliases → canonical company id
const COMPANY_ALIASES = byKey<string>({
  aps: "aps", "alliance permitting": "aps", "alliance permitting service": "aps",
  ads: "ads", "alliance data": "ads", "alliance data solutions": "ads",
  tgr: "tgr", tigerleads: "tgr", "tigerleads ai": "tgr", tiger: "tgr",
});
const TRACK_ALIASES = byKey<"seo" | "paid_social">({
  seo: "seo", organic: "seo", "seo & organic": "seo",
  paid_social: "paid_social", "paid+social": "paid_social", "paid + social": "paid_social",
  paid: "paid_social", social: "paid_social", "paid social": "paid_social",
});
const PRIORITIES = ["high", "medium", "low"];
const STATUS_ALIASES = byKey<string>({
  not_started: "not_started", "not started": "not_started", todo: "not_started", "to do": "not_started", new: "not_started",
  in_progress: "in_progress", "in progress": "in_progress", doing: "in_progress", active: "in_progress", started: "in_progress",
  blocked: "blocked", stuck: "blocked", waiting: "blocked",
  done: "done", complete: "done", completed: "done", finished: "done",
});
const CADENCE_ALIASES = byKey<string>({
  "one-time": "one-time", "one time": "one-time", once: "one-time", onetime: "one-time", "": "one-time",
  weekly: "weekly", week: "weekly",
  monthly: "monthly", month: "monthly",
  quarterly: "quarterly", quarter: "quarterly",
});

// Column-name aliases → our field keys. Keys stripped to match key() lookups.
const FIELD_ALIASES = byKey<keyof ImportRow>({
  company: "company_id", companyid: "company_id", client: "company_id", account: "company_id", business: "company_id",
  track: "track", channel: "track", type: "track", area: "track",
  phase: "phase", stage: "phase", section: "phase", group: "phase", category: "phase",
  title: "title", task: "title", name: "title", taskname: "title", item: "title", todo: "title", description: "title",
  priority: "priority", importance: "priority", prio: "priority",
  status: "status", state: "status",
  cadence: "cadence", frequency: "cadence", recurrence: "cadence", repeat: "cadence",
  deadline: "deadline", duedate: "deadline", due: "deadline", date: "deadline", when: "deadline", scheduled: "deadline",
  assignees: "assignees", assignee: "assignees", assignedto: "assignees", owner: "assignees", assigned: "assignees", who: "assignees",
});

// ---- Public entry point ----
export function parseImportFile(
  text: string,
  fileName: string,
  fallback: { company_id: string; track: "seo" | "paid_social"; validPhases: string[] }
): ParsedResult {
  const trimmed = text.trim();
  const looksJson = fileName.toLowerCase().endsWith(".json") || trimmed.startsWith("[") || trimmed.startsWith("{");
  const records = looksJson ? recordsFromJson(trimmed) : recordsFromCsv(trimmed);
  return validate(records, fallback);
}

// ---- JSON → array of {field: value} records ----
function recordsFromJson(text: string): Record<string, any>[] {
  let data: any;
  try { data = JSON.parse(text); }
  catch { throw new Error("That file isn't valid JSON. Check for a missing comma or bracket, or export as CSV instead."); }

  // Accept either a bare array, or an object wrapping a tasks/items/rows array.
  let arr: any[] = [];
  if (Array.isArray(data)) arr = data;
  else if (data && typeof data === "object") {
    const holder = data.tasks || data.items || data.rows || data.calendar || data.data;
    if (Array.isArray(holder)) arr = holder;
    else arr = [data]; // single task object
  }
  return arr.map(remapKeys);
}

// ---- CSV → array of {field: value} records ----
function recordsFromCsv(text: string): Record<string, any>[] {
  const rows = parseCsv(text);
  if (!rows.length) return [];
  const header = rows[0].map(h => h);
  return rows.slice(1)
    .filter(cols => cols.some(c => norm(c) !== "")) // drop blank lines
    .map(cols => {
      const rec: Record<string, any> = {};
      header.forEach((h, i) => { rec[h] = cols[i] ?? ""; });
      return remapKeys(rec);
    });
}

// Map arbitrary column/property names onto our canonical field keys.
function remapKeys(rec: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(rec)) {
    const canonical = FIELD_ALIASES[key(k)];
    if (canonical) out[canonical] = v;
  }
  return out;
}

// ---- Validate + normalize each record ----
function validate(
  records: Record<string, any>[],
  fallback: { company_id: string; track: "seo" | "paid_social"; validPhases: string[] }
): ParsedResult {
  const rows: ImportRow[] = [];
  const errors: ParsedResult["errors"] = [];
  const warnings: ParsedResult["warnings"] = [];

  records.forEach((rec, idx) => {
    const line = idx + 2; // human-friendly: header is line 1

    const title = norm(rec.title);
    if (!title) { errors.push({ line, message: "No task title — row skipped." }); return; }

    // company
    let company_id = COMPANY_ALIASES[key(rec.company_id)] || "";
    if (!company_id) {
      company_id = fallback.company_id;
      if (rec.company_id) warnings.push({ line, message: `Unknown company "${norm(rec.company_id)}" — used ${company_id.toUpperCase()}.` });
    }

    // track
    let track: "seo" | "paid_social" | "" = TRACK_ALIASES[key(rec.track)] || "";
    if (!track) {
      track = fallback.track;
      if (rec.track) warnings.push({ line, message: `Unknown track "${norm(rec.track)}" — used ${track}.` });
    }

    // phase — free text, but nudge toward a known phase if it's close
    let phase = norm(rec.phase);
    if (!phase) {
      phase = fallback.validPhases[0] || "Phase 1";
      warnings.push({ line, message: `No phase given — used "${phase}".` });
    } else if (fallback.validPhases.length) {
      const match = fallback.validPhases.find(p => key(p) === key(phase))
        || fallback.validPhases.find(p => key(p).includes(key(phase)) || key(phase).includes(key(p)));
      if (match && match !== phase) { warnings.push({ line, message: `Phase "${phase}" matched to "${match}".` }); phase = match; }
    }

    // priority
    let priority = key(rec.priority) as any;
    if (priority && !PRIORITIES.includes(priority)) { warnings.push({ line, message: `Unknown priority "${norm(rec.priority)}" — used medium.` }); priority = "medium"; }
    if (!priority) priority = "medium";

    // status
    let status = STATUS_ALIASES[key(rec.status)] as any;
    if (rec.status && !status) { warnings.push({ line, message: `Unknown status "${norm(rec.status)}" — used not started.` }); status = "not_started"; }
    if (!status) status = "not_started";

    // cadence
    let cadence = CADENCE_ALIASES[key(rec.cadence)] as any;
    if (rec.cadence && !cadence) { warnings.push({ line, message: `Unknown cadence "${norm(rec.cadence)}" — used one-time.` }); cadence = "one-time"; }
    if (!cadence) cadence = "one-time";

    // deadline → YYYY-MM-DD or null
    const { value: deadline, warn: dWarn } = parseDate(rec.deadline);
    if (dWarn) warnings.push({ line, message: dWarn });

    // assignees → string[]
    const assignees = parseAssignees(rec.assignees);

    rows.push({ company_id, track, phase, title, priority, status, cadence, deadline, assignees });
  });

  return { rows, errors, warnings };
}

// Accept ISO, US (M/D/YYYY), and a few common formats; return YYYY-MM-DD.
function parseDate(raw: any): { value: string | null; warn?: string } {
  const s = norm(raw);
  if (!s) return { value: null };
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return { value: s };

  // M/D/YYYY or M-D-YYYY
  const us = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (us) {
    let [, mo, da, yr] = us;
    if (yr.length === 2) yr = "20" + yr;
    const iso = `${yr}-${mo.padStart(2, "0")}-${da.padStart(2, "0")}`;
    return { value: iso };
  }

  // Last resort: let Date try (handles "Jan 5 2026", "2026/01/05", etc.)
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return { value: iso };
  }
  return { value: null, warn: `Couldn't read date "${s}" — left with no deadline.` };
}

function parseAssignees(raw: any): string[] {
  if (Array.isArray(raw)) return raw.map(norm).filter(Boolean);
  const s = norm(raw);
  if (!s) return [];
  return s.split(/[;,/|]/).map(norm).filter(Boolean);
}

// ---- Minimal RFC-4180-ish CSV parser (handles quotes, commas, newlines) ----
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const src = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
      else field += c;
    }
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows;
}
