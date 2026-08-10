"use client";
/**
 * TrendsTab.jsx — history.
 *
 * Buckets come from the dates stamped when work was actually done, so a row only
 * appears in a period if someone marked it there. Bucket width follows the span
 * (day / week / month) rather than being a setting to get wrong.
 *
 * Live rows carry the current picture. Closed months are read from
 * acquisition_snapshots, which is the whole point of taking them — archived rows
 * can be cleared out and the history still adds up.
 */
import React, { useMemo, useState } from "react";
import { Card, Btn, Badge, fmtN, selectStyle, inputStyle, th, td, SHORT_VERT } from "./ui";

const METRICS = [
  { k: "researched", label: "Researched" },
  { k: "fb_found", label: "FB found" },
  { k: "ig_found", label: "IG found" },
  { k: "li_found", label: "LI found" },
  { k: "followed", label: "Followed" },
  { k: "backs", label: "Follow-backs" },
  { k: "engagements", label: "Engagements" },
];

const DIMS = [
  ["period", "Period"], ["vertical", "Vertical"], ["state", "State"],
  ["researched_by", "Person"], ["metro", "Metro"],
];

const PRESETS = [["7", "Last 7 days"], ["30", "Last 30 days"], ["90", "Last 90 days"],
  ["month", "This month"], ["last", "Last month"], ["all", "All time"], ["custom", "Custom"]];

const SERIES_COLORS = ["#3898EF", "#35D98A", "#E8A33D", "#A98BE8", "#3ECFEF", "#E4695E", "#6C9BE8"];

const iso = d => d.toISOString().slice(0, 10);
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const parseISO = s => new Date(`${s}T00:00:00`);
const inRange = (d, a, b) => !!d && d >= a && d <= b;

/** Day up to a month, week up to ~4 months, month beyond. */
function buildBuckets(a, b) {
  const span = Math.round((parseISO(b) - parseISO(a)) / 86400000) + 1;
  const unit = span <= 31 ? "day" : span <= 126 ? "week" : "month";
  const out = [];
  let cur = parseISO(a);
  const end = parseISO(b);
  while (cur <= end) {
    let last;
    if (unit === "day") last = cur;
    else if (unit === "week") last = addDays(cur, 6);
    else last = new Date(cur.getFullYear(), cur.getMonth() + 1, 0);
    if (last > end) last = end;
    out.push({
      a: iso(cur), b: iso(last),
      label: unit === "day" ? iso(cur).slice(5)
        : unit === "week" ? `w/c ${iso(cur).slice(5)}`
          : iso(cur).slice(0, 7),
    });
    cur = addDays(last, 1);
  }
  return { unit, list: out };
}

function aggregate(list, a, b) {
  const researched = list.filter(r => inRange(r.researched_on, a, b));
  const followed = list.filter(r =>
    inRange(r.fb_followed, a, b) || inRange(r.ig_followed, a, b) || inRange(r.li_followed, a, b));
  return {
    researched: researched.length,
    fb_found: researched.filter(r => r.fb_found === true).length,
    ig_found: researched.filter(r => r.ig_found === true).length,
    li_found: researched.filter(r => r.li_found === true).length,
    followed: followed.length,
    backs: followed.filter(r => r.fb_back === true || r.ig_back === true || r.li_back === true).length,
    engagements: researched.reduce((s, r) => s + (r.engagements || 0), 0),
  };
}

