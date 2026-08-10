"use client";
/**
 * PlanTab.jsx — Plan & rates.
 *
 * The plan is the only place monthly targets come from: edit a row here and the
 * KPI cards and dashboard pacing move with it. Measured rates sit beside the
 * planned ones with the gap in points, and Apply pushes a measured rate into the
 * plan. Below 8 checked records a rate is withheld rather than shown — a 100%
 * hit rate off three records is worse than no number at all.
 */
import React, { useState } from "react";
import { hitRates, targetsFromPlan, MIN_SAMPLE, CONFIDENT_SAMPLE } from "@/lib/acquisition/acquisition-logic";
import { Card, Btn, Badge, fmtN, inputStyle, th, td, SHORT_VERT, vertColor } from "./ui";

const pct = v => `${Math.round(v * 100)}%`;

export default function PlanTab({ rows, plan, t, onSavePlan }) {
  const [saving, setSaving] = useState("");

  const measuredFor = vertical => hitRates(rows.filter(r => r.vertical === vertical));
  const targets = targetsFromPlan(plan);

  async function save(vertical, patch) {
    setSaving(vertical);
    try { await onSavePlan(vertical, patch); } finally { setSaving(""); }
  }

  const numCell = (vertical, field, value, isRate) => (
    <td style={{ ...td(t), textAlign: "right" }}>
      <input
        type="number" min={0} max={isRate ? 100 : undefined} step={1}
        defaultValue={isRate ? Math.round(value * 100) : value}
        disabled={saving === vertical}
        onBlur={e => {
          const raw = Number(e.target.value) || 0;
          const next = isRate ? Math.max(0, Math.min(100, raw)) / 100 : Math.max(0, raw);
          if (next !== value) save(vertical, { [field]: next });
        }}
        style={{ ...inputStyle(t), width: 74, textAlign: "right" }}
      />
      {isRate && <span style={{ color: t.inkFaint, fontSize: 11, marginLeft: 3 }}>%</span>}
    </td>
  );

  const delta = (measured, planned) => {
    if (measured == null) return <span style={{ color: t.inkGhost }}>—</span>;
    const d = Math.round((measured - planned) * 100);
    const c = d >= 5 ? t.good : d <= -5 ? t.bad : t.inkFaint;
    return <span style={{ color: c, fontWeight: 700 }}>{d > 0 ? `+${d}` : d} pts</span>;
  };

  return (
    <div style={{ flex: 1, overflowY: "auto", minHeight: 0, padding: "22px 24px", display: "flex", flexDirection: "column", gap: 16 }}>

      <Card t={t} title="This month's targets"
        right={<span style={{ fontSize: 11.5, color: t.inkFaint }}>derived from the plan — never hard-coded</span>}>
        <div style={{ display: "flex", gap: 26, flexWrap: "wrap" }}>
          {[["Research", targets.research, t.accent], ["Facebook", targets.fb, t.indigo],
            ["Instagram", targets.ig, t.pink], ["LinkedIn", targets.li, t.teal]].map(([label, n, c]) => (
            <div key={label}>
              <div style={{ fontSize: 10.5, letterSpacing: ".1em", textTransform: "uppercase", color: t.inkFaint, fontWeight: 700 }}>{label}</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: c, fontFamily: "'JetBrains Mono',monospace" }}>{fmtN(n)}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card t={t} title="Monthly plan">
        <p style={{ fontSize: 12.5, color: t.inkMuted, margin: "0 0 12px", maxWidth: 720 }}>
          How many companies to research each month per trade, and the presence rate you expect on each platform.
          Edit a cell and tab out — it saves and the targets above move immediately.
        </p>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th(t)}>Vertical</th>
                <th style={{ ...th(t), textAlign: "right" }}>Research / month</th>
                <th style={{ ...th(t), textAlign: "right" }}>FB rate</th>
                <th style={{ ...th(t), textAlign: "right" }}>IG rate</th>
                <th style={{ ...th(t), textAlign: "right" }}>LI rate</th>
                <th style={{ ...th(t), textAlign: "right" }}>Projected profiles</th>
              </tr>
            </thead>
            <tbody>
              {plan.map(p => (
                <tr key={p.vertical}>
                  <td style={td(t)}><Badge t={t} color={vertColor(p.vertical, t)}>{SHORT_VERT(p.vertical)}</Badge></td>
                  {numCell(p.vertical, "research_per_month", p.research_per_month, false)}
                  {numCell(p.vertical, "fb_rate", p.fb_rate, true)}
                  {numCell(p.vertical, "ig_rate", p.ig_rate, true)}
                  {numCell(p.vertical, "li_rate", p.li_rate, true)}
                  <td style={{ ...td(t), textAlign: "right", color: t.inkMuted, fontFamily: "'JetBrains Mono',monospace" }}>
                    {fmtN(Math.round(p.research_per_month * (p.fb_rate + p.ig_rate + p.li_rate)))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card t={t} title="Measured against plan">
        <p style={{ fontSize: 12.5, color: t.inkMuted, margin: "0 0 12px", maxWidth: 720 }}>
          Measured is found ÷ checked from the records this team has actually worked. A rate stays hidden until{" "}
          {MIN_SAMPLE} records in that trade have been checked, and is only called solid at {CONFIDENT_SAMPLE}.
          Apply writes the measured rate into the plan above.
        </p>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th(t)}>Vertical</th>
                <th style={{ ...th(t), textAlign: "right" }}>Checked</th>
                {["FB", "IG", "LI"].map(k => (
                  <th key={k} style={{ ...th(t), textAlign: "right" }}>{k} planned → measured</th>
                ))}
                <th style={th(t)}>Confidence</th>
                <th style={th(t)}>Apply</th>
              </tr>
            </thead>
            <tbody>
              {plan.map(p => {
                const m = measuredFor(p.vertical);
                const ready = m.checked >= MIN_SAMPLE;
                const cells = [["fb", "fb_rate"], ["ig", "ig_rate"], ["li", "li_rate"]];
                return (
                  <tr key={p.vertical}>
                    <td style={td(t)}><Badge t={t} color={vertColor(p.vertical, t)}>{SHORT_VERT(p.vertical)}</Badge></td>
                    <td style={{ ...td(t), textAlign: "right", fontFamily: "'JetBrains Mono',monospace", color: t.inkMuted }}>{fmtN(m.checked)}</td>
                    {cells.map(([k, field]) => (
                      <td key={k} style={{ ...td(t), textAlign: "right", whiteSpace: "nowrap" }}>
                        <span style={{ color: t.inkFaint }}>{pct(p[field])}</span>
                        <span style={{ color: t.inkGhost, margin: "0 5px" }}>→</span>
                        <span style={{ color: t.ink, fontWeight: 600 }}>{ready ? pct(m[k]) : "—"}</span>
                        <div style={{ fontSize: 10.5 }}>{ready ? delta(m[k], p[field]) : null}</div>
                      </td>
                    ))}
                    <td style={td(t)}>
                      {!ready
                        ? <span style={{ fontSize: 11, color: t.inkFaint }}>needs {MIN_SAMPLE - m.checked} more</span>
                        : <Badge t={t} color={m.confident ? t.good : t.warn}>{m.confident ? "solid" : "thin"}</Badge>}
                    </td>
                    <td style={td(t)}>
                      <Btn t={t} disabled={!ready || saving === p.vertical}
                        onClick={() => save(p.vertical, { fb_rate: m.fb, ig_rate: m.ig, li_rate: m.li })}>
                        Apply measured
                      </Btn>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
