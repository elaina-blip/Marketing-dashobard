/**
 * enrich-ai.ts
 * -----------------------------------------------------------------------------
 * PAID enrichment pass. Runs only on records the free footer pass could not
 * resolve. Uses the Anthropic API with the web search tool, so there is no
 * scraping, no proxy, no IP-blocking exposure and nothing against anyone's ToS.
 *
 * Roughly $0.01–0.03 per company depending on how many searches it needs.
 *
 * SERVER-SIDE ONLY. The API key must never reach the browser.
 *
 * Dependency: npm i @anthropic-ai/sdk
 *
 * CHANGED FROM THE SUPPLIED FILE — three values in enrichWithAi(), no prompt
 * text and no spend-guard logic touched. The supplied file names
 * `claude-sonnet-4-6` with the basic `web_search_20250305` tool; the current
 * Sonnet is `claude-sonnet-5`, which supports `web_search_20260209` (dynamic
 * filtering — results are filtered before they reach the context window, which
 * is exactly what this pass wants). Sonnet tier is kept deliberately: the
 * $0.01–0.03 per-record estimate and the dry-run quote are built on Sonnet
 * pricing. max_tokens is raised because Sonnet 5 runs adaptive thinking by
 * default and max_tokens caps thinking + response together — 1024 truncates
 * the JSON before it is closed.
 * -----------------------------------------------------------------------------
 */

import Anthropic from '@anthropic-ai/sdk';

export interface AiResult {
  facebook: string | null;
  instagram: string | null;
  linkedin: string | null;
  /** Canonical business name the model settled on — often better than our record. */
  resolvedName: string | null;
  /** Where the model believes the business is actually based, not where it filed. */
  resolvedCity: string | null;
  confidence: 'high' | 'medium' | 'low';
  /** One line explaining the call, shown to the reviewer. */
  note: string;
  outcome: 'found' | 'none' | 'error';
  error?: string;
}

export interface EnrichInput {
  id: string;
  companyName: string;
  vertical: string;
  state: string;
  metro?: string;
  /** The company's own website, when we have a usable one. Strongest anchor. */
  website?: string | null;
  /** State licence number pulled from the record name. Second strongest. */
  licenceNumber?: string | null;
}

/** "an HVAC contractor", "a roofing contractor" — reads as written English. */
const article = (w: string) => /^[aeiou]|^hvac/i.test(w) ? 'an' : 'a';

const TRADE_WORD: Record<string, string> = {
  'Homebuilders': 'home builder',
  'Roofing': 'roofing contractor',
  'Windows-Doors-Siding': 'windows and doors contractor',
  'Solar': 'solar installer',
  'Mechanical-HVAC': 'HVAC contractor',
  'Electrical': 'electrical contractor',
  'Plumbing': 'plumbing contractor',
};

/**
 * Anchors on the website, then the licence number, then the name — the same
 * order proven fastest in manual testing. The permit metro is passed only as a
 * hint, never as a fact, because it is where the PERMIT was pulled and a
 * contractor often works outside its home county.
 */
export function buildPrompt(input: EnrichInput): string {
  const trade = TRADE_WORD[input.vertical] || 'contractor';
  const rules = `
Report only accounts you are confident belong to this exact business.

A similarly named company in another city or state is NOT a match — check the
location on the profile before accepting it. Businesses with common names have
many namesakes.

If you cannot find a genuine account for a platform, return null for it. A null
is a useful answer; a wrong URL is not. Do not substitute a plausible-looking
alternative, and do not infer an account exists because the company has a website.

Prefer a company/business page over a personal profile. For LinkedIn that means
a /company/ URL, never /in/.

Respond with ONLY a JSON object, no preamble and no markdown fences:
{"facebook":"url or null","instagram":"url or null","linkedin":"url or null",
 "resolvedName":"the canonical business name","resolvedCity":"city, state where it is based",
 "confidence":"high|medium|low","note":"one short sentence on how you identified it"}`.trim();

  if (input.website) {
    return `This is the website of ${article(trade)} ${trade}: ${input.website}

Find that same company's official Facebook page, Instagram profile and LinkedIn company page.

${rules}`;
  }

  if (input.licenceNumber) {
    return `Find the ${trade} holding ${input.state} contractor licence ${input.licenceNumber}, listed on the permit record as "${input.companyName}".

First confirm the business name and city from the licence record, then find its official Facebook page, Instagram profile and LinkedIn company page.

${rules}`;
  }

  const hint = input.metro && input.metro !== '—'
    ? ` It pulled permits near ${input.metro.replace(/\s*\/.*$/, '')}, though it may be based elsewhere.`
    : '';
  return `Find the official Facebook page, Instagram profile and LinkedIn company page for "${input.companyName}", ${article(trade)} ${trade} in ${input.state}.${hint}

${rules}`;
}

