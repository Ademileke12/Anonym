// Public, key-less checkout confirm. Called by the hosted checkout page after
// the shopper's wallet has moved real MON on-chain into the vault. It flips the
// intent created -> paid and fires the payment.paid webhook.
//
// Security model: this endpoint has no merchant secret, so it is deliberately
// narrow — it only advances a `created` intent to `paid` (never re-credits an
// already-paid one), and it requires a real 0x64 transaction hash. It cannot be
// used to move funds; the on-chain deposit already happened in the browser.
import { NextResponse } from "next/server";
import {
  getPublicCheckoutIntent,
  markIntentPaid,
  dispatchWebhook,
} from "@/services/gateway";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!/^[0-9a-f-]{36}$/i.test(id)) {
      return NextResponse.json(
        { ok: false, error: "Invalid payment id" },
        { status: 400 },
      );
    }

    const body = await request.json().catch(() => ({}));

    const txHash = typeof body.tx_hash === "string" ? body.tx_hash : "";
    if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
      return NextResponse.json(
        { ok: false, error: "A real on-chain tx_hash is required" },
        { status: 400 },
      );
    }

    const current = await getPublicCheckoutIntent(id);
    if (!current.ok || !current.data) {
      return NextResponse.json(
        { ok: false, error: "Payment not found" },
        { status: 404 },
      );
    }
    if (current.data.status !== "created") {
      // Already paid/settled/expired/cancelled — return current state, no re-credit.
      return NextResponse.json(
        {
          ok: current.data.status === "paid" || current.data.status === "settled",
          data: current.data,
          error:
            current.data.status === "paid" || current.data.status === "settled"
              ? undefined
              : `Payment is ${current.data.status}`,
        },
        { status: 200 },
      );
    }

    const depositId =
      body.deposit_id != null && Number.isFinite(Number(body.deposit_id))
        ? Number(body.deposit_id)
        : undefined;

    const result = await markIntentPaid(id, txHash, depositId, {
      salt: body.salt,
      commitment_hash: body.commitment_hash,
    });

    if (result.ok && result.data) {
      await dispatchWebhook("payment.paid", result.data);
    }

    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
