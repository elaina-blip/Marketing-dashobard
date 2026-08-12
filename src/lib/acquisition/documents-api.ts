/**
 * documents-api.ts
 * -----------------------------------------------------------------------------
 * Everything the Documents tab does, server-side.
 *
 * Every function takes the Supabase client as its first argument, so this file
 * makes no assumption about how the dashboard creates clients. Pass whatever you
 * already use — createServerClient, createRouteHandlerClient, a service-role
 * client for background jobs. Nothing else needs changing.
 *
 * Dependencies: @supabase/supabase-js, xlsx
 * -----------------------------------------------------------------------------
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { parseUpload, NeedSheetChoice, monthTag } from './parse-upload';
import {
  planMerge, refreshedFields, recheckFields, computeGroups,
  type CompanyRow, type IncomingRow, type MergePlan,
} from './acquisition-logic';

export const BUCKET = 'acquisition-docs';

export interface DocumentRow {
  id: string;
  filename: string;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  row_count: number | null;
  month_tag: string | null;
  sheet_name: string | null;
  uploaded_by: string | null;
  uploaded_at: string;
  deleted_at: string | null;
}

const today = () => new Date().toISOString().slice(0, 10);

/* ========================== upload ========================== */

/**
 * Stores the file and records it. Does NOT touch acquisition_companies —
 * loading is a separate, explicit step so nothing is imported by accident.
 */
