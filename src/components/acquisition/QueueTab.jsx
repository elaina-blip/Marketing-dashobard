"use client";
/**
 * QueueTab.jsx — Research, Follow and Archive.
 *
 * One component, three stages: the columns and the bulk actions change, the
 * filtering, sorting, paging and selection do not. Mirrors the reference HTML's
 * three working tabs.
 *
 * Scroll position survives a redraw for free here — React patches the existing
 * table instead of replacing innerHTML, which is what lost the user's place in
 * the HTML version. The only thing that would break it is remounting this
 * component on every keystroke, so the parent must keep it mounted.
 */
import React, { useMemo, useState } from "react";
import {
  verify, searchTerm, searchUrls, licenceBoard, licenceNumber,
  VERDICT_LABEL, foundCount, isTouched, followedCount,
} from "@/lib/acquisition/acquisition-logic";
import { today } from "@/lib/acquisition/companies-api";
import {
  Btn, Mark, DateMark, Badge, Empty, verdictColor, vertColor, SHORT_VERT,
  fmtN, selectStyle, inputStyle, th, td,
} from "./ui";

const PER_PAGE = 100;

const HEADS = {
  research: [
    ["Company", "company_name"], ["Vertical", "vertical"], ["Permit types", null],
    ["Permits", "total_permits", "num"], ["Where", "state"], ["Domain check", "verdict"],
    ["Open & search", null], ["Found", null], ["By", "researched_by"],
  ],
  follow: [
    ["Company", "company_name"], ["Vertical", "vertical"], ["Permits", "total_permits", "num"],
    ["Where", "state"], ["Profiles", null], ["Followed on", null], ["Follow-back", null],
    ["Engagements", "engagements", "num"], ["Notes", null],
  ],
  archive: [
    ["Company", "company_name"], ["Vertical", "vertical"], ["Permits", "total_permits", "num"],
    ["Where", "state"], ["Found", null], ["Followed", null], ["Follow-back", null],
    ["By", "researched_by"], ["Notes", null],
  ],
};

const HINT = {
  research: "Click FB/IG/LI to cycle found → none → clear. All opens every search at once. Searches use the company, never a person.",
  follow: "Stamp a platform once you have actually followed them — the tool records the follow, it never performs one. B marks a follow-back.",
  archive: "Completed records. They stay queryable here; nothing needs removing.",
};

