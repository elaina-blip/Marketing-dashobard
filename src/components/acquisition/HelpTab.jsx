"use client";
/**
 * HelpTab.jsx — "How this works", rewritten for the dashboard.
 *
 * Step 13 of the brief. The diagram and the numbered steps carry over; the
 * sections that only made sense in a single HTML file are gone:
 *   · "Saving your work" — state is in Supabase, there is nothing to export to keep.
 *   · the unsaved / export-before-closing warnings — there is no unsaved state.
 *   · "Remove from file" — archived rows stay queryable.
 *   · "Month end" — reduced to the two steps that still apply (snapshot, apply rates).
 * Export survives as reporting, not as the save file.
 */
import React from "react";
import { Card } from "./ui";
import { RECHECK_MONTHS } from "@/lib/acquisition/acquisition-logic";

function Flow({ t }) {
  const box = (x, label, sub, color) => (
    <g key={label}>
      <rect x={x} y={16} width={180} height={62} rx={8} fill={`${color}1A`} stroke={color} strokeWidth="1" />
      <text x={x + 90} y={42} textAnchor="middle" fontSize="14" fontWeight="600" fill={t.ink}>{label}</text>
      <text x={x + 90} y={62} textAnchor="middle" fontSize="11" fill={t.inkMuted}>{sub}</text>
    </g>
  );
  return (
    <svg viewBox="0 0 900 190" style={{ width: "100%", height: "auto", maxWidth: 900 }} role="img"
      aria-label="Research to Follow to Archive, with measurement feeding the next month">
      <defs>
        <marker id="acqArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M2 1L8 5L2 9" fill="none" stroke={t.inkFaint} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </marker>
      </defs>
      {box(14, "1 · Research", "Mark green, red or blank", t.accent)}
      {box(248, "2 · Follow", "Stamp each follow by hand", t.good)}
      {box(482, "3 · Archive", "Done — stays queryable", t.inkFaint)}
      {box(716, "Measure", "Dashboard · Trends · Plan", t.indigo)}
      {[[194, 240], [428, 474], [662, 708]].map(([x1, x2]) => (
        <line key={x1} x1={x1} y1={47} x2={x2} y2={47} stroke={t.inkFaint} strokeWidth="1.4" markerEnd="url(#acqArrow)" />
      ))}
      <path d="M104 78 Q338 168 566 78" fill="none" stroke={t.inkFaint} strokeWidth="1" strokeDasharray="3 3" markerEnd="url(#acqArrow)" />
      <text x={336} y={158} textAnchor="middle" fontSize="11" fill={t.inkMuted}>no profiles anywhere → straight to Archive</text>
      <path d="M801 78 L801 138 L104 138 L104 84" fill="none" stroke={t.indigo} strokeWidth="1.2" strokeDasharray="4 4" markerEnd="url(#acqArrow)" />
      <text x={700} y={132} textAnchor="middle" fontSize="11" fill={t.indigo}>measured rates set next month&rsquo;s quotas</text>
    </svg>
  );
}

