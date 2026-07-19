import { NextResponse } from "next/server";
import { extractMerchantFromRequest, settlePaymentIntent, dispatchWebhook, getPaymentIntent } from "@/services/gateway";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const merchant = await extractMerchantFromRequest(request);
    if (!merchant) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const intentId = body.intent_id;

    if (!intentId) {
      return NextResponse.json(
        { ok: false, error: "intent_id is required" },
        { status: 400 }
      );
    }

    const { data: existing } = await getPaymentIntent(intentId, merchant.id);
    if (!existing) {
      return NextResponse.json({ ok: false, error: "Intent not found" }, { status: 404 });
    }

    if (existing.status !== "paid") {
      return NextResponse.json(
        { ok: false, error: `Cannot settle intent in status: ${existing.status}` },
        { status: 400 }
      );
    }

    const result = await settlePaymentIntent(intentId);

    if (result.ok && result.data) {
      await dispatchWebhook("payment.settled", result.data);
    }

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
