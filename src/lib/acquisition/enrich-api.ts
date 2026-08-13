/**
 * enrich-api.ts
 * -----------------------------------------------------------------------------
 * Ties the two enrichment passes to the database.
 *
 *   runFooterEnrichment()  free   · no key   · every record with a real domain
 *   runAiEnrichment()      paid   · API key  · only what the free pass missed
 *
 * Both write results as SUGGESTIONS, never as confirmed marks. A suggested row
 * shows purple in the UI and stays in Research until a human confirms it.
 *
 * Rationale for never auto-confirming: in live testing, AI reported "no accounts"
 * for a company that had a Facebook page, and a plain web search returned an
 * Australian business with the same name. Enrichment fills the field; the person
 * keeps the verdict. A wrong follow is worse than a missing one.
 * -----------------------------------------------------------------------------
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { enrichFooterBatch } from './enrich-footer';
import { enrichAiBatch, estimateCost, type EnrichInput } from './enrich-ai';
import { verify, licenceNumber, computeGroups, usableSite, type CompanyRow } from './acquisition-logic';

export interface EnrichSummary {
  attempted: number;
  resolved: number;        // at least one profile suggested
  empty: number;           // loaded/searched fine, nothing there
  failed: number;
  suggestions: { fb: number; ig: number; li: number };
  estimatedCost?: { low: string; high: string };
}

type Suggestion = {
  fb_suggested: string | null;
  ig_suggested: string | null;
  li_suggested: string | null;
  enrich_source: 'footer' | 'ai';
  enrich_note: string;
  enrich_confidence: 'high' | 'medium' | 'low' | null;
  enriched_at: string;
};

async function writeSuggestions(
  sb: SupabaseClient,
  updates: { id: string; patch: Suggestion }[],
): Promise<void> {
  for (const u of updates) {
    const { error } = await sb.from('acquisition_companies').update(u.patch).eq('id', u.id);
    if (error) throw new Error(`Could not save suggestion: ${error.message}`);
  }
}

/** Rows still worth enriching: untouched, not skipped, still in Research. */
async function loadCandidates(sb: SupabaseClient, ids?: string[]): Promise<CompanyRow[]> {
  let q = sb.from('acquisition_companies')
    .select('*')
    .eq('stage', 'research')
    .is('fb_found', null).is('ig_found', null).is('li_found', null)
    .order('priority_score', { ascending: false });
  if (ids?.length) q = q.in('id', ids);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []).filter(r => !(r as any).skip) as CompanyRow[];
}

/* ========================== free pass ========================== */

/**
 * Reads social links straight off each company's own website. Only runs on
 * records whose email domain is genuinely theirs — an aggregator or shared-filer
 * domain is somebody else's site and would return somebody else's socials.
 */
export async function runFooterEnrichment(
  sb: SupabaseClient,
  opts: { ids?: string[]; limit?: number; onProgress?: (d: number, t: number) => void } = {},
): Promise<EnrichSummary> {
  const rows = await loadCandidates(sb, opts.ids);

  // Same employer grouping and same usable-site rule the Research tab applies, so
  // enrichment anchors on exactly the domain the AI ✦ button would have used.
  const groupOf = computeGroups(rows);
  const targets = rows
    .map(r => {
      const group = groupOf(r);
      return { row: r, group, chk: verify({ name: r.company_name, email: r.email, group }) };
    })
    .filter(({ row, chk, group }) => !!usableSite(row, chk, group))
    .slice(0, opts.limit ?? 500)
    .map(({ row, chk }) => ({ id: row.id as string, domain: chk.domain }));

  const results = await enrichFooterBatch(targets, { onProgress: opts.onProgress });

  const now = new Date().toISOString();
  const updates: { id: string; patch: Suggestion }[] = [];
  const summary: EnrichSummary = {
    attempted: targets.length, resolved: 0, empty: 0, failed: 0,
    suggestions: { fb: 0, ig: 0, li: 0 },
  };

  for (const [id, r] of results) {
    if (r.outcome === 'error') { summary.failed++; continue; }
    if (r.outcome === 'none')  { summary.empty++;  continue; }
    summary.resolved++;
    if (r.facebook)  summary.suggestions.fb++;
    if (r.instagram) summary.suggestions.ig++;
    if (r.linkedin)  summary.suggestions.li++;
    updates.push({
      id,
      patch: {
        fb_suggested: r.facebook,
        ig_suggested: r.instagram,
        li_suggested: r.linkedin,
        enrich_source: 'footer',
        enrich_note: r.sourceUrl ? `Listed on ${r.sourceUrl}` : 'Listed on the company website',
        // A link published by the company on its own site is as good as it gets.
        enrich_confidence: 'high',
        enriched_at: now,
      },
    });
  }

  await writeSuggestions(sb, updates);
  return summary;
}

/* ========================== paid pass ========================== */

export interface AiRunOptions {
  ids?: string[];
  limit?: number;
  /** Skip anything the footer pass already resolved. Leave true. */
  onlyUnresolved?: boolean;
  dryRun?: boolean;
  onProgress?: (d: number, t: number) => void;
}

/**
 * Anthropic web search. No scraping, no proxy, no IP-blocking exposure.
 * Call with dryRun first to show the record count and cost before spending.
 */