function parseJson(text: string): Partial<AiResult> | null {
  const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) return null;
  try { return JSON.parse(cleaned.slice(start, end + 1)); } catch { return null; }
}

const isRealUrl = (v: unknown, host: RegExp): string | null => {
  if (typeof v !== 'string') return null;
  const s = v.trim();
  if (!s || /^(null|none|n\/a|not found|unavailable)$/i.test(s)) return null;
  if (!/^https?:\/\//i.test(s)) return null;
  return host.test(s) ? s.replace(/\/$/, '') : null;
};


/* ========================== spend guards ========================== */

/**
 * Free-mail and consumer ISP domains. A record on one of these has no company
 * website to identify it by, so the only searchable thing is the name.
 */
const FREEMAIL_DOMAINS = new Set([
  'gmail.com','yahoo.com','yahoo.es','aol.com','hotmail.com','outlook.com','icloud.com',
  'msn.com','live.com','me.com','mac.com','ymail.com','rocketmail.com','comcast.net',
  'bellsouth.net','att.net','verizon.net','sbcglobal.net','earthlink.net','charter.net',
  'cox.net','windstream.net','embarqmail.com','tampabay.rr.com','cfl.rr.com',
  'carolina.rr.com','protonmail.com','mail.com','centurylink.net',
]);

/**
 * A domain about permitting is a filing service, not the contractor —
 * centralfloridapermitting.com, gulfcoastpermitting.com, apiprocessing.com.
 * Searching it finds the filer, which is never the company we want.
 */
const FILER_DOMAIN = /(permit|permitting|expedit|filing|processing|codecompliance)/i;

/** Entity or trade words that make a record name a company in its own right. */
const COMPANY_MARKER =
  /\b(LLC|L\.?L\.?C|INC|INCORPORATED|CORP|CORPORATION|COMPANY|CO|LP|LLP|LTD|PLLC|PA|DBA|GROUP|ENTERPRISES?|SERVICES?|SOLUTIONS?|SYSTEMS?|INDUSTRIES|ASSOCIATES|PARTNERS|HOLDINGS|CONTRACTING|CONSTRUCTION|ROOFING|PLUMBING|ELECTRIC|ELECTRICAL|HVAC|HEATING|COOLING|AIR|MECHANICAL|SOLAR|WINDOWS?|DOORS?|SIDING|GLASS|BUILDERS?|HOMES?|EXTERIORS?|GUTTERS?|SCREENS?|SHUTTERS?|CONCRETE|MASONRY|PAVING|FENCE|POOL)\b/i;

/** A licence number in the name identifies the business on its own. */
const LICENCE_IN_NAME = /\b[A-Z]{2,4}\s?\d{5,9}\b/;

export interface SkipDecision { skip: boolean; reason: string; }

/**
 * Decides whether a record is worth paying to search.
 *
 * The rule that matters: a record needs at least ONE identifying anchor — a
 * company website, a licence number, or a name that reads as a business. A bare
 * personal name on a Gmail address has none of the three, and searching it
 * returns a person or the wrong company. Paying for that is worse than skipping
 * it, because a confident wrong answer costs more than a blank.
 */
export function shouldSkipAi(input: EnrichInput): SkipDecision {
  const name = String(input.companyName || '').trim();
  const domain = String(input.website || '').replace(/^https?:\/\//, '')
                   .replace(/^www\./, '').replace(/\/.*$/, '').toLowerCase();

  if (!name) return { skip: true, reason: 'No company name on the record' };

  // A permit-filing domain belongs to the filer, never the contractor.
  if (domain && FILER_DOMAIN.test(domain))
    return { skip: true, reason: `${domain} is a permit filing service, not the contractor` };

  const nameIsCompany = COMPANY_MARKER.test(name) || LICENCE_IN_NAME.test(name);
  const hasRealSite = !!domain && !FREEMAIL_DOMAINS.has(domain);

  if (nameIsCompany || hasRealSite || input.licenceNumber) return { skip: false, reason: '' };

  return {
    skip: true,
    reason: domain
      ? `Personal name on ${domain} — nothing identifying to search`
      : 'Personal name with no email — nothing identifying to search',
  };
}

export async function enrichWithAi(
  client: Anthropic,
  input: EnrichInput,
  opts: { model?: string; maxSearches?: number } = {},
): Promise<AiResult> {
  const base: AiResult = {
    facebook: null, instagram: null, linkedin: null,
    resolvedName: null, resolvedCity: null,
    confidence: 'low', note: '', outcome: 'none',
  };

  try {
    const res = await client.messages.create({
      model: opts.model ?? 'claude-sonnet-5',
      max_tokens: 4096,
      messages: [{ role: 'user', content: buildPrompt(input) }],
      tools: [{
        type: 'web_search_20260209',
        name: 'web_search',
        max_uses: opts.maxSearches ?? 4,
      } as any],
    });

    const text = res.content
      .filter((b: any) => b.type === 'text')
      .map((b: any) => b.text)
      .join('\n');

    const parsed = parseJson(text);
    if (!parsed) return { ...base, outcome: 'error', error: 'Model did not return usable JSON.' };

    const facebook  = isRealUrl(parsed.facebook,  /facebook\.com/i);
    const instagram = isRealUrl(parsed.instagram, /instagram\.com/i);
    // company pages only — a /in/ URL is a person
    const linkedin  = isRealUrl(parsed.linkedin,  /linkedin\.com\/(company|showcase)\//i);

    const anyFound = !!(facebook || instagram || linkedin);
    return {
      facebook, instagram, linkedin,
      resolvedName: typeof parsed.resolvedName === 'string' ? parsed.resolvedName : null,
      resolvedCity: typeof parsed.resolvedCity === 'string' ? parsed.resolvedCity : null,
      confidence: (['high', 'medium', 'low'] as const).includes(parsed.confidence as any)
        ? (parsed.confidence as AiResult['confidence']) : 'low',
      note: typeof parsed.note === 'string' ? parsed.note.slice(0, 240) : '',
      outcome: anyFound ? 'found' : 'none',
    };
  } catch (e: any) {
    return { ...base, outcome: 'error', error: e?.message || 'API call failed.' };
  }
}

/**
 * Batch runner. Sequential with a small gap by default — this is an API, so the
 * limit is spend and rate limits, not blocking. Raise concurrency once you have
 * watched a real run.
 */
export async function enrichAiBatch(
  client: Anthropic,
  items: EnrichInput[],
  opts: {
    concurrency?: number;
    delayMs?: number;
    /** Hard stop, so a runaway loop cannot spend all night. */
    maxRecords?: number;
    /** Skip records with nothing identifying to search. Leave true. */
    applySkipRules?: boolean;
    onProgress?: (done: number, total: number) => void;
    onSkip?: (id: string, reason: string) => void;
  } = {},
): Promise<Map<string, AiResult>> {
  const eligible = (opts.applySkipRules ?? true)
    ? items.filter(i => {
        const d = shouldSkipAi(i);
        if (d.skip) opts.onSkip?.(i.id, d.reason);
        return !d.skip;
      })
    : items;

  const cap = Math.min(eligible.length, opts.maxRecords ?? 5000);
  const queue = eligible.slice(0, cap);
  const concurrency = opts.concurrency ?? 3;
  const delayMs = opts.delayMs ?? 250;
  const results = new Map<string, AiResult>();
  let done = 0;

  const worker = async () => {
    for (;;) {
      const item = queue.shift();
      if (!item) return;
      results.set(item.id, await enrichWithAi(client, item));
      done++;
      opts.onProgress?.(done, cap);
      if (delayMs) await new Promise(r => setTimeout(r, delayMs));
    }
  };

  await Promise.all(Array.from({ length: Math.min(concurrency, queue.length) }, worker));
  return results;
}

/** Rough cost estimate for the confirmation dialog. */
export const estimateCost = (n: number) => ({
  low: (n * 0.01).toFixed(2),
  high: (n * 0.03).toFixed(2),
});
