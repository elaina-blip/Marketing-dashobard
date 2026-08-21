"use client";
/**
 * EnrichBar.jsx — the three enrichment buttons, the spend confirmation, and the
 * progress bar.
 *
 * ONE CLICK, MANY SHORT CALLS. The route now does one chunk per request and
 * writes before it returns, so this loops until it reports nothing left. That is
 * what stops a long run being killed at Vercel's 300s ceiling and throwing away
 * a batch of API calls that were already paid for.
 *
 * Stopping is safe and resuming is free: completed chunks are already committed,
 * and enriched rows drop out of the candidate pool, so clicking again continues
 * rather than starting over.
 *
 * The free and paid paths are deliberately separate controls — Elaina asked for
 * that specifically so nobody spends money by accident.
 */
import React, { useRef, useState } from "react";
import { Sparkles, Globe, Zap, Square } from "lucide-react";
import { Btn, Card, Meter, fmtN } from "./ui";

const MODES = {
  footer: {
    label: "Find from websites", icon: Globe, free: true,
    hint: "Reads each company's own site for social links. No key, no cost, cannot fail expensively.",
  },
  full: {
    label: "Find everything", icon: Sparkles, free: false,
    hint: "Free website pass first, then the API on whatever it could not resolve. The default.",
  },
  ai: {
    label: "AI search only", icon: Zap, free: false,
    hint: "Skips the free pass. Use it for a second opinion when a website result looks wrong.",
  },
};

const blank = () => ({
  attempted: 0, resolved: 0, empty: 0, failed: 0,
  jsShell: 0, blocked: 0, noDomain: 0, skipped: 0,
  suggestions: { fb: 0, ig: 0, li: 0 },
});

/** Chunk summaries add up across a run; the client keeps the running total. */
function accumulate(total, s) {
  if (!s) return total;
  const n = { ...total, suggestions: { ...total.suggestions } };
  for (const k of ["attempted", "resolved", "empty", "failed", "jsShell", "blocked", "noDomain", "skipped"]) {
    n[k] = (n[k] || 0) + (s[k] || 0);
  }
  for (const k of ["fb", "ig", "li"]) {
    n.suggestions[k] += s.suggestions?.[k] || 0;
  }
  return n;
}

