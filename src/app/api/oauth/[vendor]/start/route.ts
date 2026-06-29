import { NextResponse } from "next/server";
import { buildAuthUrl, type Vendor } from "@/lib/oauth-config";

// GET /api/oauth/<vendor>/start?key=<connection-key>
// Builds the provider's consent URL and redirects the browser to it.
// `key` is which UI source to mark connected on return (e.g. ga4, search_console).
export async function GET(req: Request, { params }: { params: { vendor: string } }) {
  const vendor = params.vendor as Vendor;
  if (!["google", "meta", "linkedin"].includes(vendor)) {
    return NextResponse.json({ error: "unknown vendor" }, { status: 400 });
  }

  const url = new URL(req.url);
  const key = url.searchParams.get("key") || vendor;
  const nonce = crypto.randomUUID();
  const state = `${nonce}.${key}`;

  try {
    const authUrl = buildAuthUrl(vendor, { origin: url.origin, state, productKey: key });
    const res = NextResponse.redirect(authUrl);
    const secure = url.protocol === "https:";
    const opts = { httpOnly: true, sameSite: "lax" as const, secure, path: "/", maxAge: 600 };
    res.cookies.set("oauth_state", nonce, opts);
    res.cookies.set("oauth_key", key, opts);
    return res;
  } catch (e: any) {
    // Most common cause: the provider's client ID/secret env vars aren't set yet.
    return NextResponse.redirect(
      `${url.origin}/?view=integrations&error=${encodeURIComponent(e?.message || "config")}`
    );
  }
}
