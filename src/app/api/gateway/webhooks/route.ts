import { NextResponse } from "next/server";
import { resolveMerchant, createWebhookEndpoint, listWebhookEndpoints, checkRateLimit } from "@/services/gateway";
import type { CreateWebhookRequest } from "@/services/gateway";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const merchant = await resolveMerchant(request);
    if (!merchant) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const rateCheck = await checkRateLimit(merchant.id, "POST /webhooks");
    if (!rateCheck.ok) {
      return NextResponse.json(rateCheck, { status: 429 });
    }

    const body: CreateWebhookRequest = await request.json();
    if (!body.url) {
      return NextResponse.json({ ok: false, error: "URL is required" }, { status: 400 });
    }

    const result = await createWebhookEndpoint(merchant.id, body);
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
    const merchant = await resolveMerchant(request);
    if (!merchant) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const result = await listWebhookEndpoints(merchant.id);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
