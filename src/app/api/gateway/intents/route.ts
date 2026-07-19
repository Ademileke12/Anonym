import { NextResponse } from "next/server";
import { extractMerchantFromRequest, createPaymentIntent, listPaymentIntents, checkRateLimit } from "@/services/gateway";
import type { CreateIntentRequest } from "@/services/gateway";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const merchant = await extractMerchantFromRequest(request);
    if (!merchant) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const rateCheck = await checkRateLimit(merchant.id, "POST /intents");
    if (!rateCheck.ok) {
      return NextResponse.json(rateCheck, { status: 429 });
    }

    const body: CreateIntentRequest = await request.json();
    const result = await createPaymentIntent(merchant.id, body);

    return NextResponse.json(result, {
      status: result.ok ? 201 : 400,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const merchant = await extractMerchantFromRequest(request);
    if (!merchant) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const status = url.searchParams.get("status") || undefined;
    const limit = parseInt(url.searchParams.get("limit") || "25", 10);
    const offset = parseInt(url.searchParams.get("offset") || "0", 10);

    const result = await listPaymentIntents(merchant.id, { status, limit, offset });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
