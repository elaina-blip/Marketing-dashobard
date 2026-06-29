# Integrations & Data — Implementation Guide

This document explains how the "Integrations & Data" connection system works, what
is **already built**, and the step-by-step work needed to bring each data source
fully online so real numbers flow into the dashboard, reports, and channel pages.

Audience: the developer completing the integrations. Some steps (registering
developer apps, business verification, API approvals) can only be done by an
account owner with admin access to the Google / Meta / LinkedIn accounts.

---

## 1. What is already built vs. what is left

**Already built (the framework):**

- Database tables: `data_connections` (status), `connection_secrets` (tokens,
  server-only), `provider_metrics` (normalized metrics the dashboard reads).
- A working **OAuth round-trip** for Google, Meta, and LinkedIn:
  `/api/oauth/<vendor>/start` → provider consent → `/api/oauth/<vendor>/callback`
  → tokens stored, status flipped to `connected`.
- A **Disconnect** action that clears tokens and resets status.
- The **Integrations UI**: the "Connect source" button works, each source card
  shows its real connection status from the database, and Connect/Disconnect are
  live. Connecting a source persists across reloads.

**Left to do (per provider, one at a time):**

1. Register the developer app for the provider and add its client ID/secret to Vercel.
2. (Once connected) write a **sync job** that pulls the provider's metrics into
   `provider_metrics`.
3. Point the dashboard/report views at `provider_metrics` so the "No data yet"
   placeholders fill in.
4. Add token refresh + a scheduled cron so data stays current.

Until step 1 is done for a provider, clicking Connect will bounce back with an
`error=...` message (usually "client ID not set") — that's expected.

---

## 2. Architecture at a glance

```
[ Integrations UI ]
   │  click Connect
   ▼
GET /api/oauth/<vendor>/start         → redirect to provider consent screen
   ▼  (user approves)
GET /api/oauth/<vendor>/callback       → exchange code for tokens
   │      ├─ connection_secrets  (access/refresh token)   ← service-role only
   │      └─ data_connections    (status='connected')     ← readable by team
   ▼
POST /api/sync/<key>  (to build)       → call provider API with the token
   └─ provider_metrics (sessions, clicks, spend, leads, …)
   ▼
[ Dashboard / Reports / Channel pages ] read from provider_metrics
```

Key security property: the browser can read **status and metrics** but never the
**tokens**. Tokens live in `connection_secrets`, which has RLS enabled with no
policies, so only the service-role key (server side) can touch it.

---

## 3. One-time database step

In Supabase → SQL Editor → New query, paste and run **`supabase/02_integrations.sql`**.
It creates the three tables, the RLS policies, and seeds one disconnected row per
source. (Run `01_schema.sql` first if this is a fresh project.)

Verify: Table Editor now shows `data_connections`, `connection_secrets`, and
`provider_metrics`.

---

## 4. Environment variables

Add these in **Vercel → Settings → Environment Variables**, then redeploy. Never
put secrets in the repo. Full list is in `.env.example`.

| Variable | Used for | Where to get it |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | server writes (callback, sync) | Supabase → Settings → API → service_role |
| `GOOGLE_OAUTH_CLIENT_ID` / `..._SECRET` | Search Console, GA4, GTM, Ads sign-in | Google Cloud → Credentials |
| `GOOGLE_ADS_DEVELOPER_TOKEN` / `GOOGLE_ADS_LOGIN_CUSTOMER_ID` | Google Ads data pull | Google Ads MCC → API Center |
| `META_APP_ID` / `META_APP_SECRET` | Instagram + Facebook | developers.facebook.com → app → Settings |
| `LINKEDIN_CLIENT_ID` / `LINKEDIN_CLIENT_SECRET` | LinkedIn Pages | linkedin.com/developers → app → Auth |
| `AHREFS_API_KEY` | Ahrefs/Semrush (optional) | Ahrefs account |

**Redirect URIs to register** (replace the domain with the real Vercel URL):

- Google:  `https://www.YOURDOMAIN/api/oauth/google/callback`
- Meta:    `https://www.YOURDOMAIN/api/oauth/meta/callback`
- LinkedIn:`https://www.YOURDOMAIN/api/oauth/linkedin/callback`

For local testing, also register the `http://localhost:3000/...` variants.

---

## 5. Per-provider setup

### 5A. Google — Search Console, GA4, Tag Manager (fastest, no review)

1. **Google Cloud Console** → create (or pick) a project.
2. **APIs & Services → Library** → enable: *Google Search Console API*,
   *Google Analytics Data API*, and (optional) *Tag Manager API*.
3. **OAuth consent screen** → User type **External** → fill app name, support
   email, developer email. Add the scopes (read-only) for the APIs above. While in
   "Testing", add each teammate's Google address under **Test users** (no
   verification needed for internal use; publish the app only if you need users
   outside the test list).
