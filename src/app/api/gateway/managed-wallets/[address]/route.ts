import { NextResponse } from "next/server";
import { extractMerchantFromRequest, getManagedWallet, freezeManagedWallet } from "@/services/gateway";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const merchant = await extractMerchantFromRequest(request);
    if (!merchant) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { address } = await params;
    const result = await getManagedWallet(address, merchant.id);
    return NextResponse.json(result, {
      status: result.ok ? 200 : 404,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const merchant = await extractMerchantFromRequest(request);
    if (!merchant) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { address } = await params;
    const result = await freezeManagedWallet(address, merchant.id);
    return NextResponse.json(result, {
      status: result.ok ? 200 : 400,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
