// Public, key-less checkout read. The hosted checkout page (which runs in a
// shopper's browser, with no merchant secret) calls this to render the payment.
// Only ever returns fields safe to expose publicly.
import { NextResponse } from "next/server";
import { getPublicCheckoutIntent } from "@/services/gateway";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
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

    const result = await getPublicCheckoutIntent(id);
    return NextResponse.json(result, { status: result.ok ? 200 : 404 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
