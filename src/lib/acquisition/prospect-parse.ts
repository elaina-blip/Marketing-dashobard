/**
 * prospect-parse.ts
 * -----------------------------------------------------------------------------
 * Parses follower / following lists pasted from a social profile page, and sorts
 * the names into buckets by rule alone — no lookups, no cost.
 *
 * Written against REAL pastes from Instagram and Facebook, not constructed
 * samples. Four things those revealed, all of which are handled here:
 *
 *   1. Facebook interleaves metadata lines that belong to the entry ABOVE them —
 *      "Landrum, South Carolina", "Attorney at Morgan & Morgan". Left in, each
 *      becomes a phantom record and shifts every pairing after it.
 *   2. Instagram usernames are ALWAYS lowercase. That single fact separates a
 *      handle from a one-word display name sitting on the next line, which was
 *      otherwise splitting real pairs into two broken records.
 *   3. Facebook and LinkedIn paste display names only. Running handle detection
 *      there invents wrong handles from adjacent lines.
 *   4. Trade vocabulary alone discards real businesses — Appliance Direct,
 *      Teron Metal Components, Fastest Labs. A general business vocabulary and
 *      an "unsure" bucket fix that.
 *
 * No dependencies.
 * -----------------------------------------------------------------------------
 */

/* Kept in sync with acquisition-logic.ts — same stripping rules, so a name
   classified here matches the same name classified there. */
const ENTITY =
  /\b(LLC|L\.?L\.?C|INC|INCORPORATED|CORP|CORPORATION|CO|COMPANY|LP|LLP|LTD|PLLC|PA|DBA|THE|AND|OF)\b/g;

const COMPANY_MARKER =
  /\b(LLC|L\.?L\.?C|INC|INCORPORATED|CORP|CORPORATION|COMPANY|CO|LP|LLP|LTD|PLLC|PA|DBA|GROUP|ENTERPRISES?|SERVICES?|SOLUTIONS?|SYSTEMS?|INDUSTRIES|ASSOCIATES|PARTNERS|HOLDINGS|CONTRACTING|CONSTRUCTION)\b/i;

const TRADE = new Set<string>([
  'ROOFING','ROOF','ROOFERS','PLUMBING','PLUMBER','ELECTRIC','ELECTRICAL','HVAC','HEATING',
  'AIR','COOLING','MECHANICAL','SOLAR','WINDOWS','WINDOW','DOORS','DOOR','SIDING','GLASS',
  'CONSTRUCTION','CONTRACTING','CONTRACTORS','CONTRACTOR','BUILDERS','BUILDER','HOMES','HOME',
  'SERVICES','SERVICE','SOLUTIONS','GROUP','ENTERPRISES','SYSTEMS','INDUSTRIES','DEVELOPMENT',
  'REMODELING','RESTORATION','SPECIALIST','SPECIALISTS','EXTERIORS','EXTERIOR','GENERAL',
  'RESIDENTIAL','COMMERCIAL','PROFESSIONAL','QUALITY','CUSTOM','AMERICAN','NATIONAL','PREMIER',
  'ELITE','ADVANCED','ALL','PRO',
]);

/* TRADE exists to STRIP filler out of company names, so it is deliberately
   narrow. Detecting whether a pasted name IS a trade business needs a much wider
   vocabulary — gutters, screens, concrete and paving are companies, not filler. */
