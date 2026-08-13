/**
 * enrich-footer.ts
 * -----------------------------------------------------------------------------
 * FREE enrichment pass. Fetches a company's own website and reads the social
 * links out of it — usually the footer, sometimes the header or a contact page.
 *
 * No API key, no cost, no rate-limit exposure. Each request goes to the
 * contractor's own server, one company at a time, with a normal browser
 * User-Agent. This is the same thing a person does by opening the site and
 * scrolling to the bottom.
 *
 * Hit rate is modest — plenty of contractor sites list no socials at all — but
 * every hit is unambiguous, because the link came from the company itself. Run
 * this BEFORE the paid pass and only send the misses to the API.
 *
 * No dependencies beyond fetch (Node 18+).
 * -----------------------------------------------------------------------------
 */

export interface FooterResult {
  facebook: string | null;
  instagram: string | null;
  linkedin: string | null;
  /** Where each link was found, for the audit trail. */
  sourceUrl: string | null;
  /** 'none' when the site loaded but listed nothing; 'error' when it did not load. */
  outcome: 'found' | 'none' | 'error';
  error?: string;
}

const EMPTY: FooterResult = {
  facebook: null, instagram: null, linkedin: null,
  sourceUrl: null, outcome: 'none',
};

/* Paths worth trying when the homepage has nothing. Ordered by likelihood. */
const FALLBACK_PATHS = ['/contact', '/contact-us', '/about', '/about-us'];

/* Platform URLs that are never a company profile. */
const FB_JUNK = /\/(sharer|share\.php|dialog|plugins|tr\?|login|help|policies|business\/?$)/i;
const IG_JUNK = /instagram\.com\/(p|reel|reels|explore|accounts|about|developer)\//i;
const LI_JUNK = /linkedin\.com\/(shareArticle|sharing|feed|pulse|posts|jobs|learning|help|legal)/i;

/* Aggregators and marketing agencies whose own socials appear in site footers —
   "Website by X" links would otherwise be captured as the contractor's. */
const NOT_THE_CLIENT = new Set([
  'buildzoom', 'houzz', 'angi', 'angieslist', 'homeadvisor', 'thumbtack', 'yelp',
  'bbb', 'nextdoor', 'godaddy', 'wix', 'squarespace', 'wordpress', 'duda',
  'gonation', 'townsquareinteractive', 'scorpion', 'blueprint', 'hibu',
]);

function cleanUrl(raw: string, base: string): string | null {
  try {
    const u = new URL(raw, base);
    if (!/^https?:$/.test(u.protocol)) return null;
    u.hash = '';
    // Strip tracking noise so the same profile does not appear twice.
    ['fbclid', 'igshid', 'utm_source', 'utm_medium', 'utm_campaign', 'mibextid', 'rdid']
      .forEach(p => u.searchParams.delete(p));
    return u.toString().replace(/\/$/, '');
  } catch { return null; }
}

function firstHandleSegment(url: string): string {
  try {
    const seg = new URL(url).pathname.split('/').filter(Boolean)[0] || '';
    return seg.toLowerCase();
  } catch { return ''; }
}

/** Pulls candidate social links out of raw HTML. */
export function extractSocials(html: string, pageUrl: string) {
  const out = { facebook: null as string | null, instagram: null as string | null, linkedin: null as string | null };

  // href="..." and href='...' — deliberately not a DOM parse, so this stays
  // dependency-free and tolerant of malformed markup.
  const hrefs = [...html.matchAll(/href\s*=\s*["']([^"']+)["']/gi)].map(m => m[1]);

  for (const raw of hrefs) {
    const url = cleanUrl(raw, pageUrl);
    if (!url) continue;
    const lower = url.toLowerCase();

    if (!out.facebook && /(?:^|\/\/|\.)facebook\.com\//.test(lower) && !FB_JUNK.test(lower)) {
      const seg = firstHandleSegment(url);
      if (seg && !NOT_THE_CLIENT.has(seg)) out.facebook = url;
    }
    if (!out.instagram && /(?:^|\/\/|\.)instagram\.com\//.test(lower) && !IG_JUNK.test(lower)) {
      const seg = firstHandleSegment(url);
      if (seg && !NOT_THE_CLIENT.has(seg)) out.instagram = url;
    }
    if (!out.linkedin && /(?:^|\/\/|\.)linkedin\.com\//.test(lower) && !LI_JUNK.test(lower)) {
      // company pages only — /in/ is a person, not the business
      if (/linkedin\.com\/(company|showcase)\//i.test(lower)) {
        const seg = new URL(url).pathname.split('/').filter(Boolean)[1] || '';
        if (!NOT_THE_CLIENT.has(seg.toLowerCase())) out.linkedin = url;
      }
    }
  }
  return out;
}

