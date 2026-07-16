import { NextResponse } from "next/server";
import { createAdminClient } from "@/services/supabase/admin";
import { generateSiweNonce } from "viem/siwe";

export const runtime = "nodejs";

/** Issue a short-lived SIWE nonce for a wallet address. */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { address?: string };
    const address = body.address?.toLowerCase();
    if (!address || !/^0x[a-f0-9]{40}$/.test(address)) {
      return NextResponse.json({ error: "Invalid address" }, { status: 400 });
    }

    const nonce = generateSiweNonce();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const admin = createAdminClient();

    const { error } = await admin.from("auth_nonces").upsert({
      address,
      nonce,
      expires_at: expiresAt,
    });

    if (error) {
      console.error("nonce upsert", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ nonce, expiresAt });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Nonce failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
