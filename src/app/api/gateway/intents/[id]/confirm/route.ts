import { NextResponse } from "next/server";
import { extractMerchantFromRequest, markIntentPaid, dispatchWebhook } from "@/services/gateway";
import { getPaymentIntent } from "@/services/gateway";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const merchant = await extractMerchantFromRequest(request);
    if (!merchant) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    const { data: existing } = await getPaymentIntent(id, merchant.id);
    if (!existing) {
      return NextResponse.json({ ok: false, error: "Intent not found" }, { status: 404 });
    }
    if (existing.status !== "created") {
      return NextResponse.json(
        { ok: false, error: `Intent already in status: ${existing.status}` },
        { status: 400 }
      );
    }

    const result = await markIntentPaid(id, body.tx_hash || "confirmed", body.deposit_id, {
      salt: body.salt,
      commitment_hash: body.commitment_hash,
    });

    if (result.ok && result.data) {
      await dispatchWebhook("payment.paid", result.data);
    }

    return NextResponse.json(result, {
      status: result.ok ? 200 : 400,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
