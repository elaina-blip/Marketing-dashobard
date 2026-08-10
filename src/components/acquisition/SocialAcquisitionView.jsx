"use client";
/**
 * SocialAcquisitionView — APT-SOCIAL-WORKBENCH-001, Phase 2.
 *
 * The section shell: loads the queue, the plan and the snapshots once, owns the
 * write path, and hands each tab the slice it needs. Alliance Permitting only —
 * the nav entry is hidden for the other companies.
 *
 * Writes are optimistic. A mark has to feel instant when you are working down a
 * list of five hundred, so local state moves first and the row is put back the
 * way it was if the database refuses.
 *
 * The reference HTML is still served at /tools/social-workbench.html and linked
 * from the header, so anyone mid-session can finish there.
 */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, ExternalLink } from "lucide-react";
import {
  loadCompanies, loadPlan, loadSnapshots, updateCompany, updateCompanies, savePlanRow,
} from "@/lib/acquisition/companies-api";
import { isTouched, followedCount } from "@/lib/acquisition/acquisition-logic";
import { downloadCSV } from "./export-csv";
import QueueTab from "./QueueTab";
import DocumentsTab from "./DocumentsTab";
import PlanTab from "./PlanTab";
import DashboardTab from "./DashboardTab";
import TrendsTab from "./TrendsTab";
import HelpTab from "./HelpTab";
import { Btn } from "./ui";

export const TOOL_SRC = "/tools/social-workbench.html";

const TABS = [
  { id: "research", label: "Research", group: 0 },
  { id: "follow", label: "Follow", group: 0 },
  { id: "archive", label: "Archive", group: 0 },
  { id: "dash", label: "Dashboard", group: 1 },
  { id: "trends", label: "Trends", group: 1 },
  { id: "rates", label: "Plan & rates", group: 1 },
  { id: "docs", label: "Documents", group: 2 },
  { id: "help", label: "How this works", group: 2 },
];

