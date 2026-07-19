import { createAdminClient } from "@/services/supabase/admin";
import { generateApiKey } from "./auth";
import type { Merchant, GatewayApiResponse } from "./types";

/**
 * The wallet a merchant's payments are committed to on-chain, so the merchant
 * can later claim them from the vault. We use the merchant owner's linked Anonym
 * account wallet, stored on the auth user's metadata at SIWE login.
 *
 * The vault only releases a deposit to the address its commitment was built for
 * (`keccak256(recipient || salt)`), so this MUST be a wallet the merchant controls.
 */
export async function getMerchantPayoutAddress(
  merchant: Pick<Merchant, "user_id">,
): Promise<string | null> {
  if (!merchant.user_id) return null;
  const admin = createAdminClient();
  try {
    const { data, error } = await admin.auth.admin.getUserById(merchant.user_id);
    if (error || !data?.user) return null;
    const meta = { ...data.user.app_metadata, ...data.user.user_metadata };
    const wallet =
      typeof meta.wallet_address === "string" ? meta.wallet_address.trim() : "";
    return /^0x[a-fA-F0-9]{40}$/.test(wallet) ? wallet.toLowerCase() : null;
  } catch {
    return null;
  }
}

export async function createMerchant(
  name: string,
  email: string,
  userId?: string
): Promise<GatewayApiResponse<{ merchant: Merchant; api_key: string }>> {
  const admin = createAdminClient();

  const { key, hash, prefix } = generateApiKey();
  const webhookSecret = `whsec_${hash.slice(0, 32)}`;

  const { data, error } = await admin
    .from("merchants")
    .insert({
      name,
      email,
      user_id: userId || null,
      api_key_hash: hash,
      api_key_prefix: prefix,
      webhook_secret: webhookSecret,
      status: "active",
    })
    .select()
    .single();

  if (error) {
    return { ok: false, error: error.message, code: "DB_ERROR" };
  }

  await admin.from("merchant_api_keys").insert({
    merchant_id: data.id,
    key_hash: hash,
    key_prefix: prefix,
    name: "default",
  });

  return {
    ok: true,
    data: {
      merchant: data as Merchant,
      api_key: key,
    },
  };
}

export async function getMerchant(
  merchantId: string
): Promise<GatewayApiResponse<Merchant>> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("merchants")
    .select("*")
    .eq("id", merchantId)
    .single();

  if (error || !data) {
    return { ok: false, error: "Merchant not found", code: "NOT_FOUND" };
  }

  return { ok: true, data: data as Merchant };
}

export async function updateMerchant(
  merchantId: string,
  updates: { name?: string; email?: string; webhook_url?: string; metadata?: Record<string, unknown> }
): Promise<GatewayApiResponse<Merchant>> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("merchants")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", merchantId)
    .select()
    .single();

  if (error || !data) {
    return { ok: false, error: "Update failed", code: "DB_ERROR" };
  }

  return { ok: true, data: data as Merchant };
}

export async function rotateApiKey(
  merchantId: string
): Promise<GatewayApiResponse<{ api_key: string; prefix: string }>> {
  const admin = createAdminClient();

  const oldKey = await admin
    .from("merchant_api_keys")
    .select("key_hash")
    .eq("merchant_id", merchantId)
    .is("revoked_at", null)
    .limit(1)
    .single();

  if (oldKey.data) {
    await admin
      .from("merchant_api_keys")
      .update({ revoked_at: new Date().toISOString() })
      .eq("key_hash", oldKey.data.key_hash);

    const { data: merchant } = await admin
      .from("merchants")
      .select("api_key_hash")
      .eq("id", merchantId)
      .single();

    if (merchant) {
      const newApiKey = generateApiKey();
      await admin
        .from("merchants")
        .update({
          api_key_hash: newApiKey.hash,
          api_key_prefix: newApiKey.prefix,
          updated_at: new Date().toISOString(),
        })
        .eq("id", merchantId);

      await admin.from("merchant_api_keys").insert({
        merchant_id: merchantId,
        key_hash: newApiKey.hash,
        key_prefix: newApiKey.prefix,
        name: "rotated",
      });

      return {
        ok: true,
        data: { api_key: newApiKey.key, prefix: newApiKey.prefix },
      };
    }
  }

  const newApiKey = generateApiKey();
  await admin
    .from("merchants")
    .update({
      api_key_hash: newApiKey.hash,
      api_key_prefix: newApiKey.prefix,
      updated_at: new Date().toISOString(),
    })
    .eq("id", merchantId);

  await admin.from("merchant_api_keys").insert({
    merchant_id: merchantId,
    key_hash: newApiKey.hash,
    key_prefix: newApiKey.prefix,
    name: "initial",
  });

  return {
    ok: true,
    data: { api_key: newApiKey.key, prefix: newApiKey.prefix },
  };
}
