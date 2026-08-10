/**
 * acquisition-logic.ts
 * -----------------------------------------------------------------------------
 * Pure functions lifted from APS_Social_Acquisition_Workbench.html.
 * No DOM, no framework, no side effects — drop this file in and import from it.
 *
 * Everything here is already tested against 500 real permit records. Do not
 * rewrite the rules; if output differs from the reference HTML, the HTML is right.
 * -----------------------------------------------------------------------------
 */

/* ========================== types ========================== */

export type Verdict = 'confirmed' | 'likely' | 'employer' | 'conflict' | 'unusable';
export type Stage = 'research' | 'follow' | 'archive';
export type Platform = 'fb' | 'ig' | 'li';

export interface CompanyRow {
  id?: string;
  company_name: string;
  vertical: string;
  total_permits: number;
  priority_score: number;
  state: string;
  metro: string;
  primary_jurisdiction: string;
  permit_types: string;
  email: string;
  records_on_domain: number;
  stage: Stage;
  fb_found: boolean | null;
  ig_found: boolean | null;
  li_found: boolean | null;
  fb_followed: string | null;
  ig_followed: string | null;
  li_followed: string | null;
  fb_back: boolean | null;
  ig_back: boolean | null;
  li_back: boolean | null;
  engagements: number;
  notes: string;
  researched_by: string;
  researched_on: string | null;
  recheck: boolean;
  last_seen_in_upload: string | null;
}

export interface Check {
  verdict: Verdict;
  domain: string;
  core: string;
  why: string;
}

/* ========================== blocklists ========================== */

export const FREEMAIL = new Set<string>(['gmail.com','yahoo.com','yahoo.es','aol.com','hotmail.com','outlook.com','icloud.com',
 'msn.com','live.com','me.com','mac.com','ymail.com','rocketmail.com','comcast.net','bellsouth.net','att.net',
 'verizon.net','sbcglobal.net','earthlink.net','charter.net','cox.net','windstream.net','embarqmail.com',
 'tampabay.rr.com','cfl.rr.com','carolina.rr.com','protonmail.com','mail.com','centurylink.net']);
export const AGGREGATOR = new Set<string>(['buildzoom.com','blockrenovation.com','buzzfile.com','activatemylicense.com',
 'tempemail.tmp','ecslimited.com','metrocode.com','example.com','noemail.com','email.com','test.com']);
export const COMPETITOR = new Set<string>(['permitflowteam.com','expeditepermit.com']);

const ENTITY = /\b(LLC|L\.?L\.?C|INC|INCORPORATED|CORP|CORPORATION|CO|COMPANY|LP|LLP|LTD|PLLC|PA|DBA|THE|AND|OF)\b/g;

const TRADE = new Set<string>(['ROOFING','ROOF','ROOFERS','PLUMBING','PLUMBER','ELECTRIC','ELECTRICAL','HVAC','HEATING',
 'AIR','COOLING','MECHANICAL','SOLAR','WINDOWS','WINDOW','DOORS','DOOR','SIDING','GLASS','CONSTRUCTION',
 'CONTRACTING','CONTRACTORS','CONTRACTOR','BUILDERS','BUILDER','HOMES','HOME','SERVICES','SERVICE','SOLUTIONS',
 'GROUP','ENTERPRISES','SYSTEMS','INDUSTRIES','DEVELOPMENT','REMODELING','RESTORATION','SPECIALIST',
 'SPECIALISTS','EXTERIORS','EXTERIOR','GENERAL','RESIDENTIAL','COMMERCIAL','PROFESSIONAL','QUALITY','CUSTOM',
 'AMERICAN','NATIONAL','PREMIER','ELITE','ADVANCED','ALL','PRO']);

/* ========================== normalisation ========================== */

