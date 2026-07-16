import { NextResponse } from "next/server";
import { ZK_ENGINE } from "@/services/privacy";
import { isSupabaseConfigured } from "@/lib/env";

/** Lightweight edge health for status pages / uptime. */
export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "anonym-edge",
    timestamp: new Date().toISOString(),
    supabase: isSupabaseConfigured(),
    privacy: {
      version: ZK_ENGINE.version,
      onChainShielded: ZK_ENGINE.onChainShielded,
    },
  });
}
