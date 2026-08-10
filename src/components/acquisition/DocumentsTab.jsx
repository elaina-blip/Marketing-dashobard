"use client";
/**
 * DocumentsTab.jsx — from the supplied DocumentsTab.tsx.
 *
 * Behaviour is unchanged: drag-drop upload, filterable file table, per-row
 * Load / Download / Retag / Remove, sheet picker, and the merge preview that
 * writes nothing until you confirm.
 *
 * TWO CHANGES from the supplied file. The `supabase` import became this repo's
 * browser client factory (there is no `@/lib/supabase` singleton). And the
 * className styling became inline theme styles, because the dashboard ships no
 * stylesheet for those class names to land in.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import {
  listDocuments, uploadDocument, documentDownloadUrl, renameDocument,
  deleteDocument, previewMerge, commitMerge, snapshotMonth,
} from "@/lib/acquisition/documents-api";
import { monthTag } from "@/lib/acquisition/parse-upload";
import { Card, Btn, Badge, Empty, fmtN, selectStyle, inputStyle, th, td } from "./ui";

const supabase = createClient();

const fmtSize = b => (!b ? "—" : b < 1024 ? `${b} B` : b < 1048576 ? `${Math.round(b / 1024)} KB` : `${(b / 1048576).toFixed(1)} MB`);
const fmtWhen = s => { const d = new Date(s); return isNaN(d) ? "—" : `${d.toISOString().slice(0, 10)} ${d.toTimeString().slice(0, 5)}`; };
const extOf = n => (String(n).split(".").pop() || "").toLowerCase();

export default function DocumentsTab({ currentUser, t, onDataChanged, onSnapshot }) {
  const [docs, setDocs] = useState([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [filters, setFilters] = useState({});
  const [sheetPick, setSheetPick] = useState(null);
  const [preview, setPreview] = useState(null);
  const [previewSheet, setPreviewSheet] = useState(undefined);
  const [closeMonth, setCloseMonth] = useState(monthTag());
  const fileInput = useRef(null);

  const refresh = useCallback(async () => {
    try { setDocs(await listDocuments(supabase, filters)); }
    catch (e) { setMsg({ text: e.message, bad: true }); }
  }, [filters]);

  useEffect(() => { refresh(); }, [refresh]);

  /* ---------- upload ---------- */
  async function handleFiles(files, sheetName) {
    setBusy(true); setMsg(null);
    try {
      for (const file of Array.from(files)) {
        const res = await uploadDocument(
          supabase,
          { name: file.name, type: file.type, size: file.size, buffer: await file.arrayBuffer() },
          currentUser,
          { month: monthTag(), sheetName },
        );
        if (res.sheetNames && !res.document) { setSheetPick({ file, sheets: res.sheetNames }); break; }
        setMsg({ text: `${file.name} uploaded — ${fmtN(res.rowCount)} rows. Press Load to merge it in.` });
      }
      await refresh();
    } catch (e) {
      setMsg({ text: e.message, bad: true });
    } finally { setBusy(false); }
  }

  const onDrop = e => {
    e.preventDefault(); setDragging(false);
    if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
  };

  /* ---------- load ---------- */
  async function startLoad(doc, sheetName) {
    setBusy(true); setMsg(null);
    try {
      const { preview: p } = await previewMerge(supabase, doc.id, sheetName);
      setPreviewSheet(sheetName);
      setPreview(p);
    } catch (e) {
      // A multi-sheet workbook uploaded without a sheet choice surfaces here.
      if (e.name === "NeedSheetChoice") setSheetPick({ doc, sheets: e.sheetNames });
      else setMsg({ text: e.message, bad: true });
    } finally { setBusy(false); }
  }

  async function confirmLoad() {
    if (!preview) return;
    setBusy(true);
    try {
      const r = await commitMerge(supabase, preview.documentId, previewSheet);
      setMsg({ text: `Merged — ${fmtN(r.inserted)} new, ${fmtN(r.updated)} refreshed, ${fmtN(r.rechecked)} rechecking.` });
      setPreview(null);
      onDataChanged();
    } catch (e) {
      setMsg({ text: e.message, bad: true });
    } finally { setBusy(false); }
  }

  /* ---------- row actions ---------- */
  async function download(doc) {
    try { window.open(await documentDownloadUrl(supabase, doc.id), "_blank"); }
    catch (e) { setMsg({ text: e.message, bad: true }); }
  }
  async function retag(doc) {
    const m = window.prompt("Month tag for this file", doc.month_tag || monthTag());
    if (!m) return;
    try { await renameDocument(supabase, doc.id, { month_tag: m }); refresh(); }
    catch (e) { setMsg({ text: e.message, bad: true }); }
  }
  async function remove(doc) {
    if (!window.confirm(`Remove "${doc.filename}" from the list?\n\nThe file itself is kept and can be restored.`)) return;
    try {
      await deleteDocument(supabase, doc.id);
      setMsg({ text: `${doc.filename} removed from the list.` });
      refresh();
    } catch (e) { setMsg({ text: e.message, bad: true }); }
  }

  /* ---------- month close ---------- */
  async function takeSnapshot() {
    if (!/^\d{4}-\d{2}$/.test(closeMonth)) { setMsg({ text: "Month must look like 2026-08.", bad: true }); return; }
    setBusy(true);
    try {
      const n = await snapshotMonth(supabase, closeMonth);
      setMsg({ text: n ? `${closeMonth} frozen — ${n} vertical${n === 1 ? "" : "s"} written to the snapshot.` : "Nothing to snapshot for that month." });
      onSnapshot?.();
    } catch (e) {
      setMsg({ text: e.message, bad: true });
    } finally { setBusy(false); }
  }

  const months = [...new Set(docs.map(d => d.month_tag).filter(Boolean))];
  const people = [...new Set(docs.map(d => d.uploaded_by).filter(Boolean))];

  return (
    <div style={{ flex: 1, overflowY: "auto", minHeight: 0, padding: "22px 24px", display: "flex", flexDirection: "column", gap: 16 }}>

      {preview && (
        <Card t={t} title={`Review before importing — ${preview.filename}`} style={{ border: `2px solid ${t.gold}` }}>
          <p style={{ fontSize: 12.5, color: t.inkMuted, margin: "0 0 12px" }}>
            Nothing has changed yet. This is what the merge will do.
          </p>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              {[
                ["New companies", "Added to Research, ranked by priority score", preview.newCount, t.good],
                ["Already known", "Permit counts and scores refreshed · all research work kept", preview.updateCount, t.accent],
                ["Due for recheck", "Marked none-found over 9 months ago · returning to Research", preview.recheckCount, t.warn],
              ].map(([label, note, n, c]) => (
                <tr key={label}>
                  <td style={td(t)}>
                    <b style={{ color: t.ink }}>{label}</b>
                    <div style={{ fontSize: 11, color: t.inkFaint }}>{note}</div>
                  </td>
                  <td style={{ ...td(t), textAlign: "right", fontSize: 22, fontWeight: 700, color: c, fontFamily: "'JetBrains Mono',monospace" }}>
                    {fmtN(n)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ fontSize: 11.5, color: t.inkFaint, marginTop: 10 }}>
            Matched on: {preview.matchedBy.email} by email · {preview.matchedBy.domain} by domain and state ·{" "}
            {preview.matchedBy.name} by name and state.
            {preview.skippedRows > 0 && ` ${preview.skippedRows} row(s) had no company name and were skipped.`}
          </div>
          {preview.verticalConflicts > 0 && (
            <div style={{ marginTop: 10, padding: 10, borderRadius: 8, background: t.warnSoft, border: `1px solid ${t.warn}44`, fontSize: 12, color: t.inkMuted }}>
              <b style={{ color: t.warn }}>{preview.verticalConflicts} vertical conflict{preview.verticalConflicts === 1 ? "" : "s"}.</b>{" "}
              These companies already exist under a different trade. The existing vertical is kept and a note is added —
              a roofer that also pulls electrical permits should not become two records.
            </div>
          )}
          {preview.missingColumns.length > 0 && (
            <div style={{ fontSize: 11.5, color: t.inkFaint, marginTop: 8 }}>
              No column matched: {preview.missingColumns.join(", ")} — those fields stay blank.
            </div>
          )}
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <Btn t={t} kind="solid" onClick={confirmLoad} disabled={busy}>Merge into current data</Btn>
            <Btn t={t} onClick={() => setPreview(null)} disabled={busy}>Cancel</Btn>
          </div>
        </Card>
      )}

      {sheetPick && (
        <Card t={t} title={`Which sheet? — ${sheetPick.file?.name || sheetPick.doc?.filename}`} style={{ border: `2px solid ${t.accent}` }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {sheetPick.sheets.map(s => (
              <Btn key={s} t={t} kind="solid" onClick={() => {
                const pick = sheetPick; setSheetPick(null);
                if (pick.file) handleFiles([pick.file], s); else startLoad(pick.doc, s);
              }}>{s}</Btn>
            ))}
          </div>
          <div style={{ marginTop: 10 }}><Btn t={t} onClick={() => setSheetPick(null)}>Cancel</Btn></div>
        </Card>
      )}

      <Card t={t} title="Documents">
        <p style={{ fontSize: 12.5, color: t.inkMuted, margin: "0 0 12px", maxWidth: 720 }}>
          Every acquisition list and export, kept for the whole team. Upload a file, then load it into the workbench
          when you are ready — loading always shows you what will change first.
        </p>
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => fileInput.current?.click()}
          onKeyDown={e => { if (e.key === "Enter" || e.key === " ") fileInput.current?.click(); }}
          role="button" tabIndex={0}
          style={{
            padding: "28px 16px", textAlign: "center", borderRadius: 12, cursor: "pointer", fontSize: 13,
            color: dragging ? t.accentDeep : t.inkMuted,
            border: `2px dashed ${dragging ? t.accent : t.lineStrong}`,
            background: dragging ? t.accentWash : t.bgSunk,
          }}
        >
          {busy ? "Working…" : "Drop a CSV or Excel file here, or click to choose"}
        </div>
        <input ref={fileInput} type="file" accept=".csv,.xlsx,.xls" multiple hidden
          onChange={e => { if (e.target.files?.length) handleFiles(e.target.files); e.target.value = ""; }} />
        {msg && (
          <div style={{ marginTop: 10, padding: "8px 11px", borderRadius: 8, fontSize: 12.5,
            color: msg.bad ? t.bad : t.good, background: msg.bad ? t.badSoft : t.goodSoft,
            border: `1px solid ${msg.bad ? t.bad : t.good}44` }}>{msg.text}</div>
        )}
      </Card>

      <Card t={t} title="All files">
        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          <select value={filters.month || ""} onChange={e => setFilters(f => ({ ...f, month: e.target.value || undefined }))} style={selectStyle(t)}>
            <option value="">All months</option>
            {months.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select value={filters.uploadedBy || ""} onChange={e => setFilters(f => ({ ...f, uploadedBy: e.target.value || undefined }))} style={selectStyle(t)}>
            <option value="">Anyone</option>
            {people.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={filters.type || ""} onChange={e => setFilters(f => ({ ...f, type: e.target.value || undefined }))} style={selectStyle(t)}>
            <option value="">All types</option>
            <option value="csv">CSV</option>
            <option value="xlsx">Excel</option>
          </select>
        </div>

        {!docs.length ? (
          <Empty t={t}>No files yet. Drop one above to get started.</Empty>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={th(t)}>File</th>
                  <th style={{ ...th(t), textAlign: "right" }}>Rows</th>
                  <th style={{ ...th(t), textAlign: "right" }}>Size</th>
                  <th style={th(t)}>Month</th>
                  <th style={th(t)}>Uploaded</th>
                  <th style={th(t)}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {docs.map(d => (
                  <tr key={d.id}>
                    <td style={td(t)}>
                      <span style={{ fontWeight: 600, marginRight: 7 }}>{d.filename}</span>
                      <Badge t={t} color={extOf(d.filename) === "csv" ? t.teal : t.good}>{extOf(d.filename)}</Badge>
                      {d.sheet_name && <div style={{ fontSize: 11, color: t.inkFaint }}>sheet: {d.sheet_name}</div>}
                    </td>
                    <td style={{ ...td(t), textAlign: "right", fontFamily: "'JetBrains Mono',monospace" }}>
                      {d.row_count != null ? fmtN(d.row_count) : "—"}
                    </td>
                    <td style={{ ...td(t), textAlign: "right", color: t.inkMuted }}>{fmtSize(d.size_bytes)}</td>
                    <td style={{ ...td(t), color: t.inkMuted }}>{d.month_tag ?? "—"}</td>
                    <td style={{ ...td(t), fontSize: 11.5, color: t.inkMuted, whiteSpace: "nowrap" }}>
                      {fmtWhen(d.uploaded_at)}
                      <div style={{ color: t.inkFaint }}>{d.uploaded_by}</div>
                    </td>
                    <td style={td(t)}>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <Btn t={t} kind="solid" onClick={() => startLoad(d)} disabled={busy}>Load</Btn>
                        <Btn t={t} onClick={() => download(d)}>Download</Btn>
                        <Btn t={t} onClick={() => retag(d)}>Retag</Btn>
                        <Btn t={t} onClick={() => remove(d)}>Remove</Btn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card t={t} title="Close the month">
        <p style={{ fontSize: 12.5, color: t.inkMuted, margin: "0 0 12px", maxWidth: 720 }}>
          Freezes this month&rsquo;s per-vertical totals into the snapshot Trends reads for closed months. Safe to run
          more than once — re-running overwrites that month rather than adding to it.
        </p>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <input value={closeMonth} onChange={e => setCloseMonth(e.target.value)} placeholder="2026-08"
            style={{ ...inputStyle(t), width: 110, fontFamily: "'JetBrains Mono',monospace" }} />
          <Btn t={t} kind="solid" onClick={takeSnapshot} disabled={busy}>Close the month</Btn>
        </div>
      </Card>
    </div>
  );
}
