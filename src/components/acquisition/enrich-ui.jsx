"use client";
/**
 * enrich-ui.jsx — the small pieces that show what an enrichment pass did.
 *
 * The point of both is the same: a row that was checked and came back empty must
 * not look like a row that was never attempted. Without that distinction a pass
 * appears to have skipped work it actually did, and nobody can tell whether a
 * blank means "no accounts" or "we never looked".
 */
import React from "react";

/**
 * Why a row has no suggestion. The three that matter are js_shell, blocked and
 * error — the site was there, we just could not read it, so the paid pass is
 * still worth running. "none" is a real answer: the company lists nothing.
 */
export const OUTCOME = {
  none:      { label: "no links on site", color: t => t.inkFaint,
               hint: "Website read, no social links listed on it" },
  js_shell:  { label: "built in browser", color: t => t.warn,
               hint: "The site assembles its header and footer in the browser, so the links are not in the page source. Worth an AI pass." },
  blocked:   { label: "bot wall", color: t => t.warn,
               hint: "A bot wall answered instead of the site. Worth a look by hand or an AI pass." },
  error:     { label: "site not reachable", color: t => t.bad,
               hint: "The website did not load" },
  no_domain: { label: "no company site", color: t => t.indigo,
               hint: "No company website to read — needs a name search" },
  skipped:   { label: "nothing to search", color: t => t.inkGhost,
               hint: "Passed over by the spend guards — no website, no licence, and the name is not a business" },
  found:     { label: "found", color: t => t.good, hint: "A profile was suggested" },
};

/**
 * Is the derived website really this company's?
 *
 * The domain comes from an email address, and an email address can belong to a
 * filer, an employer, or the wrong firm entirely. Marking a site wrong clears
 * the suggestions read off it, because they are somebody else's profiles.
 */
export function SiteVerdict({ value, onSet, t }) {
  const pill = (active, colour) => ({
    borderRadius: 6, padding: "3px 5px", fontSize: 10, fontWeight: 700, cursor: "pointer",
    fontFamily: "'JetBrains Mono',monospace", lineHeight: 1,
    background: active ? `${colour}22` : "transparent",
    color: active ? colour : t.inkGhost,
    border: `1px solid ${active ? colour : t.line}`,
  });
  return (
    <span style={{ display: "inline-flex", gap: 2 }}>
      <button title="This is the right company's website"
        onClick={() => onSet(value === true ? null : true)}
        style={pill(value === true, t.good)}>✓</button>
      <button title="Wrong company — clears anything read off this site"
        onClick={() => onSet(value === false ? null : false)}
        style={pill(value === false, t.bad)}>✗</button>
    </span>
  );
}
