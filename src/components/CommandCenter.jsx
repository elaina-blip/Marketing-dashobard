"use client";
import React, { useState, useMemo, useEffect } from "react";
import {
  Search, Megaphone, LayoutGrid, Plus, X, Check, Clock,
  AlertTriangle, Circle, Star, Users, Calendar, MessageSquare,
  ChevronDown, Building2, Filter, CalendarDays, ChevronLeft, ChevronRight,
  Paperclip, Link2, FileText, Image as ImageIcon, Film, Download, Trash2
} from "lucide-react";
import {
  loadTasks, updateTask as dbUpdate, setAssignee as dbSetAssignee,
  addNote as dbAddNote, addLink as dbAddLink, uploadFile as dbUploadFile,
  fileUrl as dbFileUrl, removeAttachment as dbRemoveAttachment,
  getTeam, currentEmail, signOut as dbSignOut,
} from "@/lib/data";

/* ────────────────────────────────────────────────────────────────
   Marketing Command Center — prototype
   One login · 3 companies · SEO + Paid/Social areas
   In-memory state now; swaps to Supabase (tasks / task_assignees /
   notes / users / companies) with no UI change.
   ──────────────────────────────────────────────────────────────── */

const COMPANIES = [
  { id: "aps", name: "Alliance Permitting Service", short: "APS", site: "alliancepermitting.com", color: "#F47B27" },
  { id: "ads", name: "Alliance Data Solutions", short: "ADS", site: "alliancedatasolutions.ai", color: "#3FA7D6" },
  { id: "tgr", name: "TigerLeads AI", short: "TGR", site: "tigerleads.ai", color: "#E4B100" },
];

let TEAM = ["Marshall", "Elaina", "Weston", "Dena"];

const STATUSES = {
  not_started: { label: "Not Started", color: "#8A94A6", icon: Circle },
  in_progress: { label: "In Progress", color: "#3FA7D6", icon: Clock },
  blocked:     { label: "Blocked", color: "#E0564B", icon: AlertTriangle },
  done:        { label: "Done", color: "#4CAF7D", icon: Check },
};
const STATUS_ORDER = ["not_started", "in_progress", "blocked", "done"];
const PRIORITIES = { high: "#E0564B", medium: "#F0A23C", low: "#8A94A6" };

/* SEO master — 47 tasks, 10 phases. Seed for every company. */
const SEO_MASTER = [
  ["Phase 1 — Foundations & Access", [
    ["Secure domain + business email on the domain", "high", "one-time"],
    ["Create the central Google account that owns all assets", "high", "one-time"],
    ["Document all logins in a shared password manager", "high", "one-time"],
    ["Confirm site is on HTTPS with valid SSL", "high", "one-time"],
  ]],
  ["Phase 2 — Measurement & Verification", [
    ["Set up & verify Google Search Console", "high", "one-time"],
    ["Install GA4 and confirm tracking", "high", "one-time"],
    ["Configure GA4 conversion events", "high", "one-time"],
    ["Submit XML sitemap in Search Console", "high", "one-time"],
    ["Audit robots.txt for accidental blocks", "high", "one-time"],
    ["Decide AI-crawler policy (GPTBot, PerplexityBot)", "medium", "one-time"],
    ["Connect GA4 + GSC; install rank/audit tool", "medium", "one-time"],
  ]],
  ["Phase 3 — Keyword & Market Research", [
    ["Build seed keyword list", "high", "one-time"],
    ["Map search intent to each keyword", "high", "one-time"],
    ["Run competitor gap analysis", "medium", "one-time"],
    ["Group keywords into topic clusters", "high", "one-time"],
    ["Refresh keyword research & rankings", "medium", "quarterly"],
  ]],
  ["Phase 4 — Technical SEO", [
    ["Confirm crawl/render/index of key pages", "high", "one-time"],
    ["Pass Core Web Vitals (LCP, INP, CLS)", "high", "monthly"],
    ["Ensure fully responsive mobile experience", "high", "one-time"],
    ["Set canonicals; fix duplicate content", "medium", "one-time"],
    ["Logical URL structure + internal linking", "medium", "one-time"],
    ["Add structured data / schema", "high", "one-time"],
    ["Fix broken links and 4xx/5xx; set 301s", "medium", "monthly"],
    ["Run full-site crawl audit", "medium", "quarterly"],
  ]],
  ["Phase 5 — On-Page SEO", [
    ["Unique title tags + meta descriptions", "high", "one-time"],
    ["One H1 + logical heading hierarchy", "medium", "one-time"],
    ["One primary keyword per page; no cannibalization", "medium", "one-time"],
    ["Optimize images (alt, compress, modern formats)", "medium", "one-time"],
    ["Add concise top-of-page answers (AEO-ready)", "high", "one-time"],
  ]],
  ["Phase 6 — Content & E-E-A-T", [
    ["Publish pillar + cluster content", "high", "monthly"],
    ["Add author bios, credentials, experience", "high", "one-time"],
    ["Show trust signals: contact, sourcing, reviews", "high", "one-time"],
    ["Consolidate / improve thin pages", "medium", "quarterly"],
    ["Refresh existing top content", "medium", "monthly"],
  ]],
  ["Phase 7 — Local SEO", [
    ["Create / complete Google Business Profile", "high", "one-time"],
    ["Make NAP identical everywhere", "high", "one-time"],
    ["Location/service-area page per location", "medium", "one-time"],
    ["Build citations in directories", "medium", "one-time"],
    ["Post GBP updates; request & reply to reviews", "medium", "weekly"],
  ]],
  ["Phase 8 — Off-Page & Authority", [
    ["Set up brand profiles; earn mentions", "medium", "monthly"],
    ["Run targeted link building", "medium", "monthly"],
    ["Monitor backlinks; disavow toxic only", "low", "quarterly"],
  ]],
  ["Phase 9 — AI Search Readiness (AEO/GEO)", [
    ["Confirm AI crawlers can access the site", "high", "one-time"],
    ["Format content for AI extraction", "high", "monthly"],
    ["Strengthen entity/topic coverage", "medium", "quarterly"],
    ["Track brand citations in AI results", "low", "monthly"],
  ]],
  ["Phase 10 — Measurement & Reporting", [
    ["Build reporting dashboard", "high", "one-time"],
    ["Review Search Console performance", "medium", "weekly"],
    ["Monthly performance review vs goals", "medium", "monthly"],
    ["Quarterly full audit + strategy reset", "medium", "quarterly"],
  ]],
];