export default function QueueTab({ stage, rows, me, t, onPatch, onBulk, onExport }) {
  const [fVert, setFVert] = useState("");
  const [fVerdict, setFVerdict] = useState("");
  const [fState, setFState] = useState("");
  const [fBy, setFBy] = useState("");
  const [text, setText] = useState("");
  const [todoOnly, setTodoOnly] = useState(false);
  const [sortKey, setSortKey] = useState("priority_score");
  const [sortDir, setSortDir] = useState(-1);
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState(() => new Set());

  // verify()/searchTerm() are pure and a little expensive, so derive once per load
  // rather than per render of every row.
  const meta = useMemo(() => {
    const m = new Map();
    for (const r of rows) {
      const check = verify({ name: r.company_name, email: r.email, group: r.records_on_domain });
      const { term, fromDomain } = searchTerm(r.company_name, check);
      m.set(r.id, {
        check, term, fromDomain,
        urls: searchUrls(r, check, term),
        licence: licenceNumber(r.company_name),
        board: licenceBoard(r.state, r.vertical),
      });
    }
    return m;
  }, [rows]);

  const verticals = useMemo(() => [...new Set(rows.map(r => r.vertical).filter(Boolean))].sort(), [rows]);
  const states = useMemo(() => [...new Set(rows.map(r => r.state).filter(Boolean))].sort(), [rows]);
  const people = useMemo(() => [...new Set(rows.map(r => r.researched_by).filter(Boolean))].sort(), [rows]);

  const shown = useMemo(() => {
    const q = text.trim().toLowerCase();
    const out = rows.filter(r => {
      if (r.stage !== stage) return false;
      if (fVert && r.vertical !== fVert) return false;
      if (fState && r.state !== fState) return false;
      if (fBy && r.researched_by !== fBy) return false;
      const m = meta.get(r.id);
      if (fVerdict && m.check.verdict !== fVerdict) return false;
      if (todoOnly && (stage === "research" ? isTouched(r) : followedCount(r) > 0)) return false;
      if (q) {
        const hay = `${r.company_name} ${m.check.domain} ${r.primary_jurisdiction} ${r.metro} ${m.term}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    out.sort((a, b) => {
      // Rechecks first on Research — a contractor who has since started an account
      // is the most valuable row in the queue.
      if (stage === "research" && a.recheck !== b.recheck) return a.recheck ? -1 : 1;
      let x = sortKey === "verdict" ? meta.get(a.id).check.verdict : a[sortKey];
      let y = sortKey === "verdict" ? meta.get(b.id).check.verdict : b[sortKey];
      if (typeof x === "string" || typeof y === "string") {
        x = String(x || "").toLowerCase(); y = String(y || "").toLowerCase();
        return x < y ? -sortDir : x > y ? sortDir : 0;
      }
      return ((x || 0) - (y || 0)) * sortDir;
    });
    return out;
  }, [rows, stage, fVert, fState, fBy, fVerdict, text, todoOnly, sortKey, sortDir, meta]);

  const pages = Math.max(1, Math.ceil(shown.length / PER_PAGE));
  const pageSafe = Math.min(page, pages - 1);
  const slice = shown.slice(pageSafe * PER_PAGE, (pageSafe + 1) * PER_PAGE);
  const selected = [...sel];

  const sortBy = key => {
    if (!key) return;
    if (sortKey === key) setSortDir(d => -d);
    else { setSortKey(key); setSortDir(key === "total_permits" || key === "engagements" || key === "priority_score" ? -1 : 1); }
  };
  const toggleSel = id => setSel(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const clearSel = () => setSel(new Set());

  /* ---------- writes ---------- */

  // Cycling a platform is also what marks a row researched: the first mark stamps
  // who and when, and clearing the last one takes the stamp back off.
  function cycleFound(r, key) {
    const next = r[key] === true ? false : r[key] === false ? null : true;
    const after = { ...r, [key]: next };
    const patch = { [key]: next };
    if (isTouched(after)) {
      if (!r.researched_on) patch.researched_on = today();
      if (!r.researched_by) patch.researched_by = me;
    } else {
      patch.researched_by = "";
      patch.researched_on = null;
    }
    onPatch(r.id, patch);
  }

  const cycleBack = (r, key) => onPatch(r.id, { [key]: r[key] === true ? false : r[key] === false ? null : true });
  const stampDate = (r, key) => onPatch(r.id, { [key]: r[key] ? null : today() });

  function bulk(patch, alsoStamp) {
    if (!selected.length) return;
    const full = { ...patch };
    if (alsoStamp) { full.researched_on = today(); full.researched_by = me; }
    onBulk(selected, full);
    clearSel();
  }

  /**
   * Bulk actions that depend on the row: a company with no profiles anywhere
   * skips Follow entirely, and "Followed on IG" must not stamp a row that has no
   * Instagram profile. Rows are grouped by the patch they need so this is still
   * a handful of round trips, not one per row.
   */
  function bulkPerRow(patchFor) {
    if (!selected.length) return;
    const groups = new Map();
    for (const r of rows) {
      if (!sel.has(r.id)) continue;
      const patch = patchFor(r);
      if (!patch) continue;
      const key = JSON.stringify(patch);
      if (!groups.has(key)) groups.set(key, { patch, ids: [] });
      groups.get(key).ids.push(r.id);
    }
    for (const g of groups.values()) onBulk(g.ids, g.patch);
    clearSel();
  }

  const stampMany = key => bulkPerRow(r =>
    (r[`${key}_found`] === true ? { [`${key}_followed`]: today() } : null));

  const openAll = r => {
    const u = meta.get(r.id).urls;
    [u.site, u.google, u.facebook, u.instagram, u.linkedin]
      .filter(Boolean).forEach(x => window.open(x, "_blank", "noopener"));
  };

  const heads = HEADS[stage];
  const link = { color: t.accent, textDecoration: "none", fontSize: 11, fontWeight: 600,
    border: `1px solid ${t.lineStrong}`, borderRadius: 6, padding: "3px 7px", whiteSpace: "nowrap" };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: 0, flex: 1 }}>

      {/* toolbar */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", padding: "10px 24px",
        borderBottom: `1px solid ${t.line}`, background: t.bgCard, flexShrink: 0 }}>
        <select value={fVert} onChange={e => { setFVert(e.target.value); setPage(0); }} style={selectStyle(t)}>
          <option value="">All verticals</option>
          {verticals.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
        <select value={fVerdict} onChange={e => { setFVerdict(e.target.value); setPage(0); }} style={selectStyle(t)}>
          <option value="">All verdicts</option>
          {Object.entries(VERDICT_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <select value={fState} onChange={e => { setFState(e.target.value); setPage(0); }} style={selectStyle(t)}>
          <option value="">All states</option>
          {states.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={fBy} onChange={e => { setFBy(e.target.value); setPage(0); }} style={selectStyle(t)}>
          <option value="">Anyone</option>
          {people.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <input value={text} onChange={e => { setText(e.target.value); setPage(0); }}
          placeholder="Search company, domain, jurisdiction" style={{ ...inputStyle(t), minWidth: 240 }} />
        <Btn t={t} kind={todoOnly ? "solid" : "ghost"} onClick={() => { setTodoOnly(v => !v); setPage(0); }}>
          {stage === "research" ? "Untouched only" : "Not yet followed"}
        </Btn>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 11.5, color: t.inkFaint, fontFamily: "'JetBrains Mono',monospace" }}>
          {fmtN(shown.length)} in {stage} · {fmtN(rows.length)} total
        </span>
        <Btn t={t} onClick={() => onExport(shown)}>Export CSV</Btn>
      </div>

      {/* bulk bar */}
      {selected.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", padding: "9px 24px",
          borderBottom: `1px solid ${t.line}`, background: t.accentWash, flexShrink: 0 }}>
          <b style={{ fontSize: 12.5, color: t.ink }}>{selected.length} selected</b>
          {stage === "research" && <>
            <Btn t={t} onClick={() => bulk({ fb_found: true }, true)}>Mark FB found</Btn>
            <Btn t={t} onClick={() => bulk({ ig_found: true }, true)}>Mark IG found</Btn>
            <Btn t={t} onClick={() => bulk({ li_found: true }, true)}>Mark LI found</Btn>
            <Btn t={t} onClick={() => bulk({ fb_found: false, ig_found: false, li_found: false }, true)}>Mark none found</Btn>
            {/* A row with nothing found anywhere has no follow work — it goes
                straight to Archive rather than clogging the Follow queue. */}
            <Btn t={t} kind="solid" title="Rows with no profile found anywhere go straight to Archive"
              onClick={() => bulkPerRow(r => ({ stage: foundCount(r) ? "follow" : "archive" }))}>Send to Follow →</Btn>
          </>}
          {stage === "follow" && <>
            <Btn t={t} title="Only stamps rows with a Facebook profile" onClick={() => stampMany("fb")}>Followed on FB</Btn>
            <Btn t={t} title="Only stamps rows with an Instagram profile" onClick={() => stampMany("ig")}>Followed on IG</Btn>
            <Btn t={t} title="Only stamps rows with a LinkedIn profile" onClick={() => stampMany("li")}>Followed on LI</Btn>
            <Btn t={t} kind="solid" onClick={() => bulk({ stage: "archive" })}>Archive →</Btn>
          </>}
          {stage === "archive" && <Btn t={t} onClick={() => bulk({ stage: "follow" })}>Send back to Follow</Btn>}
          <span style={{ flex: 1 }} />
          <Btn t={t} onClick={clearSel}>Clear selection</Btn>
        </div>
      )}

      {/* table */}
      <div style={{ flex: 1, overflow: "auto", minHeight: 0 }}>
        {!rows.length ? (
          <Empty t={t}>No records loaded yet.<br />Upload a list on <b>Documents</b>, then press Load.</Empty>
        ) : !shown.length ? (
          <Empty t={t}>
            {stage === "follow" ? <>Nothing here yet. Mark rows on <b>Research</b> and use <b>Send to Follow</b>.</>
              : stage === "archive" ? "Nothing archived yet."
                : "Nothing matches those filters."}
          </Empty>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ ...th(t), width: 34 }}>
                  <input type="checkbox"
                    checked={slice.length > 0 && slice.every(r => sel.has(r.id))}
                    onChange={e => setSel(s => {
                      const n = new Set(s);
                      slice.forEach(r => (e.target.checked ? n.add(r.id) : n.delete(r.id)));
                      return n;
                    })} />
                </th>
                {heads.map(([label, key, cls]) => (
                  <th key={label} onClick={() => sortBy(key)}
                    style={{ ...th(t), cursor: key ? "pointer" : "default", textAlign: cls === "num" ? "right" : "left" }}>
                    {label}{sortKey === key ? <span style={{ color: t.accent }}> {sortDir > 0 ? "▲" : "▼"}</span> : null}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {slice.map(r => {
                const m = meta.get(r.id);
                const picked = sel.has(r.id);
                return (
                  <tr key={r.id} style={{ background: picked ? t.accentWash : "transparent" }}>
                    <td style={td(t)}><input type="checkbox" checked={picked} onChange={() => toggleSel(r.id)} /></td>

                    <td style={{ ...td(t), minWidth: 220 }}>
                      <div style={{ fontWeight: 600, color: t.ink }}>{r.company_name}</div>
                      <div style={{ fontSize: 11, color: t.inkFaint }}>{r.email || "—"}</div>
                      {m.fromDomain && (
                        <div style={{ fontSize: 10.5, color: t.warn, marginTop: 3 }}>
                          searching “{m.term}” from domain
                        </div>
                      )}
                      <div style={{ display: "flex", gap: 5, marginTop: 4, flexWrap: "wrap" }}>
                        {m.licence && <Badge t={t} color={t.inkMuted}>lic {m.licence}</Badge>}
                        {r.recheck && <Badge t={t} color={t.warn}>recheck</Badge>}
                      </div>
                    </td>

                    <td style={td(t)}><Badge t={t} color={vertColor(r.vertical, t)}>{SHORT_VERT(r.vertical)}</Badge></td>

                    {stage === "research" && (
                      <td style={{ ...td(t), fontSize: 11, color: t.inkMuted, maxWidth: 170 }}>{r.permit_types || "—"}</td>
                    )}

                    <td style={{ ...td(t), textAlign: "right", fontFamily: "'JetBrains Mono',monospace" }}>{fmtN(r.total_permits)}</td>

                    <td style={{ ...td(t), fontSize: 11.5, color: t.inkMuted, whiteSpace: "nowrap" }}>
                      <b style={{ color: t.ink }}>{r.state}</b> · {r.primary_jurisdiction}
                      <div>{r.metro}</div>
                    </td>

                    {stage === "research" && <>
                      <td style={{ ...td(t), maxWidth: 220 }}>
                        <Badge t={t} color={verdictColor(m.check.verdict, t)}>{VERDICT_LABEL[m.check.verdict]}</Badge>
                        <div style={{ fontSize: 10.5, color: t.inkFaint, marginTop: 4 }}>{m.check.why}</div>
                      </td>
                      <td style={td(t)}>
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                          <Btn t={t} kind="solid" onClick={() => openAll(r)} style={{ padding: "3px 8px", fontSize: 11 }}>All</Btn>
                          {m.urls.site && <a href={m.urls.site} target="_blank" rel="noopener noreferrer" style={link}>Site</a>}
                          <a href={m.urls.google} target="_blank" rel="noopener noreferrer" style={link}>Google</a>
                          <a href={m.urls.facebook} target="_blank" rel="noopener noreferrer" style={link}>FB</a>
                          <a href={m.urls.instagram} target="_blank" rel="noopener noreferrer" style={link}>IG</a>
                          <a href={m.urls.linkedin} target="_blank" rel="noopener noreferrer" style={link}>LI</a>
                          {m.board && (
                            <a href={m.board.url} target="_blank" rel="noopener noreferrer"
                              title={`${m.licence ? `Search licence ${m.licence}` : "Search by name"} — ${m.board.name}`}
                              style={{ ...link, color: t.gold, borderColor: `${t.gold}66` }}>{m.board.name}</a>
                          )}
                        </div>
                      </td>
                      <td style={td(t)}>
                        <div style={{ display: "flex", gap: 4 }}>
                          <Mark t={t} value={r.fb_found} label="FB" onClick={() => cycleFound(r, "fb_found")} />
                          <Mark t={t} value={r.ig_found} label="IG" onClick={() => cycleFound(r, "ig_found")} />
                          <Mark t={t} value={r.li_found} label="LI" onClick={() => cycleFound(r, "li_found")} />
                        </div>
                      </td>
                      <td style={{ ...td(t), fontSize: 11.5, color: t.inkMuted, whiteSpace: "nowrap" }}>
                        {isTouched(r) ? <>{r.researched_by || "—"}<div style={{ color: t.inkFaint }}>{r.researched_on || ""}</div></> : "—"}
                      </td>
                    </>}

                    {stage === "follow" && <>
                      <td style={td(t)}>
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                          {r.fb_found === true && <a href={m.urls.facebook} target="_blank" rel="noopener noreferrer" style={link}>FB</a>}
                          {r.ig_found === true && <a href={m.urls.instagram} target="_blank" rel="noopener noreferrer" style={link}>IG</a>}
                          {r.li_found === true && <a href={m.urls.linkedin} target="_blank" rel="noopener noreferrer" style={link}>LI</a>}
                          {foundCount(r) === 0 && <span style={{ fontSize: 11, color: t.inkFaint }}>none found</span>}
                        </div>
                      </td>
                      <td style={td(t)}>
                        <div style={{ display: "flex", gap: 4 }}>
                          {r.fb_found === true && <DateMark t={t} value={r.fb_followed} label="FB" onClick={() => stampDate(r, "fb_followed")} />}
                          {r.ig_found === true && <DateMark t={t} value={r.ig_followed} label="IG" onClick={() => stampDate(r, "ig_followed")} />}
                          {r.li_found === true && <DateMark t={t} value={r.li_followed} label="LI" onClick={() => stampDate(r, "li_followed")} />}
                        </div>
                      </td>
                      <td style={td(t)}>
                        <div style={{ display: "flex", gap: 4 }}>
                          {r.fb_found === true && <Mark t={t} value={r.fb_back} label="FB" onClick={() => cycleBack(r, "fb_back")} />}
                          {r.ig_found === true && <Mark t={t} value={r.ig_back} label="IG" onClick={() => cycleBack(r, "ig_back")} />}
                          {r.li_found === true && <Mark t={t} value={r.li_back} label="LI" onClick={() => cycleBack(r, "li_back")} />}
                        </div>
                      </td>
                      <td style={{ ...td(t), textAlign: "right" }}>
                        <input type="number" min={0} defaultValue={r.engagements || 0}
                          onBlur={e => { const n = Number(e.target.value) || 0; if (n !== r.engagements) onPatch(r.id, { engagements: n }); }}
                          style={{ ...inputStyle(t), width: 70, textAlign: "right" }} />
                      </td>
                      <td style={td(t)}>
                        <input defaultValue={r.notes || ""} placeholder="notes"
                          onBlur={e => { if (e.target.value !== r.notes) onPatch(r.id, { notes: e.target.value }); }}
                          style={{ ...inputStyle(t), width: 180 }} />
                      </td>
                    </>}

                    {stage === "archive" && <>
                      <td style={{ ...td(t), fontSize: 11.5, color: t.inkMuted }}>{foundCount(r)} of 3</td>
                      <td style={{ ...td(t), fontSize: 11, color: t.inkMuted }}>
                        {[r.fb_followed && `FB ${r.fb_followed}`, r.ig_followed && `IG ${r.ig_followed}`, r.li_followed && `LI ${r.li_followed}`]
                          .filter(Boolean).map(s => <div key={s}>{s}</div>)}
                      </td>
                      <td style={{ ...td(t), fontSize: 11.5, color: t.inkMuted }}>
                        {[r.fb_back === true && "FB", r.ig_back === true && "IG", r.li_back === true && "LI"].filter(Boolean).join(" ") || "—"}
                      </td>
                      <td style={{ ...td(t), fontSize: 11.5, color: t.inkMuted, whiteSpace: "nowrap" }}>
                        {r.researched_by || "—"}<div style={{ color: t.inkFaint }}>{r.researched_on || ""}</div>
                      </td>
                      <td style={{ ...td(t), fontSize: 11.5, color: t.inkMuted, maxWidth: 200 }}>{r.notes || "—"}</td>
                    </>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* footer */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", padding: "9px 24px",
        borderTop: `1px solid ${t.line}`, background: t.bgCard, flexShrink: 0, fontSize: 11.5, color: t.inkFaint }}>
        {pages > 1 && <>
          <Btn t={t} disabled={pageSafe === 0} onClick={() => setPage(p => Math.max(0, p - 1))}>← Prev</Btn>
          <span>Page {pageSafe + 1} of {pages}</span>
          <Btn t={t} disabled={pageSafe >= pages - 1} onClick={() => setPage(p => p + 1)}>Next →</Btn>
          <span>· {PER_PAGE} per page</span>
        </>}
        <span style={{ flex: 1 }} />
        <span>{HINT[stage]}</span>
      </div>
    </div>
  );
}
