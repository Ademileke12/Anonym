// Root gateway info — returns available endpoints so the base URL isn't a 404.
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    service: "Anonym Gateway API",
    version: "1.0.0",
    docs: "/docs",
    endpoints: {
      intents: "/api/gateway/intents",
      merchants: "/api/gateway/merchants/me",
      webhooks: "/api/gateway/webhooks",
      managed_wallets: "/api/gateway/managed-wallets",
      settle: "/api/gateway/settle",
      checkout: "/checkout/{intent_id}",
    },
  });
}
