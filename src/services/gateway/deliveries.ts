import { createAdminClient } from "@/services/supabase/admin";
import type { WebhookDelivery } from "./types";

export async function listWebhookDeliveries(
  merchantId: string,
  options: { limit?: number; offset?: number; endpointId?: string } = {}
): Promise<{ data: WebhookDelivery[]; total: number }> {
  const admin = createAdminClient();
  const limit = Math.min(options.limit || 50, 200);
  const offset = options.offset || 0;

  let query = admin
    .from("webhook_deliveries")
    .select("*, webhook_endpoints!inner(merchant_id)", { count: "exact" })
    .eq("webhook_endpoints.merchant_id", merchantId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (options.endpointId) {
    query = query.eq("endpoint_id", options.endpointId);
  }

  const { data, count } = await query;

  return {
    data: (data || []) as WebhookDelivery[],
    total: count || 0,
  };
}

export async function getWebhookDeliveryStats(merchantId: string): Promise<{
  totalDeliveries: number;
  successRate: number;
  failedCount: number;
  pendingCount: number;
}> {
  const admin = createAdminClient();

  const { data } = await admin
    .from("webhook_deliveries")
    .select("status, webhook_endpoints!inner(merchant_id)")
    .eq("webhook_endpoints.merchant_id", merchantId);

  const deliveries = (data || []) as { status: string }[];
  const totalDeliveries = deliveries.length;
  const successCount = deliveries.filter((d) => d.status === "success").length;
  const failedCount = deliveries.filter((d) => d.status === "failed").length;
  const pendingCount = deliveries.filter((d) => d.status === "pending").length;
  const successRate = totalDeliveries > 0 ? Math.round((successCount / totalDeliveries) * 100) : 0;

  return { totalDeliveries, successRate, failedCount, pendingCount };
}
