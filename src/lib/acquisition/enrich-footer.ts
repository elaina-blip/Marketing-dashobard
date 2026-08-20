/**
 * enrich-footer.ts  (v2)
 * -----------------------------------------------------------------------------
 * FREE enrichment pass. Fetches a company's own website and reads the social
 * links out of it — usually the footer, sometimes the header or a contact page.
 *
 * V2 CHANGES, each from a real miss on live contractor sites:
 *   1. v1 read only href="..." attributes. Most WordPress SEO plugins (Yoast,
 *      RankMath, AIOSEO) publish social profiles in a JSON-LD "sameAs" array
 *      inside a <script> tag, never as a link. Now scanned.
 *   2. Whole-document URL scan as a last pass, catching links in inline JS,
 *      data-* attributes and JSON config.
 *   3. Older Facebook formats — profile.php?id= and /pages/Name/123 — accepted.
 *   4. http://www. attempt added, timeout raised, more candidate pages.
 *   5. A client-rendered shell (Wix, Squarespace, React) now reports
 *      outcome 'js_shell' rather than 'none'. That distinction matters: 'none'
 *      means the company lists nothing, 'js_shell' means the page needs the AI
 *      pass or a human. Collapsing them hides why a row failed.
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
  /** Personal LinkedIn profile — weaker signal, kept apart, never auto-suggested. */
  linkedinPersonal: string | null;
  /** Where each link was found, for the audit trail. */
  sourceUrl: string | null;
  /** Which pass found it: a real anchor beats a string in a script. */
  method: 'href' | 'jsonld' | 'raw' | null;
  /**
   * found    — at least one profile
   * none     — page loaded, company genuinely lists nothing
   * js_shell — page loaded but header/footer are assembled in the browser
   * blocked  — a bot wall answered, not the site
   * error    — page did not load
   */
  outcome: 'found' | 'none' | 'js_shell' | 'blocked' | 'error';
  error?: string;
  pagesTried: number;
}

const EMPTY: FooterResult = {
  facebook: null, instagram: null, linkedin: null, linkedinPersonal: null,
  sourceUrl: null, method: null, outcome: 'none', pagesTried: 0,
};

/* Paths worth trying when the homepage has nothing. Ordered by likelihood. */
const FALLBACK_PATHS = [
  '/contact', '/contact-us', '/about', '/about-us',
  '/contact.html', '/about.html', '/connect', '/social', '/follow-us',
];

/** Markers of a client-rendered shell with no real content in the HTML. */
const JS_SHELL = [
  /<div id="root"><\/div>/i, /<div id="app"><\/div>/i, /_next\/static/i,
  /wix-(?:bolt|thunderbolt|perf)/i, /squarespace\.com\/universal/i, /data-reactroot/i,
  // Site builders that assemble header and footer in the browser. These are the
  // ones that produced "footer clearly has a Facebook icon but nothing was
  // found" — the icon is real, it just is not in the served HTML.
  /godaddy\.com\/websites|wsimg\.com|_partials\/|data-aid=/i,   // GoDaddy Website Builder
  /d\.mysimpleshow|dudamobile|dudaone|\.multiscreensite\.com/i,  // Duda
  /elementor-location-(?:header|footer)/i,                        // Elementor templates
  /__NUXT__|window\.__INITIAL_STATE__/i,
  /<noscript>[^<]*(?:enable JavaScript|requires JavaScript)/i,
];

/** Bot walls. Worth telling apart from a site that is simply down. */
const BLOCKED = [
  /just a moment|checking your browser|cf-browser-verification/i,
  /attention required.*cloudflare/i,
  /access denied|request blocked|forbidden/i,
];

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
  'sharethis', 'addthis', 'shopify', 'weebly', 'webflow', 'hubspot', 'mailchimp',
  'google', 'youtube', 'twitter', 'tiktok', 'pinterest', 'meta', 'facebook',
]);

function cleanUrl(raw: string, base: string): string | null {
  try {
    const u = new URL(raw, base);
    if (!/^https?:$/.test(u.protocol)) return null;
    u.hash = '';
    // Strip tracking noise so the same profile does not appear twice.
    ['fbclid', 'igshid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content',
     'utm_term', 'mibextid', 'rdid', 'hl', 'ref', 'referrer']
      .forEach(p => u.searchParams.delete(p));
    return u.toString().replace(/\/$/, '');
  } catch { return null; }
}

function segsOf(url: string): string[] {
  try { return new URL(url).pathname.split('/').filter(Boolean); } catch { return []; }
}

/** Older business pages are legitimate: /profile.php?id= and /pages/Name/123. */
function fbHandleOk(url: string): boolean {
  try {
    const u = new URL(url);
    const segs = segsOf(url);
    if (segs[0] === 'profile.php' || u.searchParams.has('id')) return true;
    if (segs[0] === 'pages' || segs[0] === 'p') return segs.length > 1;
    return !!segs[0] && !NOT_THE_CLIENT.has(segs[0].toLowerCase());
  } catch { return false; }
}

function igHandleOk(url: string): boolean {
  const seg = segsOf(url)[0] || '';
  return !!seg && !NOT_THE_CLIENT.has(seg.toLowerCase());
}

