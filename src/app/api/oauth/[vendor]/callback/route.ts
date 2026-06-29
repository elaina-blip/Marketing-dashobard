import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { exchangeCode, adminDb, type Vendor } from "@/lib/oauth-config";

// GET /api/oauth/<vendor>/callback?code=...&state=...
// The provider redirects here after the user consents. We verify state,
// exchange the code for tokens, store the tokens server-side, and flip the
// connection's status to "connected".
export async function GET(req: Request, { params }: { params: { vendor: string } }) {
  const vendor = params.vendor as Vendor;
  const url = new URL(req.url);
  const back = (q: string) =>
    NextResponse.redirect(`${url.origin}/?view=integrations&${q}`);

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state") || "";
  const providerError = url.searchParams.get("error");
  if (providerError) return back(`error=${encodeURIComponent(providerError)}`);
  if (!code) return back("error=missing_code");

  const jar = cookies();
  const nonce = jar.get("oauth_state")?.value;
  const cookieKey = jar.get("oauth_key")?.value;
  const [stNonce, stKey] = state.split(".");
  const key = stKey || cookieKey || vendor;

  // CSRF: the state nonce must match the one we set when starting.
  if (!nonce || stNonce !== nonce) return back("error=bad_state");

  try {
    const tok = await exchangeCode(vendor, { origin: url.origin, code });
    const db = adminDb();
    const now = new Date().toISOString();
    const expires = tok.expires_in
      ? new Date(Date.now() + tok.expires_in * 1000).toISOString()
      : null;

    await db.from("connection_secrets").upsert({
      provider: key,
      access_token: tok.access_token,
      refresh_token: tok.refresh_token,
      token_expires_at: expires,
      updated_at: now,
    });
    await db.from("data_connections").upsert({
      provider: key,
      status: "connected",
      scopes: tok.scope || null,
      error_detail: null,
      updated_at: now,
    });

    // NEXT PHASE (per-provider): trigger the first data pull here so the
    // dashboard fills in right away. See INTEGRATIONS_SETUP.md → "Pulling data".
    //   await fetch(`${url.origin}/api/sync/${key}`, { method: "POST", headers: {...} });

    const res = back(`connected=${encodeURIComponent(key)}`);
    res.cookies.delete("oauth_state");
    res.cookies.delete("oauth_key");
    return res;
  } catch (e: any) {
    try {
      const db = adminDb();
      await db.from("data_connections").upsert({
        provider: key,
        status: "error",
        error_detail: String(e?.message || e).slice(0, 400),
        updated_at: new Date().toISOString(),
      });
    } catch {
      /* ignore secondary failure */
    }
    return back("error=token_exchange_failed");
  }
}