4. **Credentials → Create credentials → OAuth client ID → Web application.**
   Add the Google redirect URI from section 4. Copy the **Client ID** and
   **Client secret** into Vercel as `GOOGLE_OAUTH_CLIENT_ID` / `..._SECRET`.
5. Redeploy. In the app, open Integrations and click **Connect** on Search Console
   and on Analytics 4. You'll sign in with the Google account that owns the
   property and grant read-only access. Status should flip to **Connected**.

After connecting, store the specific property/site id so the sync job knows what
to query. Easiest: write it into `data_connections.meta` (e.g.
`{ "property_id": "123456789" }` for GA4, `{ "site_url": "https://www.alliancepermitting.com/" }`
for Search Console). You can do this in the callback (look it up via the API) or
add a small "choose property" step.

### 5B. Google Ads (same login + a developer token)

1. Uses the **same** Google OAuth client as 5A, plus the `adwords` scope (already
   wired for the `google_ads` card).
2. In a **Google Ads manager (MCC) account → Tools → API Center**, apply for a
   **developer token**. Basic access is usually approved within a few days.
3. Set `GOOGLE_ADS_DEVELOPER_TOKEN` and `GOOGLE_ADS_LOGIN_CUSTOMER_ID` (the MCC id,
   digits only) in Vercel.
4. Connect the Google Ads card in the app. The sync job (section 6) calls the
   Google Ads API with `developer-token` + `login-customer-id` headers.

### 5C. Meta — Instagram + Facebook (longest lead time)

> Plan for this taking up to ~2 weeks because of verification and review.

1. **developers.facebook.com → Create App → Business.**
2. Add the **Facebook Login** product. Under **Facebook Login → Settings**, add the
   Meta redirect URI from section 4 to **Valid OAuth Redirect URIs**.
3. **Settings → Basic**: copy **App ID** / **App Secret** into Vercel as
   `META_APP_ID` / `META_APP_SECRET`. Add a Privacy Policy URL and the business
   details (required for review).
4. **Permissions / App Review** — request: `pages_show_list`,
   `pages_read_engagement`, `instagram_basic`, `instagram_manage_insights`,
   `read_insights`, `ads_read`, `business_management`. Complete **Business
   Verification** and submit each permission for **App Review** with a short
   screencast of the connect flow.
5. Make sure the **Instagram account is a Business/Creator account linked to a
   Facebook Page** — IG insights are only available that way.
6. Once approved, connect the Meta card. The token returned is exchanged for a
   long-lived (~60-day) token automatically; re-auth before it expires.

Provider notes for the sync job: list Pages via `/me/accounts`, get the linked IG
user via the Page's `instagram_business_account` field, then read insights from
`/{ig-user-id}/insights` and `/{page-id}/insights`. Store the page id / ig user id
in `data_connections.meta`.

### 5D. LinkedIn Pages

1. **linkedin.com/developers → Create app**, associated with the company Page.
2. Request access to the **Community Management API** (and **Marketing
   Developer Platform** if you want ad data). Approval is required.
3. **Auth tab**: add the LinkedIn redirect URI from section 4; copy Client ID /
   Secret into Vercel.
4. The scopes in `oauth-config.ts` (`r_organization_social`,
   `rw_organization_admin`) cover Page analytics; adjust to match what LinkedIn
   grants your app. You must be a Page admin.

### 5E. Ahrefs / Semrush and CRM

These are **API-key / custom** sources, not OAuth. For Ahrefs/Semrush, add the API
key as an env var and write a sync job that calls their REST API. For the CRM,
wire a webhook or scheduled pull that writes leads into `provider_metrics`
(metric `leads`, with `dims` like `{channel:'organic'}`). The UI shows these as
"Not connected" until your sync job sets their status to `connected`.

---

## 6. Pulling data into the dashboard (the per-provider phase)

This is the work that turns "Connected" into actual numbers. The contract is:
**a sync job writes rows into `provider_metrics` and updates
`data_connections.last_synced_at`.** Nothing in the dashboard is provider-specific
— it just reads `provider_metrics`.

### Token refresh helper (Google)

```ts
// src/lib/sync-helpers.ts  (to create)
import { adminDb } from "@/lib/oauth-config";

export async function googleAccessToken(provider: string): Promise<string> {
  const db = adminDb();
  const { data } = await db.from("connection_secrets")
    .select("access_token, refresh_token, token_expires_at").eq("provider", provider).single();
  if (!data) throw new Error("not connected: " + provider);

  const fresh = data.token_expires_at && new Date(data.token_expires_at).getTime() > Date.now() + 60_000;
  if (fresh) return data.access_token;

  // refresh
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: data.refresh_token!,
    client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
    client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
  });
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body,
  });
  const j = await r.json();
  if (!r.ok) throw new Error("refresh failed: " + JSON.stringify(j));
  const expires = new Date(Date.now() + j.expires_in * 1000).toISOString();
  await db.from("connection_secrets").update({ access_token: j.access_token, token_expires_at: expires }).eq("provider", provider);
  return j.access_token;
}
```

### Example sync route — GA4 sessions

