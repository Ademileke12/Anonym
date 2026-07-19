-- ============================================================
-- Migration 08: Anonym Gateway API
-- Payment gateway for external crypto & web2 apps
-- ============================================================

-- ---------- Merchants ----------
CREATE TABLE merchants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  api_key_hash TEXT NOT NULL UNIQUE,
  api_key_prefix TEXT NOT NULL,
  webhook_url TEXT,
  webhook_secret TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended', 'deleted')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_merchants_api_key_prefix ON merchants (api_key_prefix);
CREATE INDEX idx_merchants_user_id ON merchants (user_id) WHERE user_id IS NOT NULL;

-- ---------- Payment Intents ----------
CREATE TABLE payment_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,

  amount NUMERIC(38,18) NOT NULL,
  token TEXT NOT NULL DEFAULT 'MON',
  currency TEXT NOT NULL DEFAULT 'MON',

  recipient_address TEXT,
  recipient_merchant_id UUID REFERENCES merchants(id) ON DELETE SET NULL,

  payer_managed_wallet TEXT,
  payer_label TEXT,

  vault_address TEXT,
  deposit_id BIGINT,
  commitment_hash TEXT,
  salt TEXT,
  tx_hash TEXT,
  claim_tx_hash TEXT,

  status TEXT NOT NULL DEFAULT 'created'
    CHECK (status IN ('created', 'pending', 'paid', 'settled', 'failed', 'expired', 'cancelled')),

  description TEXT,
  metadata JSONB DEFAULT '{}',
  idempotency_key TEXT UNIQUE,

  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '1 hour'),

  paid_at TIMESTAMPTZ,
  settled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_payment_intents_merchant ON payment_intents (merchant_id);
CREATE INDEX idx_payment_intents_status ON payment_intents (status);
CREATE INDEX idx_payment_intents_idempotency ON payment_intents (idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX idx_payment_intents_expires ON payment_intents (expires_at) WHERE status IN ('created', 'pending');

-- ---------- Managed Wallets ----------
CREATE TABLE managed_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  address TEXT NOT NULL UNIQUE,
  derivation_index BIGINT NOT NULL,
  label TEXT,
  user_identifier TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'frozen', 'closed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_managed_wallets_merchant ON managed_wallets (merchant_id);
CREATE INDEX idx_managed_wallets_merchant_user ON managed_wallets (merchant_id, user_identifier) WHERE user_identifier IS NOT NULL;

-- ---------- Webhook Endpoints ----------
CREATE TABLE webhook_endpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  secret TEXT NOT NULL,
  events TEXT[] NOT NULL DEFAULT ARRAY['payment.paid', 'payment.settled', 'payment.failed'],
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'disabled')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_webhook_endpoints_merchant ON webhook_endpoints (merchant_id);

-- ---------- Webhook Deliveries ----------
CREATE TABLE webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint_id UUID NOT NULL REFERENCES webhook_endpoints(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'success', 'failed')),
  attempts INT DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  next_retry_at TIMESTAMPTZ,
  response_status INT,
  response_body TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_webhook_deliveries_endpoint ON webhook_deliveries (endpoint_id);
CREATE INDEX idx_webhook_deliveries_pending ON webhook_deliveries (status, next_retry_at) WHERE status = 'pending';

-- ---------- Merchant API Keys (for listing / revoking) ----------
CREATE TABLE merchant_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  name TEXT DEFAULT 'default',
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_merchant_api_keys_merchant ON merchant_api_keys (merchant_id);

-- ---------- RLS Policies ----------

ALTER TABLE merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE managed_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_api_keys ENABLE ROW LEVEL SECURITY;

-- Merchants: service-role only (API routes use admin client)
CREATE POLICY "merchants_service_all" ON merchants
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "merchants_user_select" ON merchants
  FOR SELECT USING (user_id = auth.uid());

-- Payment Intents: service-role for API, user can read own
CREATE POLICY "intents_service_all" ON payment_intents
  FOR ALL USING (auth.role() = 'service_role');

-- Managed Wallets: service-role only
CREATE POLICY "wallets_service_all" ON managed_wallets
  FOR ALL USING (auth.role() = 'service_role');

-- Webhook Endpoints: service-role only
CREATE POLICY "webhooks_service_all" ON webhook_endpoints
  FOR ALL USING (auth.role() = 'service_role');

-- Webhook Deliveries: service-role only
CREATE POLICY "webhook_deliveries_service_all" ON webhook_deliveries
  FOR ALL USING (auth.role() = 'service_role');

-- Merchant API Keys: service-role only
CREATE POLICY "api_keys_service_all" ON merchant_api_keys
  FOR ALL USING (auth.role() = 'service_role');
