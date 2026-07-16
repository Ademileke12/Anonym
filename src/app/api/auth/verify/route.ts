import { createHash, createHmac } from "crypto";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createPublicClient, http } from "viem";
import { parseSiweMessage, verifySiweMessage } from "viem/siwe";
import { createAdminClient } from "@/services/supabase/admin";
import { getServerAuthConfig } from "@/lib/env";
import { monadTestnet } from "@/services/blockchain/chains";
import type { Database } from "@/services/supabase/types";

export const runtime = "nodejs";

function walletEmail(address: string) {
  const hash = createHash("sha256")
    .update(address.toLowerCase())
    .digest("hex")
    .slice(0, 32);
  return `w_${hash}@wallet.anonym.local`;
}

function walletPassword(address: string, secret: string) {
  return createHmac("sha256", secret)
    .update(address.toLowerCase())
    .digest("hex");
}

/**
 * Verify SIWE signature and return a Supabase session.
 * Stores wallet_address on user_metadata for RLS (current_wallet()).
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      message?: string;
      signature?: string;
    };

    if (!body.message || !body.signature) {
      return NextResponse.json(
        { error: "message and signature required" },
        { status: 400 },
      );
    }

    const { url, anon, walletSecret } = getServerAuthConfig();
    const admin = createAdminClient();

    let parsed;
    try {
      parsed = parseSiweMessage(body.message);
    } catch {
      return NextResponse.json({ error: "Invalid SIWE message" }, { status: 400 });
    }

    const address = parsed.address?.toLowerCase();
    if (!address || !parsed.nonce) {
      return NextResponse.json({ error: "Missing address or nonce" }, { status: 400 });
    }

    const { data: nonceRow, error: nonceErr } = await admin
      .from("auth_nonces")
      .select("nonce, expires_at")
      .eq("address", address)
      .maybeSingle();

    if (nonceErr || !nonceRow) {
      return NextResponse.json(
        { error: "Nonce not found - request a new one" },
        { status: 400 },
      );
    }
    if (new Date(nonceRow.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ error: "Nonce expired" }, { status: 400 });
    }
    if (parsed.nonce !== nonceRow.nonce) {
      return NextResponse.json({ error: "Nonce mismatch" }, { status: 400 });
    }

    const publicClient = createPublicClient({
      chain: monadTestnet,
      transport: http(),
    });

    const ok = await verifySiweMessage(publicClient, {
      message: body.message,
      signature: body.signature as `0x${string}`,
      address: address as `0x${string}`,
      nonce: nonceRow.nonce,
    });

    if (!ok) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    await admin.from("auth_nonces").delete().eq("address", address);

    const email = walletEmail(address);
    const password = walletPassword(address, walletSecret);

    // Prefer getUserByEmail if available; fall back to create.
    const { data: byEmail } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    let authUser = byEmail?.users?.find((u) => u.email === email);

    if (!authUser) {
      const { data: created, error: createErr } =
        await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { wallet_address: address },
          app_metadata: { wallet_address: address, provider: "siwe" },
        });
      if (createErr || !created.user) {
        // Race: user created between list and create
        if (createErr?.message?.toLowerCase().includes("already")) {
          const retry = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
          authUser = retry.data?.users?.find((u) => u.email === email);
        }
        if (!authUser) {
          console.error(createErr);
          return NextResponse.json(
            { error: createErr?.message || "Failed to create auth user" },
            { status: 500 },
          );
        }
      } else {
        authUser = created.user;
      }
    } else {
      await admin.auth.admin.updateUserById(authUser.id, {
        password,
        user_metadata: {
          ...authUser.user_metadata,
          wallet_address: address,
        },
        app_metadata: {
          ...authUser.app_metadata,
          wallet_address: address,
          provider: "siwe",
        },
      });
    }

    const authClient = createClient<Database>(url, anon, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: signIn, error: signErr } =
      await authClient.auth.signInWithPassword({ email, password });

    if (signErr || !signIn.session) {
      console.error(signErr);
      return NextResponse.json(
        { error: signErr?.message || "Session creation failed" },
        { status: 500 },
      );
    }

    const { data: profile } = await admin
      .from("users")
      .select("*")
      .eq("wallet_address", address)
      .maybeSingle();

    return NextResponse.json({
      session: {
        access_token: signIn.session.access_token,
        refresh_token: signIn.session.refresh_token,
        expires_at: signIn.session.expires_at,
        expires_in: signIn.session.expires_in,
      },
      wallet: address,
      user: profile,
    });
  } catch (e) {
    console.error(e);
    const message = e instanceof Error ? e.message : "Verify failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