```ts
// src/app/api/sync/ga4/route.ts  (to create)
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/oauth-config";
import { googleAccessToken } from "@/lib/sync-helpers";

export async function POST() {
  const db = adminDb();
  const { data: conn } = await db.from("data_connections").select("meta").eq("provider", "ga4").single();
  const propertyId = conn?.meta?.property_id;           // stored at connect time
  if (!propertyId) return NextResponse.json({ error: "no property_id" }, { status: 400 });

  const token = await googleAccessToken("ga4");
  const r = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
      dimensions: [{ name: "date" }],
      metrics: [{ name: "sessions" }],
    }),
  });
  const j = await r.json();
  if (!r.ok) return NextResponse.json({ error: j }, { status: 502 });

  const rows = (j.rows || []).map((row: any) => {
    const d = row.dimensionValues[0].value;            // "20260601"
    return {
      provider: "ga4",
      metric: "sessions",
      metric_date: `${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}`,
      value: Number(row.metricValues[0].value),
      dims: {},
    };
  });
  if (rows.length) await db.from("provider_metrics").upsert(rows, { onConflict: "provider,metric,metric_date,dims" });
  await db.from("data_connections").update({ last_synced_at: new Date().toISOString() }).eq("provider", "ga4");
  return NextResponse.json({ ok: true, inserted: rows.length });
}
```

Repeat the pattern per source (Search Console `searchAnalytics/query`, Google Ads
`GoogleAdsService.search`, Meta `/{id}/insights`, etc.), writing the right
`metric` names. Then schedule them with Vercel Cron in `vercel.json`:

```json
{ "crons": [
  { "path": "/api/cron/refresh-posts", "schedule": "0 6 * * 1" },
  { "path": "/api/sync/ga4",           "schedule": "0 * * * *" }
] }
```

(Protect each sync route with the `CRON_SECRET` bearer check, the same way
`/api/cron/refresh-posts` already does, so only the cron can call it.)

### Wiring the views to real data

The dashboard and channel pages currently render neutral "No data yet" empty
states (in `src/components/CommandCenter.jsx`: `OverviewView`, `SeoView`,
`SocialView`, `PaidView`, `EmailView`, `AttributionView`). To light them up, read
aggregates from `provider_metrics` and pass real values in. For example, total
GA4 sessions for the KPI card:

```ts
const { data } = await supabase
  .from("provider_metrics")
  .select("value")
  .eq("provider", "ga4").eq("metric", "sessions")
  .gte("metric_date", thirtyDaysAgo);
const sessions = (data || []).reduce((s, r) => s + Number(r.value), 0);
```

Swap the `value="—"` on each `KpiCard` for the computed number, and replace each
`EmptyState` / `EmptySpark` with the chart/table fed from `provider_metrics`.
Doing one card at a time keeps the "no fake data" guarantee — a card only shows a
number once a real sync has populated it.

---

## 7. Files added by the framework

| File | Purpose |
|---|---|
| `supabase/02_integrations.sql` | the three tables + RLS (run once) |
| `src/lib/oauth-config.ts` | scopes, auth-URL builder, code→token exchange (server-only) |
| `src/app/api/oauth/[vendor]/start/route.ts` | begins the OAuth redirect |
| `src/app/api/oauth/[vendor]/callback/route.ts` | stores tokens, sets status |
| `src/app/api/oauth/[vendor]/disconnect/route.ts` | clears a connection |
| `src/lib/data.ts` → `loadConnections`, `disconnectSource` | browser reads status / triggers disconnect |
| `src/components/CommandCenter.jsx` → `IntegrationsView`, `ConnectModal` | the live UI |
| `.env.example` | the full env-var list |

To build next: `src/lib/sync-helpers.ts` and `src/app/api/sync/<key>/route.ts`
per provider, then point the views at `provider_metrics`.

---

## 8. Testing checklist

1. Run `02_integrations.sql`; confirm the three tables exist.
2. Set the Google client ID/secret in Vercel; register the redirect URI; redeploy.
3. App → Integrations → Connect on **Analytics 4** → Google consent → returns with
   a "Connected ga4." banner and the card shows **Connected**.
4. Reload the page — it still shows Connected (status came from the DB).
5. Click **Disconnect** — status returns to Not connected and the token row is gone
   (check `connection_secrets` is empty for that provider).
6. Confirm the browser cannot read tokens: in the browser console,
   `await supabase.from('connection_secrets').select('*')` should return `[]`/error,
   while `data_connections` returns rows. (This proves the RLS split works.)
7. Repeat per provider as each app is approved.

---

## 9. Security notes

- Tokens are written and read **only** by the service-role key on the server.
  `connection_secrets` has RLS on with no policies; the anon/auth browser key
  cannot see it.
- Client secrets live in Vercel env vars, never in the repo or the browser.
- The OAuth flow uses a one-time `state` nonce (httpOnly cookie) to block CSRF.
- Use **read-only** scopes everywhere (the config already does for Google).
