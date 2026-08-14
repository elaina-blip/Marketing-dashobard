"use client";
/**
 * ProspectingTab.jsx — leads from pasted follower lists.
 *
 * Permit data only knows contractors who filed in a covered jurisdiction. A
 * follower list reaches the ones it never sees.
 *
 * Everything on this tab is free: rules only, no lookups, so a list of several
 * thousand costs nothing to sift. Only what survives is worth a paid enrichment
 * pass, which happens later on Research.
 *
 * The paste is made by a person, by hand. Nothing here collects a follower list
 * automatically and nothing here should ever be made to — every platform
 * prohibits it, and the account that would get banned is the APS account this
 * whole project exists to build.
 */
import React, { useMemo, useState } from "react";
import { ClipboardPaste, AlertTriangle } from "lucide-react";
import { parseAndClassify } from "@/lib/acquisition/prospect-parse";
import { knownKeySet, addProspects, recordProspectRun } from "@/lib/acquisition/companies-api";
import { Card, Btn, Badge, Empty, fmtN, selectStyle, inputStyle, th, td } from "./ui";

const PLATFORMS = [
  ["instagram", "Instagram"],
  ["facebook", "Facebook"],
  ["linkedin", "LinkedIn"],
];

/* Buckets, in the order the funnel reads. */
const KINDS = {
  new: { label: "New to you", color: t => t.good, hint: "Reads as a business and is not already in your list" },
  unsure: { label: "Worth a look", color: t => t.warn, hint: "No clear signal either way — one glance decides it" },
  known: { label: "Already yours", color: t => t.accent, hint: "Matches a company already in the queue" },
  person: { label: "People", color: t => t.inkFaint, hint: "Reads as a personal name" },
  junk: { label: "Filtered out", color: t => t.inkGhost, hint: "Nothing usable" },
};

