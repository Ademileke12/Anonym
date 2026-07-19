import { NextResponse } from "next/server";
import {
  resolveMerchant,
  getSessionUserId,
  getMerchant,
  createMerchant,
  updateMerchant,
  rotateApiKey,
  getMerchantPayoutAddress,
} from "@/services/gateway";
import type { Merchant } from "@/services/gateway";

export const runtime = "nodejs";

/** Never leak key hashes or webhook secrets to the dashboard. */
function publicMerchant(m: Merchant, payoutAddress?: string | null) {
  return {
    id: m.id,
    name: m.name,
    email: m.email,
    api_key_prefix: m.api_key_prefix,
    webhook_url: m.webhook_url,
    status: m.status,
    created_at: m.created_at,
    payout_address: payoutAddress || null,
  };
}

export async function GET(request: Request) {
  try {
    const merchant = await resolveMerchant(request);
    if (!merchant) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const result = await getMerchant(merchant.id);
    if (!result.ok || !result.data) {
      return NextResponse.json(result, { status: 404 });
    }

    const payoutAddress = await getMerchantPayoutAddress(result.data);
    return NextResponse.json({ ok: true, data: publicMerchant(result.data, payoutAddress) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

/**
 * Create a merchant for the signed-in dashboard user. Requires a SIWE session;
 * external API-key callers cannot create merchants.
 */
export async function POST(request: Request) {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    // One merchant per user.
    const existing = await resolveMerchant(request);
    if (existing) {
      return NextResponse.json(
        { ok: false, error: "Merchant already exists", code: "CONFLICT" },
        { status: 409 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const name = typeof body.name === "string" && body.name.trim() ? body.name.trim() : "My App";
    const email =
      typeof body.email === "string" && body.email.trim()
        ? body.email.trim()
        : `${userId}@merchant.anonym.local`;

    const result = await createMerchant(name, email, userId);
    if (!result.ok || !result.data) {
      return NextResponse.json(result, { status: 400 });
    }

    // api_key is returned exactly once, at creation time.
    const payoutAddress = await getMerchantPayoutAddress(result.data.merchant);
    return NextResponse.json(
      {
        ok: true,
        data: {
          merchant: publicMerchant(result.data.merchant, payoutAddress),
          api_key: result.data.api_key,
        },
      },
      { status: 201 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const merchant = await resolveMerchant(request);
    if (!merchant) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    if (body.rotate_key) {
      const result = await rotateApiKey(merchant.id);
      return NextResponse.json(result);
    }

    const allowedUpdates: Record<string, unknown> = {};
    if (body.name) allowedUpdates.name = body.name;
    if (body.email) allowedUpdates.email = body.email;
    if (body.webhook_url) allowedUpdates.webhook_url = body.webhook_url;
    if (body.metadata) allowedUpdates.metadata = body.metadata;

    if (Object.keys(allowedUpdates).length === 0) {
      return NextResponse.json({ ok: false, error: "No valid fields to update" }, { status: 400 });
    }

    const result = await updateMerchant(merchant.id, allowedUpdates);
    if (!result.ok || !result.data) {
      return NextResponse.json(result, { status: 400 });
    }
    const payoutAddress = await getMerchantPayoutAddress(result.data);
    return NextResponse.json({ ok: true, data: publicMerchant(result.data, payoutAddress) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
