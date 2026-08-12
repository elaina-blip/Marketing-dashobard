"use client";
/**
 * DashboardTab.jsx — the read-only view of everything the three working tabs
 * have produced. Nothing here is editable; every number traces back to a mark
 * someone made, and every target traces back to the plan.
 */
import React, { useMemo } from "react";
import {
  verify, computeGroups, VERDICT_LABEL, foundCount, isTouched, isSkipped, followedCount, targetsFromPlan,
} from "@/lib/acquisition/acquisition-logic";
import { Card, Badge, Meter, fmtN, pctOf, th, td, SHORT_VERT, vertColor, verdictColor } from "./ui";

const PLATFORMS = [["fb", "Facebook"], ["ig", "Instagram"], ["li", "LinkedIn"]];

/* Instagram throttles hard on follow velocity. These are the thresholds the
   reference tool warns at — a caution and a stop, not an enforcement. */
const IG_CAUTION = 60, IG_LIMIT = 100;

const todayStr = () => new Date().toISOString().slice(0, 10);
const withinDays = (ds, n) => {
  if (!ds) return false;
  const d = new Date(`${ds}T00:00:00`);
  if (isNaN(d)) return false;
  return (Date.now() - d.getTime()) / 86400000 <= n;
};

export default function DashboardTab({ rows, plan, t }) {
  const targets = targetsFromPlan(plan);

  const s = useMemo(() => {
    const researched = rows.filter(isTouched).length;
    const found = k => rows.filter(r => r[`${k}_found`] === true).length;
    const now = new Date();
    const eom = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const day = now.getDate();
    const left = Math.max(1, eom - day + 1);
    const expected = Math.round(targets.research * (day / eom));
    const projected = Math.round((researched / Math.max(1, day)) * eom);
    return {
      researched, found, day, eom, left, expected, projected,
      remaining: Math.max(0, targets.research - researched),
      perDayNeeded: Math.ceil(Math.max(0, targets.research - researched) / left),
      anyFound: rows.filter(r => foundCount(r) > 0).length,
      followed: rows.filter(r => followedCount(r) > 0).length,
      backs: rows.filter(r => r.fb_back === true || r.ig_back === true || r.li_back === true).length,
      engaged: rows.filter(r => (r.engagements || 0) > 0).length,
    };
  }, [rows, targets.research]);

  const byState = useMemo(() => {
    const acc = {};
    for (const r of rows) {
      const k = r.state || "—";
      acc[k] ??= { n: 0, done: 0 };
      acc[k].n++;
      if (isTouched(r)) acc[k].done++;
    }
    return Object.entries(acc).sort((a, b) => b[1].n - a[1].n);
  }, [rows]);

  const byVerdict = useMemo(() => {
    const groupOf = computeGroups(rows);
    const acc = {};
    for (const r of rows) {
      const v = verify({ name: r.company_name, email: r.email, group: groupOf(r) }).verdict;
      acc[v] = (acc[v] || 0) + 1;
    }
    return acc;
  }, [rows]);

  // Skipped rows are not work waiting to be done — they are work already dismissed.
  const untouched = useMemo(() =>
    rows.filter(r => r.stage === "research" && !isTouched(r) && !isSkipped(r))
      .sort((a, b) => (b.priority_score || b.total_permits) - (a.priority_score || a.total_permits))
      .slice(0, 10), [rows]);

  const funnel = [
    ["Loaded", rows.length], ["Researched", s.researched], ["At least one profile", s.anyFound],
    ["Followed", s.followed], ["Followed back", s.backs], ["Engaged", s.engaged],
  ];

  const ahead = s.researched >= s.expected;
  const igToday = rows.filter(r => r.ig_followed === todayStr()).length;

  return (
    <div style={{ flex: 1, overflowY: "auto", minHeight: 0, padding: "22px 24px", display: "flex", flexDirection: "column", gap: 16 }}>

      {/* pacing */}
      <Card t={t} title="This month">
        <div style={{ display: "flex", gap: 30, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 34, fontWeight: 700, color: t.ink, fontFamily: "'JetBrains Mono',monospace", lineHeight: 1 }}>
              {fmtN(s.researched)}<span style={{ fontSize: 17, color: t.inkFaint }}> / {fmtN(targets.research)}</span>
            </div>
            <div style={{ fontSize: 11.5, color: t.inkFaint, marginTop: 4 }}>researched · day {s.day} of {s.eom}</div>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: ahead ? t.good : t.warn }}>
              {ahead ? "Ahead of pace" : "Behind pace"} by {fmtN(Math.abs(s.researched - s.expected))}
            </div>
            <div style={{ fontSize: 11.5, color: t.inkFaint, marginTop: 4 }}>
              expected {fmtN(s.expected)} by now · projecting {fmtN(s.projected)} by month end
            </div>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: t.ink }}>{fmtN(s.perDayNeeded)} a day</div>
            <div style={{ fontSize: 11.5, color: t.inkFaint, marginTop: 4 }}>
              to close the remaining {fmtN(s.remaining)} in {s.left} day{s.left === 1 ? "" : "s"}
            </div>
          </div>
        </div>
        <Meter t={t} pct={pctOf(s.researched, targets.research)} color={ahead ? t.good : t.warn} height={9} />
        <div style={{ display: "flex", gap: 20, marginTop: 14, flexWrap: "wrap" }}>
          {PLATFORMS.map(([k, name]) => (
            <div key={k} style={{ minWidth: 150 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, marginBottom: 4 }}>
                <span style={{ color: t.inkFaint }}>{name}</span>
                <span style={{ color: t.ink, fontFamily: "'JetBrains Mono',monospace" }}>
                  {fmtN(s.found(k))} / {fmtN(targets[k])}
                </span>
              </div>
              <Meter t={t} pct={pctOf(s.found(k), targets[k])} />
            </div>
          ))}
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(340px,1fr))", gap: 16 }}>

        {/* funnel */}
        <Card t={t} title="Funnel">
          {funnel.map(([label, n], i) => {
            const prev = i ? funnel[i - 1][1] : 0;
            return (
              <div key={label} style={{ marginBottom: 11 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                  <span style={{ color: t.inkMuted }}>{label}</span>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", color: t.ink }}>
                    {fmtN(n)}
                    {i > 0 && prev > 0 && (
                      <span style={{ color: t.inkFaint, marginLeft: 7 }}>{Math.round((n / prev) * 100)}%</span>
                    )}
                  </span>
                </div>
                <Meter t={t} pct={pctOf(n, rows.length || 1)} />
              </div>
            );
          })}
        </Card>

        {/* platforms */}
        <Card t={t} title="By platform">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th(t)}>Platform</th>
                <th style={{ ...th(t), textAlign: "right" }}>Found</th>
                <th style={{ ...th(t), textAlign: "right" }}>Absent</th>
                <th style={{ ...th(t), textAlign: "right" }}>Followed</th>
                <th style={{ ...th(t), textAlign: "right" }}>Back</th>
              </tr>
            </thead>
            <tbody>
              {PLATFORMS.map(([k, name]) => (
                <tr key={k}>
                  <td style={td(t)}>{name}</td>
                  <td style={{ ...td(t), textAlign: "right", color: t.good, fontFamily: "'JetBrains Mono',monospace" }}>
                    {fmtN(rows.filter(r => r[`${k}_found`] === true).length)}
                  </td>
                  <td style={{ ...td(t), textAlign: "right", color: t.inkFaint, fontFamily: "'JetBrains Mono',monospace" }}>
                    {fmtN(rows.filter(r => r[`${k}_found`] === false).length)}
                  </td>
                  <td style={{ ...td(t), textAlign: "right", fontFamily: "'JetBrains Mono',monospace" }}>
                    {fmtN(rows.filter(r => r[`${k}_followed`]).length)}
                  </td>
                  <td style={{ ...td(t), textAlign: "right", color: t.accent, fontFamily: "'JetBrains Mono',monospace" }}>
                    {fmtN(rows.filter(r => r[`${k}_back`] === true).length)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        {/* verticals */}
        <Card t={t} title="By vertical">
          {plan.map(p => {
            const inV = rows.filter(r => r.vertical === p.vertical);
            const done = inV.filter(isTouched).length;
            return (
              <div key={p.vertical} style={{ marginBottom: 11 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                  <span style={{ color: t.inkMuted }}>{SHORT_VERT(p.vertical)}</span>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", color: t.ink }}>
                    {fmtN(done)} / {fmtN(p.research_per_month)}
                  </span>
                </div>
                <Meter t={t} pct={pctOf(done, p.research_per_month)} color={vertColor(p.vertical, t)} />
              </div>
            );
          })}
        </Card>

        {/* states */}
        <Card t={t} title="By state">
          {byState.map(([st, o]) => (
            <div key={st} style={{ marginBottom: 11 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: t.inkMuted }}>{st}</span>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", color: t.ink }}>
                  {fmtN(o.done)} researched of {fmtN(o.n)}
                </span>
              </div>
              <Meter t={t} pct={pctOf(o.done, o.n)} />
            </div>
          ))}
          {!byState.length && <div style={{ fontSize: 12.5, color: t.inkFaint }}>Nothing loaded yet.</div>}
        </Card>

        {/* record quality */}
        <Card t={t} title="Record quality">
          {Object.entries(VERDICT_LABEL).map(([k, label]) => (
            <div key={k} style={{ marginBottom: 11 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: t.inkMuted }}>{label}</span>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", color: t.ink }}>{fmtN(byVerdict[k] || 0)}</span>
              </div>
              <Meter t={t} pct={pctOf(byVerdict[k] || 0, rows.length || 1)} color={verdictColor(k, t)} />
            </div>
          ))}
          {(byVerdict.employer || 0) > 0 && (
            <div style={{ fontSize: 11.5, color: t.inkFaint, marginTop: 8 }}>
              {fmtN(byVerdict.employer)} records are staff on a shared employer domain — search the employer, not the person.
            </div>
          )}
        </Card>

        {/* recent activity */}
        <Card t={t} title="Recent activity">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th(t)}>Platform</th>
                <th style={{ ...th(t), textAlign: "right" }}>Followed today</th>
                <th style={{ ...th(t), textAlign: "right" }}>Last 7 days</th>
              </tr>
            </thead>
            <tbody>
              {PLATFORMS.map(([k, name]) => (
                <tr key={k}>
                  <td style={td(t)}>{name}</td>
                  <td style={{ ...td(t), textAlign: "right", fontFamily: "'JetBrains Mono',monospace" }}>
                    {fmtN(rows.filter(r => r[`${k}_followed`] === todayStr()).length)}
                  </td>
                  <td style={{ ...td(t), textAlign: "right", color: t.inkMuted, fontFamily: "'JetBrains Mono',monospace" }}>
                    {fmtN(rows.filter(r => withinDays(r[`${k}_followed`], 7)).length)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {igToday >= IG_CAUTION && (
            <div style={{ marginTop: 10, padding: 10, borderRadius: 8, fontSize: 12,
              color: igToday >= IG_LIMIT ? t.bad : t.warn,
              background: igToday >= IG_LIMIT ? t.badSoft : t.warnSoft,
              border: `1px solid ${igToday >= IG_LIMIT ? t.bad : t.warn}44` }}>
              <b>{igToday} Instagram follows recorded today.</b>{" "}
              {igToday >= IG_LIMIT
                ? "Past 100 in a day Instagram starts restricting the account. Stop for today."
                : "Instagram gets touchy past 60 in a day. Ease off."}
            </div>
          )}
        </Card>
      </div>

      {/* next best */}
      <Card t={t} title="Highest value still untouched">
        {!untouched.length ? (
          <div style={{ fontSize: 12.5, color: t.inkFaint }}>Nothing waiting in Research.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={th(t)}>Company</th>
                  <th style={th(t)}>Vertical</th>
                  <th style={{ ...th(t), textAlign: "right" }}>Permits</th>
                  <th style={{ ...th(t), textAlign: "right" }}>Score</th>
                  <th style={th(t)}>Where</th>
                </tr>
              </thead>
              <tbody>
                {untouched.map(r => (
                  <tr key={r.id}>
                    <td style={td(t)}>
                      <div style={{ fontWeight: 600 }}>{r.company_name}</div>
                      <div style={{ fontSize: 11, color: t.inkFaint }}>{r.email || "—"}</div>
                    </td>
                    <td style={td(t)}><Badge t={t} color={vertColor(r.vertical, t)}>{SHORT_VERT(r.vertical)}</Badge></td>
                    <td style={{ ...td(t), textAlign: "right", fontFamily: "'JetBrains Mono',monospace" }}>{fmtN(r.total_permits)}</td>
                    <td style={{ ...td(t), textAlign: "right", fontFamily: "'JetBrains Mono',monospace", color: t.inkMuted }}>{fmtN(Math.round(r.priority_score))}</td>
                    <td style={{ ...td(t), fontSize: 11.5, color: t.inkMuted }}>{r.state} · {r.primary_jurisdiction}</td>
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