const PAID_MASTER = [
  ["Phase 1 — Paid Foundations & Account Setup", [
    ["Create Google Ads account at ads.google.com with the business email", "high", "one-time"],
    ["Enter legal business name, site URL, billing, and set timezone to target market", "high", "one-time"],
    ["Define the primary objective (leads / calls / sales) — drives campaign type & bidding", "high", "one-time"],
    ["Link Google Ads to GA4, Search Console, and Google Business Profile", "high", "one-time"],
    ["Review and disable unwanted auto-apply recommendation settings", "medium", "one-time"],
  ]],
  ["Phase 2 — Conversion Tracking (do BEFORE any spend)", [
    ["Set up Google Tag Manager for flexible tag deployment", "high", "one-time"],
    ["Create conversion actions for real outcomes (form submit, call, purchase)", "high", "one-time"],
    ["Place the conversion tag on thank-you / confirmation pages and verify it fires", "high", "one-time"],
    ["Mark only true conversions as primary; set page views/time-on-site as secondary", "high", "one-time"],
    ["Add server-side / enhanced conversions for post-cookie data accuracy", "high", "one-time"],
    ["Confirm GA4 imports aren't double-counting with native Google Ads tags", "high", "one-time"],
  ]],
  ["Phase 3 — Campaign Structure & Build", [
    ["Set account hierarchy: Account → Campaign → Ad Group → Keywords + Ads", "high", "one-time"],
    ["Separate Brand, Non-Brand Search, and PMax into their own campaigns/budgets", "high", "one-time"],
    ["Adopt a consistent naming convention (market | type | theme)", "medium", "one-time"],
    ["Build tight ad groups (5–20 closely related keywords, one theme each)", "high", "one-time"],
    ["Start new keywords on Phrase & Exact match; reserve Broad for proven performers", "high", "one-time"],
    ["Add 20+ negative keywords before launch; build shared negative lists", "high", "one-time"],
    ["Write 2–3 Responsive Search Ads per ad group", "high", "one-time"],
    ["Add all relevant assets/extensions (sitelinks, callouts, snippets, call, location)", "medium", "one-time"],
    ["Uncheck Display Network expansion on Search campaigns", "medium", "one-time"],
  ]],
  ["Phase 4 — Launch & Budget", [
    ["Set location targeting to 'Presence' only (not presence-or-interest)", "high", "one-time"],
    ["Set daily budget high enough to exit the learning phase and get real data", "high", "one-time"],
    ["Start with Maximize Clicks/Conversions; move to Smart Bidding after 50+ conv/mo", "high", "one-time"],
    ["Run pre-launch final check (tracking live, locations, budget, ads approved)", "high", "one-time"],
    ["Enable campaign and monitor closely for the first 48–72 hours", "high", "one-time"],
  ]],
  ["Phase 5 — Paid Optimization (ongoing)", [
    ["Review Search Terms Report after first ~100 clicks; mine new negatives", "high", "weekly"],
    ["Hold structural changes for 4–6 weeks so Smart Bidding can learn", "medium", "one-time"],
    ["Weekly budget review: spend pace, CPA trend, ROAS trajectory (trends not points)", "high", "weekly"],
    ["Pause campaigns that spend 3–5× target CPA with zero conversions; audit fundamentals", "high", "monthly"],
    ["Test new ad variations; trim underperforming keywords; reallocate to winners", "medium", "monthly"],
    ["Run a full Google Ads audit (tracking, structure, bidding, attribution)", "medium", "quarterly"],
  ]],
  ["Phase 6 — Social Foundations & Account Setup", [
    ["Pick platforms by where the audience actually is (depth over breadth)", "high", "one-time"],
    ["Create/claim business accounts: Facebook, Instagram, TikTok, LinkedIn", "high", "one-time"],
    ["Apply consistent logo, colors, and profile/cover images at correct 2026 sizes", "high", "one-time"],
    ["Write keyword-clear bios with a call to action and link on every profile", "high", "one-time"],
    ["Set up Facebook/Instagram Shop & catalog (if product-based)", "medium", "one-time"],
    ["Connect Meta Business Suite and link Instagram to the Facebook page", "medium", "one-time"],
  ]],
  ["Phase 7 — Social Strategy", [
    ["Write a one-sentence brand positioning statement to guide every post", "high", "one-time"],
    ["Create audience personas (roles, interests, challenges, content they engage)", "high", "one-time"],
    ["Research 10–15 competitors per platform; note formats, cadence, gaps", "medium", "one-time"],
    ["Define 3–5 content pillars every post must map to", "high", "one-time"],
    ["Set measurable 90-day goals (followers, engagement %, clicks, signups)", "medium", "one-time"],
  ]],
  ["Phase 8 — Content Creation & Calendar", [
    ["Build a content calendar with themes, campaigns, and key dates", "high", "one-time"],
    ["Bank 15–20 posts before launch; schedule the first full week", "high", "one-time"],
    ["Design 10+ reusable templates for recurring content types", "medium", "one-time"],
    ["Shoot 5–10 short-form videos (Reels/TikToks/Shorts, 15–90s)", "high", "monthly"],
    ["Repurpose each core asset across formats (blog → carousel → Reel → Stories)", "medium", "weekly"],
  ]],
  ["Phase 9 — Engagement & Community", [
    ["Post consistently (most brands 3–5×/week per platform)", "high", "weekly"],
    ["Reply to comments and DMs; engage in relevant groups/communities", "high", "weekly"],
    ["Track trending audio/formats weekly and adapt before they fade", "medium", "weekly"],
    ["Set up Instagram Broadcast Channel for announcements (if relevant)", "low", "one-time"],
  ]],
  ["Phase 10 — Paid Social Campaigns", [
    ["Install Meta Pixel / TikTok Pixel / LinkedIn Insight Tag and verify events", "high", "one-time"],
    ["Build first-party custom audiences and lookalikes", "high", "one-time"],
    ["Launch a test campaign per platform with a clear objective and small budget", "medium", "one-time"],
    ["A/B test creatives and audiences; scale winners, cut losers", "medium", "monthly"],
  ]],
  ["Phase 11 — Analytics & Reporting", [
    ["Build a combined dashboard: paid spend/CPA/ROAS + social reach/engagement/clicks", "high", "one-time"],
    ["Review platform analytics weekly; spot early trends before they snowball", "medium", "weekly"],
    ["Monthly performance review vs the 90-day goals; adjust the plan", "medium", "monthly"],
    ["Quarterly audit of profiles, ad accounts, and strategy; pivot what's flat", "medium", "quarterly"],
  ]],
];

const SEO_TIMELINE = [
  { phase: "Phase 1 — Foundations & Access", start: 1, len: 2, kind: "one-time" },
  { phase: "Phase 2 — Measurement & Verification", start: 1, len: 2, kind: "one-time", milestone: 2 },
  { phase: "Phase 3 — Keyword & Market Research", start: 2, len: 2, kind: "one-time" },
  { phase: "Phase 4 — Technical SEO", start: 3, len: 3, kind: "one-time" },
  { phase: "Phase 5 — On-Page SEO", start: 4, len: 2, kind: "one-time" },
  { phase: "Phase 6 — Content & E-E-A-T", start: 5, len: 3, kind: "recurring", milestone: 6 },
  { phase: "Phase 7 — Local SEO", start: 6, len: 2, kind: "recurring" },
  { phase: "Phase 8 — Off-Page & Authority", start: 7, len: 6, kind: "recurring" },
  { phase: "Phase 9 — AI Search Readiness (AEO/GEO)", start: 8, len: 5, kind: "recurring" },
  { phase: "Phase 10 — Measurement & Reporting", start: 9, len: 4, kind: "recurring" },
];

function fmtDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function SetupScreen({ onDone, me }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const run = async () => {
    setBusy(true); setErr("");
    try {
      const res = await fetch("/api/seed", { method: "POST" });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Seed failed");
      await onDone();
    } catch (e) { setErr(e?.message || String(e)); setBusy(false); }
  };
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#101725",
      fontFamily: "ui-sans-serif, system-ui, sans-serif", padding: 20 }}>
      <div style={{ width: 460, maxWidth: "92vw", background: "#fff", borderRadius: 16, padding: 34,
        boxShadow: "0 20px 60px rgba(0,0,0,.35)" }}>
        <div style={{ width: 46, height: 46, borderRadius: 13, background: "linear-gradient(135deg,#F47B27,#E0564B)",
          display: "grid", placeItems: "center", fontWeight: 800, fontSize: 22, color: "#fff", marginBottom: 18 }}>M</div>
        <h1 style={{ fontSize: 21, fontWeight: 700, margin: "0 0 8px", color: "#1d2433" }}>One-time setup</h1>
        <p style={{ fontSize: 14, color: "#6b7587", lineHeight: 1.55, margin: "0 0 22px" }}>
          Your database is empty. Click below to load the master checklists for all three companies —
          the SEO tasks, the Paid + Social tasks, and the first weeks of recurring Mon/Wed/Fri posts.
          This runs once and is safe to click again later (it won't duplicate).
        </p>
        <button onClick={run} disabled={busy} style={{ width: "100%", padding: "13px", background: "#F47B27",
          color: "#fff", border: "none", borderRadius: 11, fontSize: 15, fontWeight: 700,
          cursor: busy ? "default" : "pointer", opacity: busy ? .7 : 1 }}>
          {busy ? "Loading master tasks…" : "Load master tasks"}
        </button>
        {err && <div style={{ marginTop: 14, color: "#E0564B", fontSize: 13 }}>{err}</div>}
        <div style={{ marginTop: 18, fontSize: 12, color: "#9aa3b2" }}>Signed in as {me}</div>
      </div>
    </div>
  );
}

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState("Someone");
  const [companyId, setCompanyId] = useState("aps"); // or "all"
  const mapRow = (r) => ({
    ...r, companyId: r.company_id,
    deadline: r.deadline || "",
    notes: (r.notes || []).map(n => ({ id: n.id, who: n.author, text: n.body, when: new Date(n.created_at).toLocaleDateString() })),
    attachments: (r.attachments || []).map(a => ({ ...a, type: a.kind })),
  });
  const reload = React.useCallback(async () => {
    const rows = await loadTasks();
    setTasks(rows.map(mapRow));
  }, []);
  useEffect(() => {
    (async () => {
      try {
        const [rows, team, email] = await Promise.all([loadTasks(), getTeam(), currentEmail()]);
        if (team && team.length) TEAM = team;
        setMe(email);
        setTasks(rows.map(mapRow));
      } finally { setLoading(false); }
    })();
  }, []);
  const [track, setTrack] = useState("seo");
  const [view, setView] = useState("board"); // "board" | "calendar" | "timeline"
  const [calMonth, setCalMonth] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const [companyMenu, setCompanyMenu] = useState(false);
  const [openTask, setOpenTask] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedPhase, setSelectedPhase] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");

  const activeCompany = companyId === "all"
    ? { id: "all", name: "All Companies", short: "ALL", color: "#9b8cff" }
    : COMPANIES.find(c => c.id === companyId);

  const todayISO = useMemo(() => {
    const d = new Date(); d.setHours(0,0,0,0); return fmtDate(d);
  }, []);
  const weekAheadISO = useMemo(() => {
    const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() + 7); return fmtDate(d);
  }, []);

  const visible = useMemo(() => tasks.filter(t =>
    (companyId === "all" || t.companyId === companyId) &&
    t.track === track &&
    (statusFilter === "all" || t.status === statusFilter) &&
    // recurring posts only show the next 7 days on the board (full set lives in Calendar)
    (!t.recurring || (t.deadline >= todayISO && t.deadline <= weekAheadISO))
  ), [tasks, companyId, track, statusFilter, todayISO, weekAheadISO]);

  const grouped = useMemo(() => {
    const m = new Map();
    for (const t of visible) {
      if (!m.has(t.phase)) m.set(t.phase, []);
      m.get(t.phase).push(t);
    }
    const entries = [...m.entries()];
    // recurring posting phase floats to the top (most time-sensitive)
    entries.sort((a, b) => {
      const ar = a[0].startsWith("Recurring") ? 0 : 1;
      const br = b[0].startsWith("Recurring") ? 0 : 1;
      return ar - br;
    });
    return entries;
  }, [visible]);

  const scope = tasks.filter(t => (companyId === "all" || t.companyId === companyId) && t.track === track
    && (!t.recurring || (t.deadline >= todayISO && t.deadline <= weekAheadISO)));
  const counts = STATUS_ORDER.reduce((a, s) => (a[s] = scope.filter(t => t.status === s).length, a), {});
  const pct = scope.length ? Math.round((counts.done / scope.length) * 100) : 0;

  const update = (id, patch) => {
    setTasks(ts => ts.map(t => t.id === id ? { ...t, ...patch } : t));
    const dbPatch = {};
    for (const k of ["status","priority","deadline","title"]) if (k in patch) dbPatch[k] = patch[k];
    if (Object.keys(dbPatch).length) dbUpdate(id, dbPatch);
  };
  const detail = openTask ? tasks.find(t => t.id === openTask) : null;

  const selectedPhaseData = useMemo(() => {
    if (view !== "timeline" || !selectedPhase) return null;
    const meta = SEO_TIMELINE.find(p => p.phase === selectedPhase);
    if (!meta) return null;
    const phaseTasks = tasks.filter(t =>
      t.track === "seo" &&
      (companyId === "all" || t.companyId === companyId) &&
      t.phase === meta.phase
    );
    return { ...meta, tasks: phaseTasks };
  }, [tasks, companyId, selectedPhase, view]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center",
        fontFamily: "ui-sans-serif, system-ui, sans-serif", color: "#6b7587", background: "#eef1f6" }}>
        Loading your command center…
      </div>
    );
  }

  if (tasks.length === 0) {
    return <SetupScreen onDone={reload} me={me} />;
  }

  return (
    <div style={S.app}>
      <style>{CSS}</style>

      {/* Sidebar */}
      <aside style={S.sidebar}>
        <div style={S.brand}>
          <div style={S.brandMark}>M</div>
          <div>
            <div style={S.brandName}>Command Center</div>
            <div style={S.brandSub}>Marketing Ops</div>
          </div>
        </div>

        {/* Company switcher */}
        <div style={{ position: "relative", padding: "0 14px" }}>
          <button style={S.switcher} onClick={() => setCompanyMenu(v => !v)}>
            <span style={{ ...S.dot, background: activeCompany.color }} />
            <span style={S.switcherName}>{activeCompany.short}</span>
            <ChevronDown size={15} style={{ marginLeft: "auto", opacity: .6 }} />
          </button>
          {companyMenu && (
            <div style={S.menu}>
              {COMPANIES.map(c => (
                <button key={c.id} style={S.menuItem}
                  onClick={() => { setCompanyId(c.id); setCompanyMenu(false); }}>
                  <span style={{ ...S.dot, background: c.color }} />
                  <span style={{ textAlign: "left" }}>
                    <div style={{ fontWeight: 600 }}>{c.short}</div>
                    <div style={S.menuSite}>{c.name}</div>
                  </span>
                  {companyId === c.id && <Check size={14} style={{ marginLeft: "auto", color: "#4CAF7D" }} />}
                </button>
              ))}
              <button style={{ ...S.menuItem, borderTop: "1px solid #2b3344" }}
                onClick={() => { setCompanyId("all"); setCompanyMenu(false); }}>
                <LayoutGrid size={15} style={{ color: "#9b8cff" }} />
                <span style={{ fontWeight: 600 }}>All Companies</span>
                {companyId === "all" && <Check size={14} style={{ marginLeft: "auto", color: "#4CAF7D" }} />}
              </button>
            </div>
          )}
        </div>

        <nav style={S.nav}>
          <div style={S.navLabel}>AREAS</div>
          <NavItem icon={Search} label="SEO" active={track === "seo"} onClick={() => setTrack("seo")} />
          <NavItem
            icon={Megaphone}
            label="Paid + Social"
            active={track === "paid_social"}
            onClick={() => {
              setTrack("paid_social");
              setSelectedPhase(null);
              if (view === "timeline") setView("board");
            }}
          />
          <div style={{ ...S.navLabel, marginTop: 16 }}>VIEW</div>
          <NavItem icon={CalendarDays} label="Timeline" active={view === "timeline"} onClick={() => { setTrack("seo"); setView("timeline"); }} />
          <NavItem icon={LayoutGrid} label="Board" active={view === "board"} onClick={() => setView("board")} />
          <NavItem icon={CalendarDays} label="Calendar" active={view === "calendar"} onClick={() => setView("calendar")} />
        </nav>

        <div style={S.progressCard}>
          <div style={S.progressTop}>
            <span style={{ color: "#aeb6c4", fontSize: 12 }}>{track === "seo" ? "SEO" : "Paid + Social"} progress</span>
            <span style={{ fontWeight: 700 }}>{pct}%</span>
          </div>
          <div style={S.bar}><div style={{ ...S.barFill, width: `${pct}%` }} /></div>
          <div style={S.miniStats}>
            {STATUS_ORDER.map(s => (
              <span key={s} style={{ color: STATUSES[s].color }}>{counts[s]} {STATUSES[s].label.split(" ")[0]}</span>
            ))}
          </div>
        </div>

        <div style={S.sideFoot}>
          <div style={{ marginBottom: 8, color: "#aeb6c4" }}>{me}</div>
          <button onClick={dbSignOut} style={{ background: "none", border: "1px solid #2b3344",
            color: "#aeb6c4", borderRadius: 8, padding: "6px 12px", fontSize: 12, cursor: "pointer" }}>
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={S.main}>
        <header style={S.header}>
          <div>
            <div style={S.crumb}>
              <Building2 size={13} /> {activeCompany.name}
              {companyId !== "all" && activeCompany.site && <span style={S.site}>· {activeCompany.site}</span>}
            </div>
            <h1 style={S.h1}>
              {view === "timeline" ? "SEO Timeline" : view === "calendar" ? "Calendar" : (track === "seo" ? "SEO Setup & Management" : "Paid + Social")}
            </h1>
          </div>
          <div style={S.headerRight}>
            {view === "board" && (
              <div style={S.filterWrap}>
                <Filter size={14} style={{ opacity: .5 }} />
                <select style={S.select} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                  <option value="all">All statuses</option>
                  {STATUS_ORDER.map(s => <option key={s} value={s}>{STATUSES[s].label}</option>)}
                </select>
              </div>
            )}
            <button style={S.addBtn}><Plus size={15} /> Add task</button>
          </div>
        </header>

        {view === "timeline" ? (
          <TimelineView
            tasks={tasks}
            companyId={companyId}
            setCompanyId={(nextCompany) => setCompanyId(nextCompany)}
            onOpenTask={setOpenTask}
            selectedPhase={selectedPhaseData}
            onSelectPhase={(phase) => { setOpenTask(null); setSelectedPhase(phase); }}
            onClosePhase={() => setSelectedPhase(null)}
          />
        ) : view === "calendar" ? (
          <CalendarView tasks={tasks} companyId={companyId} calMonth={calMonth}
            setCalMonth={setCalMonth} selectedDay={selectedDay} onOpen={setOpenTask} onSelectDay={setSelectedDay} />
        ) : (
          <div style={S.board}>
            {grouped.length === 0 && <div style={S.empty}>No tasks match this filter.</div>}
            {grouped.map(([phase, items]) => (
              <section key={phase} style={S.phase}>
                <div style={S.phaseHead}>
                  <span style={S.phaseTitle}>
                    {phase}
                    {phase.startsWith("Recurring") &&
                      <span style={S.phaseHint}> · next 7 days — full schedule in Calendar</span>}
                  </span>
                  <span style={S.phaseCount}>{items.filter(t => t.status === "done").length}/{items.length}</span>
                </div>
                {items.map(t => (
                  <TaskRow key={t.id} t={t} showCompany={companyId === "all"}
                    onOpen={() => setOpenTask(t.id)} onCycle={() => {
                      const i = STATUS_ORDER.indexOf(t.status);
                      update(t.id, { status: STATUS_ORDER[(i + 1) % STATUS_ORDER.length] });
                    }}
                    onPriority={() => {
                      const order = ["high", "medium", "low"];
                      const i = order.indexOf(t.priority);
                      update(t.id, { priority: order[(i + 1) % 3] });
                    }} />
                ))}
              </section>
            ))}
          </div>
        )}
      </main>

      {detail && (
        <TaskDrawer t={detail} onClose={() => setOpenTask(null)} update={update}
          company={COMPANIES.find(c => c.id === detail.companyId)} me={me} onChanged={reload} />
      )}

      {selectedPhaseData && (
        <PhaseDrawer
          phase={selectedPhaseData}
          company={companyId === "all" ? { name: "All Companies", short: "ALL", color: "#9b8cff" } : COMPANIES.find(c => c.id === companyId)}
          onClose={() => setSelectedPhase(null)}
          onOpenTask={(id) => { setSelectedPhase(null); setOpenTask(id); }}
        />
      )}

      {selectedDay && (
        <DayPanel ds={selectedDay.ds}
          tasks={tasks.filter(t => t.deadline === selectedDay.ds && (companyId === "all" || t.companyId === companyId))}
          onClose={() => setSelectedDay(null)}
          onOpen={(id) => { setSelectedDay(null); setOpenTask(id); }} />
      )}
    </div>
  );
}

