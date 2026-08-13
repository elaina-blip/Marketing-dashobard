"use client";
/**
 * EnrichBar.jsx — the three enrichment buttons, the spend confirmation, and the
 * live progress readout.
 *
 * The free and paid paths are deliberately separate controls. Elaina asked for
 * that specifically so nobody spends money by accident, so the free one is
 * labelled and coloured as free and the two paid ones always route through a
 * confirmation showing the record count and a cost ceiling.
 *
 * The quoted range is the ceiling, not the hope: the dry run assumes the free
 * footer pass resolves nothing and everything falls through to the API, so the
 * real bill comes in under the number every time.
 */
import React, { useState } from "react";
import { Sparkles, Globe, Zap } from "lucide-react";
import { Btn, Card, fmtN } from "./ui";

const MODES = {
  footer: {
    label: "Find from websites",
    icon: Globe,
    free: true,
    hint: "Reads each company's own site for social links. No key, no cost, cannot fail expensively.",
  },
  full: {
    label: "Find everything",
    icon: Sparkles,
    free: false,
    hint: "Free website pass first, then the API on whatever it could not resolve. The default.",
  },
  ai: {
    label: "AI search only",
    icon: Zap,
    free: false,
    hint: "Skips the free pass. Use it for a second opinion when a website result looks wrong.",
  },
};

export default function EnrichBar({ selectedIds, t, onDone }) {
  const [pending, setPending] = useState(null);   // dry-run result awaiting confirmation
  const [running, setRunning] = useState(null);   // { phase, done, total }
  const [msg, setMsg] = useState(null);
  const scope = selectedIds.length ? { ids: selectedIds } : {};
  const scopeLabel = selectedIds.length ? `${fmtN(selectedIds.length)} selected` : "everything untouched";

  async function post(body) {
    const res = await fetch("/api/acquisition/enrich", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res;
  }

  /* ---------- step one: ask what it would cost ---------- */
  async function start(mode) {
    setMsg(null);
    // The free pass has nothing to confirm — no key, no spend, no ceiling to quote.
    if (MODES[mode].free) { run(mode); return; }
    setRunning({ phase: "estimating", done: 0, total: 0 });
    try {
      const res = await post({ mode, ...scope, dryRun: true });
      const data = await res.json();
      if (!res.ok) { setMsg({ text: data.error || "Could not estimate.", bad: true }); return; }
      setPending({ mode, ...data });
    } catch (e) {
      setMsg({ text: e.message, bad: true });
    } finally { setRunning(null); }
  }

  /* ---------- step two: run it, reading progress as it streams ---------- */
  async function run(mode) {
    setPending(null); setMsg(null);
    setRunning({ phase: mode === "ai" ? "ai" : "footer", done: 0, total: 0 });
    try {
      const res = await post({ mode, ...scope });
      if (!res.ok || !res.body) {
        let text = "Enrichment failed.";
        try { text = (await res.json()).error || text; } catch { /* not JSON */ }
        setMsg({ text, bad: true });
        return;
      }
      // NDJSON: one JSON object per line, the last one carrying the summary.
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let final = null;
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          let evt; try { evt = JSON.parse(line); } catch { continue; }
          if (evt.error) { setMsg({ text: evt.error, bad: true }); continue; }
          if (evt.done) final = evt;
          else setRunning({ phase: evt.phase, done: evt.done, total: evt.total });
        }
      }
      if (final) {
        const c = final.combined || {};
        const s = c.suggestions || { fb: 0, ig: 0, li: 0 };
        setMsg({
          text: `Checked ${fmtN(c.attempted)} — ${fmtN(c.resolved)} came back with something ` +
                `(${fmtN(s.fb)} FB · ${fmtN(s.ig)} IG · ${fmtN(s.li)} LI), ` +
                `${fmtN(c.empty)} had nothing, ${fmtN(c.failed)} failed. ` +
                `Suggestions are purple until you confirm them.`,
        });
        onDone?.();
      }
    } catch (e) {
      setMsg({ text: e.message, bad: true });
    } finally { setRunning(null); }
  }

  const busy = !!running;

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", padding: "9px 24px",
      borderBottom: `1px solid ${t.line}`, background: t.bgSunk, flexShrink: 0 }}>
      <span style={{ fontSize: 11, letterSpacing: ".09em", textTransform: "uppercase",
        color: t.inkFaint, fontWeight: 700 }}>Enrich</span>

      {Object.entries(MODES).map(([mode, m]) => {
        const Icon = m.icon;
        return (
          <Btn key={mode} t={t} kind={mode === "full" ? "solid" : "ghost"} disabled={busy}
            title={m.hint} onClick={() => start(mode)}
            style={{ display: "flex", alignItems: "center", gap: 6,
              ...(m.free ? { borderColor: t.good, color: t.good } : {}) }}>
            <Icon size={13} />{m.label}{m.free && <span style={{ fontSize: 10, opacity: .8 }}>free</span>}
          </Btn>
        );
      })}

      <span style={{ fontSize: 11.5, color: t.inkFaint }}>on {scopeLabel}</span>
      <span style={{ flex: 1 }} />

      {running && (
        <span style={{ fontSize: 11.5, color: t.accent, fontFamily: "'JetBrains Mono',monospace" }}>
          {running.phase === "estimating" ? "estimating…"
            : `${running.phase === "ai" ? "AI search" : "websites"} ${fmtN(running.done)}/${fmtN(running.total)}`}
        </span>
      )}

      {msg && (
        <span style={{ fontSize: 11.5, color: msg.bad ? t.bad : t.inkMuted, maxWidth: 620 }}>{msg.text}</span>
      )}

      {/* Spend confirmation — quote the ceiling, never the hope. */}
      {pending && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", zIndex: 100,
          display: "grid", placeItems: "center", padding: 20 }}>
          <Card t={t} title="Confirm before spending" style={{ maxWidth: 540, border: `2px solid ${t.gold}` }}>
            <p style={{ fontSize: 13.5, color: t.ink, margin: "0 0 10px", lineHeight: 1.6 }}>
              Enrich <b>{fmtN(pending.combined?.attempted ?? pending.ai?.attempted ?? 0)}</b> records?
              {pending.mode === "full" && pending.footer?.attempted > 0 && (
                <> The free website pass covers <b>{fmtN(pending.footer.attempted)}</b> at no cost.</>
              )}
            </p>
            <p style={{ fontSize: 13.5, color: t.inkMuted, margin: "0 0 14px", lineHeight: 1.6 }}>
              Up to <b style={{ color: t.ink }}>{fmtN(pending.ai?.attempted ?? 0)}</b> would reach the API —
              estimated{" "}
              <b style={{ color: t.gold }}>
                ${pending.ai?.estimatedCost?.low ?? "0.00"} to ${pending.ai?.estimatedCost?.high ?? "0.00"}
              </b>.
            </p>
            <p style={{ fontSize: 11.5, color: t.inkFaint, margin: "0 0 14px", lineHeight: 1.6 }}>
              That is the ceiling. The estimate assumes the free pass resolves nothing, so the real
              bill comes in under it. Nothing is written to the found flags — everything lands as a
              suggestion for you to confirm.
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn t={t} kind="solid" onClick={() => run(pending.mode)}>Run it</Btn>
              <Btn t={t} onClick={() => setPending(null)}>Cancel</Btn>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