export const PRO_TRADE = new Set<string>([...TRADE,
 'GUTTERS','GUTTER','SCREENS','SCREEN','SHUTTERS','SHUTTER','ENCLOSURES','ENCLOSURE',
 'CONCRETE','MASONRY','STUCCO','PAVING','ASPHALT','FENCE','FENCING','DECK','DECKING',
 'POOL','POOLS','SPA','LANDSCAPE','LANDSCAPING','IRRIGATION','PAINTING','PAINTERS',
 'DRYWALL','FLOORING','FLOORS','TILE','CABINETS','COUNTERTOPS','GRANITE','INSULATION',
 'FRAMING','CARPENTRY','WELDING','EXCAVATION','GRADING','DEMOLITION','SEPTIC','WELL',
 'GENERATOR','GENERATORS','LIGHTING','SECURITY','ALARM','GARAGE','AWNING','AWNINGS',
 'CANOPY','LANAI','PATIO','PORCH','SUNROOM','SUNROOMS','PERGOLA','RAILING','RAILINGS',
 'CHIMNEY','WATERPROOFING','SEALING','SEALCOATING','PRESSURE','CLEANING','RESTORATION',
 'REMEDIATION','MITIGATION','INSPECTION','INSPECTIONS','SURVEYING','ENGINEERING',
 'ARCHITECT','ARCHITECTS','DESIGN','BUILD','BUILDING','SUPPLY','SUPPLIES','DISTRIBUTION',
 'DISTRIBUTORS','WHOLESALE','MATERIALS','LUMBER','HARDWARE','EQUIPMENT','RENTAL',
 'RENTALS','TRUSS','TRUSSES','STEEL','ALUMINUM','VINYL','ROOFS','SOLARPOWER',
 'PHOTOVOLTAIC','ENERGY','CLIMATE','COMFORT','REFRIGERATION','DUCT','SHEETMETAL',
 'EXCAVATING','UTILITIES','PLUMBERS','ELECTRICIANS','MECHANICALS','TRADES','TRADE',
 'PERMITTING','PERMITS','EXPEDITING','CONSULTING','CONSULTANTS','MANAGEMENT',
 'PROPERTIES','REALTY','DEVELOPERS','RENOVATIONS','RENOVATION','REMODEL','REMODELERS',
 'HANDYMAN','MAINTENANCE','REPAIR','REPAIRS','INSTALL','INSTALLATION','INSTALLERS',
 'SIDINGS','WINDOWS','DOORS','ENTRY','IMPACT','HURRICANE','STORM',
]);

/** General business words. A supplier or institution is still worth seeing. */
export const BIZ_HINT = new Set<string>(['AGENCY','MEDIA','GROUP','SOLUTIONS','SYSTEMS','COMPONENTS','LABS','LAB',
 'UNIVERSITY','COLLEGE','ACADEMY','INSTITUTE','FOUNDATION','ASSOCIATION','COUNCIL','CHAMBER',
 'DIRECT','CENTER','CENTRE','INSURANCE','REALTY','REAL','ESTATE','LAW','ATTORNEYS','ATTORNEY',
 'BREWING','CARS','AUTO','MOTORS','SALES','STAFFING','RECRUITING','CONSULTING','CONSULTANTS',
 'PARTNERS','ENTERPRISE','HOLDINGS','VENTURES','STUDIO','STUDIOS','WORKS','WORKSHOP','SHOP',
 'STORE','MARKET','TRADING','LOGISTICS','TRANSPORT','FLEET','RENTAL','RENTALS','LEASING',
 'FINANCIAL','CAPITAL','BANK','CREDIT','TITLE','ESCROW','MORTGAGE','ADVERTISING','MARKETING',
 'DIGITAL','TECH','TECHNOLOGIES','TECHNOLOGY','SOFTWARE','DESIGNS','GRAPHICS','PRINTING',
 'SCREENPRINTING','SIGNS','SIGNAGE','WRAPS','PROMOTIONS','EVENTS','CATERING','CLEANING',
 'JANITORIAL','SECURITY','GUARD','PROTECTION','STORAGE','MOVING','HAULING','RECYCLING',
 'DISPOSAL','ENVIRONMENTAL','TESTING','LABORATORY','COLLECTIONS','SERVICES','METAL','METALS',
 'STEEL','PLASTICS','PRODUCTS','MANUFACTURING','INDUSTRIAL','WHOLESALE','OUTLET','DEPOT',
 'PODCAST','SCHOOL','TRAINING','JOBS','CAREERS','TALENT','PTO','PTA','CITY','COUNTY','TOWN']);

/**
 * Handles run words together — "gafroofing", "tampabayhvac" — so token matching
 * misses them entirely. These are substring-scanned against the collapsed text.
 */