function NavItem({ icon: Icon, label, active, onClick }) {
  return (
    <button style={{ ...S.navItem, ...(active ? S.navItemActive : {}) }} onClick={onClick}>
      <Icon size={16} /> {label}
    </button>
  );
}

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DOW = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

function CalendarView({ tasks, companyId, calMonth, setCalMonth, selectedDay, onOpen, onSelectDay }) {
  const { y, m } = calMonth;

  // tasks with a deadline in scope (both areas show on calendar)
  const dated = useMemo(() => tasks.filter(t =>
    t.deadline && (companyId === "all" || t.companyId === companyId)
  ), [tasks, companyId]);

  const byDay = useMemo(() => {
    const map = {};
    for (const t of dated) {
      (map[t.deadline] ||= []).push(t);
    }
    return map;
  }, [dated]);

  const first = new Date(y, m, 1);
  const startDow = first.getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const todayStr = new Date().toISOString().slice(0, 10);

  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ d, ds, tasks: byDay[ds] || [] });
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const monthCount = dated.filter(t => t.deadline.startsWith(`${y}-${String(m + 1).padStart(2, "0")}`)).length;
  const prev = () => setCalMonth(m === 0 ? { y: y - 1, m: 11 } : { y, m: m - 1 });
  const next = () => setCalMonth(m === 11 ? { y: y + 1, m: 0 } : { y, m: m + 1 });
  const today = () => { const d = new Date(); setCalMonth({ y: d.getFullYear(), m: d.getMonth() }); };

  return (
    <div style={S.calWrap}>
      <div style={S.calBar}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button style={S.calNavBtn} onClick={prev}><ChevronLeft size={18} /></button>
          <h2 style={S.calMonthTitle}>{MONTHS[m]} {y}</h2>
          <button style={S.calNavBtn} onClick={next}><ChevronRight size={18} /></button>
          <button style={S.todayBtn} onClick={today}>Today</button>
        </div>
        <span style={S.calMonthCount}>{monthCount} task{monthCount !== 1 ? "s" : ""} due this month</span>
      </div>

      <div style={S.calScroll}>
        <div style={S.calGrid}>
          {DOW.map(d => <div key={d} style={S.calDow}>{d}</div>)}
          {cells.map((cell, i) => {
            if (!cell) return <div key={i} style={{ ...S.calCell, background: "#f7f9fc" }} />;
            const isToday = cell.ds === todayStr;
            const hasTasks = cell.tasks.length > 0;
            const isSelected = selectedDay?.ds === cell.ds;
            return (
              <div key={i}
                style={{
                  ...S.calCell,
                  ...(isToday ? S.calCellToday : {}),
                  ...(isSelected ? S.calCellSelected : {}),
                }}>
                <div
                  style={{
                    ...S.calCellTop,
                    ...(hasTasks ? S.calCellTopClickable : {}),
                    ...(isSelected ? S.calCellTopSelected : {}),
                  }}
                  className={hasTasks ? "calhead" : ""}
                  onClick={() => onSelectDay(cell)}
                  title="Click to expand this day">
                  <div style={{
                    ...S.calDayNum,
                    ...(isToday ? S.calDayNumToday : {}),
                    ...(isSelected ? S.calDayNumSelected : {}),
                  }}>{cell.d}</div>
                  {cell.tasks.length > 0 &&
                    <span style={{ ...S.calDayBadge, ...(isSelected ? S.calDayBadgeSelected : {}) }}>
                      {cell.tasks.length} task{cell.tasks.length !== 1 ? "s" : ""}
                    </span>}
                </div>
                <div style={{ ...S.calTasks, ...(isSelected ? S.calTasksSelected : {}) }}>
                  {cell.tasks.slice(0, 8).map(t => {
                    const co = COMPANIES.find(c => c.id === t.companyId);
                    const done = t.status === "done";
                    return (
                      <button key={t.id} style={{ ...S.calTask, borderLeftColor: co.color, ...(done ? S.calTaskDone : {}) }}
                        onClick={(e) => { e.stopPropagation(); onOpen(t.id); }} title={`${co.short} · ${t.title}`}>
                        <span style={{ ...S.calTaskDot, background: STATUSES[t.status].color }} />
                        <span style={S.calTaskText}>{t.title}</span>
                      </button>
                    );
                  })}
                  {cell.tasks.length > 8 &&
                    <button style={S.calMore} onClick={(e) => { e.stopPropagation(); onSelectDay(cell); }}>
                      +{cell.tasks.length - 8} more — view all
                    </button>}
                </div>
                {isSelected && (
                  <div style={S.calExpandedPanel}>
                    <div style={S.calExpandedLabel}>Selected day</div>
                    <div style={S.calExpandedHeading}>{cell.ds}</div>
                    <div style={S.calExpandedCopy}>
                      {cell.tasks.length} task{cell.tasks.length !== 1 ? "s" : ""} are due. Open the drawer on the right for the full list.
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div style={S.calLegend}>
        {COMPANIES.map(c => (
          <span key={c.id} style={S.legendItem}><span style={{ ...S.dot, background: c.color }} /> {c.short}</span>
        ))}
        <span style={{ marginLeft: "auto", color: "#9aa3b2", fontSize: 12 }}>Click a day to see all its tasks · click a task to open it</span>
      </div>
    </div>
  );
}

function TimelineView({ tasks, companyId, setCompanyId, onOpenTask, selectedPhase, onSelectPhase, onClosePhase }) {
  const activeCompany = companyId === "all"
    ? { id: "all", short: "ALL", name: "All Companies", site: "" }
    : COMPANIES.find(c => c.id === companyId);

  const seoTasks = useMemo(() => tasks.filter(t =>
    t.track === "seo" && (companyId === "all" || t.companyId === companyId)
  ), [tasks, companyId]);

  const rows = useMemo(() => SEO_TIMELINE.map(meta => {
    const phaseTasks = seoTasks.filter(t => t.phase === meta.phase);
    const doneCount = phaseTasks.filter(t => t.status === "done").length;
    return { ...meta, tasks: phaseTasks, doneCount };
  }), [seoTasks]);

  const totalTasks = seoTasks.length;
  const totalDone = seoTasks.filter(t => t.status === "done").length;
  const activeName = selectedPhase?.phase || null;

  return (
    <div style={S.timelineWrap}>
      <div style={S.timelineHero}>
        <div>
          <div style={S.timelineKicker}>
            <Building2 size={13} /> {activeCompany.name}{companyId !== "all" && activeCompany.site ? <span style={S.site}>· {activeCompany.site}</span> : null}
          </div>
          <h2 style={S.timelineTitle}>SEO Setup &amp; Management</h2>
        </div>
        <div style={S.timelineBadge}>12-week rollout</div>
      </div>

      <div style={S.timelineTabs}>
        {[{ id: "all", short: "ALL", name: "All Companies" }, ...COMPANIES].map(c => {
          const active = companyId === c.id;
          return (
            <button
              key={c.id}
              style={{
                ...S.timelineTab,
                ...(active ? { borderColor: c.color, background: c.color, color: "#fff" } : {}),
              }}
              onClick={() => setCompanyId(c.id)}
            >
              <span style={{ ...S.timelineDot, background: active ? "rgba(255,255,255,.9)" : c.color }} />
              {c.short}
            </button>
          );
        })}
      </div>

      <div style={S.timelineLegend}>
        <span style={S.timelineLegendItem}><span style={{ ...S.timelineSwatch, background: "#7F77DD" }} /> One-time setup</span>
        <span style={S.timelineLegendItem}><span style={{ ...S.timelineSwatch, background: "#1D9E75" }} /> Recurring / ongoing</span>
        <span style={S.timelineLegendItem}><i className="ti ti-flag-filled" style={{ color: "#D85A30", fontSize: 13 }} aria-hidden="true" /> Milestone</span>
        <span style={{ marginLeft: "auto", color: "#8a94a6" }}>Click a phase bar to see the task list.</span>
      </div>

      <div style={S.timelineScroll}>
        <table style={S.timelineTable}>
          <colgroup>
            <col style={{ width: 300 }} />
            <col style={{ width: 56 }} />
            <col style={{ width: 1 }} />
          </colgroup>
          <thead>
            <tr style={S.timelineHeadRow}>
              <th style={{ ...S.timelineHeadCell, textAlign: "left" }}>Phase</th>
              <th style={{ ...S.timelineHeadCell, textAlign: "center" }}>Tasks</th>
              <th style={S.timelineWeekHeadCell}>
                <div style={S.timelineWeeks}>
                  {Array.from({ length: 12 }, (_, i) => (
                    <span key={i} style={S.timelineWeekLabel}>W{i + 1}</span>
                  ))}
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((phase, index) => {
              const isOpen = activeName === phase.phase;
              const left = `${((phase.start - 1) / 12) * 100}%`;
              const width = `${(phase.len / 12) * 100}%`;
              return (
                <tr key={phase.phase} style={{ ...S.timelineRow, ...(isOpen ? S.timelineRowActive : {}) }}>
                  <td style={S.timelinePhaseCell}>
                    <button
                      style={S.timelinePhaseButton}
                      onClick={() => onSelectPhase(phase.phase)}
                    >
                      <span style={S.timelinePhaseTitle}>{phase.phase}</span>
                      <span style={S.timelinePhaseMeta}>{phase.kind === "recurring" ? "Recurring" : "One-time"}</span>
                    </button>
                  </td>
                  <td style={S.timelineTaskCountCell}>
                    <button style={S.timelineTaskCountButton} onClick={() => onSelectPhase(phase.phase)}>
                      {phase.doneCount}/{phase.tasks.length}
                    </button>
                  </td>
                  <td style={S.timelineTrackCell}>
                    <div style={S.timelineTrack}>
                      {Array.from({ length: 11 }, (_, i) => (
                        <span key={i} style={{ ...S.timelineTrackLine, left: `${((i + 1) / 12) * 100}%` }} />
                      ))}
                      <button
                        style={{ ...S.timelineBar, left, width, background: phase.kind === "recurring" ? "#1D9E75" : "#7F77DD", ...(isOpen ? S.timelineBarActive : {}) }}
                        onClick={() => onSelectPhase(phase.phase)}
                        title={`${phase.phase} · ${phase.tasks.length} tasks`}
                      >
                        <span style={S.timelineBarLabel}>{phase.phase}</span>
                      </button>
                      {phase.milestone && (
                        <span style={{ ...S.timelineMilestone, left: `${((phase.milestone - 1) / 12) * 100}%` }} title={`Milestone at W${phase.milestone}`}>
                          <i className="ti ti-flag-filled" aria-hidden="true" />
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={S.timelineFooter}>
        <span><i className="ti ti-list-check" style={{ verticalAlign: -2 }} aria-hidden="true" /> {totalTasks} tasks · {rows.length} phases</span>
        <span><i className="ti ti-circle-check" style={{ verticalAlign: -2, color: "#1D9E75" }} aria-hidden="true" /> {totalDone} completed</span>
        <span>Phases 6–10 keep rolling after launch.</span>
      </div>
    </div>
  );
}

function PhaseDrawer({ phase, company, onClose, onOpenTask }) {
  const sortedTasks = [...phase.tasks].sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.priority] - order[b.priority];
  });

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={{ ...S.drawer, width: 520 }} onClick={e => e.stopPropagation()}>
        <div style={S.drawerHead}>
          <span style={{ ...S.tag, background: company.color + "22", color: company.color }}>{company.short}</span>
          <button style={S.closeBtn} onClick={onClose}><X size={18} /></button>
        </div>

        <div style={S.phaseTag}>SEO timeline phase</div>
        <h2 style={S.drawerTitle}>{phase.phase}</h2>
        <div style={S.timelineDetailMeta}>
          <span>Weeks {phase.start}–{phase.start + phase.len - 1}</span>
          <span>{sortedTasks.length} tasks</span>
          <span>{phase.kind === "recurring" ? "Recurring" : "One-time"}</span>
        </div>

        <div style={S.timelineDetailTasks}>
          {sortedTasks.length === 0 && <div style={S.noNotes}>No tasks loaded for this phase yet.</div>}
          {sortedTasks.map(task => {
            const companyTag = COMPANIES.find(c => c.id === task.companyId) || company;
            const status = STATUSES[task.status];
            return (
              <button key={task.id} style={S.timelineDetailTask} onClick={() => onOpenTask(task.id)}>
                <div style={{ ...S.timelineStatusDot, background: status.color }} />
                <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                  <div style={S.timelineDetailTaskTitle}>{task.title}</div>
                  <div style={S.timelineDetailTaskMeta}>
                    <span style={{ ...S.tag, background: companyTag.color + "22", color: companyTag.color }}>{companyTag.short}</span>
                    <span style={{ ...S.cadence, background: "#eef1f6" }}>{status.label}</span>
                    {task.assignees.length > 0 && <span>{task.assignees.join(", ")}</span>}
                  </div>
                </div>
                <ChevronRight size={15} style={{ color: "#9aa3b2" }} />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function DayPanel({ ds, tasks, onClose, onOpen }) {
  const date = new Date(ds + "T00:00:00");
  const heading = date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const sorted = [...tasks].sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.priority] - order[b.priority];
  });
  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.drawer} onClick={e => e.stopPropagation()}>
        <div style={S.drawerHead}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#6b7587", fontSize: 13, fontWeight: 600 }}>
            <CalendarDays size={15} /> {sorted.length} task{sorted.length !== 1 ? "s" : ""} due
          </div>
          <button style={S.closeBtn} onClick={onClose}><X size={18} /></button>
        </div>
        <h2 style={{ ...S.drawerTitle, marginTop: 14 }}>{heading}</h2>

        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          {sorted.length === 0 && <div style={S.noNotes}>No tasks due this day.</div>}
          {sorted.map(t => {
            const co = COMPANIES.find(c => c.id === t.companyId);
            const St = STATUSES[t.status]; const Ico = St.icon;
            return (
              <button key={t.id} style={S.dayTask} className="row" onClick={() => onOpen(t.id)}>
                <Ico size={17} style={{ color: St.color, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                  <div style={{ ...S.rowTitle, whiteSpace: "normal" }}>{t.title}</div>
                  <div style={S.rowMeta}>
                    <span style={{ ...S.tag, background: co.color + "22", color: co.color }}>{co.short}</span>
                    <span style={{ ...S.tag, background: "#eef1f6", color: "#6b7587" }}>{t.track === "seo" ? "SEO" : "Paid+Social"}</span>
                    <span style={{ fontSize: 11.5, color: St.color, fontWeight: 600 }}>{St.label}</span>
                    {t.assignees.length > 0 && <span style={S.metaItem}><Users size={11} /> {t.assignees.join(", ")}</span>}
                    {t.attachments && t.attachments.length > 0 && <span style={S.metaItem}><Paperclip size={11} /> {t.attachments.length}</span>}
                    {t.notes.length > 0 && <span style={S.metaItem}><MessageSquare size={11} /> {t.notes.length}</span>}
                  </div>
                </div>
                <Star size={14} style={{ color: PRIORITIES[t.priority], fill: t.priority === "high" ? PRIORITIES.high : "none", flexShrink: 0 }} />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TaskRow({ t, showCompany, onOpen, onCycle, onPriority }) {
  const St = STATUSES[t.status]; const Ico = St.icon;
  const co = COMPANIES.find(c => c.id === t.companyId);
  return (
    <div style={S.row} className="row">
      <button style={S.statusBtn} onClick={onCycle} title="Click to advance status">
        <Ico size={17} style={{ color: St.color }} />
      </button>
      <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={onOpen}>
        <div style={{ ...S.rowTitle, ...(t.status === "done" ? S.done : {}) }}>{t.title}</div>
        <div style={S.rowMeta}>
          {showCompany && <span style={{ ...S.tag, background: co.color + "22", color: co.color }}>{co.short}</span>}
          <span style={S.cadence}>{t.cadence}</span>
          {t.deadline && <span style={S.metaItem}><Calendar size={11} /> {t.deadline}</span>}
          {t.assignees.length > 0 && <span style={S.metaItem}><Users size={11} /> {t.assignees.join(", ")}</span>}
          {t.attachments && t.attachments.length > 0 && <span style={S.metaItem}><Paperclip size={11} /> {t.attachments.length}</span>}
          {t.notes.length > 0 && <span style={S.metaItem}><MessageSquare size={11} /> {t.notes.length}</span>}
        </div>
      </div>
      <button style={S.prioBtn} onClick={onPriority} title="Click to change priority">
        <Star size={15} style={{ color: PRIORITIES[t.priority], fill: t.priority === "high" ? PRIORITIES.high : "none" }} />
      </button>
    </div>
  );
}

function TaskDrawer({ t, onClose, update, company, me, onChanged }) {
  const [note, setNote] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkLabel, setLinkLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const fileInputRef = React.useRef(null);
  const attachments = t.attachments || [];
  const who = me || "Someone";

  const toggleAssignee = async (name) => {
    const has = t.assignees.includes(name);
    update(t.id, { assignees: has ? t.assignees.filter(a => a !== name) : [...t.assignees, name] });
    await dbSetAssignee(t.id, name, !has);
  };
  const addNote = async () => {
    if (!note.trim()) return;
    const body = note.trim(); setNote("");
    update(t.id, { notes: [...t.notes, { who, text: body, when: "just now" }] });
    await dbAddNote(t.id, who, body);
    if (onChanged) onChanged();
  };
  const fmtSize = (b) => b < 1024 ? `${b} B` : b < 1048576 ? `${(b/1024).toFixed(0)} KB` : `${(b/1048576).toFixed(1)} MB`;
  const kindOf = (name, type) => {
    const n = (name || "").toLowerCase();
    if ((type||"").startsWith("image") || /\.(png|jpe?g|gif|webp|svg)$/.test(n)) return "image";
    if ((type||"").startsWith("video") || /\.(mp4|mov|webm|avi)$/.test(n)) return "video";
    return "file";
  };
  const onFiles = async (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    setBusy(true);
    try {
      for (const f of files) await dbUploadFile(t.id, f, who);
      if (onChanged) await onChanged();
    } catch (e) { alert("Upload failed: " + (e?.message || e)); }
    finally { setBusy(false); }
  };
  const addLink = async () => {
    if (!linkUrl.trim()) return;
    let url = linkUrl.trim();
    if (!/^https?:\/\//i.test(url)) url = "https://" + url;
    const label = linkLabel.trim() || url;
    setLinkUrl(""); setLinkLabel("");
    await dbAddLink(t.id, label, url, who);
    if (onChanged) await onChanged();
  };
  const removeAttachment = async (a) => {
    await dbRemoveAttachment(a);
    if (onChanged) await onChanged();
  };
  const openAttachment = async (a) => {
    if (a.type === "link" || a.kind === "link") { window.open(a.url, "_blank"); return; }
    if (a.storage_path) { const u = await dbFileUrl(a.storage_path); if (u) window.open(u, "_blank"); }
  };
  const kindLabel = (a) => a.kind || a.type;
  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.drawer} onClick={e => e.stopPropagation()}>
        <div style={S.drawerHead}>
          <span style={{ ...S.tag, background: company.color + "22", color: company.color }}>{company.short}</span>
          <button style={S.closeBtn} onClick={onClose}><X size={18} /></button>
        </div>
        <div style={S.phaseTag}>{t.phase}</div>
        <h2 style={S.drawerTitle}>{t.title}</h2>

        <div style={S.field}>
          <label style={S.label}>Status</label>
          <div style={S.chipRow}>
            {STATUS_ORDER.map(s => (
              <button key={s} onClick={() => update(t.id, { status: s })}
                style={{ ...S.chip, ...(t.status === s ? { background: STATUSES[s].color, color: "#fff", borderColor: STATUSES[s].color } : {}) }}>
                {STATUSES[s].label}
              </button>
            ))}
          </div>
        </div>

        <div style={S.field}>
          <label style={S.label}><Users size={13} /> Assignees (multiple)</label>
          <div style={S.chipRow}>
            {TEAM.map(name => (
              <button key={name} onClick={() => toggleAssignee(name)}
                style={{ ...S.chip, ...(t.assignees.includes(name) ? S.chipOn : {}) }}>
                {t.assignees.includes(name) && <Check size={12} />} {name}
              </button>
            ))}
          </div>
        </div>

        <div style={S.field}>
          <label style={S.label}><Calendar size={13} /> Deadline</label>
          <input type="date" value={t.deadline} onChange={e => update(t.id, { deadline: e.target.value })} style={S.dateInput} />
        </div>

        <div style={S.field}>
          <label style={S.label}><Paperclip size={13} /> Attachments — content for this post</label>

          {attachments.length > 0 && (
            <div style={S.attList}>
              {attachments.map(a => {
                const kind = a.kind || a.type;
                const Icon = kind === "link" ? Link2 : kind === "image" ? ImageIcon : kind === "video" ? Film : FileText;
                const meta = (kind === "link" ? "Link" : (kind + (a.size ? ` · ${fmtSize(a.size)}` : "")))
                  + (a.added_by ? ` · ${a.added_by}` : (a.who ? ` · ${a.who}` : ""));
                return (
                  <div key={a.id} style={S.attItem}>
                    <div style={S.attIcon}><Icon size={16} /></div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <button onClick={() => openAttachment(a)} style={{ ...S.attName, background: "none", border: "none", textAlign: "left", cursor: "pointer", padding: 0 }} title={a.name}>{a.name}</button>
                      <div style={S.attMeta}>{meta}</div>
                    </div>
                    <button style={S.attBtn} onClick={() => openAttachment(a)} title="Open / download"><Download size={14} /></button>
                    <button style={S.attBtn} onClick={() => removeAttachment(a)} title="Remove"><Trash2 size={14} /></button>
                  </div>
                );
              })}
            </div>
          )}

          <div
            style={{ ...S.dropZone, opacity: busy ? .6 : 1 }}
            onDragOver={e => { e.preventDefault(); }}
            onDrop={e => { e.preventDefault(); onFiles(e.dataTransfer.files); }}
            onClick={() => !busy && fileInputRef.current && fileInputRef.current.click()}>
            <Paperclip size={15} style={{ opacity: .6 }} />
            <span>{busy ? "Uploading…" : <>Drop a file here, or <span style={{ color: "#3FA7D6", fontWeight: 600 }}>browse</span> — image, video, PDF, caption doc</>}</span>
            <input ref={fileInputRef} type="file" multiple style={{ display: "none" }}
              onChange={e => onFiles(e.target.files)} />
          </div>

          <div style={S.linkAdd}>
            <Link2 size={14} style={{ opacity: .5, flexShrink: 0 }} />
            <input value={linkLabel} onChange={e => setLinkLabel(e.target.value)} placeholder="Label (optional)" style={{ ...S.noteInput, maxWidth: 130 }} />
            <input value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="Paste a Drive / Dropbox link…"
              onKeyDown={e => e.key === "Enter" && addLink()} style={S.noteInput} />
            <button style={S.noteBtn} onClick={addLink}>Add</button>
          </div>
        </div>

        <div style={S.field}>
          <label style={S.label}><MessageSquare size={13} /> Notes</label>
          <div style={S.notes}>
            {t.notes.length === 0 && <div style={S.noNotes}>No notes yet.</div>}
            {t.notes.map((n, i) => (
              <div key={i} style={S.note}>
                <div style={S.noteHead}><strong>{n.who}</strong> <span style={{ opacity: .5 }}>{n.when}</span></div>
                <div>{n.text}</div>
              </div>
            ))}
          </div>
          <div style={S.noteAdd}>
            <input value={note} onChange={e => setNote(e.target.value)} placeholder="Add a note…"
              onKeyDown={e => e.key === "Enter" && addNote()} style={S.noteInput} />
            <button style={S.noteBtn} onClick={addNote}>Post</button>
          </div>
        </div>
      </div>
    </div>
  );
}

const CSS = `
* { box-sizing: border-box; }
body { margin: 0; }
.row:hover { background: #f6f8fb !important; }
.calhead:hover { background: #e7f3fb !important; border-color: #c3e2f5 !important; }
select:focus, input:focus { outline: 2px solid #3FA7D6; outline-offset: 1px; }
::-webkit-scrollbar { width: 9px; height: 9px; }
::-webkit-scrollbar-thumb { background: #c7cfdb; border-radius: 5px; }
`;

const S = {
  app: { display: "flex", height: "100vh", fontFamily: "'DM Sans', ui-sans-serif, system-ui, sans-serif",
    background: "#eef1f6", color: "#1d2433", overflow: "hidden" },
  sidebar: { width: 264, background: "#101725", color: "#dde3ec", display: "flex", flexDirection: "column",
    flexShrink: 0, borderRight: "1px solid #0a0f18" },
  brand: { display: "flex", alignItems: "center", gap: 11, padding: "20px 18px 16px" },
  brandMark: { width: 38, height: 38, borderRadius: 11, background: "linear-gradient(135deg,#F47B27,#E0564B)",
    display: "grid", placeItems: "center", fontWeight: 800, fontSize: 19, color: "#fff" },
  brandName: { fontWeight: 700, fontSize: 15, letterSpacing: "-.01em" },
  brandSub: { fontSize: 11, color: "#7c869a" },
  switcher: { width: "100%", display: "flex", alignItems: "center", gap: 9, padding: "10px 12px",
    background: "#1b2434", border: "1px solid #2b3344", borderRadius: 10, color: "#dde3ec",
    cursor: "pointer", fontSize: 14 },
  switcherName: { fontWeight: 700 },
  dot: { width: 9, height: 9, borderRadius: "50%", flexShrink: 0 },
  menu: { position: "absolute", top: "calc(100% + 6px)", left: 14, right: 14, background: "#1b2434",
    border: "1px solid #2b3344", borderRadius: 11, padding: 5, zIndex: 50, boxShadow: "0 18px 40px rgba(0,0,0,.45)" },
  menuItem: { width: "100%", display: "flex", alignItems: "center", gap: 9, padding: "9px 10px",
    background: "none", border: "none", color: "#dde3ec", cursor: "pointer", fontSize: 13.5, borderRadius: 8 },
  menuSite: { fontSize: 11, color: "#7c869a" },
  nav: { padding: "20px 14px 8px" },
  navLabel: { fontSize: 10.5, letterSpacing: ".12em", color: "#5e6878", fontWeight: 700, padding: "0 8px 8px" },
  navItem: { width: "100%", display: "flex", alignItems: "center", gap: 11, padding: "10px 12px",
    background: "none", border: "none", color: "#aeb6c4", cursor: "pointer", fontSize: 14,
    borderRadius: 9, marginBottom: 2, fontWeight: 500 },
  navItemActive: { background: "#1f2a3d", color: "#fff" },
  progressCard: { margin: "auto 14px 14px", padding: 14, background: "#161f2e", borderRadius: 12,
    border: "1px solid #232d40" },
  progressTop: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 9 },
  bar: { height: 7, background: "#0c1320", borderRadius: 5, overflow: "hidden" },
  barFill: { height: "100%", background: "linear-gradient(90deg,#F47B27,#4CAF7D)", transition: "width .4s" },
  miniStats: { display: "flex", flexWrap: "wrap", gap: "4px 10px", marginTop: 10, fontSize: 11, fontWeight: 600 },
  sideFoot: { padding: "0 18px 16px", fontSize: 11, color: "#5e6878" },

  main: { flex: 1, display: "flex", flexDirection: "column", minWidth: 0 },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-end",
    padding: "22px 30px 18px", borderBottom: "1px solid #dfe4ec", background: "#fff" },
  crumb: { display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "#6b7587", marginBottom: 4 },
  site: { color: "#9aa3b2" },
  h1: { margin: 0, fontSize: 23, fontWeight: 700, letterSpacing: "-.02em" },
  headerRight: { display: "flex", alignItems: "center", gap: 10 },
  filterWrap: { display: "flex", alignItems: "center", gap: 6, background: "#f1f4f9",
    border: "1px solid #dfe4ec", borderRadius: 9, padding: "0 10px" },
  select: { border: "none", background: "none", padding: "9px 4px", fontSize: 13, color: "#1d2433", cursor: "pointer" },
  addBtn: { display: "flex", alignItems: "center", gap: 6, background: "#101725", color: "#fff",
    border: "none", borderRadius: 9, padding: "10px 15px", fontSize: 13.5, fontWeight: 600, cursor: "pointer" },

  board: { flex: 1, overflowY: "auto", padding: "22px 30px 60px" },
  empty: { textAlign: "center", color: "#9aa3b2", padding: 50, fontSize: 14 },

  calWrap: { flex: 1, display: "flex", flexDirection: "column", padding: "20px 30px 24px", overflow: "hidden" },
  calBar: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16,
    background: "#fff", border: "1px solid #dfe4ec", borderRadius: 14, padding: "14px 16px",
    boxShadow: "0 8px 24px rgba(16,23,37,.04)" },
  calNavBtn: { background: "#fff", border: "1px solid #dfe4ec", borderRadius: 9, padding: 7, cursor: "pointer",
    color: "#4a5468", display: "grid", placeItems: "center" },
  calMonthTitle: { margin: 0, fontSize: 20, fontWeight: 800, letterSpacing: "-.02em", minWidth: 170, textAlign: "center" },
  todayBtn: { background: "#101725", color: "#fff", border: "none", borderRadius: 9, padding: "8px 14px",
    fontSize: 13, fontWeight: 600, cursor: "pointer", marginLeft: 4 },
  calMonthCount: { fontSize: 12.5, color: "#6b7587", fontWeight: 600 },
  calScroll: { flex: 1, overflowY: "auto", border: "1px solid #dfe4ec", borderRadius: 14, minHeight: 0, background: "#fff" },
  calGrid: { display: "grid", gridTemplateColumns: "repeat(7,minmax(0,1fr))", gridAutoRows: "minmax(190px, auto)",
    gap: 1, background: "#dfe4ec" },
  calDow: { background: "#fbfcfe", padding: "11px 0", textAlign: "center", fontSize: 11.5, fontWeight: 700,
    color: "#4a5468", letterSpacing: ".08em", position: "sticky", top: 0, zIndex: 2, textTransform: "uppercase" },
  calCell: { background: "#fff", padding: "7px 8px", display: "flex", flexDirection: "column",
    minHeight: 0, overflow: "hidden" },
  calCellSelected: {
    minHeight: 260,
    border: "2px solid #F47B27",
    boxShadow: "0 14px 28px rgba(244,123,39,.14)",
    transform: "translateY(-1px)",
    zIndex: 1,
    position: "relative",
  },
  calCellTop: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, flexShrink: 0,
    paddingBottom: 6, borderBottom: "1px solid #eef1f6" },
  calCellTopSelected: { marginBottom: 10, paddingBottom: 8, borderBottomColor: "#f7d7bc" },
  calCellTopClickable: { cursor: "pointer", borderRadius: 7, padding: "3px 5px", margin: "-3px -5px 4px",
    border: "1px solid transparent" },
  calCellToday: { background: "#fff7f0" },
  calDayNum: { fontSize: 14, fontWeight: 700, color: "#4a5468" },
  calDayNumSelected: { fontSize: 18, width: 30, height: 30, borderRadius: 10, display: "grid", placeItems: "center", background: "#F47B27", color: "#fff" },
  calDayBadge: { fontSize: 10.5, fontWeight: 700, color: "#3FA7D6", background: "#e7f3fb",
    borderRadius: 9, padding: "2px 8px" },
  calDayBadgeSelected: { background: "#fff0e4", color: "#C35A10" },
  calDayNumToday: { color: "#fff", background: "#F47B27", width: 22, height: 22, borderRadius: "50%",
    display: "grid", placeItems: "center", fontWeight: 700 },
  calTasks: { display: "flex", flexDirection: "column", gap: 5, overflowY: "auto", minHeight: 0, paddingBottom: 2 },
  calTasksSelected: { gap: 6, maxHeight: 132 },
  calTask: { display: "flex", alignItems: "center", gap: 6, background: "#f6f8fb", borderLeft: "3px solid #ccc",
    borderRadius: 8, padding: "6px 8px", cursor: "pointer", border: "none", borderLeftStyle: "solid",
    borderLeftWidth: 3, textAlign: "left", width: "100%" },
  calTaskDone: { opacity: .5, textDecoration: "line-through" },
  calTaskDot: { width: 7, height: 7, borderRadius: "50%", flexShrink: 0 },
  calTaskText: { fontSize: 11.5, color: "#2a3346", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", lineHeight: 1.3 },
  calMore: { fontSize: 11, color: "#3FA7D6", fontWeight: 700, padding: "3px 7px", background: "none",
    border: "none", cursor: "pointer", textAlign: "left", width: "100%" },
  calLegend: { display: "flex", alignItems: "center", gap: 16, marginTop: 14, fontSize: 12.5, color: "#4a5468", fontWeight: 600 },
  legendItem: { display: "flex", alignItems: "center", gap: 6 },
  calExpandedPanel: { marginTop: 10, padding: "10px 11px", borderRadius: 11, background: "linear-gradient(180deg, #fff8f1 0%, #fff 100%)", border: "1px solid #f4d7bc" },
  calExpandedLabel: { fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".08em", color: "#C35A10", fontWeight: 800 },
  calExpandedHeading: { marginTop: 4, fontSize: 13.5, fontWeight: 800, color: "#1d2433" },
  calExpandedCopy: { marginTop: 5, fontSize: 12, lineHeight: 1.45, color: "#6b7587" },
  timelineWrap: { flex: 1, display: "flex", flexDirection: "column", padding: "20px 30px 24px", overflow: "hidden" },
  timelineHero: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16,
    padding: "14px 16px", border: "1px solid #dfe4ec", borderRadius: 14, background: "#fff",
    boxShadow: "0 8px 24px rgba(16,23,37,.04)", marginBottom: 12 },
  timelineKicker: { display: "flex", alignItems: "center", gap: 6, color: "#6b7587", fontSize: 12.5, fontWeight: 600, marginBottom: 4 },
  timelineTitle: { margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: "-.03em" },
  timelineBadge: { background: "#FAEEDA", color: "#854F0B", borderRadius: 11, padding: "6px 11px", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" },
  timelineTabs: { display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  timelineTab: { display: "inline-flex", alignItems: "center", gap: 8, padding: "7px 12px", borderRadius: 999,
    border: "1px solid #dfe4ec", background: "#fff", color: "#4a5468", cursor: "pointer", fontSize: 12.5, fontWeight: 700 },
  timelineDot: { width: 8, height: 8, borderRadius: "50%", flexShrink: 0 },
  timelineLegend: { display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", marginBottom: 12, fontSize: 12.5, color: "#4a5468", fontWeight: 600 },
  timelineLegendItem: { display: "flex", alignItems: "center", gap: 6 },
  timelineSwatch: { width: 11, height: 11, borderRadius: 3, flexShrink: 0 },
  timelineScroll: { flex: 1, overflow: "auto", background: "#fff", border: "1px solid #dfe4ec", borderRadius: 14 },
  timelineTable: { width: "100%", minWidth: 980, borderCollapse: "collapse", tableLayout: "fixed" },
  timelineHeadRow: { position: "sticky", top: 0, zIndex: 2, background: "#fbfcfe" },
  timelineHeadCell: { padding: "12px 14px", borderBottom: "1px solid #e8edf4", color: "#6b7587", fontSize: 11.5, textTransform: "uppercase", letterSpacing: ".08em" },
  timelineWeekHeadCell: { padding: "0 14px 12px 8px", borderBottom: "1px solid #e8edf4" },
  timelineWeeks: { display: "grid", gridTemplateColumns: "repeat(12,1fr)", gap: 0, height: 18, alignItems: "end" },
  timelineWeekLabel: { fontSize: 11, color: "#8a94a6", textAlign: "center", fontWeight: 700 },
  timelineRow: { borderBottom: "1px solid #f1f4f9" },
  timelineRowActive: { background: "#fbfcfe" },
  timelinePhaseCell: { padding: "12px 14px", verticalAlign: "middle" },
  timelinePhaseButton: { width: "100%", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4,
    background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "left" },
  timelinePhaseTitle: { fontSize: 13.5, fontWeight: 800, color: "#1d2433", lineHeight: 1.35 },
  timelinePhaseMeta: { fontSize: 11.5, color: "#8a94a6", fontWeight: 700, letterSpacing: ".02em" },
  timelineTaskCountCell: { padding: "12px 10px", verticalAlign: "middle", textAlign: "center" },
  timelineTaskCountButton: { background: "#f1f4f9", color: "#4a5468", border: "none", borderRadius: 999, minWidth: 42,
    padding: "6px 10px", cursor: "pointer", fontSize: 12, fontWeight: 800 },
  timelineTrackCell: { padding: "12px 14px 12px 8px", verticalAlign: "middle" },
  timelineTrack: { position: "relative", height: 30, borderRadius: 999,
    background: "repeating-linear-gradient(90deg, #ffffff 0, #ffffff calc(8.333% - 1px), #eef1f6 calc(8.333% - 1px), #eef1f6 8.333%)" },
  timelineTrackLine: { position: "absolute", top: 0, bottom: 0, width: 1, background: "rgba(223,228,236,.9)" },
  timelineBar: { position: "absolute", top: 3, height: 24, border: "none", borderRadius: 999, color: "#fff",
    display: "flex", alignItems: "center", padding: "0 10px", cursor: "pointer", boxShadow: "0 8px 18px rgba(16,23,37,.08)",
    overflow: "hidden" },
  timelineBarActive: { boxShadow: "0 0 0 2px #D85A30, 0 10px 22px rgba(16,23,37,.12)" },
  timelineBarLabel: { fontSize: 11.5, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  timelineMilestone: { position: "absolute", top: -5, transform: "translateX(-50%)", color: "#D85A30", fontSize: 13 },
  timelineFooter: { display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap", marginTop: 12, fontSize: 12, color: "#6b7587", fontWeight: 600 },
  timelineDetailMeta: { display: "flex", gap: 10, flexWrap: "wrap", color: "#6b7587", fontSize: 12.5, fontWeight: 600, marginBottom: 14 },
  timelineDetailTasks: { display: "flex", flexDirection: "column", gap: 8 },
  timelineDetailTask: { display: "flex", alignItems: "flex-start", gap: 10, padding: "11px 12px", borderRadius: 11,
    border: "1px solid #e8edf4", background: "#f9fbfd", cursor: "pointer", width: "100%", textAlign: "left" },
  timelineStatusDot: { width: 10, height: 10, borderRadius: "50%", marginTop: 4, flexShrink: 0 },
  timelineDetailTaskTitle: { fontSize: 13.5, fontWeight: 700, color: "#1d2433", lineHeight: 1.35 },
  timelineDetailTaskMeta: { display: "flex", gap: 8, flexWrap: "wrap", marginTop: 5, fontSize: 11.5, color: "#6b7587", alignItems: "center" },
  dayTask: { display: "flex", alignItems: "flex-start", gap: 11, padding: "11px 13px", background: "#f6f8fb",
    border: "1px solid #eef1f6", borderRadius: 10, cursor: "pointer", width: "100%" },
  phase: { marginBottom: 26, background: "#fff", borderRadius: 14, border: "1px solid #e3e8f0",
    overflow: "hidden", boxShadow: "0 1px 2px rgba(20,30,50,.04)" },
  phaseHead: { display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "13px 18px", background: "#fbfcfe", borderBottom: "1px solid #eef1f6" },
  phaseTitle: { fontWeight: 700, fontSize: 13.5, color: "#2a3346", letterSpacing: "-.01em" },
  phaseHint: { fontWeight: 500, fontSize: 11.5, color: "#8a94a6", letterSpacing: 0 },
  phaseCount: { fontSize: 12, color: "#8a94a6", fontWeight: 600 },
  row: { display: "flex", alignItems: "center", gap: 12, padding: "11px 18px", borderBottom: "1px solid #f1f4f9", transition: "background .12s" },
  statusBtn: { background: "none", border: "none", cursor: "pointer", padding: 0, display: "grid", placeItems: "center" },
  rowTitle: { fontSize: 14, fontWeight: 500, color: "#1d2433", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  done: { textDecoration: "line-through", color: "#a0a8b6" },
  rowMeta: { display: "flex", alignItems: "center", gap: 9, marginTop: 4, flexWrap: "wrap" },
  tag: { fontSize: 10.5, fontWeight: 700, padding: "2px 7px", borderRadius: 5, letterSpacing: ".02em" },
  cadence: { fontSize: 11, color: "#8a94a6", background: "#f1f4f9", padding: "2px 7px", borderRadius: 5, fontWeight: 600 },
  metaItem: { display: "flex", alignItems: "center", gap: 3, fontSize: 11.5, color: "#6b7587" },
  prioBtn: { background: "none", border: "none", cursor: "pointer", padding: 4 },

  overlay: { position: "fixed", inset: 0, background: "rgba(16,23,37,.4)", display: "flex", justifyContent: "flex-end", zIndex: 100 },
  drawer: { width: 440, maxWidth: "92vw", background: "#fff", height: "100%", overflowY: "auto", padding: 26,
    boxShadow: "-20px 0 50px rgba(0,0,0,.18)" },
  drawerHead: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  closeBtn: { background: "#f1f4f9", border: "none", borderRadius: 8, padding: 6, cursor: "pointer", color: "#6b7587" },
  phaseTag: { fontSize: 11.5, color: "#8a94a6", fontWeight: 600, marginTop: 16 },
  drawerTitle: { margin: "5px 0 22px", fontSize: 20, fontWeight: 700, letterSpacing: "-.02em", lineHeight: 1.3 },
  field: { marginBottom: 22 },
  label: { display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 700, color: "#4a5468", marginBottom: 9 },
  chipRow: { display: "flex", flexWrap: "wrap", gap: 7 },
  chip: { display: "flex", alignItems: "center", gap: 4, padding: "6px 11px", borderRadius: 8,
    border: "1px solid #dfe4ec", background: "#fff", fontSize: 12.5, cursor: "pointer", color: "#4a5468", fontWeight: 500 },
  chipOn: { background: "#101725", color: "#fff", borderColor: "#101725" },
  dateInput: { padding: "9px 11px", border: "1px solid #dfe4ec", borderRadius: 8, fontSize: 13.5, fontFamily: "inherit", width: "100%" },
  notes: { display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 },
  noNotes: { fontSize: 13, color: "#9aa3b2", fontStyle: "italic" },
  note: { background: "#f6f8fb", borderRadius: 9, padding: "9px 11px", fontSize: 13, lineHeight: 1.45 },
  noteHead: { fontSize: 11.5, marginBottom: 3, color: "#4a5468" },
  noteAdd: { display: "flex", gap: 7 },
  noteInput: { flex: 1, padding: "9px 11px", border: "1px solid #dfe4ec", borderRadius: 8, fontSize: 13, fontFamily: "inherit" },
  noteBtn: { background: "#F47B27", color: "#fff", border: "none", borderRadius: 8, padding: "0 15px", fontWeight: 600, cursor: "pointer", fontSize: 13 },
  attList: { display: "flex", flexDirection: "column", gap: 7, marginBottom: 10 },
  attItem: { display: "flex", alignItems: "center", gap: 10, background: "#f6f8fb", border: "1px solid #eef1f6",
    borderRadius: 9, padding: "8px 10px" },
  attThumb: { width: 34, height: 34, borderRadius: 7, objectFit: "cover", flexShrink: 0 },
  attIcon: { width: 34, height: 34, borderRadius: 7, background: "#e7eef6", display: "grid", placeItems: "center",
    color: "#4a5468", flexShrink: 0 },
  attName: { fontSize: 13, fontWeight: 600, color: "#1d2433", textDecoration: "none", display: "block",
    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  attMeta: { fontSize: 11, color: "#8a94a6", marginTop: 1 },
  attPending: { color: "#F0A23C", fontWeight: 600 },
  attBtn: { background: "none", border: "none", color: "#8a94a6", cursor: "pointer", padding: 5, flexShrink: 0,
    display: "grid", placeItems: "center", borderRadius: 6 },
  dropZone: { display: "flex", alignItems: "center", gap: 8, padding: "12px 13px", border: "1.5px dashed #cdd6e2",
    borderRadius: 10, cursor: "pointer", fontSize: 12.5, color: "#6b7587", background: "#fbfcfe", marginBottom: 9 },
  linkAdd: { display: "flex", alignItems: "center", gap: 7 },
};
