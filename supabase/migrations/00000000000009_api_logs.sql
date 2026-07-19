-- ============================================================
-- Migration 09: User-level RLS for Merchant Dashboard
-- Allows authenticated users to read their own gateway data
-- via the client Supabase (non-service-role context)
-- ============================================================

-- Merchants: allow users to create their own merchant record
CREATE POLICY "merchants_user_insert" ON merchants
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Merchants: allow users to update their own record
CREATE POLICY "merchants_user_update" ON merchants
  FOR UPDATE USING (user_id = auth.uid());

-- Payment Intents: user can read intents for their merchant
CREATE POLICY "intents_user_select" ON payment_intents
  FOR SELECT USING (
    merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid())
  );

-- Managed Wallets: user can read wallets for their merchant
CREATE POLICY "wallets_user_select" ON managed_wallets
  FOR SELECT USING (
    merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid())
  );

-- Webhook Endpoints: user can read endpoints for their merchant
CREATE POLICY "webhooks_user_select" ON webhook_endpoints
  FOR SELECT USING (
    merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid())
  );

-- Webhook Deliveries: user can read deliveries for their merchant's endpoints
CREATE POLICY "webhook_deliveries_user_select" ON webhook_deliveries
  FOR SELECT USING (
    endpoint_id IN (
      SELECT we.id FROM webhook_endpoints we
      JOIN merchants m ON we.merchant_id = m.id
      WHERE m.user_id = auth.uid()
    )
  );

-- Merchant API Keys: user can read keys for their merchant
CREATE POLICY "api_keys_user_select" ON merchant_api_keys
  FOR SELECT USING (
    merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid())
  );

-- API Request Logs: user can read logs for their merchant
CREATE POLICY "request_logs_user_select" ON api_request_logs
  FOR SELECT USING (
    merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid())
  );