export default function HelpTab({ t }) {
  const h3 = { fontSize: 14, fontWeight: 600, color: t.ink, margin: "20px 0 8px", fontFamily: "'Fraunces',serif" };
  const p = { fontSize: 13, color: t.inkMuted, lineHeight: 1.65, margin: "0 0 10px", maxWidth: 760 };
  const ol = { fontSize: 13, color: t.inkMuted, lineHeight: 1.75, margin: "0 0 10px", paddingLeft: 20, maxWidth: 760 };
  const callout = bad => ({
    padding: 12, borderRadius: 9, fontSize: 12.5, lineHeight: 1.6, margin: "10px 0", maxWidth: 760,
    color: t.inkMuted, background: bad ? t.badSoft : t.accentWash,
    border: `1px solid ${bad ? t.bad : t.accent}44`,
  });
  const cell = { padding: "8px 10px", fontSize: 12.5, color: t.inkMuted, borderBottom: `1px solid ${t.line}`, verticalAlign: "top" };

  return (
    <div style={{ flex: 1, overflowY: "auto", minHeight: 0, padding: "22px 24px" }}>
      <Card t={t} title="How this works">
        <p style={p}>
          Three stages, left to right. A company moves Research → Follow → Archive, and nothing moves on its
          own — you push it. Everything you mark saves as you go and the rest of the team sees it on their next refresh.
        </p>

        <Flow t={t} />

        <h3 style={h3}>Step 1 · Research</h3>
        <ol style={ol}>
          <li>Work down the list — it is already sorted with the biggest permit pullers first.</li>
          <li>Press <b>All</b> on a row to open the website, Google and all three platform searches at once.</li>
          <li>Mark each platform: <b>green</b> if the profile exists, <b>red</b> if you checked and it is not there, blank if you did not look.</li>
          <li>Your first mark on a row stamps your name and today&rsquo;s date against it.</li>
          <li>Tick the rows you finished, then press <b>Send to Follow →</b>.</li>
        </ol>
        <div style={callout(false)}>
          <b>Red is data, not a shrug.</b> A hit rate is found ÷ checked. Marking red is what makes the Plan &amp; rates
          numbers real, and it stops you rechecking the same dead end next month.
        </div>
        <p style={p}>Rows with at least one green go to Follow. Rows red on all three skip straight to Archive.</p>

        <h3 style={h3}>Step 2 · Follow</h3>
        <ol style={ol}>
          <li>Open the profile from the row and follow it <b>by hand</b>.</li>
          <li>Click the platform button to stamp today&rsquo;s date, so the tool knows it is done.</li>
          <li>Days later, mark <b>Follow-back</b> when they follow you back, and count engagements as you comment.</li>
          <li>When a company is finished, select it and press <b>Archive →</b>.</li>
        </ol>
        <div style={callout(true)}>
          <b>Never automate following.</b> Facebook, Instagram and LinkedIn all prohibit it and it is the fastest way to
          lose the APS accounts. This tool records that a follow happened; a human performs it. Instagram is the strict
          one — spread follows across the day rather than batching, and stop if the Dashboard warns you.
        </div>

        <h3 style={h3}>Step 3 · Archive</h3>
        <p style={p}>
          Read-only, completed. Archived rows stay in the database and keep counting towards Trends — there is nothing
          to clear out, and nothing is lost when a new month starts.
        </p>

        <h3 style={h3}>Loading a new month</h3>
        <p style={p}>Uploads <b>merge</b>. They never wipe your work.</p>
        <ol style={ol}>
          <li>Upload the list on <b>Documents</b>, then press <b>Load</b>. A preview appears — nothing is written yet.</li>
          <li>It tells you how many are new, how many you already know, and how many are due a recheck.</li>
          <li>Press <b>Merge</b>. Permit counts and scores refresh; every mark, date and note survives.</li>
        </ol>
        <table style={{ borderCollapse: "collapse", maxWidth: 760, width: "100%", marginTop: 6 }}>
          <tbody>
            {[
              ["Known companies get fresh permit counts", "Volumes change monthly — stale scores corrupt the ranking"],
              ["Your marks are never touched", "You already did that work"],
              [`Companies marked absent over ${RECHECK_MONTHS} months ago return, badged recheck`, "Contractors start accounts"],
              ["Employees sharing one employer domain stay separate", "Otherwise every builder's field staff collapse into one row"],
              ["A company already filed under another trade keeps its vertical, plus a note", "It is one firm, not two records"],
            ].map(([what, why]) => (
              <tr key={what}>
                <td style={{ ...cell, color: t.ink, fontWeight: 500 }}>{what}</td>
                <td style={cell}>{why}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h3 style={h3}>Month end</h3>
        <ol style={ol}>
          <li>Open <b>Plan &amp; rates</b> and press <b>Apply measured</b> on any vertical with enough samples. That sets
            next month&rsquo;s targets from real data instead of estimates.</li>
          <li>Press <b>Close the month</b> on <b>Documents</b> to freeze this month&rsquo;s per-vertical totals into the
            snapshot Trends reads.</li>
        </ol>

        <h3 style={h3}>Why searches use the company, not the name on the record</h3>
        <p style={p}>
          Two thirds of high-permit records are licence qualifiers or field employees of a bigger builder. The name says{" "}
          <i>Christopher James Smith</i>; the email says <code style={{ color: t.accentDeep }}>lennar.com</code>. Searching
          the person finds a person. So when the domain names a different firm, the tool searches the firm and says so on
          the row — check it if it ever looks wrong.
        </p>

        <h3 style={h3}>The other tabs</h3>
        <table style={{ borderCollapse: "collapse", maxWidth: 760, width: "100%" }}>
          <tbody>
            {[
              ["Dashboard", "Where the month stands right now — pacing, funnel, platform warnings, and the highest-value companies nobody has touched"],
              ["Trends", "The same numbers over time, broken down by vertical, state or person"],
              ["Plan & rates", "Set the monthly quotas, and push measured rates into them"],
              ["Documents", "Every list the team has uploaded, and the merge preview that loads one in"],
            ].map(([tab, what]) => (
              <tr key={tab}>
                <td style={{ ...cell, color: t.ink, fontWeight: 600, whiteSpace: "nowrap" }}>{tab}</td>
                <td style={cell}>{what}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
