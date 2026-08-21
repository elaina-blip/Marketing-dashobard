"use client";
/**
 * ui.jsx — shared bits for the Social Acquisition tabs.
 *
 * The dashboard has no stylesheet: every component styles inline from the theme
 * object. The reference HTML's class names have nowhere to land here, so its
 * visual language (verdict badges, vertical colours, tri-state mark buttons) is
 * rebuilt as themed inline styles instead.
 */
import React from "react";

/* Vertical colours, lifted from VSTYLE in the reference HTML so a roofer is the
   same red here as in the tool Weston already knows. */
export const VERT_COLOR = {
  "Homebuilders": "#3898EF",
  "Roofing": "#E4695E",
  "Windows-Doors-Siding": "#A98BE8",
  "Solar": "#F0B558",
  "Mechanical-HVAC": "#3ECFEF",
  "Electrical": "#35D98A",
  "Plumbing": "#6C9BE8",
};
export const vertColor = (v, t) => VERT_COLOR[v] || t.inkFaint;
export const SHORT_VERT = v =>
  String(v || "—").replace("Windows-Doors-Siding", "Windows/Doors").replace("Mechanical-HVAC", "HVAC");

export const verdictColor = (verdict, t) => ({
  confirmed: t.good, likely: t.teal, conflict: t.warn, employer: t.indigo, unusable: t.inkFaint,
}[verdict] || t.inkFaint);

export const fmtN = n => (Number(n) || 0).toLocaleString();
export const pctOf = (a, b) => (b > 0 ? Math.min(100, Math.round((a / b) * 100)) : 0);


/**
 * The table surface is LIGHT on purpose.
 *
 * Dense rows of colour-coded badges read better dark-on-light, which is why the
 * reference HTML uses a light table under a dark header. Rendering it on the
 * dashboard's navy left the reference's text colours — tuned for light — muddy
 * and hard to read.
 *
 * Rather than hand-inverting every colour at every call site, this returns the
 * same token names with light values. Pass it as `t` to anything inside the
 * table and every existing component renders correctly with no changes.
 */
export const paperTheme = t => ({
  ...t,
  bg: "#FFFFFF",
  bgCard: "#FFFFFF",
  bgElevated: "#FFFFFF",
  bgSunk: "rgba(10,31,48,.045)",

  ink: "#08192A",
  inkMuted: "rgba(10,31,48,.74)",
  inkFaint: "rgba(10,31,48,.56)",
  inkGhost: "rgba(10,31,48,.34)",

  line: "rgba(10,31,48,.10)",
  lineStrong: "rgba(10,31,48,.20)",

  /* Badge colours lifted from the reference stylesheet's .vd-* rules, so a
     verdict is the same colour here as in the tool Weston already knows. */
  good: "#0C6A39",     goodSoft: "rgba(28,192,106,.18)",
  bad: "#9C332B",      badSoft: "rgba(210,84,74,.15)",
  warn: "#8C5B0D",     warnSoft: "rgba(232,163,61,.22)",
  accent: "#1F5FA8",   accentSoft: "rgba(56,152,239,.18)",
  accentDeep: "#14487F", accentWash: "rgba(56,152,239,.07)",
  gold: "#8C5B0D",     goldSoft: "rgba(232,163,61,.22)",
  teal: "#0F6E56",     tealSoft: "rgba(15,110,86,.14)",
  indigo: "#534AB7",   indigoSoft: "rgba(83,74,183,.14)",

  shadowCard: "0 1px 2px rgba(10,31,48,.10)",
});

export function Card({ title, right, children, t, style }) {
  return (
    <div style={{ background: t.bgCard, border: `1px solid ${t.line}`, borderRadius: 12, padding: 18, boxShadow: t.shadowCard, ...style }}>
      {(title || right) && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          {title && <h3 style={{ margin: 0, fontSize: 14.5, fontWeight: 600, color: t.ink, fontFamily: "'Fraunces',serif" }}>{title}</h3>}
          <span style={{ flex: 1 }} />
          {right}
        </div>
      )}
      {children}
    </div>
  );
}

export function Btn({ children, onClick, kind = "ghost", t, disabled, title, style }) {
  const base = {
    solid: { background: t.accent, color: t.bg, border: `1px solid ${t.accent}` },
    warn: { background: t.badSoft, color: t.bad, border: `1px solid ${t.bad}` },
    ghost: { background: t.bgElevated, color: t.ink, border: `1px solid ${t.lineStrong}` },
  }[kind];
  return (
    <button onClick={onClick} disabled={disabled} title={title}
      style={{ ...base, opacity: disabled ? 0.45 : 1, borderRadius: 8, padding: "7px 12px", fontSize: 12.5,
        fontWeight: 600, cursor: disabled ? "default" : "pointer", fontFamily: "inherit", whiteSpace: "nowrap", ...style }}>
      {children}
    </button>
  );
}