async function fetchPage(url: string, timeoutMs: number): Promise<string | null> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ac.signal,
      redirect: 'follow',
      headers: {
        // Identify as a normal browser. Some hosts 403 an empty UA.
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
                      '(KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    if (!res.ok) return null;
    const type = res.headers.get('content-type') || '';
    if (!/text\/html/i.test(type)) return null;
    // Cap the read — a handful of sites serve enormous pages.
    const text = await res.text();
    return text.length > 2_000_000 ? text.slice(0, 2_000_000) : text;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Scrapes one company website. Tries https then http, homepage then a couple of
 * likely inner pages, and stops as soon as all three platforms are found.
 */
export async function enrichFromFooter(
  domain: string,
  opts: { timeoutMs?: number; tryFallbackPaths?: boolean } = {},
): Promise<FooterResult> {
  const timeoutMs = opts.timeoutMs ?? 8000;
  const clean = domain.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '').trim();
  if (!clean || !clean.includes('.')) return { ...EMPTY, outcome: 'error', error: 'Not a domain.' };

  const bases = [`https://${clean}`, `https://www.${clean}`, `http://${clean}`];
  let loadedAny = false;
  const acc = { facebook: null as string | null, instagram: null as string | null, linkedin: null as string | null };
  let sourceUrl: string | null = null;

  const tryUrl = async (url: string) => {
    const html = await fetchPage(url, timeoutMs);
    if (html === null) return false;
    loadedAny = true;
    const got = extractSocials(html, url);
    if (got.facebook && !acc.facebook)   { acc.facebook = got.facebook;   sourceUrl ??= url; }
    if (got.instagram && !acc.instagram) { acc.instagram = got.instagram; sourceUrl ??= url; }
    if (got.linkedin && !acc.linkedin)   { acc.linkedin = got.linkedin;   sourceUrl ??= url; }
    return true;
  };

  let base: string | null = null;
  for (const b of bases) {
    if (await tryUrl(b)) { base = b; break; }
  }
  if (!base) return { ...EMPTY, outcome: 'error', error: 'Site did not load.' };

  const complete = () => acc.facebook && acc.instagram && acc.linkedin;
  if (!complete() && (opts.tryFallbackPaths ?? true)) {
    for (const p of FALLBACK_PATHS) {
      if (complete()) break;
      await tryUrl(base + p);
    }
  }

  const anyFound = !!(acc.facebook || acc.instagram || acc.linkedin);
  return {
    ...acc,
    sourceUrl,
    outcome: anyFound ? 'found' : (loadedAny ? 'none' : 'error'),
  };
}

/**
 * Runs a batch with bounded concurrency and a small delay between requests.
 *
 * These are separate hosts, so the pacing is courtesy rather than evasion — it
 * keeps us from hammering a shared host and keeps memory flat on large runs.
 */
export async function enrichFooterBatch(
  items: { id: string; domain: string }[],
  opts: { concurrency?: number; delayMs?: number; onProgress?: (done: number, total: number) => void } = {},
): Promise<Map<string, FooterResult>> {
  const concurrency = opts.concurrency ?? 5;
  const delayMs = opts.delayMs ?? 200;
  const results = new Map<string, FooterResult>();
  let done = 0;
  const queue = [...items];

  const worker = async () => {
    for (;;) {
      const item = queue.shift();
      if (!item) return;
      try {
        results.set(item.id, await enrichFromFooter(item.domain));
      } catch (e: any) {
        results.set(item.id, { ...EMPTY, outcome: 'error', error: e?.message || 'Unknown error' });
      }
      done++;
      opts.onProgress?.(done, items.length);
      if (delayMs) await new Promise(r => setTimeout(r, delayMs));
    }
  };

  await Promise.all(Array.from({ length: Math.min(concurrency, queue.length) }, worker));
  return results;
}
