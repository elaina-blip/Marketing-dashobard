import { NextResponse } from "next/server";
import { createClient as createServer } from "@/lib/supabase-server";
import { adminDb } from "@/lib/oauth-config";

// POST /api/oauth/<provider-key>/disconnect
// Here the dynamic segment is the connection KEY (e.g. "ga4", "meta"), not a
// vendor. Clears stored tokens and resets the connection to "disconnected".
export async function POST(_req: Request, { params }: { params: { vendor: string } }) {
  const provider = params.vendor;

  // Gate: only a signed-in, allow-listed user can disconnect.
  const userClient = createServer();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "not signed in" }, { status: 401 });
  const { data: allowed } = await userClient.from("allowed_users").select("email").limit(1);
  if (!allowed) return NextResponse.json({ error: "not allowed" }, { status: 403 });

  try {
    const db = adminDb();
    const now = new Date().toISOString();
    await db.from("connection_secrets").delete().eq("provider", provider);
    await db.from("data_connections").upsert({
      provider,
      status: "disconnected",
      account_label: null,
      scopes: null,
      last_synced_at: null,
      error_detail: null,
      updated_at: now,
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