/** Multi-series line chart. Dashed lines are the previous period of equal length. */
function Chart({ labels, series, compare, t }) {
  const W = 1000, H = 300, L = 46, R = 14, T = 14, B = 40;
  const iw = W - L - R, ih = H - T - B;
  const all = [...series, ...(compare || [])].flatMap(s => s.values);
  const max = Math.max(1, ...all);
  const n = Math.max(1, labels.length - 1);
  const X = i => L + (labels.length === 1 ? iw / 2 : (i * iw) / n);
  const Y = v => T + ih - (v / max) * ih;
  const path = vals => vals.map((v, i) => `${i ? "L" : "M"}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(" ");
  const step = Math.max(1, Math.ceil(labels.length / 12));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }} role="img" aria-label="Trend chart">
      {[0, 0.25, 0.5, 0.75, 1].map(f => (
        <g key={f}>
          <line x1={L} x2={W - R} y1={Y(max * f)} y2={Y(max * f)} stroke={t.line} strokeWidth="1" />
          <text x={L - 8} y={Y(max * f) + 4} textAnchor="end" fontSize="11" fill={t.inkFaint}>{Math.round(max * f)}</text>
        </g>
      ))}
      {(compare || []).map((s, i) => (
        <path key={`c${s.k}`} d={path(s.values)} fill="none" strokeDasharray="5 4"
          stroke={SERIES_COLORS[i % SERIES_COLORS.length]} strokeWidth="1.5" opacity="0.45" />
      ))}
      {series.map((s, i) => (
        <path key={s.k} d={path(s.values)} fill="none"
          stroke={SERIES_COLORS[i % SERIES_COLORS.length]} strokeWidth="2.2"
          strokeLinejoin="round" strokeLinecap="round" />
      ))}
      {labels.map((l, i) => (i % step === 0 ? (
        <text key={l + i} x={X(i)} y={H - 14} textAnchor="middle" fontSize="10.5" fill={t.inkFaint}>{l}</text>
      ) : null))}
    </svg>
  );
}

export default function TrendsTab({ rows, snapshots, t }) {
  const [preset, setPreset] = useState("30");
  const [customA, setCustomA] = useState("");
  const [customB, setCustomB] = useState("");
  const [dim, setDim] = useState("period");
  const [on, setOn] = useState({ researched: true, fb_found: true, ig_found: true, li_found: true });
  const [compare, setCompare] = useState(true);

  const allDates = useMemo(() => {
    const s = [];
    for (const r of rows) {
      for (const k of ["researched_on", "fb_followed", "ig_followed", "li_followed"]) if (r[k]) s.push(r[k]);
    }
    return s.sort();
  }, [rows]);

  const range = useMemo(() => {
    const now = new Date(); now.setHours(0, 0, 0, 0);
    if (preset === "custom" && customA && customB) return { a: customA, b: customB };
    if (preset === "month") return { a: iso(new Date(now.getFullYear(), now.getMonth(), 1)), b: iso(now) };
    if (preset === "last") {
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return { a: iso(first), b: iso(new Date(now.getFullYear(), now.getMonth(), 0)) };
    }
    if (preset === "all") return { a: allDates[0] || iso(addDays(now, -30)), b: allDates[allDates.length - 1] || iso(now) };
    return { a: iso(addDays(now, -(Number(preset) - 1))), b: iso(now) };
  }, [preset, customA, customB, allDates]);

  const { unit, list: buckets } = useMemo(() => buildBuckets(range.a, range.b), [range]);

  const spanDays = Math.round((parseISO(range.b) - parseISO(range.a)) / 86400000) + 1;
  const prev = useMemo(() => {
    const b = addDays(parseISO(range.a), -1);
    return { a: iso(addDays(b, -(spanDays - 1))), b: iso(b) };
  }, [range, spanDays]);

  const activeMetrics = METRICS.filter(m => on[m.k]);

  const series = useMemo(() => activeMetrics.map(m => ({
    k: m.k, label: m.label, values: buckets.map(bk => aggregate(rows, bk.a, bk.b)[m.k]),
  })), [activeMetrics, buckets, rows]);

  const compareSeries = useMemo(() => {
    if (!compare) return null;
    const pb = buildBuckets(prev.a, prev.b).list;
    return activeMetrics.map(m => ({
      k: m.k, values: buckets.map((_, i) => (pb[i] ? aggregate(rows, pb[i].a, pb[i].b)[m.k] : 0)),
    }));
  }, [compare, prev, activeMetrics, buckets, rows]);

  const totalNow = aggregate(rows, range.a, range.b);
  const totalPrev = aggregate(rows, prev.a, prev.b);

  const breakdown = useMemo(() => {
    if (dim === "period") {
      return buckets.map(bk => ({ label: bk.label, m: aggregate(rows, bk.a, bk.b) }));
    }
    const values = [...new Set(rows.map(r => r[dim] || "—"))].sort();
    return values
      .map(v => ({ label: dim === "vertical" ? SHORT_VERT(v) : v, m: aggregate(rows.filter(r => (r[dim] || "—") === v), range.a, range.b) }))
      .filter(x => x.m.researched || x.m.followed)
      .sort((a, b) => b.m.researched - a.m.researched);
  }, [dim, buckets, rows, range]);

  const delta = (cur, was) => {
    if (!was) return <span style={{ color: cur ? t.good : t.inkGhost, fontSize: 11 }}>{cur ? "new" : "—"}</span>;
    const p = Math.round(((cur - was) / was) * 100);
    return <span style={{ color: p > 0 ? t.good : p < 0 ? t.bad : t.inkFaint, fontSize: 11 }}>{p > 0 ? `+${p}` : p}%</span>;
  };

  const closedMonths = useMemo(() => {
    const acc = {};
    for (const s of snapshots) {
      acc[s.month_tag] ??= { researched: 0, fb_found: 0, ig_found: 0, li_found: 0, followed: 0, follow_backs: 0, engagements: 0 };
      for (const k of Object.keys(acc[s.month_tag])) acc[s.month_tag][k] += s[k] || 0;
    }
    return Object.entries(acc).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [snapshots]);

  return (
    <div style={{ flex: 1, overflowY: "auto", minHeight: 0, padding: "22px 24px", display: "flex", flexDirection: "column", gap: 16 }}>

      <Card t={t} title="Trends"
        right={<span style={{ fontSize: 11.5, color: t.inkFaint }}>{range.a} → {range.b} · bucketed by {unit}</span>}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
          <select value={preset} onChange={e => setPreset(e.target.value)} style={selectStyle(t)}>
            {PRESETS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          {preset === "custom" && <>
            <input type="date" value={customA} onChange={e => setCustomA(e.target.value)} style={inputStyle(t)} />
            <input type="date" value={customB} onChange={e => setCustomB(e.target.value)} style={inputStyle(t)} />
          </>}
          <select value={dim} onChange={e => setDim(e.target.value)} style={selectStyle(t)}>
            {DIMS.map(([v, l]) => <option key={v} value={v}>Break down by {l.toLowerCase()}</option>)}
          </select>
          <Btn t={t} kind={compare ? "solid" : "ghost"} onClick={() => setCompare(v => !v)}>Compare to previous</Btn>
          <span style={{ flex: 1 }} />
          {METRICS.map((m, i) => (
            <Btn key={m.k} t={t} kind={on[m.k] ? "solid" : "ghost"}
              onClick={() => setOn(o => ({ ...o, [m.k]: !o[m.k] }))}
              style={on[m.k] ? { background: SERIES_COLORS[activeMetrics.findIndex(x => x.k === m.k) % SERIES_COLORS.length] || t.accent, borderColor: "transparent" } : undefined}>
              {m.label}
            </Btn>
          ))}
        </div>

        {!allDates.length ? (
          <div style={{ padding: 40, textAlign: "center", color: t.inkFaint, fontSize: 13 }}>
            No dated work yet. Marks on Research and Follow stamp the dates this chart reads.
          </div>
        ) : !activeMetrics.length ? (
          <div style={{ padding: 40, textAlign: "center", color: t.inkFaint, fontSize: 13 }}>Turn on a metric to draw it.</div>
        ) : (
          <Chart labels={buckets.map(b => b.label)} series={series} compare={compareSeries} t={t} />
        )}
        {compare && activeMetrics.length > 0 && (
          <div style={{ fontSize: 11.5, color: t.inkFaint, marginTop: 6 }}>
            Dashed lines are {prev.a} → {prev.b}, the previous period of equal length.
          </div>
        )}
      </Card>

      <Card t={t} title="Measurements">
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th(t)}>{DIMS.find(d => d[0] === dim)[1]}</th>
                {METRICS.map(m => <th key={m.k} style={{ ...th(t), textAlign: "right" }}>{m.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {breakdown.map(b => (
                <tr key={b.label}>
                  <td style={td(t)}>{b.label}</td>
                  {METRICS.map(m => (
                    <td key={m.k} style={{ ...td(t), textAlign: "right", fontFamily: "'JetBrains Mono',monospace" }}>{fmtN(b.m[m.k])}</td>
                  ))}
                </tr>
              ))}
              <tr>
                <td style={{ ...td(t), fontWeight: 700, borderTop: `2px solid ${t.lineStrong}` }}>Total for period</td>
                {METRICS.map(m => (
                  <td key={m.k} style={{ ...td(t), textAlign: "right", fontWeight: 700, borderTop: `2px solid ${t.lineStrong}`, fontFamily: "'JetBrains Mono',monospace" }}>
                    {fmtN(totalNow[m.k])}
                    <div>{delta(totalNow[m.k], totalPrev[m.k])}</div>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        {!breakdown.length && <div style={{ fontSize: 12.5, color: t.inkFaint, marginTop: 10 }}>Nothing recorded in this period.</div>}
      </Card>

      <Card t={t} title="Closed months"
        right={<span style={{ fontSize: 11.5, color: t.inkFaint }}>from snapshots — survives archiving</span>}>
        {!closedMonths.length ? (
          <div style={{ fontSize: 12.5, color: t.inkFaint }}>
            No months closed yet. Take a snapshot from Documents at month end and it lands here.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={th(t)}>Month</th>
                  {["Researched", "FB", "IG", "LI", "Followed", "Backs", "Engagements"].map(h => (
                    <th key={h} style={{ ...th(t), textAlign: "right" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {closedMonths.map(([month, m]) => (
                  <tr key={month}>
                    <td style={td(t)}><Badge t={t} color={t.accent}>{month}</Badge></td>
                    {["researched", "fb_found", "ig_found", "li_found", "followed", "follow_backs", "engagements"].map(k => (
                      <td key={k} style={{ ...td(t), textAlign: "right", fontFamily: "'JetBrains Mono',monospace" }}>{fmtN(m[k])}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
