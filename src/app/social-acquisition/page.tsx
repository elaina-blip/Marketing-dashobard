/**
 * app/social-acquisition/page.tsx — the original HTML tool, full screen.
 *
 * The real workbench is now the Social Acquisition entry in the sidebar, backed
 * by Supabase (components/acquisition/SocialAcquisitionView.jsx). This route
 * keeps the reference HTML reachable while the team moves across: it is the
 * fallback for anyone mid-session, and the thing to compare against if a number
 * in the new tabs ever looks wrong.
 *
 * Delete this route and public/tools/social-workbench.html once nobody is using
 * them (step 14 of the brief). Covered by the same middleware sign-in check as
 * everything else, so neither is publicly reachable.
 */
"use client";

import { useEffect, useState } from "react";

// Declared here rather than imported: this fallback route must not pull the
// whole Supabase-backed workbench into its bundle just to read one string.
const TOOL_SRC = "/tools/social-workbench.html";

export default function SocialAcquisitionPage() {
  const [loaded, setLoaded] = useState(false);

  // The tool holds unsaved marks in memory. Warn before a reload or close takes them.
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#06171D" }}>
      <div
        style={{
          display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
          padding: "10px 16px", borderBottom: "1px solid rgba(125,205,220,.13)",
          fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: 11,
          letterSpacing: ".05em", color: "#9FC3CC", flexShrink: 0,
        }}
      >
        <span style={{ color: "#16C7E8", fontWeight: 600 }}>SOCIAL ACQUISITION · ORIGINAL TOOL</span>
        <span style={{ opacity: 0.75 }}>
          Work here is held in this tab only — export before you leave. The saved version is in the sidebar.
        </span>
        <span style={{ flex: 1 }} />
        <a href="/" style={{ color: "#16C7E8", textDecoration: "none" }}>← Command Center</a>
      </div>

      {!loaded && (
        <div style={{ padding: 40, fontSize: 14, color: "#6E929B", fontFamily: "'IBM Plex Sans', sans-serif" }}>
          Loading the workbench…
        </div>
      )}

      {/* allow-downloads is required for Export CSV to work inside the frame. */}
      <iframe
        src={TOOL_SRC}
        title="Social acquisition workbench"
        onLoad={() => setLoaded(true)}
        sandbox="allow-scripts allow-same-origin allow-downloads allow-popups allow-popups-to-escape-sandbox allow-forms allow-modals"
        style={{
          flex: 1, width: "100%", border: 0, minHeight: 0,
          background: "#081319", visibility: loaded ? "visible" : "hidden",
        }}
      />
    </div>
  );
}
