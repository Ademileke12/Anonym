import { NextResponse } from "next/server";
import { extractMerchantFromRequest, cancelPaymentIntent } from "@/services/gateway";

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
    const result = await cancelPaymentIntent(id, merchant.id);
    return NextResponse.json(result, {
      status: result.ok ? 200 : 400,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