/** Tri-state platform button: found (green) → none (red) → unchecked (blank). */
export function Mark({ value, label, onClick, t, title }) {
  const look = value === true
    ? { background: t.goodSoft, color: t.good, border: `1px solid ${t.good}` }
    : value === false
      ? { background: t.badSoft, color: t.bad, border: `1px solid ${t.bad}` }
      : { background: t.bgSunk, color: t.inkFaint, border: `1px solid ${t.lineStrong}` };
  return (
    <button onClick={onClick} title={title}
      style={{ ...look, borderRadius: 7, padding: "4px 8px", fontSize: 11, fontWeight: 700,
        cursor: "pointer", fontFamily: "'JetBrains Mono',monospace", minWidth: 34 }}>
      {label}
    </button>
  );
}

/** Date-stamp button used on Follow: stamped (accent + date in tooltip) or not. */
export function DateMark({ value, label, onClick, t }) {
  const look = value
    ? { background: t.accentSoft, color: t.accentDeep, border: `1px solid ${t.accent}` }
    : { background: t.bgSunk, color: t.inkFaint, border: `1px solid ${t.lineStrong}` };
  return (
    <button onClick={onClick} title={value || "not yet"}
      style={{ ...look, borderRadius: 7, padding: "4px 8px", fontSize: 11, fontWeight: 700,
        cursor: "pointer", fontFamily: "'JetBrains Mono',monospace", minWidth: 34 }}>
      {label}
    </button>
  );
}

/**
 * A suggested profile awaiting a human verdict. Purple — matching the AI ✦
 * styling — because purple means proposed, not found. The label opens the
 * suggested URL so the reviewer can look at it; ✓ and ✗ are the only things
 * that write to the found flag.
 */
export function SuggestMark({ url, label, source, note, confidence, onConfirm, onReject, t }) {
  const pill = {
    borderRadius: 7, padding: "4px 7px", fontSize: 11, fontWeight: 700, cursor: "pointer",
    fontFamily: "'JetBrains Mono',monospace", border: "none", color: "#fff",
  };
  // A link the company published on its own site is stronger evidence than an AI
  // match, so the two are told apart at a glance rather than only on hover.
  const fromSite = source === "footer";
  const glyph = fromSite ? "⌂" : "✦";           // house vs spark
  const grad = fromSite
    ? "linear-gradient(95deg,#1F5FA8,#2E8B74)"           // site: cooler, greener
    : "linear-gradient(95deg,#1F5FA8,#7A4FD0)";          // AI: the AI-Mode purple
  const why = [
    fromSite ? "Listed on the company's own website" : "Found by AI search",
    note || "",
    confidence ? `${confidence} confidence` : "",
  ].filter(Boolean).join(" · ");

  return (
    <span style={{ display: "inline-flex", gap: 2, alignItems: "stretch" }}>
      <a href={url} target="_blank" rel="noopener noreferrer"
        title={`${why} — open it before deciding`}
        style={{ ...pill, background: grad, textDecoration: "none",
          display: "inline-flex", alignItems: "center", gap: 3, letterSpacing: ".04em" }}>
        {label}<span style={{ fontSize: 9, opacity: .95 }}>{glyph}</span>
      </a>
      <button onClick={onConfirm} title={`Confirm — this is them. ${why}`}
        style={{ ...pill, background: t.goodSoft, color: t.good, border: `1px solid ${t.good}`, padding: "4px 6px" }}>✓</button>
      <button onClick={onReject} title="Reject — not them"
        style={{ ...pill, background: t.badSoft, color: t.bad, border: `1px solid ${t.bad}`, padding: "4px 6px" }}>✗</button>
    </span>
  );
}

export function Badge({ children, color, t }) {
  return (
    <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 20, fontSize: 10.5, fontWeight: 700,
      color, background: `${color}22`, border: `1px solid ${color}55`, whiteSpace: "nowrap" }}>{children}</span>
  );
}

export const selectStyle = t => ({
  background: t.bgElevated, border: `1px solid ${t.lineStrong}`, color: t.ink, borderRadius: 8,
  padding: "7px 9px", fontSize: 12.5, fontFamily: "inherit", outline: "none",
});
export const inputStyle = t => ({ ...selectStyle(t), background: t.bgSunk });

export function Empty({ children, t }) {
  return <div style={{ padding: "40px 20px", textAlign: "center", color: t.inkFaint, fontSize: 13.5 }}>{children}</div>;
}

/** A labelled progress bar — used for pacing, funnels and per-vertical coverage. */
export function Meter({ pct, color, t, height = 6 }) {
  return (
    <div style={{ height, borderRadius: 20, background: t.bgSunk, overflow: "hidden" }}>
      <div style={{ width: `${Math.max(0, Math.min(100, pct))}%`, height: "100%", borderRadius: 20,
        background: color || t.accent, transition: "width .4s" }} />
    </div>
  );
}

export const th = t => ({
  textAlign: "left", padding: "9px 10px", fontSize: 10.5, letterSpacing: ".09em", textTransform: "uppercase",
  color: t.inkFaint, fontWeight: 700, borderBottom: `1px solid ${t.lineStrong}`, background: t.bgSunk,
  position: "sticky", top: 0, zIndex: 1, whiteSpace: "nowrap",
});
export const td = t => ({ padding: "9px 10px", fontSize: 12.5, color: t.ink, borderBottom: `1px solid ${t.line}`, verticalAlign: "top" });
