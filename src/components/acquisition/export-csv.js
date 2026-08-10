/**
 * export-csv.js — reporting only.
 *
 * In the HTML tool the CSV was the save file, so the round trip had to be
 * lossless. State lives in Supabase now, so this is just a report: same columns
 * as the reference export, so anything built on top of those files still opens.
 */
import { verify, searchTerm, licenceBoard, licenceNumber, VERDICT_LABEL } from "@/lib/acquisition/acquisition-logic";

const HEAD = [
  "Company", "Searched As", "Licence No", "Vertical", "Total Permits", "Priority Score", "State",
  "Metro", "Primary Jurisdiction", "Permit Types Seen", "Email", "Domain", "Verdict", "Records on Domain",
  "Licence Board", "Stage", "FB Found?", "IG Found?", "LI Found?", "FB Followed", "IG Followed", "LI Followed",
  "FB Follow-back", "IG Follow-back", "LI Follow-back", "Engagements", "Notes", "Researched By", "Researched On",
  "Recheck", "Last Seen In Upload",
];

const yn = v => (v === true ? "Yes" : v === false ? "No" : "");

export function toCSV(rows) {
  const body = rows.map(r => {
    const check = verify({ name: r.company_name, email: r.email, group: r.records_on_domain });
    const { term } = searchTerm(r.company_name, check);
    const board = licenceBoard(r.state, r.vertical);
    return [
      r.company_name, term, licenceNumber(r.company_name), r.vertical, r.total_permits, r.priority_score,
      r.state, r.metro, r.primary_jurisdiction, r.permit_types, r.email, check.domain,
      VERDICT_LABEL[check.verdict], r.records_on_domain || "", board ? board.name : "", r.stage,
      yn(r.fb_found), yn(r.ig_found), yn(r.li_found), r.fb_followed, r.ig_followed, r.li_followed,
      yn(r.fb_back), yn(r.ig_back), yn(r.li_back), r.engagements, r.notes, r.researched_by, r.researched_on,
      r.recheck ? "Yes" : "", r.last_seen_in_upload,
    ];
  });
  return [HEAD, ...body]
    .map(a => a.map(c => {
      const s = String(c == null ? "" : c);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(","))
    .join("\n");
}

export function downloadCSV(rows, filename) {
  const url = URL.createObjectURL(new Blob([toCSV(rows)], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || `aps_social_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
