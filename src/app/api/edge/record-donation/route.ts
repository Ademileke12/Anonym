import { NextResponse } from "next/server";
import { createClient } from "@/services/supabase/server";

export const runtime = "nodejs";

/**
 * Edge-style serverless handler: validate + insert donation after on-chain tx.
 * Prefer this path over raw client inserts for rate-limit / validation hooks.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      campaign_id?: string;
      sender_wallet?: string;
      recipient_wallet?: string;
      amount?: number;
      message?: string | null;
      anonymous?: boolean;
      tx_hash?: string;
    };

    if (
      !body.campaign_id ||
      !body.sender_wallet ||
      !body.recipient_wallet ||
      !body.tx_hash ||
      body.amount == null ||
      !(body.amount > 0)
    ) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    if (!/^0x[a-fA-F0-9]{64}$/.test(body.tx_hash)) {
      return NextResponse.json({ error: "Invalid tx_hash" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const wallet = (
      (user.user_metadata as { wallet_address?: string })?.wallet_address ||
      (user.app_metadata as { wallet_address?: string })?.wallet_address ||
      ""
    ).toLowerCase();

    if (wallet && wallet !== body.sender_wallet.toLowerCase()) {
      return NextResponse.json(
        { error: "Sender must match session wallet" },
        { status: 403 },
      );
    }

    const { data, error } = await supabase
      .from("donations")
      .insert({
        campaign_id: body.campaign_id,
        sender_wallet: body.sender_wallet.toLowerCase(),
        recipient_wallet: body.recipient_wallet.toLowerCase(),
        amount: body.amount,
        message: body.message ?? null,
        anonymous: body.anonymous ?? true,
        tx_hash: body.tx_hash,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ donation: data });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
