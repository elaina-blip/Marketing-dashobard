/**
 * parse-upload.ts
 * -----------------------------------------------------------------------------
 * Turns an uploaded CSV or Excel file into IncomingRow[] ready for planMerge().
 * Header matching is by name, case- and spacing-insensitive, so Elaina never has
 * to rearrange a spreadsheet before uploading.
 *
 * Dependency: npm i xlsx
 *
 * CHANGED FROM THE SUPPLIED FILE — two lines in parseUpload(), no parsing rules
 * touched. The original decoded CSVs with Buffer.from() and read workbooks with
 * XLSX type:'buffer'; both are Node-only, and this runs in the browser (the
 * Documents tab uploads through the same browser Supabase client as the rest of
 * the dashboard). TextDecoder and type:'array' work in both runtimes.
 * -----------------------------------------------------------------------------
 */

import * as XLSX from 'xlsx';
import type { IncomingRow } from './acquisition-logic';

/* Header aliases, lifted from the reference implementation. Add to these
   rather than asking users to rename columns. */
const FIELD_ALIASES: Record<string, string[]> = {
  company_name:         ['company / contact', 'company', 'company name', 'company name (clean)', 'name', 'record name'],
  vertical:             ['trade category', 'vertical', 'category'],
  total_permits:        ['total permits', 'permits', 'permit count'],
  priority_score:       ['priority score', 'score'],
  email:                ['email', 'email (clean)', 'email address'],
  primary_jurisdiction: ['primary jurisdiction', 'jurisdiction'],
  metro:                ['metro', 'metro / quota group', 'market'],
  state:                ['state'],
  permit_types:         ['permit types seen', 'permit type', 'sample permit type', 'permit types'],
  records_on_domain:    ['records on domain', 'group size', 'domain group size'],
};

export interface ParseResult {
  rows: IncomingRow[];
  matchedColumns: string[];
  missingColumns: string[];
  sheetNames?: string[];
  skippedRows: number;
}

export class NeedSheetChoice extends Error {
  constructor(public sheetNames: string[]) {
    super('This workbook has several sheets — choose one.');
    this.name = 'NeedSheetChoice';
  }
}

/** RFC-4180 CSV parser: handles quoted fields, embedded commas, escaped quotes. */
export function parseCSV(text: string): string[][] {
  const out: string[][] = [];
  let row: string[] = [], cell = '', inQuotes = false;
  text = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else inQuotes = false; }
      else cell += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell); out.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell.length || row.length) { row.push(cell); out.push(row); }
  return out.filter(r => r.some(c => String(c).trim() !== ''));
}

const num = (v: unknown) => Number(String(v ?? '').replace(/[^0-9.-]/g, '')) || 0;

function gridToRows(grid: string[][]): ParseResult {
  if (grid.length < 2) throw new Error('That file has no data rows.');

  const header = grid[0].map(h => String(h).trim().toLowerCase());
  const idx: Record<string, number> = {};
  const matched: string[] = [], missing: string[] = [];

  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    const i = header.findIndex(h => aliases.includes(h));
    idx[field] = i;
    (i > -1 ? matched : missing).push(field);
  }
  if (idx.company_name < 0)
    throw new Error('No company column found. Expected a header like "Company / Contact".');

  const get = (r: string[], f: string, dflt = '') => idx[f] > -1 ? (r[idx[f]] ?? dflt) : dflt;

  let skipped = 0;
  const rows: IncomingRow[] = [];
  for (const r of grid.slice(1)) {
    const name = String(get(r, 'company_name')).trim();
    if (!name) { skipped++; continue; }
    rows.push({
      company_name: name,
      vertical: String(get(r, 'vertical')).trim(),
      total_permits: num(get(r, 'total_permits', '0')),
      priority_score: num(get(r, 'priority_score', '0')),
      state: String(get(r, 'state')).trim().toUpperCase(),
      metro: String(get(r, 'metro', '—')),
      primary_jurisdiction: String(get(r, 'primary_jurisdiction', '—')),
      permit_types: String(get(r, 'permit_types')),
      email: String(get(r, 'email')).trim(),
      records_on_domain: num(get(r, 'records_on_domain', '0')),
    });
  }
  if (!rows.length) throw new Error('No rows had a company name.');

  // Highest priority first, so the queue is useful the moment it loads.
  rows.sort((a, b) => (b.priority_score || b.total_permits) - (a.priority_score || a.total_permits));
  return { rows, matchedColumns: matched, missingColumns: missing, skippedRows: skipped };
}

/**
 * Parses an uploaded file. Throws NeedSheetChoice when an .xlsx has several
 * sheets and none was named — catch it, show the sheet list, call again.
 */
export function parseUpload(
  buffer: ArrayBuffer | Buffer,
  filename: string,
  sheetName?: string,
): ParseResult {
  const ext = (filename.split('.').pop() || '').toLowerCase();
  const bytes = new Uint8Array(buffer as ArrayBuffer);

  if (ext === 'csv' || ext === 'txt') {
    const text = new TextDecoder('utf-8').decode(bytes);
    return gridToRows(parseCSV(text));
  }

  const wb = XLSX.read(bytes, { type: 'array' });
  if (wb.SheetNames.length > 1 && !sheetName) throw new NeedSheetChoice(wb.SheetNames);

  const sn = sheetName || wb.SheetNames[0];
  const ws = wb.Sheets[sn];
  if (!ws) throw new Error(`Sheet "${sn}" not found in that workbook.`);

  const grid = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, raw: false, defval: '' });
  const res = gridToRows(grid.map(r => (r as unknown[]).map(c => String(c ?? ''))));
  res.sheetNames = wb.SheetNames;
  return res;
}

export const monthTag = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