export default function EnrichBar({ selectedIds, t, onDone }) {
  const [pending, setPending] = useState(null);   // dry run awaiting confirmation
  const [run, setRun] = useState(null);           // { phase, done, total, totals }
  const [msg, setMsg] = useState(null);
  const stop = useRef(false);

  const scoped = selectedIds.length > 0;
  const scope = scoped ? { ids: selectedIds } : {};
  const scopeLabel = scoped ? `${fmtN(selectedIds.length)} selected` : "everything untouched";

  const post = body => fetch("/api/acquisition/enrich", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  /* ---------- step one: what would this attempt, and cost? ---------- */
  async function start(mode) {
    setMsg(null);
    setRun({ phase: "estimating", done: 0, total: 0, totals: blank() });
    try {
      const res = await post({ mode, ...scope, dryRun: true });
      const data = await res.json();
      if (!res.ok) { setMsg({ text: data.error || "Could not estimate.", bad: true }); return; }
      // The free pass has no spend to confirm — go straight into the loop.
      if (MODES[mode].free) { loop(mode, data.remaining || 0); return; }
      setPending({ mode, ...data });
    } catch (e) {
      setMsg({ text: e.message, bad: true });
    } finally { setRun(r => (r?.phase === "estimating" ? null : r)); }
  }

  /* ---------- step two: chunk until nothing is left ---------- */
  async function loop(mode, startTotal) {
    setPending(null); setMsg(null);
    stop.current = false;

    let totals = blank();
    let total = startTotal || 0;
    let done = 0;
    let phase = mode === "ai" ? "ai" : "footer";
    setRun({ phase, done, total, totals });

    try {
      for (;;) {
        if (stop.current) {
          setMsg({ text: `Stopped. ${fmtN(done)} records are saved — click again to carry on from here.` });
          break;
        }
        const res = await post({ mode, ...scope });
        const data = await res.json();
        if (!res.ok) {
          // Anything earlier chunks wrote is already committed.
          setMsg({
            text: `${data.error || "Enrichment failed."} ${fmtN(done)} records completed before this and are saved — click again to resume.`,
            bad: true,
          });
          break;
        }

        totals = accumulate(totals, data.summary);
        phase = data.phase || phase;
        done += data.summary?.attempted || 0;
        // `remaining` is authoritative; the starting estimate only seeds the bar.
        total = Math.max(total, done + (data.remaining || 0));
        setRun({ phase, done, total, totals });

        if (!data.hasMore) { setMsg({ text: describe(totals) }); break; }
      }
    } catch (e) {
      setMsg({ text: `${e.message}. ${fmtN(done)} records are saved — click again to resume.`, bad: true });
    } finally {
      setRun(null);
      onDone?.();
    }
  }

  /**
   * "0 of 0 came back with something" reads as a failure even when the guards
   * correctly passed over rows nothing could identify. Every bucket is named.
   */
  function describe(c) {
    const s = c.suggestions;
    const parts = [
      c.empty    ? `${fmtN(c.empty)} listed nothing` : "",
      c.jsShell  ? `${fmtN(c.jsShell)} build their footer in the browser` : "",
      c.blocked  ? `${fmtN(c.blocked)} hit a bot wall` : "",
      c.noDomain ? `${fmtN(c.noDomain)} have no company site` : "",
      c.skipped  ? `${fmtN(c.skipped)} skipped — nothing identifying to search` : "",
      c.failed   ? `${fmtN(c.failed)} failed` : "",
    ].filter(Boolean).join(" · ");
    const retry = (c.jsShell || 0) + (c.blocked || 0) + (c.noDomain || 0) + (c.failed || 0);
    return `${fmtN(c.attempted)} searched — ${fmtN(c.resolved)} came back with something ` +
      `(${fmtN(s.fb)} FB · ${fmtN(s.ig)} IG · ${fmtN(s.li)} LI)` +
      (parts ? `. ${parts}` : "") +
      (retry ? `. ${fmtN(retry)} are worth an AI pass — the site was there, it just could not be read.` : "") +
      ` Suggestions stay purple until you confirm them.`;
  }

  const busy = !!run;
  const pct = run && run.total > 0 ? Math.round((run.done / run.total) * 100) : 0;

  return (
    <div style={{ borderBottom: `1px solid ${t.line}`, background: t.bgSunk, flexShrink: 0 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", padding: "9px 24px" }}>
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

        {/* The scope caused real confusion, so it is stated loudly rather than
            as a quiet aside — and repeated in the spend confirmation. */}
        <span style={{ fontSize: 11.5, padding: "3px 9px", borderRadius: 20, fontWeight: 600,
          color: scoped ? t.accentDeep : t.inkMuted,
          background: scoped ? t.accentSoft : "transparent",
          border: `1px solid ${scoped ? t.accent : t.lineStrong}` }}>
          on {scopeLabel}
        </span>

        <span style={{ flex: 1 }} />

        {busy && (
          <Btn t={t} kind="warn" onClick={() => { stop.current = true; }}
            style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Square size={11} /> Stop
          </Btn>
        )}
      </div>

      {/* Progress. Five minutes of greyed-out buttons looked like a hang. */}
      {run && (
        <div style={{ padding: "0 24px 10px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5,
            marginBottom: 5, color: t.inkMuted, fontFamily: "'JetBrains Mono',monospace" }}>
            <span>
              {run.phase === "estimating" ? "working out what this would attempt…"
                : run.phase === "ai" ? "AI search" : "reading websites"}
              {run.phase !== "estimating" && run.total > 0 &&
                ` · ${fmtN(run.done)} of ${fmtN(run.total)}`}
            </span>
            <span style={{ color: t.accent }}>
              {run.phase !== "estimating" && run.total > 0 ? `${pct}%` : ""}
            </span>
          </div>
          <Meter t={t} pct={pct} height={5}
            color={run.phase === "ai" ? t.gold : t.good} />
          <div style={{ fontSize: 10.5, color: t.inkFaint, marginTop: 5 }}>
            Each batch is saved as it finishes — stopping or losing the tab keeps everything done so far.
          </div>
        </div>
      )}

      {msg && !run && (
        <div style={{ padding: "0 24px 10px", fontSize: 11.5,
          color: msg.bad ? t.bad : t.inkMuted, maxWidth: 900 }}>{msg.text}</div>
      )}

      {/* Spend confirmation — quote the ceiling, never the hope. */}
      {pending && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", zIndex: 100,
          display: "grid", placeItems: "center", padding: 20 }}>
          <Card t={t} title="Confirm before spending" style={{ maxWidth: 560, border: `2px solid ${t.gold}` }}>
            <p style={{ fontSize: 13.5, color: t.ink, margin: "0 0 10px", lineHeight: 1.6 }}>
              Enrich <b>{fmtN(pending.combined?.attempted ?? pending.ai?.attempted ?? 0)}</b> records,
              running on <b style={{ color: scoped ? t.accentDeep : t.ink }}>{scopeLabel}</b>?
              {pending.mode === "full" && pending.footer?.attempted > 0 && (
                <> The free website pass covers <b>{fmtN(pending.footer.attempted)}</b> of them at no cost.</>
              )}
            </p>
            <p style={{ fontSize: 13.5, color: t.inkMuted, margin: "0 0 6px", lineHeight: 1.6 }}>
              Up to <b style={{ color: t.ink }}>{fmtN(pending.ai?.attempted ?? 0)}</b> would reach the API —
              estimated{" "}
              <b style={{ color: t.gold }}>
                ${pending.ai?.estimatedCost?.low ?? "0.00"} to ${pending.ai?.estimatedCost?.high ?? "0.00"}
              </b>.
            </p>
            {pending.ai?.skipped > 0 && (
              <p style={{ fontSize: 12, color: t.inkFaint, margin: "0 0 10px" }}>
                {fmtN(pending.ai.skipped)} more were passed over — no website, no licence number, and the
                name does not read as a business, so there is nothing to search on.
              </p>
            )}
            <p style={{ fontSize: 11.5, color: t.inkFaint, margin: "0 0 14px", lineHeight: 1.6 }}>
              That figure is the ceiling: it assumes the free pass resolves nothing, so the real bill comes
              in under it. The run happens in small batches, each saved as it completes — you can stop at any
              point and nothing already done is lost. Nothing is written to the found flags; everything lands
              as a suggestion for you to confirm.
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn t={t} kind="solid" onClick={() => loop(pending.mode, pending.remaining || 0)}>Run it</Btn>
              <Btn t={t} onClick={() => setPending(null)}>Cancel</Btn>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