export async function uploadDocument(
  sb: SupabaseClient,
  file: { name: string; type: string; size: number; buffer: ArrayBuffer },
  uploadedBy: string,
  opts: { month?: string; sheetName?: string } = {},
): Promise<{ document: DocumentRow; rowCount: number; sheetNames?: string[] }> {

  // Parse first — a file that cannot be read should never reach storage.
  let parsed;
  try {
    parsed = parseUpload(file.buffer, file.name, opts.sheetName);
  } catch (err) {
    if (err instanceof NeedSheetChoice) {
      return { document: null as never, rowCount: 0, sheetNames: err.sheetNames };
    }
    throw err;
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const path = `${opts.month || monthTag()}/${stamp}__${file.name}`;

  const { error: upErr } = await sb.storage
    .from(BUCKET)
    .upload(path, file.buffer, { contentType: file.type || 'application/octet-stream', upsert: false });
  if (upErr) throw new Error(`Upload failed: ${upErr.message}`);

  const { data, error } = await sb
    .from('acquisition_documents')
    .insert({
      filename: file.name,
      storage_path: path,
      mime_type: file.type,
      size_bytes: file.size,
      row_count: parsed.rows.length,
      month_tag: opts.month || monthTag(),
      sheet_name: opts.sheetName ?? null,
      uploaded_by: uploadedBy,
    })
    .select()
    .single();

  if (error) {
    await sb.storage.from(BUCKET).remove([path]);   // do not orphan the file
    throw new Error(`Could not record the document: ${error.message}`);
  }
  return { document: data as DocumentRow, rowCount: parsed.rows.length, sheetNames: parsed.sheetNames };
}

/* ========================== list / download / delete ========================== */

export async function listDocuments(
  sb: SupabaseClient,
  filters: { month?: string; uploadedBy?: string; type?: 'csv' | 'xlsx' } = {},
): Promise<DocumentRow[]> {
  let q = sb.from('acquisition_documents')
    .select('*')
    .is('deleted_at', null)
    .order('uploaded_at', { ascending: false });

  if (filters.month)      q = q.eq('month_tag', filters.month);
  if (filters.uploadedBy) q = q.eq('uploaded_by', filters.uploadedBy);
  if (filters.type === 'csv')  q = q.ilike('filename', '%.csv');
  if (filters.type === 'xlsx') q = q.ilike('filename', '%.xls%');

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as DocumentRow[];
}

/** Short-lived signed URL for the download button. */
export async function documentDownloadUrl(
  sb: SupabaseClient, documentId: string, expiresInSeconds = 300,
): Promise<string> {
  const { data: doc, error } = await sb
    .from('acquisition_documents').select('storage_path').eq('id', documentId).single();
  if (error || !doc) throw new Error('Document not found.');

  const { data, error: sErr } = await sb.storage
    .from(BUCKET).createSignedUrl(doc.storage_path, expiresInSeconds);
  if (sErr || !data) throw new Error(sErr?.message || 'Could not create a download link.');
  return data.signedUrl;
}

export async function renameDocument(
  sb: SupabaseClient, documentId: string, patch: { filename?: string; month_tag?: string },
): Promise<void> {
  const { error } = await sb.from('acquisition_documents').update(patch).eq('id', documentId);
  if (error) throw new Error(error.message);
}

/** Soft delete. The file stays in storage; history stays intact. */
export async function deleteDocument(sb: SupabaseClient, documentId: string): Promise<void> {
  const { error } = await sb
    .from('acquisition_documents')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', documentId);
  if (error) throw new Error(error.message);
}

/* ========================== load into the workbench ========================== */

export interface MergePreview {
  documentId: string;
  filename: string;
  newCount: number;
  updateCount: number;
  recheckCount: number;
  verticalConflicts: number;
  matchedBy: { email: number; domain: number; name: number };
  missingColumns: string[];
  skippedRows: number;
}

async function readDocument(sb: SupabaseClient, documentId: string, sheetName?: string) {
  const { data: doc, error } = await sb
    .from('acquisition_documents').select('*').eq('id', documentId).single();
  if (error || !doc) throw new Error('Document not found.');

  const { data: blob, error: dErr } = await sb.storage.from(BUCKET).download(doc.storage_path);
  if (dErr || !blob) throw new Error(dErr?.message || 'Could not read the stored file.');

  const buffer = await blob.arrayBuffer();
  const parsed = parseUpload(buffer, doc.filename, sheetName ?? doc.sheet_name ?? undefined);
  return { doc: doc as DocumentRow, parsed };
}

/** Step one: what WOULD happen. Writes nothing. */
export async function previewMerge(
  sb: SupabaseClient, documentId: string, sheetName?: string,
): Promise<{ preview: MergePreview; plan: MergePlan; incoming: IncomingRow[] }> {
  const { doc, parsed } = await readDocument(sb, documentId, sheetName);

  const { data: existing, error } = await sb
    .from('acquisition_companies')
    .select('id, company_name, email, state, vertical, records_on_domain, fb_found, ig_found, li_found, researched_on');
  if (error) throw new Error(error.message);

  // Employer size is recomputed across the whole set (workbench v13): sibling
  // domains of one parent count as the same employer, and a file with no
  // "Records on Domain" column still keeps a builder's field staff apart. Only
  // ever raises the count, so this can only make domain matching more cautious.
  const rows = (existing ?? []) as unknown as CompanyRow[];
  const groupOf = computeGroups(rows);
  const withGroups = rows.map(r => ({ ...r, records_on_domain: groupOf(r) }));

  const plan = planMerge(withGroups, parsed.rows);

  return {
    plan,
    incoming: parsed.rows,
    preview: {
      documentId,
      filename: doc.filename,
      newCount: plan.fresh.length,
      updateCount: plan.update.length,
      recheckCount: plan.recheck.length,
      verticalConflicts: plan.verticalConflicts.length,
      matchedBy: plan.matchCounts,
      missingColumns: parsed.missingColumns,
      skippedRows: parsed.skippedRows,
    },
  };
}

/** Step two: commit. Only call after the user has seen the preview. */
export async function commitMerge(
  sb: SupabaseClient, documentId: string, sheetName?: string,
): Promise<{ inserted: number; updated: number; rechecked: number }> {
  const { plan, incoming } = await previewMerge(sb, documentId, sheetName);
  const t = today();

  if (plan.fresh.length) {
    const inserts = plan.fresh.map(r => ({
      company_name: r.company_name,
      vertical: r.vertical,
      total_permits: r.total_permits,
      priority_score: r.priority_score,
      state: r.state,
      metro: r.metro,
      primary_jurisdiction: r.primary_jurisdiction,
      permit_types: r.permit_types,
      email: r.email,
      records_on_domain: r.records_on_domain,
      stage: 'research',
      last_seen_in_upload: t,
      source_document_id: documentId,
    }));
    for (let i = 0; i < inserts.length; i += 500) {
      const { error } = await sb.from('acquisition_companies').insert(inserts.slice(i, i + 500));
      if (error) throw new Error(`Insert failed: ${error.message}`);
    }
  }

  // Refresh only. Stage, found flags, follow dates, follow-backs, engagements,
  // notes and attribution are research work — they are never in this payload.
  for (const u of plan.update) {
    const { error } = await sb.from('acquisition_companies')
      .update(refreshedFields(u.incoming, t)).eq('id', u.existingId);
    if (error) throw new Error(`Update failed: ${error.message}`);
  }

  for (const u of plan.recheck) {
    const { error } = await sb.from('acquisition_companies')
      .update(recheckFields(u.incoming, t)).eq('id', u.existingId);
    if (error) throw new Error(`Recheck update failed: ${error.message}`);
  }

  // A company can legitimately pull permits in two trades. Keep the vertical it
  // already has and leave a note — never create a second row for the same firm.
  for (const c of plan.verticalConflicts) {
    const { data: cur } = await sb.from('acquisition_companies')
      .select('notes').eq('id', c.existingId).single();
    const tag = `also listed as ${c.incoming.vertical}`;
    const notes = String(cur?.notes || '');
    if (!notes.includes(tag)) {
      await sb.from('acquisition_companies')
        .update({ notes: notes ? `${notes} · ${tag}` : tag }).eq('id', c.existingId);
    }
  }

  void incoming;
  return { inserted: plan.fresh.length, updated: plan.update.length, rechecked: plan.recheck.length };
}

/* ========================== month close ========================== */

/** Freezes per-vertical totals so Trends keeps history after rows are archived. */
export async function snapshotMonth(
  sb: SupabaseClient, month: string, documentId?: string,
): Promise<number> {
  const { data, error } = await sb
    .from('acquisition_companies')
    .select('vertical, fb_found, ig_found, li_found, fb_followed, ig_followed, li_followed, fb_back, ig_back, li_back, engagements, researched_on');
  if (error) throw new Error(error.message);

  const inMonth = (d: string | null) => !!d && d.startsWith(month);
  const acc: Record<string, any> = {};

  for (const r of (data ?? []) as any[]) {
    const v = r.vertical || 'Unassigned';
    acc[v] ??= { month_tag: month, vertical: v, researched: 0, fb_found: 0, ig_found: 0,
                 li_found: 0, followed: 0, follow_backs: 0, engagements: 0, document_id: documentId ?? null };
    if (inMonth(r.researched_on)) {
      acc[v].researched++;
      if (r.fb_found) acc[v].fb_found++;
      if (r.ig_found) acc[v].ig_found++;
      if (r.li_found) acc[v].li_found++;
      acc[v].engagements += r.engagements || 0;
    }
    if (inMonth(r.fb_followed) || inMonth(r.ig_followed) || inMonth(r.li_followed)) {
      acc[v].followed++;
      if (r.fb_back || r.ig_back || r.li_back) acc[v].follow_backs++;
    }
  }

  const rows = Object.values(acc);
  if (!rows.length) return 0;
  const { error: upErr } = await sb
    .from('acquisition_snapshots').upsert(rows, { onConflict: 'month_tag,vertical' });
  if (upErr) throw new Error(upErr.message);
  return rows.length;
}
