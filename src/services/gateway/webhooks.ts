import { createAdminClient } from "@/services/supabase/admin";
import { sha256 } from "@/lib/crypto";
import type {
  WebhookEndpoint,
  CreateWebhookRequest,
  GatewayApiResponse,
  WebhookEvent,
  PaymentIntent,
} from "./types";

export async function createWebhookEndpoint(
  merchantId: string,
  req: CreateWebhookRequest
): Promise<GatewayApiResponse<WebhookEndpoint>> {
  const admin = createAdminClient();
  const secret = `whsec_${sha256(Math.random().toString(36) + Date.now()).slice(0, 32)}`;

  const { data, error } = await admin
    .from("webhook_endpoints")
    .insert({
      merchant_id: merchantId,
      url: req.url,
      secret,
      events: req.events || ["payment.paid", "payment.settled", "payment.failed"],
      status: "active",
    })
    .select()
    .single();

  if (error) {
    return { ok: false, error: error.message, code: "DB_ERROR" };
  }

  return { ok: true, data: data as WebhookEndpoint };
}

export async function listWebhookEndpoints(
  merchantId: string
): Promise<GatewayApiResponse<WebhookEndpoint[]>> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("webhook_endpoints")
    .select("*")
    .eq("merchant_id", merchantId)
    .order("created_at", { ascending: false });

  if (error) {
    return { ok: false, error: error.message, code: "DB_ERROR" };
  }

  return { ok: true, data: (data || []) as WebhookEndpoint[] };
}

export async function deleteWebhookEndpoint(
  endpointId: string,
  merchantId: string
): Promise<GatewayApiResponse<null>> {
  const admin = createAdminClient();

  const { error } = await admin
    .from("webhook_endpoints")
    .delete()
    .eq("id", endpointId)
    .eq("merchant_id", merchantId);

  if (error) {
    return { ok: false, error: error.message, code: "DB_ERROR" };
  }

  return { ok: true };
}

export async function dispatchWebhook(
  eventType: WebhookEvent,
  intent: PaymentIntent
): Promise<void> {
  const admin = createAdminClient();

  const { data: endpoints } = await admin
    .from("webhook_endpoints")
    .select("*")
    .eq("merchant_id", intent.merchant_id)
    .eq("status", "active");

  if (!endpoints?.length) return;

  const payload = {
    event: eventType,
    timestamp: new Date().toISOString(),
    data: {
      id: intent.id,
      amount: intent.amount,
      token: intent.token,
      currency: intent.currency,
      status: intent.status,
      description: intent.description,
      metadata: intent.metadata,
      payer_label: intent.payer_label,
      tx_hash: intent.tx_hash,
      paid_at: intent.paid_at,
      settled_at: intent.settled_at,
      created_at: intent.created_at,
    },
  };

  for (const endpoint of endpoints) {
    if (!endpoint.events.includes(eventType)) continue;

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const body = JSON.stringify(payload);
    const signature = sha256(`${timestamp}.${body}.${endpoint.secret}`);

    const deliveryPayload = {
      endpoint_id: endpoint.id,
      event_type: eventType,
      payload,
      status: "pending" as const,
      attempts: 0,
    };

    const { data: delivery } = await admin
      .from("webhook_deliveries")
      .insert(deliveryPayload)
      .select()
      .single();

    if (!delivery) continue;

    try {
      const response = await fetch(endpoint.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Anonym-Signature": `sha256=${signature}`,
          "X-Anonym-Timestamp": timestamp,
          "X-Anonym-Event": eventType,
        },
        body,
        signal: AbortSignal.timeout(10000),
      });

      await admin
        .from("webhook_deliveries")
        .update({
          status: response.ok ? "success" : "failed",
          attempts: 1,
          last_attempt_at: new Date().toISOString(),
          response_status: response.status,
          response_body: response.ok ? "OK" : await response.text().catch(() => ""),
        })
        .eq("id", delivery.id);
    } catch (err) {
      await admin
        .from("webhook_deliveries")
        .update({
          status: "failed",
          attempts: 1,
          last_attempt_at: new Date().toISOString(),
          response_body: err instanceof Error ? err.message : "Unknown error",
        })
        .eq("id", delivery.id);
    }
  }
}
