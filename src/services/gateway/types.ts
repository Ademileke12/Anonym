export type MerchantStatus = "active" | "suspended" | "deleted";

export interface Merchant {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  api_key_hash: string;
  api_key_prefix: string;
  webhook_url: string | null;
  webhook_secret: string | null;
  status: MerchantStatus;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type PaymentIntentStatus =
  | "created"
  | "pending"
  | "paid"
  | "settled"
  | "failed"
  | "expired"
  | "cancelled";

export interface PaymentIntent {
  id: string;
  merchant_id: string;
  amount: number;
  token: string;
  currency: string;
  recipient_address: string | null;
  recipient_merchant_id: string | null;
  payer_managed_wallet: string | null;
  payer_label: string | null;
  vault_address: string | null;
  deposit_id: number | null;
  commitment_hash: string | null;
  salt: string | null;
  tx_hash: string | null;
  claim_tx_hash: string | null;
  status: PaymentIntentStatus;
  description: string | null;
  metadata: Record<string, unknown>;
  idempotency_key: string | null;
  expires_at: string;
  paid_at: string | null;
  settled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ManagedWallet {
  id: string;
  merchant_id: string;
  address: string;
  derivation_index: number;
  label: string | null;
  user_identifier: string | null;
  status: "active" | "frozen" | "closed";
  created_at: string;
}

export interface WebhookEndpoint {
  id: string;
  merchant_id: string;
  url: string;
  secret: string;
  events: string[];
  status: "active" | "disabled";
  created_at: string;
}

export interface WebhookDelivery {
  id: string;
  endpoint_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  status: "pending" | "success" | "failed";
  attempts: number;
  last_attempt_at: string | null;
  next_retry_at: string | null;
  response_status: number | null;
  response_body: string | null;
  created_at: string;
}

export interface CreateIntentRequest {
  amount: number;
  token?: string;
  currency?: string;
  recipient_address?: string;
  recipient_merchant_id?: string;
  payer_label?: string;
  use_managed_wallet?: boolean;
  description?: string;
  metadata?: Record<string, unknown>;
  idempotency_key?: string;
  expires_in_seconds?: number;
}

export interface CreateWebhookRequest {
  url: string;
  events?: string[];
}

export interface GatewayApiResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
  code?: string;
}

export type WebhookEvent =
  | "payment.created"
  | "payment.paid"
  | "payment.settled"
  | "payment.failed"
  | "payment.expired"
  | "payment.cancelled";