export async function runAiEnrichment(
  sb: SupabaseClient,
  apiKey: string,
  opts: AiRunOptions = {},
): Promise<EnrichSummary> {
  const rows = await loadCandidates(sb, opts.ids);

  // onlyUnresolved=false is the "AI only" button: run every selected record
  // through the API regardless of what the footer pass already found. Useful
  // when a footer result looks wrong and you want a second opinion.
  const pending = rows.filter(r => {
    if (opts.onlyUnresolved === false) return true;
    const a = r as any;
    return !a.fb_suggested && !a.ig_suggested && !a.li_suggested;
  });

  const groupOf = computeGroups(rows);
  const inputs: EnrichInput[] = pending.slice(0, opts.limit ?? 100).map(r => {
    const group = groupOf(r);
    const chk = verify({ name: r.company_name, email: r.email, group });
    return {
      id: r.id as string,
      companyName: r.company_name,
      vertical: r.vertical,
      state: r.state,
      metro: r.metro,
      // usableSite() rejects a shared-filer domain, which would otherwise anchor
      // the prompt on somebody else's company website.
      website: usableSite(r, chk, group) || null,
      licenceNumber: licenceNumber(r.company_name) || null,
    };
  });

  if (opts.dryRun) {
    return {
      attempted: inputs.length, resolved: 0, empty: 0, failed: 0,
      suggestions: { fb: 0, ig: 0, li: 0 },
      estimatedCost: estimateCost(inputs.length),
    };
  }

  const client = new Anthropic({ apiKey });
  const results = await enrichAiBatch(client, inputs, { onProgress: opts.onProgress });

  const now = new Date().toISOString();
  const updates: { id: string; patch: Suggestion }[] = [];
  const summary: EnrichSummary = {
    attempted: inputs.length, resolved: 0, empty: 0, failed: 0,
    suggestions: { fb: 0, ig: 0, li: 0 },
    estimatedCost: estimateCost(inputs.length),
  };

  for (const [id, r] of results) {
    if (r.outcome === 'error') { summary.failed++; continue; }
    if (r.outcome === 'none')  { summary.empty++;  continue; }
    summary.resolved++;
    if (r.facebook)  summary.suggestions.fb++;
    if (r.instagram) summary.suggestions.ig++;
    if (r.linkedin)  summary.suggestions.li++;

    const where = r.resolvedCity ? ` · based in ${r.resolvedCity}` : '';
    updates.push({
      id,
      patch: {
        fb_suggested: r.facebook,
        ig_suggested: r.instagram,
        li_suggested: r.linkedin,
        enrich_source: 'ai',
        enrich_note: (r.note || 'Found by AI search') + where,
        enrich_confidence: r.confidence,
        enriched_at: now,
      },
    });
  }

  await writeSuggestions(sb, updates);
  return summary;
}

/* ========================== combined pass ========================== */

/**
 * Free pass, then paid on whatever it could not resolve.
 *
 * This is the default button. The footer pass costs nothing and every hit is
 * unambiguous — the link came from the company's own site — so there is no
 * reason to pay for a record it can already answer. Only the remainder reaches
 * the API, which is what keeps the monthly spend small.
 */
export async function runFullEnrichment(
  sb: SupabaseClient,
  apiKey: string,
  opts: {
    ids?: string[];
    footerLimit?: number;
    aiLimit?: number;
    dryRun?: boolean;
    onProgress?: (phase: 'footer' | 'ai', done: number, total: number) => void;
  } = {},
): Promise<{ footer: EnrichSummary; ai: EnrichSummary; combined: EnrichSummary }> {

  if (opts.dryRun) {
    const rows = await loadCandidates(sb, opts.ids);
    const groupOf = computeGroups(rows);
    const withSite = rows.filter(r => {
      const group = groupOf(r);
      return !!usableSite(r, verify({ name: r.company_name, email: r.email, group }), group);
    }).length;
    // Worst case for cost: the footer pass resolves nothing and everything
    // falls through to the API. Quote the ceiling, never the hope.
    const aiCeiling = Math.min(rows.length, opts.aiLimit ?? 100);
    const empty: EnrichSummary = { attempted: 0, resolved: 0, empty: 0, failed: 0,
                                   suggestions: { fb: 0, ig: 0, li: 0 } };
    return {
      footer: { ...empty, attempted: withSite },
      ai: { ...empty, attempted: aiCeiling, estimatedCost: estimateCost(aiCeiling) },
      combined: { ...empty, attempted: rows.length, estimatedCost: estimateCost(aiCeiling) },
    };
  }

  const footer = await runFooterEnrichment(sb, {
    ids: opts.ids,
    limit: opts.footerLimit,
    onProgress: (d, t) => opts.onProgress?.('footer', d, t),
  });

  // onlyUnresolved defaults true, so this automatically skips footer hits.
  const ai = await runAiEnrichment(sb, apiKey, {
    ids: opts.ids,
    limit: opts.aiLimit,
    onlyUnresolved: true,
    onProgress: (d, t) => opts.onProgress?.('ai', d, t),
  });

  return {
    footer,
    ai,
    combined: {
      attempted: footer.attempted + ai.attempted,
      resolved:  footer.resolved  + ai.resolved,
      empty:     footer.empty     + ai.empty,
      failed:    footer.failed    + ai.failed,
      suggestions: {
        fb: footer.suggestions.fb + ai.suggestions.fb,
        ig: footer.suggestions.ig + ai.suggestions.ig,
        li: footer.suggestions.li + ai.suggestions.li,
      },
      estimatedCost: ai.estimatedCost,
    },
  };
}

/* ========================== confirm / reject ========================== */

// Moved to enrich-confirm.ts so client components can import them without
// pulling the Anthropic SDK into the browser bundle. Re-exported here so
// server-side callers can still reach them from this module.
export { confirmSuggestion, confirmAllOnRow } from './enrich-confirm';
