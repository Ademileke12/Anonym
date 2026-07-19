import { createAdminClient } from "@/services/supabase/admin";
import { randomSalt, computeCommitment } from "@/services/protocol/commitments";
import { getTransferSettlement } from "@/services/protocol/config";
import { getMerchantPayoutAddress } from "./merchants";
import type {
  PaymentIntent,
  CreateIntentRequest,
  GatewayApiResponse,
} from "./types";

export async function createPaymentIntent(
  merchantId: string,
  req: CreateIntentRequest
): Promise<GatewayApiResponse<PaymentIntent>> {
  const admin = createAdminClient();

  if (req.idempotency_key) {
    const { data: existing } = await admin
      .from("payment_intents")
      .select("*")
      .eq("idempotency_key", req.idempotency_key)
      .eq("merchant_id", merchantId)
      .single();

    if (existing) {
      return { ok: true, data: existing as PaymentIntent };
    }
  }

  if (req.amount <= 0) {
    return { ok: false, error: "Amount must be positive", code: "INVALID_AMOUNT" };
  }

  const recipientMerchantId = req.recipient_merchant_id || null;

  // Default the on-chain recipient to the merchant's own payout wallet so the
  // merchant can actually claim the vaulted funds. An explicit recipient_address
  // (or a recipient_merchant_id, resolved separately) always wins.
  let recipientAddress = req.recipient_address || null;
  if (!recipientAddress && !recipientMerchantId) {
    const { data: merchantRow } = await admin
      .from("merchants")
      .select("user_id")
      .eq("id", merchantId)
      .single();
    if (merchantRow) {
      recipientAddress = await getMerchantPayoutAddress(merchantRow);
    }
  }

  if (req.recipient_merchant_id) {
    const { data: recipientMerchant } = await admin
      .from("merchants")
      .select("id")
      .eq("id", req.recipient_merchant_id)
      .eq("status", "active")
      .single();

    if (!recipientMerchant) {
      return { ok: false, error: "Recipient merchant not found", code: "INVALID_RECIPIENT" };
    }
  }

  const salt = randomSalt();
  // Commitment binds an on-chain recipient. Only compute it when we actually have
  // a 20-byte address; the merchant id is a UUID and would break viem/keccak.
  const isEvmAddress = (v: string | null): v is `0x${string}` =>
    !!v && /^0x[a-fA-F0-9]{40}$/.test(v);
  const commitmentHash = isEvmAddress(recipientAddress)
    ? computeCommitment(recipientAddress, salt)
    : null;

  let vaultAddress: string | null = null;
  try {
    const settlement = getTransferSettlement();
    vaultAddress = settlement.address;
  } catch {
    // Protocol not configured — gateway still works for tracking
  }

  const expiresIn = req.expires_in_seconds || 3600;
  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

  let payerManagedWallet: string | null = null;
  if (req.use_managed_wallet) {
    const { data: existingWallet } = await admin
      .from("managed_wallets")
      .select("address")
      .eq("merchant_id", merchantId)
      .eq("user_identifier", req.payer_label || "default")
      .eq("status", "active")
      .single();

    if (existingWallet) {
      payerManagedWallet = existingWallet.address;
    }
  }

  const { data: intent, error } = await admin
    .from("payment_intents")
    .insert({
      merchant_id: merchantId,
      amount: req.amount,
      token: req.token || "MON",
      currency: req.currency || "MON",
      recipient_address: recipientAddress,
      recipient_merchant_id: recipientMerchantId,
      payer_managed_wallet: payerManagedWallet,
      payer_label: req.payer_label || null,
      vault_address: vaultAddress,
      commitment_hash: commitmentHash,
      salt,
      status: "created",
      description: req.description || null,
      metadata: req.metadata || {},
      idempotency_key: req.idempotency_key || null,
      expires_at: expiresAt,
    })
    .select()
    .single();

  if (error) {
    return { ok: false, error: error.message, code: "DB_ERROR" };
  }

  return { ok: true, data: intent as PaymentIntent };
}

export async function getPaymentIntent(
  intentId: string,
  merchantId: string
): Promise<GatewayApiResponse<PaymentIntent>> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("payment_intents")
    .select("*")
    .eq("id", intentId)
    .eq("merchant_id", merchantId)
    .single();

  if (error || !data) {
    return { ok: false, error: "Intent not found", code: "NOT_FOUND" };
  }

  return { ok: true, data: data as PaymentIntent };
}

/**
 * Public, key-less read for the hosted checkout page. Returns ONLY the fields
 * a shopper's browser is allowed to see — never salt, commitment, or anything
 * that could be used to claim funds. Joins the merchant name for branding.
 */
export async function getPublicCheckoutIntent(
  intentId: string,
): Promise<
  GatewayApiResponse<{
    id: string;
    amount: number;
    token: string;
    currency: string;
    description: string | null;
    recipient_address: string | null;
    status: string;
    tx_hash: string | null;
    expires_at: string;
    merchant_name: string;
    metadata: Record<string, unknown>;
  }>
> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("payment_intents")
    .select(
      "id, amount, token, currency, description, recipient_address, status, tx_hash, expires_at, metadata, merchants ( name )",
    )
    .eq("id", intentId)
    .single();

  if (error || !data) {
    return { ok: false, error: "Payment not found", code: "NOT_FOUND" };
  }

  const merchant = Array.isArray(data.merchants)
    ? data.merchants[0]
    : data.merchants;

  return {
    ok: true,
    data: {
      id: data.id,
      amount: Number(data.amount),
      token: data.token,
      currency: data.currency,
      description: data.description,
      recipient_address: data.recipient_address,
      status: data.status,
      tx_hash: data.tx_hash,
      expires_at: data.expires_at,
      merchant_name:
        (merchant as { name?: string } | null)?.name || "Merchant",
      metadata: (data.metadata as Record<string, unknown>) || {},
    },
  };
}

export async function cancelPaymentIntent(
  intentId: string,
  merchantId: string
): Promise<GatewayApiResponse<PaymentIntent>> {
  const admin = createAdminClient();

  const { data: existing, error: fetchErr } = await admin
    .from("payment_intents")
    .select("*")
    .eq("id", intentId)
    .eq("merchant_id", merchantId)
    .single();

  if (fetchErr || !existing) {
    return { ok: false, error: "Intent not found", code: "NOT_FOUND" };
  }

  if (!["created", "pending"].includes(existing.status)) {
    return {
      ok: false,
      error: `Cannot cancel intent in status: ${existing.status}`,
      code: "INVALID_STATUS",
    };
  }

  const { data, error } = await admin
    .from("payment_intents")
    .update({
      status: "cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", intentId)
    .select()
    .single();

  if (error) {
    return { ok: false, error: error.message, code: "DB_ERROR" };
  }

  return { ok: true, data: data as PaymentIntent };
}

export async function listPaymentIntents(
  merchantId: string,
  options: { status?: string; limit?: number; offset?: number } = {}
): Promise<GatewayApiResponse<PaymentIntent[]>> {
  const admin = createAdminClient();
  const limit = Math.min(options.limit || 25, 100);
  const offset = options.offset || 0;

  let query = admin
    .from("payment_intents")
    .select("*")
    .eq("merchant_id", merchantId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (options.status) {
    query = query.eq("status", options.status);
  }

  const { data, error } = await query;

  if (error) {
    return { ok: false, error: error.message, code: "DB_ERROR" };
  }

  return { ok: true, data: (data || []) as PaymentIntent[] };
}

export async function settlePaymentIntent(
  intentId: string
): Promise<GatewayApiResponse<PaymentIntent>> {
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("payment_intents")
    .select("*")
    .eq("id", intentId)
    .eq("status", "paid")
    .single();

  if (!existing) {
    return { ok: false, error: "Intent not found or not in paid status", code: "NOT_FOUND" };
  }

  const { data, error } = await admin
    .from("payment_intents")
    .update({
      status: "settled",
      settled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", intentId)
    .select()
    .single();

  if (error) {
    return { ok: false, error: error.message, code: "DB_ERROR" };
  }

  return { ok: true, data: data as PaymentIntent };
}

export async function markIntentPaid(
  intentId: string,
  txHash: string,
  depositId?: number,
  claimData?: { salt?: string | null; commitment_hash?: string | null }
): Promise<GatewayApiResponse<PaymentIntent>> {
  const admin = createAdminClient();

  const updatePayload: {
    status: string;
    tx_hash: string;
    paid_at: string;
    updated_at: string;
    deposit_id?: number;
    salt?: string;
    commitment_hash?: string;
  } = {
    status: "paid",
    tx_hash: txHash,
    paid_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (depositId !== undefined) {
    updatePayload.deposit_id = depositId;
  }

  // The intent's original salt is unusable — the real on-chain deposit was made
  // with its own salt (via protocolTransfer). Persist the REAL salt + commitment
  // so the merchant can reconstruct the vault claim from the intent alone.
  if (claimData?.salt && /^0x[a-fA-F0-9]{64}$/.test(claimData.salt)) {
    updatePayload.salt = claimData.salt;
  }
  if (
    claimData?.commitment_hash &&
    /^0x[a-fA-F0-9]{64}$/.test(claimData.commitment_hash)
  ) {
    updatePayload.commitment_hash = claimData.commitment_hash;
  }

  const { data, error } = await admin
    .from("payment_intents")
    .update(updatePayload)
    .eq("id", intentId)
    .eq("status", "created")
    .select()
    .single();

  if (error || !data) {
    return { ok: false, error: "Intent not found or already processed", code: "INVALID_STATUS" };
  }

  return { ok: true, data: data as PaymentIntent };
}
