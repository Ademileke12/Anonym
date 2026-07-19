import { createAdminClient } from "@/services/supabase/admin";
import type { GatewayApiResponse } from "./types";

const RATE_LIMIT_WINDOW = 60 * 1000;
const RATE_LIMIT_MAX = 100;

export async function checkRateLimit(
  merchantId: string,
  endpoint: string
): Promise<GatewayApiResponse<null>> {
  const admin = createAdminClient();
  const windowStart = new Date(
    Math.floor(Date.now() / RATE_LIMIT_WINDOW) * RATE_LIMIT_WINDOW
  ).toISOString();

  const { data } = await admin
    .from("api_rate_limits")
    .select("request_count")
    .eq("merchant_id", merchantId)
    .eq("endpoint", endpoint)
    .eq("window_start", windowStart)
    .single();

  if (data && data.request_count >= RATE_LIMIT_MAX) {
    return {
      ok: false,
      error: "Rate limit exceeded. Try again shortly.",
      code: "RATE_LIMITED",
    };
  }

  if (data) {
    await admin
      .from("api_rate_limits")
      .update({ request_count: data.request_count + 1 })
      .eq("merchant_id", merchantId)
      .eq("endpoint", endpoint)
      .eq("window_start", windowStart);
  } else {
    await admin.from("api_rate_limits").insert({
      merchant_id: merchantId,
      endpoint,
      window_start: windowStart,
      request_count: 1,
    });
  }

  return { ok: true };
}
