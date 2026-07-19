import { NextResponse } from "next/server";
import { extractMerchantFromRequest, getPaymentIntent } from "@/services/gateway";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const merchant = await extractMerchantFromRequest(request);
    if (!merchant) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const result = await getPaymentIntent(id, merchant.id);
    return NextResponse.json(result, {
      status: result.ok ? 200 : 404,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