const TRADE_SUBSTRINGS: string[] = ['ROOFING','ROOFER','PLUMBING','PLUMBER','ELECTRIC','HVAC','SOLAR','WINDOW','DOOR',
     'SIDING','GUTTER','CONCRETE','PAVING','FENCE','POOL','SUPPLY','BUILDER','CONTRACT',
     'MECHANICAL','HEATING','COOLING','GLASS','SCREEN','SHUTTER','CONSTRUCT','DRAIN',
     'SEPTIC','TEMPSERVICE','AIRCOND','REFRIGER','INSULAT','MASONRY','STUCCO','LANDSCAP',
     'IRRIGAT','PAINTING','DRYWALL','FLOORING','CABINET','COUNTERTOP','WELDING','EXCAVAT',
     'DEMOLITION','GENERATOR','LIGHTING','GARAGE','AWNING','LANAI','PATIO','SUNROOM',
     'PERGOLA','RAILING','CHIMNEY','WATERPROOF','SEALCOAT','PRESSUREWASH','RESTORATION',
     'REMEDIATION','TOOLS','TOOLCOR','CRANE','LIFT','SCAFFOLD','TRUSS','LUMBER','HARDWARE',
     'LEADS','ADS','MARKETING'];

const PRO_NOISE =
  /^(follow|following|followers|message|remove|verified|suggested for you|follows you|see all|search|new|mutual|friend|add friend|connect|pending|·|•|-|—)$/i;

/** Lines that describe the entry above them, not a company of their own. */
const PRO_META: RegExp[] = [
  /^[A-Z][A-Za-z.\- ]+,\s*(A[LKZR]|C[AOT]|D[EC]|FL|GA|HI|I[ADLN]|K[SY]|LA|M[ADEINOST]|N[CDEHJMVY]|O[HKR]|P[AR]|RI|S[CD]|T[NX]|UT|V[AT]|W[AIVY]|Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|Florida|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|New\s\w+|North\s\w+|Ohio|Oklahoma|Oregon|Pennsylvania|Rhode\sIsland|South\s\w+|Tennessee|Texas|Utah|Vermont|Virginia|Washington|West\sVirginia|Wisconsin|Wyoming|Puerto\sRico)\s*$/,
  /\bat\s+[A-Z]/,                       /* "Attorney at Morgan & Morgan" */
  /^\d[\d.,]*[KMkm]?\s*(followers?|following|likes?|posts?|connections?)\b/i,
  /^(works? at|studied at|lives in|from|went to)\b/i,
];

const isMetaLine = (s: string) => PRO_META.some(re => re.test(s));

const PERSON_HINT = /^(mr|mrs|ms|dr)\.?\s/i;

/* ========================== normalisation ========================== */

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

export function normKey(n: string): string {
  return String(n || '').toUpperCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\b[A-Z]{2,4}\s?\d{5,}\b/g, ' ')
    .replace(/[^A-Z0-9\s]/g, ' ')
    .replace(ENTITY, ' ')
    .replace(/\s+/g, '')
    .trim();
}

/* ========================== parsing ========================== */

export type Platform = 'instagram' | 'facebook' | 'linkedin';

export interface ParsedName { handle: string; name: string; }

/**
 * Instagram usernames are always lowercase and never contain spaces, so any
 * capital letter means this is a display name, not a handle. This is what tells
 * "Kayla" apart from "geotiquedesigns" on consecutive lines.
 */
const looksHandle = (s: string) => /^@?[a-z0-9._-]{3,30}$/.test(s) && !/\s/.test(s);

/** A URL, or a line carrying a tab or double space, is its own record. */
const isOwnRecord = (s: string) =>
  /https?:|\.com\//i.test(s) || /\t|\s{2,}/.test(s) || looksHandle(s);

