import { createAdminClient } from "@/services/supabase/admin";
import { sha256 } from "@/lib/crypto";
import type { ManagedWallet, GatewayApiResponse } from "./types";

function deriveAddress(merchantId: string, index: number): string {
  const hash = sha256(`${merchantId}:${index}`);
  return `0x${hash.slice(0, 40)}`;
}

export async function createManagedWallet(
  merchantId: string,
  options: { label?: string; user_identifier?: string } = {}
): Promise<GatewayApiResponse<ManagedWallet & { address: string }>> {
  const admin = createAdminClient();

  if (options.user_identifier) {
    const { data: existing } = await admin
      .from("managed_wallets")
      .select("*")
      .eq("merchant_id", merchantId)
      .eq("user_identifier", options.user_identifier)
      .eq("status", "active")
      .single();

    if (existing) {
      return { ok: true, data: existing as ManagedWallet & { address: string } };
    }
  }

  const { count } = await admin
    .from("managed_wallets")
    .select("id", { count: "exact", head: true })
    .eq("merchant_id", merchantId);

  const derivationIndex = (count || 0) + 1;
  const address = deriveAddress(merchantId, derivationIndex);

  const { data, error } = await admin
    .from("managed_wallets")
    .insert({
      merchant_id: merchantId,
      address,
      derivation_index: derivationIndex,
      label: options.label || null,
      user_identifier: options.user_identifier || null,
      status: "active",
    })
    .select()
    .single();

  if (error) {
    return { ok: false, error: error.message, code: "DB_ERROR" };
  }

  return { ok: true, data: data as ManagedWallet & { address: string } };
}

export async function getManagedWallet(
  address: string,
  merchantId: string
): Promise<GatewayApiResponse<ManagedWallet>> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("managed_wallets")
    .select("*")
    .eq("address", address.toLowerCase())
    .eq("merchant_id", merchantId)
    .single();

  if (error || !data) {
    return { ok: false, error: "Wallet not found", code: "NOT_FOUND" };
  }

  return { ok: true, data: data as ManagedWallet };
}

export async function listManagedWallets(
  merchantId: string,
  options: { limit?: number; offset?: number } = {}
): Promise<GatewayApiResponse<ManagedWallet[]>> {
  const admin = createAdminClient();
  const limit = Math.min(options.limit || 25, 100);
  const offset = options.offset || 0;

  const { data, error } = await admin
    .from("managed_wallets")
    .select("*")
    .eq("merchant_id", merchantId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return { ok: false, error: error.message, code: "DB_ERROR" };
  }

  return { ok: true, data: (data || []) as ManagedWallet[] };
}

export async function freezeManagedWallet(
  address: string,
  merchantId: string
): Promise<GatewayApiResponse<ManagedWallet>> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("managed_wallets")
    .update({ status: "frozen" })
    .eq("address", address.toLowerCase())
    .eq("merchant_id", merchantId)
    .eq("status", "active")
    .select()
    .single();

  if (error || !data) {
    return { ok: false, error: "Wallet not found or already frozen", code: "NOT_FOUND" };
  }

  return { ok: true, data: data as ManagedWallet };
}
