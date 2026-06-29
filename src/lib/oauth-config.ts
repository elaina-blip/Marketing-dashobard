// ============================================================================
// oauth-config.ts — SERVER ONLY. Provider OAuth configuration + helpers.
// Used by the /api/oauth/* routes. Never import this into a "use client" file.
//
// Required environment variables (set in Vercel → Settings → Environment
// Variables; never commit them). See INTEGRATIONS_SETUP.md.
//   GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET   (Search Console / GA4 / GTM / Ads)
//   META_APP_ID, META_APP_SECRET                          (Instagram + Facebook)
//   LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET            (LinkedIn Pages)
//   SUPABASE_SERVICE_ROLE_KEY                             (already used by seed/cron)
// ============================================================================
import { createClient } from "@supabase/supabase-js";

export type Vendor = "google" | "meta" | "linkedin";

// One Google login can cover several products; each UI card requests its own scope.
export const GOOGLE_SCOPES: Record<string, string> = {
  search_console: "https://www.googleapis.com/auth/webmasters.readonly",
  ga4:            "https://www.googleapis.com/auth/analytics.readonly",
  gtm:            "https://www.googleapis.com/auth/tagmanager.readonly",
  google_ads:     "https://www.googleapis.com/auth/adwords",
};

export const META_SCOPES = [
  "public_profile", "pages_show_list", "pages_read_engagement",
  "instagram_basic", "instagram_manage_insights", "read_insights",
  "ads_read", "business_management",
].join(",");

export const LINKEDIN_SCOPES = ["r_organization_social", "rw_organization_admin"].join(" ");

// Graph API version — bump to the current version when your colleague verifies it.
const META_GRAPH = "v19.0";

export function adminDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_SERVICE_ROLE_KEY (or URL) not configured");
  return createClient(url, key, { auth: { persistSession: false } });
}

export function redirectUri(origin: string, vendor: Vendor) {
  return `${origin}/api/oauth/${vendor}/callback`;
}

export function buildAuthUrl(
  vendor: Vendor,
  opts: { origin: string; state: string; productKey?: string }
): string {
  const { origin, state, productKey } = opts;
  const ruri = redirectUri(origin, vendor);

  if (vendor === "google") {
    const cid = process.env.GOOGLE_OAUTH_CLIENT_ID;
    if (!cid) throw new Error("GOOGLE_OAUTH_CLIENT_ID not set");
    const scope = GOOGLE_SCOPES[productKey || "ga4"] || GOOGLE_SCOPES.ga4;
    const p = new URLSearchParams({
      client_id: cid, redirect_uri: ruri, response_type: "code",
      access_type: "offline", prompt: "consent", include_granted_scopes: "true",
      scope, state,
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${p.toString()}`;
  }

  if (vendor === "meta") {
    const cid = process.env.META_APP_ID;
    if (!cid) throw new Error("META_APP_ID not set");
    const p = new URLSearchParams({
      client_id: cid, redirect_uri: ruri, response_type: "code",
      scope: META_SCOPES, state,
    });
    return `https://www.facebook.com/${META_GRAPH}/dialog/oauth?${p.toString()}`;
  }

  if (vendor === "linkedin") {
    const cid = process.env.LINKEDIN_CLIENT_ID;
    if (!cid) throw new Error("LINKEDIN_CLIENT_ID not set");
    const p = new URLSearchParams({
      response_type: "code", client_id: cid, redirect_uri: ruri,
      scope: LINKEDIN_SCOPES, state,
    });
    return `https://www.linkedin.com/oauth/v2/authorization?${p.toString()}`;
  }

  throw new Error("unknown vendor");
}

export type TokenSet = {
  access_token: string;
  refresh_token: string | null;
  expires_in: number;
  scope: string;
};

export async function exchangeCode(
  vendor: Vendor,
  opts: { origin: string; code: string }
): Promise<TokenSet> {
  const { origin, code } = opts;
  const ruri = redirectUri(origin, vendor);

  if (vendor === "google") {
    const body = new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
      client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
      redirect_uri: ruri, grant_type: "authorization_code",
    });
    const r = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const j: any = await r.json();
    if (!r.ok) throw new Error("google token: " + JSON.stringify(j));
    return {
      access_token: j.access_token,
      refresh_token: j.refresh_token || null,
      expires_in: j.expires_in || 3600,
      scope: j.scope || "",
    };
  }

  if (vendor === "meta") {
    // 1) short-lived token
    const p = new URLSearchParams({
      client_id: process.env.META_APP_ID!,
      client_secret: process.env.META_APP_SECRET!,
      redirect_uri: ruri, code,
    });
    const r = await fetch(`https://graph.facebook.com/${META_GRAPH}/oauth/access_token?${p.toString()}`);
    const j: any = await r.json();
    if (!r.ok) throw new Error("meta token: " + JSON.stringify(j));
    // 2) exchange for a long-lived (~60 day) token
    const lp = new URLSearchParams({
      grant_type: "fb_exchange_token",
      client_id: process.env.META_APP_ID!,
      client_secret: process.env.META_APP_SECRET!,
      fb_exchange_token: j.access_token,
    });
    const lr = await fetch(`https://graph.facebook.com/${META_GRAPH}/oauth/access_token?${lp.toString()}`);
    const lj: any = await lr.json();
    const tok = lr.ok ? lj : j;
    return {
      access_token: tok.access_token,
      refresh_token: null, // Meta uses long-lived tokens; re-auth before expiry
      expires_in: tok.expires_in || 5184000,
      scope: META_SCOPES,
    };
  }

  if (vendor === "linkedin") {
    const body = new URLSearchParams({
      grant_type: "authorization_code", code, redirect_uri: ruri,
      client_id: process.env.LINKEDIN_CLIENT_ID!,
      client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
    });
    const r = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const j: any = await r.json();
    if (!r.ok) throw new Error("linkedin token: " + JSON.stringify(j));
    return {
      access_token: j.access_token,
      refresh_token: j.refresh_token || null,
      expires_in: j.expires_in || 3600,
      scope: LINKEDIN_SCOPES,
    };
  }

  throw new Error("unknown vendor");
}