export default function SocialAcquisitionView({ me = "Someone", theme: t }) {
  const [tab, setTab] = useState("research");
  const [rows, setRows] = useState([]);
  const [plan, setPlan] = useState([]);
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    setError("");
    try {
      const [c, p, s] = await Promise.all([loadCompanies(), loadPlan(), loadSnapshots()]);
      setRows(c); setPlan(p); setSnapshots(s);
    } catch (e) {
      // Almost always "run 09_acquisition.sql" or an allow-list miss. Say so
      // rather than showing an empty queue that looks like lost data.
      setError(e.message || "Could not load the acquisition data.");
    }
  }, []);

  useEffect(() => { (async () => { await reload(); setLoading(false); })(); }, [reload]);

  /* ---------- writes ---------- */

  const patch = useCallback(async (id, p) => {
    const before = rows.find(r => r.id === id);
    setRows(rs => rs.map(r => (r.id === id ? { ...r, ...p } : r)));
    try {
      await updateCompany(id, p);
    } catch (e) {
      setRows(rs => rs.map(r => (r.id === id ? before : r)));
      setError(`Could not save that change: ${e.message}`);
    }
  }, [rows]);

  const bulk = useCallback(async (ids, p) => {
    const set = new Set(ids);
    const before = rows;
    setRows(rs => rs.map(r => (set.has(r.id) ? { ...r, ...p } : r)));
    try {
      await updateCompanies(ids, p);
    } catch (e) {
      setRows(before);
      setError(`Could not save those changes: ${e.message}`);
    }
  }, [rows]);

  const savePlan = useCallback(async (vertical, p) => {
    const before = plan;
    setPlan(ps => ps.map(x => (x.vertical === vertical ? { ...x, ...p } : x)));
    try {
      await savePlanRow(vertical, p, me);
    } catch (e) {
      setPlan(before);
      setError(`Could not save the plan: ${e.message}`);
    }
  }, [plan, me]);

  const counts = useMemo(() => ({
    research: rows.filter(r => r.stage === "research").length,
    follow: rows.filter(r => r.stage === "follow").length,
    archive: rows.filter(r => r.stage === "archive").length,
    researched: rows.filter(isTouched).length,
    followed: rows.filter(r => followedCount(r) > 0).length,
  }), [rows]);

  const stageTab = tab === "research" || tab === "follow" || tab === "archive";

  if (loading) {
    return (
      <div style={{ flex: 1, display: "grid", placeItems: "center", color: t.inkFaint, fontSize: 14 }}>
        Loading the acquisition queue…
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, background: t.bg }}>

      {/* header */}
      <div style={{ padding: "16px 24px 0", borderBottom: `1px solid ${t.line}`, background: t.bgCard, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 21, fontWeight: 500, letterSpacing: "-.02em", color: t.ink, fontFamily: "'Fraunces',serif" }}>
              Social acquisition workbench
            </h1>
            <div style={{ fontSize: 11.5, color: t.inkFaint, marginTop: 3 }}>
              Alliance Permitting · {counts.researched.toLocaleString()} researched · {counts.followed.toLocaleString()} followed ·
              working as <b style={{ color: t.inkMuted }}>{me}</b>
            </div>
          </div>
          <span style={{ flex: 1 }} />
          <Btn t={t} onClick={reload} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <RefreshCw size={13} /> Refresh
          </Btn>
          <a href={TOOL_SRC} target="_blank" rel="noopener noreferrer"
            style={{ display: "flex", alignItems: "center", gap: 6, color: t.inkFaint, textDecoration: "none", fontSize: 11.5 }}>
            Original HTML tool <ExternalLink size={12} />
          </a>
        </div>

        <div style={{ display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap" }}>
          {TABS.map((x, i) => {
            const on = tab === x.id;
            const gap = i > 0 && TABS[i - 1].group !== x.group;
            return (
              <React.Fragment key={x.id}>
                {gap && <span style={{ width: 1, height: 20, background: t.lineStrong, margin: "0 8px" }} />}
                <button onClick={() => setTab(x.id)}
                  style={{
                    background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 13,
                    fontWeight: on ? 600 : 450, color: on ? t.accentDeep : t.inkMuted, padding: "9px 11px",
                    borderBottom: `2px solid ${on ? t.accent : "transparent"}`, display: "flex", alignItems: "center", gap: 7,
                  }}>
                  {x.label}
                  {counts[x.id] != null && (
                    <span style={{ background: on ? t.accentSoft : t.bgSunk, color: on ? t.accentDeep : t.inkFaint,
                      padding: "1px 7px", borderRadius: 20, fontSize: 10.5, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace" }}>
                      {counts[x.id].toLocaleString()}
                    </span>
                  )}
                </button>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {error && (
        <div style={{ padding: "9px 24px", background: t.badSoft, borderBottom: `1px solid ${t.bad}44`,
          color: t.bad, fontSize: 12.5, display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          <span style={{ flex: 1 }}>{error}</span>
          <Btn t={t} onClick={() => setError("")}>Dismiss</Btn>
        </div>
      )}

      {stageTab && (
        <QueueTab
          key={tab}
          stage={tab}
          rows={rows}
          me={me}
          t={t}
          onPatch={patch}
          onBulk={bulk}
          onExport={list => downloadCSV(list)}
        />
      )}
      {tab === "dash" && <DashboardTab rows={rows} plan={plan} t={t} />}
      {tab === "trends" && <TrendsTab rows={rows} snapshots={snapshots} t={t} />}
      {tab === "rates" && <PlanTab rows={rows} plan={plan} t={t} onSavePlan={savePlan} />}
      {tab === "docs" && (
        <DocumentsTab
          currentUser={me}
          t={t}
          onDataChanged={async () => { await reload(); setTab("research"); }}
          onSnapshot={async () => { setSnapshots(await loadSnapshots()); }}
        />
      )}
      {tab === "help" && <HelpTab t={t} />}
    </div>
  );
}