function liCompanyOk(url: string): boolean {
  if (!/linkedin\.com\/(company|showcase)\//i.test(url)) return false;
  const seg = segsOf(url)[1] || '';
  return !NOT_THE_CLIENT.has(seg.toLowerCase());
}

/**
 * Every social URL in the document, wherever it lives — anchors first, then
 * JSON-LD, then anything else. v1 saw only the first of these three.
 */
function allCandidateUrls(html: string) {
  const href: string[] = [];
  const jsonld: string[] = [];
  const raw: string[] = [];

  for (const m of html.matchAll(/href\s*=\s*["']([^"']+)["']/gi)) href.push(m[1]);

  for (const block of html.matchAll(
      /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    // JSON escapes its slashes — https:\/\/example.com — so unescape first,
    // otherwise the URL pattern never matches and the whole block is missed.
    const body = block[1].replace(/\\\//g, '/');
    for (const u of body.matchAll(/https?:\/\/[^"'\s\\]+/gi)) jsonld.push(u[0]);
  }

  // Unescape first, exactly as the JSON-LD pass above does. Inline JS and
  // data-* attributes carry JSON-encoded URLs, and the pattern here only
  // tolerated escaped slashes in the // after the protocol — so an escaped
  // slash anywhere in the PATH made the whole URL invisible to this scan.
  const flat = html.replace(/\\\//g, '/');
  for (const m of flat.matchAll(
      /(?:https?:)?\/\/(?:www\.)?(?:facebook|instagram|linkedin)\.com\/[A-Za-z0-9._\-\/?=&%]+/gi)) {
    raw.push(m[0].replace(/^\/\//, 'https://'));
  }

  return { href, jsonld, raw };
}

export function extractSocials(html: string, pageUrl: string) {
  const out = {
    facebook: null as string | null,
    instagram: null as string | null,
    linkedin: null as string | null,
    linkedinPersonal: null as string | null,
    method: null as FooterResult['method'],
  };

  const g = allCandidateUrls(html);
  const passes: [FooterResult['method'], string[]][] = [
    ['href', g.href], ['jsonld', g.jsonld], ['raw', g.raw],
  ];

  for (const [method, list] of passes) {
    for (const rawUrl of list) {
      const url = cleanUrl(rawUrl, pageUrl);
      if (!url) continue;
      const lower = url.toLowerCase();

      if (!out.facebook && /(?:\/\/|\.)facebook\.com\//.test(lower)
          && !FB_JUNK.test(lower) && fbHandleOk(url)) {
        out.facebook = url; if (!out.method) out.method = method;
      }
      if (!out.instagram && /(?:\/\/|\.)instagram\.com\//.test(lower)
          && !IG_JUNK.test(lower) && igHandleOk(url)) {
        out.instagram = url; if (!out.method) out.method = method;
      }
      if (!out.linkedin && !LI_JUNK.test(lower) && liCompanyOk(url)) {
        out.linkedin = url; if (!out.method) out.method = method;
      }
      if (!out.linkedinPersonal && /linkedin\.com\/in\//i.test(lower) && !LI_JUNK.test(lower)) {
        out.linkedinPersonal = url;
      }
    }
  }
  return out;
}

const looksLikeShell = (html: string) =>
  html.length < 40_000 && JS_SHELL.some(re => re.test(html));

interface FetchOutcome { html: string | null; status: number; blocked: boolean; }

async function fetchPage(url: string, timeoutMs: number): Promise<FetchOutcome> {
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
    if (!res.ok) {
      return { html: null, status: res.status, blocked: res.status === 403 || res.status === 429 };
    }
    const type = res.headers.get('content-type') || '';
    if (!/text\/html/i.test(type)) return { html: null, status: res.status, blocked: false };
    // Cap the read — a handful of sites serve enormous pages.
    const raw = await res.text();
    const text = raw.length > 3_000_000 ? raw.slice(0, 3_000_000) : raw;
    return { html: text, status: res.status, blocked: BLOCKED.some(re => re.test(text.slice(0, 4000))) };
  } catch {
    return { html: null, status: 0, blocked: false };
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
  // Contractor hosting is frequently slow; 8s was cutting off live sites.
  const timeoutMs = opts.timeoutMs ?? 12_000;
  const clean = domain.replace(/^https?:\/\//, '').replace(/^www\./, '')
                      .replace(/\/.*$/, '').trim();
  if (!clean || !clean.includes('.')) {
    return { ...EMPTY, outcome: 'error', error: 'Not a domain.' };
  }

  const bases = [`https://${clean}`, `https://www.${clean}`,
                 `http://${clean}`, `http://www.${clean}`];

  const acc = { facebook: null as string | null, instagram: null as string | null,
                linkedin: null as string | null, linkedinPersonal: null as string | null };
  let sourceUrl: string | null = null;
  let method: FooterResult['method'] = null;
  let shellSeen = false;
  let blockedSeen = false;
  let pagesTried = 0;

  const tryUrl = async (url: string) => {
    pagesTried++;
    const { html, blocked } = await fetchPage(url, timeoutMs);
    if (blocked) blockedSeen = true;
    if (html === null) return false;
    if (looksLikeShell(html)) shellSeen = true;
    const got = extractSocials(html, url);
    (['facebook', 'instagram', 'linkedin', 'linkedinPersonal'] as const).forEach(k => {
      if (got[k] && !acc[k]) {
        acc[k] = got[k];
        if (!sourceUrl) sourceUrl = url;
        if (!method) method = got.method;
      }
    });
    return true;
  };

  let base: string | null = null;
  for (const b of bases) { if (await tryUrl(b)) { base = b; break; } }
  if (!base) {
    return blockedSeen
      ? { ...EMPTY, outcome: 'blocked', error: 'A bot wall answered instead of the site.', pagesTried }
      : { ...EMPTY, outcome: 'error', error: 'Site did not load.', pagesTried };
  }

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
    method,
    pagesTried,
    outcome: anyFound ? 'found'
           : blockedSeen ? 'blocked'
           : shellSeen ? 'js_shell'
           : 'none',
  };
}

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