export function parsePaste(text: string, platform: Platform): ParsedName[] {
  // Only Instagram exposes handles in a paste. Detecting them elsewhere
  // produces nothing but wrong pairings from adjacent lines.
  const hasHandles = platform === 'instagram';

  const raw = String(text || '').replace(/\r/g, '').split('\n')
    .map(l => l.replace(/\u00a0/g, ' ').trim())
    .filter(l => l && !PRO_NOISE.test(l) && !isMetaLine(l));

  const out: ParsedName[] = [];
  const seen = new Set<string>();
  const push = (handle: string, name: string) => {
    handle = (handle || '').replace(/^@/, '').trim();
    name = (name || '').trim();
    const key = (handle || name).toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push({ handle, name: name || handle });
  };

  for (let i = 0; i < raw.length; i++) {
    const line = raw[i];

    // a pasted profile URL — the most reliable shape of all
    const m = line.match(/(?:instagram|facebook|linkedin)\.com\/(?:company\/|in\/)?([A-Za-z0-9._-]+)/i);
    if (m) {
      const nxt = raw[i + 1];
      if (nxt && !isOwnRecord(nxt) && nxt.length < 60) { push(m[1], nxt); i++; }
      else push(m[1], '');
      continue;
    }

    // "handle<TAB>Display Name" on one line
    const two = line.split(/\t|\s{2,}/).map(x => x.trim()).filter(Boolean);
    if (hasHandles && two.length >= 2 && looksHandle(two[0])) {
      push(two[0], two.slice(1).join(' ')); continue;
    }
    if (hasHandles && two.length >= 2 && looksHandle(two[two.length - 1])) {
      push(two[two.length - 1], two.slice(0, -1).join(' ')); continue;
    }

    // handle on its own line, display name on the next — the common IG shape.
    // Display names run long; a 60-char cap split real pairs and orphaned names.
    if (hasHandles && looksHandle(line)) {
      const nxt = raw[i + 1];
      if (nxt && !isOwnRecord(nxt) && nxt.length <= 120) { push(line, nxt); i++; }
      else push(line, '');
      continue;
    }

    // a plain display name with no handle — Facebook and LinkedIn
    if (line.length > 2 && line.length <= 140) push('', line);
  }
  return out;
}

/* ========================== classification ========================== */

export type ProspectKind = 'new' | 'known' | 'unsure' | 'person' | 'junk';

export interface ClassifiedName extends ParsedName {
  kind: ProspectKind;
  why: string;
}

/**
 * `knownKeys` is normKey() of every company already in the database — pass it so
 * names you already hold are never re-enriched.
 *
 * Biased toward inclusion: anything ambiguous lands in 'unsure' rather than
 * being discarded. A wrongly dropped company is lost silently; a wrongly kept
 * one costs one glance.
 */
export function classifyName(p: ParsedName, knownKeys: Set<string>): ClassifiedName {
  const text = (p.name + ' ' + p.handle).replace(/[._-]/g, ' ');
  const toks = tokens(text);
  const flat = text.toUpperCase().replace(/[^A-Z]/g, '');

  const hasTrade = toks.some(t => PRO_TRADE.has(t)) ||
    TRADE_SUBSTRINGS.some(t => flat.includes(t));
  const hasEntity = COMPANY_MARKER.test(text);
  const hasBiz = toks.some(t => BIZ_HINT.has(t));
  const key = normKey(p.name) || normKey(p.handle);

  const r = (kind: ProspectKind, why: string): ClassifiedName => ({ ...p, kind, why });

  if (key && knownKeys.has(key)) return r('known', 'Already in your list');
  if (!p.name && !p.handle)      return r('junk', 'Nothing usable');
  if (PERSON_HINT.test(p.name))  return r('person', 'Personal title');
  if (hasTrade || hasEntity)
    return r('new', hasEntity && hasTrade ? 'Trade and entity words'
                  : hasEntity ? 'Entity word' : 'Trade word');
  if (hasBiz) return r('new', 'Business word');

  // Two or three capitalised words and nothing else. Unicode-aware so accented
  // names are caught. Only reached when no business signal was found above, so
  // "Sunshine Gutters" and "Appliance Direct" never land here.
  if (/^\p{Lu}[\p{Ll}'’-]+(\s+\p{Lu}\.?)?(\s+\p{Lu}[\p{Ll}'’-]+){1,2}$/u.test(p.name.trim()))
    return r('person', 'Reads as a personal name');
  if (/^[a-z0-9._]+$/.test(p.name) && !p.handle)
    return r('junk', 'No business signal');
  if (p.name && p.name.length > 3)
    return r('unsure', 'No clear signal either way');
  return r('junk', 'No business signal');
}

export interface ProspectSummary {
  total: number;
  new: number;
  known: number;
  unsure: number;
  person: number;
  junk: number;
}

/** Parse and classify in one call. */
export function parseAndClassify(
  text: string, platform: Platform, knownKeys: Set<string>,
): { rows: ClassifiedName[]; summary: ProspectSummary } {
  const rows = parsePaste(text, platform).map(p => classifyName(p, knownKeys));
  const summary: ProspectSummary = {
    total: rows.length, new: 0, known: 0, unsure: 0, person: 0, junk: 0,
  };
  for (const r of rows) summary[r.kind]++;
  return { rows, summary };
}
