import { createAdminClient } from "@/services/supabase/admin";

export interface RequestLog {
  id: string;
  merchant_id: string;
  method: string;
  endpoint: string;
  status_code: number;
  response_time_ms: number | null;
  ip_address: string | null;
  user_agent: string | null;
  request_size_bytes: number | null;
  response_size_bytes: number | null;
  error_code: string | null;
  created_at: string;
}

export async function logApiRequest(entry: {
  merchantId: string;
  method: string;
  endpoint: string;
  statusCode: number;
  responseTimeMs?: number;
  ipAddress?: string;
  userAgent?: string;
  requestSizeBytes?: number;
  responseSizeBytes?: number;
  errorCode?: string;
}): Promise<void> {
  const admin = createAdminClient();
  await admin.from("api_request_logs").insert({
    merchant_id: entry.merchantId,
    method: entry.method,
    endpoint: entry.endpoint,
    status_code: entry.statusCode,
    response_time_ms: entry.responseTimeMs ?? null,
    ip_address: entry.ipAddress ?? null,
    user_agent: entry.userAgent ?? null,
    request_size_bytes: entry.requestSizeBytes ?? null,
    response_size_bytes: entry.responseSizeBytes ?? null,
    error_code: entry.errorCode ?? null,
  });
}

export async function listRequestLogs(
  merchantId: string,
  options: { limit?: number; offset?: number; endpoint?: string } = {}
): Promise<{ data: RequestLog[]; total: number }> {
  const admin = createAdminClient();
  const limit = Math.min(options.limit || 50, 200);
  const offset = options.offset || 0;

  let query = admin
    .from("api_request_logs")
    .select("*", { count: "exact" })
    .eq("merchant_id", merchantId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (options.endpoint) {
    query = query.eq("endpoint", options.endpoint);
  }

  const { data, count } = await query;

  return {
    data: (data || []) as RequestLog[],
    total: count || 0,
  };
}

export async function getRequestLogStats(merchantId: string): Promise<{
  totalRequests: number;
  avgResponseTime: number;
  errorRate: number;
  requestsLast24h: number;
}> {
  const admin = createAdminClient();
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { count: totalRequests } = await admin
    .from("api_request_logs")
    .select("*", { count: "exact", head: true })
    .eq("merchant_id", merchantId);

  const { data: recentData } = await admin
    .from("api_request_logs")
    .select("response_time_ms, status_code")
    .eq("merchant_id", merchantId)
    .gte("created_at", twentyFourHoursAgo);

  const logs = (recentData || []) as { response_time_ms: number | null; status_code: number }[];
  const requestsLast24h = logs.length;
  const avgResponseTime = logs.length > 0
    ? logs.reduce((a, l) => a + (l.response_time_ms || 0), 0) / logs.length
    : 0;
  const errorRate = logs.length > 0
    ? logs.filter((l) => l.status_code >= 400).length / logs.length
    : 0;

  return {
    totalRequests: totalRequests || 0,
    avgResponseTime: Math.round(avgResponseTime),
    errorRate: Math.round(errorRate * 100),
    requestsLast24h,
  };
}