/** Strips parentheticals, licence numbers, punctuation. */
export function cleanName(s: string): string {
  return String(s || '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\b[A-Z]{2,4}\s?\d{5,}\b/gi, ' ')
    .replace(/[-–—]\s*[A-Z0-9]{4,}\b/g, ' ')
    .replace(/[^A-Za-z0-9\s&]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokens(name: string): string[] {
  return cleanName(name).toUpperCase().replace(ENTITY, ' ')
    .split(/\s+/).filter(t => t.length > 1 && !/^\d+$/.test(t));
}

export function domainOf(email: string): string {
  const p = String(email || '').split('@');
  return p.length === 2 ? p[1].toLowerCase().trim() : '';
}

/** Domain minus TLD, punctuation removed: "bayonet-inc.com" -> "bayonetinc" */
export function domainCore(d: string): string {
  const s = d.replace(/^www\./, '').split('.');
  return s.slice(0, Math.max(1, s.length - 1)).join('').replace(/[^a-z0-9]/g, '');
}

/** Domain as readable words: "flight.builders" -> "flight builders" */
export function domainWords(d: string): string {
  const s = d.replace(/^www\./, '').split('.');
  const keep = s.length > 2
    ? s.slice(0, -1)
    : [s[0]].concat(/^(com|net|org|co|us|biz|info)$/.test(s[1] || '') ? [] : [s[1]]);
  return keep.join(' ').replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Match key for dedupe. Entity words and licence numbers removed, spaces stripped. */
export function normKey(n: string): string {
  return String(n || '').toUpperCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\b[A-Z]{2,4}\s?\d{5,}\b/g, ' ')
    .replace(/[^A-Z0-9\s]/g, ' ')
    .replace(ENTITY, ' ')
    .replace(/\s+/g, '')
    .trim();
}

/* ========================== 4.1 domain verification ========================== */

export function verify(input: { name: string; email: string; group?: number }): Check {
  const domain = domainOf(input.email);
  const core = domainCore(domain);
  const toks = tokens(input.name);
  const distinct = toks.filter(t => !TRADE.has(t) && t.length > 2);
  const compressed = toks.join('').toLowerCase();
  const base = { domain, core };

  if (!domain)
    return { ...base, verdict: 'unusable', why: 'No email on this record — search by company name.' };
  if (AGGREGATOR.has(domain))
    return { ...base, verdict: 'unusable', why: 'Data aggregator domain, not the contractor.' };
  if (COMPETITOR.has(domain))
    return { ...base, verdict: 'unusable', why: 'A competitor filed this — strong target. Search by name.' };
  if (FREEMAIL.has(domain))
    return { ...base, verdict: 'unusable', why: 'Free email provider — no company site to derive.' };

  let score = 0;
  const why: string[] = [];

  if (compressed && core.includes(compressed)) {
    score += 60;
    why.push('Domain contains the full name.');
  }
  const matched = distinct.filter(t => core.includes(t.toLowerCase()) && t.length > 3);
  if (matched.length && score < 60) {
    score += matched.length === distinct.length ? 45 : 28;
    why.push('Matched: ' + matched.join(', ') + '.');
  }
  const tradeMatched = toks.filter(t => TRADE.has(t) && core.includes(t.toLowerCase()));
  if (tradeMatched.length) {
    score += 8;
    if (!matched.length) why.push('Trade word only: ' + tradeMatched.join(', ') + '. Weak on its own.');
  }
  const initials = distinct.map(t => t[0]).join('').toLowerCase();
  if (initials.length >= 2 && core.startsWith(initials) && score < 45) {
    score += 25;
    why.push('Opens with initials ' + initials.toUpperCase() + '.');
  }

  const group = input.group || 0;
  if (group > 1)
    return { ...base, verdict: 'employer',
      why: group + ' records share ' + domain + ' — one employer, not ' + group + ' companies. Search the employer.' };
  if (score === 0)
    return { ...base, verdict: 'conflict',
      why: 'Name and domain disagree. The domain is probably the operating firm — search that instead.' };
  if (score >= 55)
    return { ...base, verdict: 'confirmed', why: why.join(' ') };
  return { ...base, verdict: 'likely', why: why.join(' ') };
}

export const VERDICT_LABEL: Record<Verdict, string> = {
  confirmed: 'Confirmed',
  likely: 'Likely',
  conflict: 'Check domain',
  employer: 'Employer group',
  unusable: 'By name only',
};

/* ========================== 4.2 search term substitution ========================== */

/**
 * Two thirds of high-permit records are licence qualifiers or employees of a
 * larger builder. Searching the person's name finds a person. When the domain
 * names a different firm, search the firm — and always surface `fromDomain`
 * in the UI so the substitution is visible.
 */
export function searchTerm(name: string, check: Check): { term: string; fromDomain: boolean } {
  if (check.verdict === 'employer' || check.verdict === 'conflict') {
    const w = domainWords(check.domain);
    if (w) return { term: w, fromDomain: true };
  }
  return { term: cleanName(name), fromDomain: false };
}

export function searchUrls(row: CompanyRow, check: Check, term: string) {
  const city = String(
    row.primary_jurisdiction && row.primary_jurisdiction !== '—'
      ? row.primary_jurisdiction : row.metro || ''
  ).replace(/\(.*\)/, '').trim();
  const q = encodeURIComponent;
  return {
    site: check.verdict === 'unusable' || !check.domain ? '' : 'https://' + check.domain.replace(/^www\./, ''),
    google: 'https://www.google.com/search?q=' + q('"' + term + '" ' + city + ' ' + row.state + ' contractor'),
    facebook: 'https://www.facebook.com/search/pages/?q=' + q(term + ' ' + city),
    instagram: 'https://www.instagram.com/explore/search/keyword/?q=' + q(term),
    linkedin: 'https://www.linkedin.com/search/results/companies/?keywords=' + q(term),
  };
}

/* ========================== 4.3 licence board routing ========================== */

interface Board { name: string; url: string; }

/** Board depends on state AND vertical. NC splits three ways — do not flatten. */
const BOARDS: Record<string, Record<string, Board>> = {
  FL: { all: { name: 'DBPR', url: 'https://www.myfloridalicense.com/wl11.asp?mode=0&SID=' } },
  TN: { all: { name: 'TN Commerce', url: 'https://search.cloud.commerce.tn.gov/' } },
  GA: { all: { name: 'GA SOS', url: 'https://verify.sos.ga.gov/verification/' } },
  TX: { all: { name: 'TDLR', url: 'https://www.tdlr.texas.gov/LicenseSearch/' } },
  NC: {
    'Electrical': { name: 'NCBEEC', url: 'https://arls-public.ncbeec.org/Public/Search' },
    'Plumbing': { name: 'NC Plumbing/Heating', url: 'https://public.nclicensing.org/Public/Search' },
    'Mechanical-HVAC': { name: 'NC Plumbing/Heating', url: 'https://public.nclicensing.org/Public/Search' },
    all: { name: 'NCLBGC', url: 'https://nclbgc.org/' },
  },
};

export function licenceBoard(state: string, vertical: string): Board | null {
  const b = BOARDS[state];
  if (!b) return null;
  return b[vertical] || b.all || null;
}

/** Pulls "CRC034602" / "EC13008492" out of a company name, if present. */
export function licenceNumber(name: string): string {
  const m = String(name || '').toUpperCase().match(/\b([A-Z]{2,4}\s?\d{5,9})\b/);
  return m ? m[1].replace(/\s/g, '') : '';
}

/* ========================== 5 merge on import ========================== */

export const RECHECK_MONTHS = 9;

export interface IncomingRow {
  company_name: string; vertical: string; total_permits: number; priority_score: number;
  state: string; metro: string; primary_jurisdiction: string; permit_types: string;
  email: string; records_on_domain: number;
}

export interface MergePlan {
  fresh: IncomingRow[];
  update: { existingId: string; incoming: IncomingRow; matchedBy: MatchRule }[];
  recheck: { existingId: string; incoming: IncomingRow; matchedBy: MatchRule }[];
  verticalConflicts: { existingId: string; incoming: IncomingRow }[];
  matchCounts: Record<MatchRule, number>;
}
export type MatchRule = 'email' | 'domain' | 'name';

function monthsAgo(dateStr: string | null): number {
  if (!dateStr) return 999;
  const t = new Date(dateStr + 'T00:00:00');
  if (isNaN(t.getTime())) return 999;
  return (Date.now() - t.getTime()) / 86400000 / 30.44;
}

/** True when a domain is shared by many people and must NOT be used to match. */
function isSharedDomain(domain: string, recordsOnDomain: number): boolean {
  return recordsOnDomain > 1
    || FREEMAIL.has(domain) || AGGREGATOR.has(domain) || COMPETITOR.has(domain);
}

function buildIndex(existing: CompanyRow[]) {
  const byEmail = new Map<string, CompanyRow>();
  const byDomain = new Map<string, CompanyRow>();
  const byName = new Map<string, CompanyRow>();
  for (const r of existing) {
    const e = String(r.email || '').toLowerCase().trim();
    if (e.includes('@') && !byEmail.has(e)) byEmail.set(e, r);

    const dom = domainOf(r.email);
    if (dom && !isSharedDomain(dom, r.records_on_domain)) {
      const k = dom + '|' + r.state;
      if (!byDomain.has(k)) byDomain.set(k, r);
    }
    const nk = normKey(r.company_name);
    if (nk.length > 3) {
      const k = nk + '|' + r.state;
      if (!byName.has(k)) byName.set(k, r);
    }
  }
  return { byEmail, byDomain, byName };
}

/**
 * Builds the merge plan. Writes nothing — show the counts to the user first,
 * then call applyMergePlan. A silent merge that swallows thousands of rows is
 * not noticed until the numbers look wrong months later.
 */
export function planMerge(existing: CompanyRow[], incoming: IncomingRow[]): MergePlan {
  const idx = buildIndex(existing);
  const plan: MergePlan = {
    fresh: [], update: [], recheck: [], verticalConflicts: [],
    matchCounts: { email: 0, domain: 0, name: 0 },
  };
  const seenInFile = new Set<string>();

  for (const rec of incoming) {
    const dupKey = (String(rec.email || '').toLowerCase() || normKey(rec.company_name)) + '|' + rec.state;
    if (seenInFile.has(dupKey)) continue;
    seenInFile.add(dupKey);

    let hit: CompanyRow | undefined;
    let how: MatchRule | null = null;

    const e = String(rec.email || '').toLowerCase().trim();
    if (e.includes('@') && idx.byEmail.has(e)) { hit = idx.byEmail.get(e); how = 'email'; }

    if (!hit) {
      const dom = domainOf(rec.email);
      if (dom && !isSharedDomain(dom, rec.records_on_domain)) {
        const k = dom + '|' + rec.state;
        if (idx.byDomain.has(k)) { hit = idx.byDomain.get(k); how = 'domain'; }
      }
    }
    if (!hit) {
      const nk = normKey(rec.company_name);
      if (nk.length > 3) {
        const k = nk + '|' + rec.state;
        if (idx.byName.has(k)) { hit = idx.byName.get(k); how = 'name'; }
      }
    }

    if (!hit || !how) { plan.fresh.push(rec); continue; }

    plan.matchCounts[how]++;
    const id = hit.id as string;
    if (hit.vertical && rec.vertical && hit.vertical !== rec.vertical)
      plan.verticalConflicts.push({ existingId: id, incoming: rec });

    const wasNoneFound = hit.fb_found === false && hit.ig_found === false && hit.li_found === false;
    if (wasNoneFound && monthsAgo(hit.researched_on) >= RECHECK_MONTHS)
      plan.recheck.push({ existingId: id, incoming: rec, matchedBy: how });
    else
      plan.update.push({ existingId: id, incoming: rec, matchedBy: how });
  }
  return plan;
}

/** Fields refreshed on a match. Everything not listed here is research work — never touch it. */
export function refreshedFields(rec: IncomingRow, today: string) {
  return {
    total_permits: rec.total_permits,
    priority_score: rec.priority_score,
    permit_types: rec.permit_types,
    records_on_domain: rec.records_on_domain,
    primary_jurisdiction: rec.primary_jurisdiction,
    metro: rec.metro,
    last_seen_in_upload: today,
  };
}

/** Applied on top of refreshedFields for a stale none-found row returning to Research. */
export function recheckFields(rec: IncomingRow, today: string) {
  return {
    ...refreshedFields(rec, today),
    fb_found: null, ig_found: null, li_found: null,
    stage: 'research' as Stage,
    recheck: true,
    researched_by: '',
    researched_on: null,
  };
}

/* ========================== metrics ========================== */

export const foundCount = (r: CompanyRow) =>
  (r.fb_found === true ? 1 : 0) + (r.ig_found === true ? 1 : 0) + (r.li_found === true ? 1 : 0);

/** Touched = any of the three flags is non-null. This is what "researched" means. */
export const isTouched = (r: CompanyRow) =>
  r.fb_found !== null || r.ig_found !== null || r.li_found !== null;

export const followedCount = (r: CompanyRow) =>
  (r.fb_followed ? 1 : 0) + (r.ig_followed ? 1 : 0) + (r.li_followed ? 1 : 0);

export const MIN_SAMPLE = 8;
export const CONFIDENT_SAMPLE = 30;

/**
 * Hit rate = found / checked. Null flags are excluded from both sides, which is
 * why the flags must be nullable — a checked-and-absent is data, an unchecked is not.
 * Returns null below MIN_SAMPLE rather than a misleading number.
 */
export function hitRates(rowsForVertical: CompanyRow[]) {
  const checked = rowsForVertical.filter(isTouched).length;
  const f = (k: 'fb_found' | 'ig_found' | 'li_found') =>
    rowsForVertical.filter(r => r[k] === true).length;
  if (checked < MIN_SAMPLE)
    return { checked, fb: null, ig: null, li: null, confident: false };
  return {
    checked,
    fb: f('fb_found') / checked,
    ig: f('ig_found') / checked,
    li: f('li_found') / checked,
    confident: checked >= CONFIDENT_SAMPLE,
  };
}

export interface PlanRow {
  vertical: string; research_per_month: number;
  fb_rate: number; ig_rate: number; li_rate: number;
}

/** Monthly targets derive from the plan — never hard-code them. */
export function targetsFromPlan(plan: PlanRow[]) {
  const t = { research: 0, fb: 0, ig: 0, li: 0 };
  for (const p of plan) {
    t.research += p.research_per_month;
    t.fb += Math.round(p.research_per_month * p.fb_rate);
    t.ig += Math.round(p.research_per_month * p.ig_rate);
    t.li += Math.round(p.research_per_month * p.li_rate);
  }
  return t;
}