export default function ProspectingTab({ rows, me, t, onReload }) {
  const [platform, setPlatform] = useState("instagram");
  const [account, setAccount] = useState("");
  const [paste, setPaste] = useState("");
  const [result, setResult] = useState(null);
  const [filter, setFilter] = useState("new");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const knownKeys = useMemo(() => knownKeySet(rows), [rows]);

  function parse() {
    setMsg(null);
    const lines = paste.split("\n").filter(l => l.trim()).length;
    if (!lines) { setMsg({ text: "Paste a list first.", bad: true }); return; }
    const { rows: parsed, summary } = parseAndClassify(paste, platform, knownKeys);
    setResult({ rows: parsed, summary, pastedLines: lines });
    setFilter("new");
  }

  async function addSelected(kind) {
    if (!result) return;
    const picks = result.rows.filter(r => r.kind === kind);
    if (!picks.length) return;
    setBusy(true); setMsg(null);
    try {
      const added = await addProspects(picks, platform, account, knownKeys);
      await recordProspectRun({
        platform, sourceAccount: account, pastedLines: result.pastedLines,
        summary: result.summary, addedToResearch: added, runBy: me,
      });
      setMsg({
        text: `Added ${fmtN(added)} to Research, tagged as prospecting from ` +
              `${account || platform}. They carry no permit count, so they rank below scraped records — that is intended.`,
      });
      // Drop what was added from the table so a second click cannot double-add.
      setResult(r => ({ ...r, rows: r.rows.filter(x => x.kind !== kind) }));
      onReload?.();
    } catch (e) {
      setMsg({ text: e.message, bad: true });
    } finally { setBusy(false); }
  }

  const shown = result ? result.rows.filter(r => r.kind === filter) : [];
  const s = result?.summary;

  return (
    <div style={{ flex: 1, overflowY: "auto", minHeight: 0, padding: "22px 24px", display: "flex", flexDirection: "column", gap: 16 }}>

      <Card t={t} title="Prospecting">
        <p style={{ fontSize: 12.5, color: t.inkMuted, margin: "0 0 12px", maxWidth: 760, lineHeight: 1.6 }}>
          Open a follower or following list on a profile, select the names, and paste them here. Everything is
          sorted by rule — no lookups, no cost — so a list of several thousand costs nothing to sift. Only what
          survives is worth enriching.
        </p>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
          <select value={platform} onChange={e => setPlatform(e.target.value)} style={selectStyle(t)}>
            {PLATFORMS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <input value={account} onChange={e => setAccount(e.target.value)}
            placeholder="whose list is this? e.g. abcsupplyco followers"
            style={{ ...inputStyle(t), minWidth: 300 }} />
        </div>

        <textarea value={paste} onChange={e => setPaste(e.target.value)}
          placeholder={"Paste the names here, one per line.\n\nInstagram gives you a handle and a display name; Facebook and LinkedIn give display names only. Paste it exactly as it comes — the parser handles the platform's shape."}
          style={{ ...inputStyle(t), width: "100%", minHeight: 150, fontFamily: "'JetBrains Mono',monospace",
            fontSize: 12, lineHeight: 1.5, resize: "vertical" }} />

        <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 10, flexWrap: "wrap" }}>
          <Btn t={t} kind="solid" onClick={parse} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <ClipboardPaste size={14} /> Parse and filter
          </Btn>
          {paste && <Btn t={t} onClick={() => { setPaste(""); setResult(null); setMsg(null); }}>Clear</Btn>}
          {msg && (
            <span style={{ fontSize: 12, color: msg.bad ? t.bad : t.good, maxWidth: 640 }}>{msg.text}</span>
          )}
        </div>

        {/* These lists load in chunks — a page showing 2,700 followers renders only
            a few hundred until you scroll, and the paste captures what rendered. */}
        <div style={{ marginTop: 12, padding: 10, borderRadius: 8, background: t.warnSoft,
          border: `1px solid ${t.warn}44`, fontSize: 12, color: t.inkMuted, display: "flex", gap: 8, maxWidth: 760 }}>
          <AlertTriangle size={15} style={{ color: t.warn, flexShrink: 0, marginTop: 1 }} />
          <span>
            <b style={{ color: t.warn }}>These lists load as you scroll.</b> A profile showing 2,700 followers
            only renders a few hundred until you scroll down — a paste taken straight away captures just those.
            Scroll the list to the bottom first, then select and copy.
          </span>
        </div>
      </Card>

      {result && (
        <>
          <Card t={t} title="What came back"
            right={<span style={{ fontSize: 11.5, color: t.inkFaint }}>
              {fmtN(result.pastedLines)} lines pasted → {fmtN(s.total)} names parsed
            </span>}>
            <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))" }}>
              {Object.entries(KINDS).map(([kind, k]) => {
                const c = k.color(t);
                const on = filter === kind;
                return (
                  <button key={kind} onClick={() => setFilter(kind)} title={k.hint}
                    style={{ textAlign: "left", cursor: "pointer", fontFamily: "inherit",
                      background: on ? `${c}1A` : t.bgSunk, borderRadius: 10, padding: "11px 13px",
                      border: `1px solid ${on ? c : t.line}` }}>
                    <div style={{ fontSize: 9.5, letterSpacing: ".11em", textTransform: "uppercase",
                      color: c, fontWeight: 700 }}>{k.label}</div>
                    <div style={{ fontSize: 26, fontWeight: 700, color: t.ink, lineHeight: 1.1, marginTop: 5,
                      fontFamily: "'JetBrains Mono',monospace" }}>{fmtN(s[kind])}</div>
                  </button>
                );
              })}
            </div>

            {(filter === "new" || filter === "unsure") && shown.length > 0 && (
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 14, flexWrap: "wrap" }}>
                <Btn t={t} kind="solid" disabled={busy} onClick={() => addSelected(filter)}>
                  Add {fmtN(shown.length)} to Research
                </Btn>
                <span style={{ fontSize: 11.5, color: t.inkFaint }}>
                  Tagged as prospecting from {account || platform}. No permit count, so they rank below scraped records.
                </span>
              </div>
            )}
          </Card>

          <Card t={t} title={KINDS[filter].label} right={
            <span style={{ fontSize: 11.5, color: t.inkFaint }}>{KINDS[filter].hint}</span>
          }>
            {!shown.length ? (
              <Empty t={t}>Nothing in this bucket.</Empty>
            ) : (
              <div style={{ overflowX: "auto", maxHeight: 520, overflowY: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={th(t)}>Name</th>
                      <th style={th(t)}>Handle</th>
                      <th style={th(t)}>Verdict</th>
                      <th style={th(t)}>Why</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map((r, i) => (
                      <tr key={`${r.handle}|${r.name}|${i}`}>
                        <td style={{ ...td(t), fontWeight: 600 }}>{r.name || "—"}</td>
                        <td style={{ ...td(t), fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, color: t.inkMuted }}>
                          {r.handle ? `@${r.handle}` : "—"}
                        </td>
                        <td style={td(t)}><Badge t={t} color={KINDS[r.kind].color(t)}>{KINDS[r.kind].label}</Badge></td>
                        <td style={{ ...td(t), fontSize: 11.5, color: t.inkFaint }}>{r.why}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}

      <Card t={t} title="Why the buckets are cautious">
        <p style={{ fontSize: 12.5, color: t.inkMuted, margin: 0, lineHeight: 1.65, maxWidth: 760 }}>
          <b style={{ color: t.ink }}>Worth a look</b> exists on purpose. A wrongly dropped company is lost
          silently; a wrongly kept one costs one glance. Anything ambiguous lands there rather than being
          discarded — <i>Appliance Direct</i>, <i>Teron Metal Components</i> and <i>Fastest Labs</i> are all real
          businesses that a stricter rule threw away as people. If the buckets ever look too messy, resist
          tightening them: real prospects disappear without anyone noticing.
        </p>
      </Card>
    </div>
  );
}
