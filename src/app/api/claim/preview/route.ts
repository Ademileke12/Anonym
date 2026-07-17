import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Public claim preview — verifies salt without exposing other deposits.
 * Uses service role so non-users can open claim links.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    const salt = url.searchParams.get("salt");
    if (!id || !salt) {
      return NextResponse.json(
        { error: "id and salt required" },
        { status: 400 },
      );
    }

    const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!base || !service) {
      return NextResponse.json(
        { error: "Server not configured" },
        { status: 500 },
      );
    }

    const admin = createClient(base, service, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await admin
      .from("protected_deposits")
      .select(
        "id, amount, token, status, recipient_wallet, unlock_at, condition_type, condition_payload, metadata, message, on_chain_deposit_id, vault_address, salt, kind, created_at, claimed_at",
      )
      .eq("id", id)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ error: "Deposit not found" }, { status: 404 });
    }

    const saltNorm = salt.startsWith("0x") ? salt.toLowerCase() : `0x${salt}`.toLowerCase();
    const rowSalt = String(data.salt).toLowerCase();
    if (rowSalt !== saltNorm && rowSalt !== salt.toLowerCase()) {
      return NextResponse.json({ error: "Invalid claim secret" }, { status: 403 });
    }

    // Never return salt to browser after validation (client already has it)
    const { salt: _s, ...safe } = data;
    void _s;

    let claimable = data.status === "claimable";
    let blockReason: string | null = null;
    if (data.unlock_at && new Date(data.unlock_at).getTime() > Date.now()) {
      claimable = false;
      blockReason = `Escrow until ${new Date(data.unlock_at).toISOString()}`;
    }
    const cond = data.condition_type ?? "none";
    if (
      claimable &&
      cond !== "none" &&
      cond !== "after_date" &&
      !(data.condition_payload as { satisfied?: boolean })?.satisfied
    ) {
      claimable = false;
      blockReason = "Conditional release not satisfied yet";
    }

    return NextResponse.json({
      deposit: safe,
      claimable,
      blockReason,
      needsVault: Boolean(data.on_chain_deposit_id && data.vault_address?.startsWith("0x")),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Preview failed" },
      { status: 500 },
    );
  }
}
