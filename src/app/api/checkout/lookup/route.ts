// Public wallet -> Anonym profile lookup for the hosted checkout ("Welcome
// back, @username"). Returns only public profile fields.
import { NextResponse } from "next/server";
import { createAdminClient } from "@/services/supabase/admin";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const wallet = new URL(request.url).searchParams.get("wallet") || "";
    if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
      return NextResponse.json({ ok: false, error: "Invalid wallet" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data } = await admin
      .from("users")
      .select("username, display_name, avatar_url")
      .eq("wallet_address", wallet.toLowerCase())
      .maybeSingle();

    if (!data) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
