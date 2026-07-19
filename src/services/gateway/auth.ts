import { createAdminClient } from "@/services/supabase/admin";
import { createClient as createServerClient } from "@/services/supabase/server";
import { sha256 } from "@/lib/crypto";
import type { Merchant } from "./types";

const GATEWAY_KEY_PREFIX = "sk_live_";
const GATEWAY_KEY_LENGTH = 48;

export function generateApiKey(): { key: string; hash: string; prefix: string } {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let key = GATEWAY_KEY_PREFIX;
  for (let i = 0; i < GATEWAY_KEY_LENGTH; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const hash = sha256(key);
  const prefix = key.slice(0, 12);
  return { key, hash, prefix };
}

export async function verifyApiKey(
  apiKey: string
): Promise<Merchant | null> {
  if (!apiKey.startsWith(GATEWAY_KEY_PREFIX)) return null;

  const hash = sha256(apiKey);
  const admin = createAdminClient();

  const { data: keyRow, error: keyErr } = await admin
    .from("merchant_api_keys")
    .select("merchant_id, revoked_at, expires_at")
    .eq("key_hash", hash)
    .single();

  if (keyErr || !keyRow) return null;
  if (keyRow.revoked_at) return null;
  if (keyRow.expires_at && new Date(keyRow.expires_at) < new Date()) return null;

  await admin
    .from("merchant_api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("key_hash", hash);

  const { data: merchant, error: mErr } = await admin
    .from("merchants")
    .select("*")
    .eq("id", keyRow.merchant_id)
    .eq("status", "active")
    .single();

  if (mErr || !merchant) return null;
  return merchant as Merchant;
}

export async function extractMerchantFromRequest(
  request: Request
): Promise<Merchant | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const apiKey = authHeader.slice(7);
  return verifyApiKey(apiKey);
}

/**
 * Resolve the auth.users id for the current dashboard session (SIWE cookie).
 * Returns null when there is no valid session.
 */
export async function getSessionUserId(): Promise<string | null> {
  try {
    const supabase = await createServerClient();
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Load the merchant owned by the current dashboard session. Uses the service-role
 * client for the lookup so it is not affected by RLS timing, but scopes strictly
 * to the authenticated user's id.
 */
export async function getMerchantForSession(): Promise<Merchant | null> {
  const userId = await getSessionUserId();
  if (!userId) return null;

  const admin = createAdminClient();
  const { data } = await admin
    .from("merchants")
    .select("*")
    .eq("user_id", userId)
    .neq("status", "deleted")
    .maybeSingle();

  return (data as Merchant) ?? null;
}

/**
 * Resolve a merchant from either a dashboard session (cookie) or an API key
 * (Authorization: Bearer). Session takes precedence for dashboard routes.
 */
export async function resolveMerchant(request: Request): Promise<Merchant | null> {
  const sessionMerchant = await getMerchantForSession();
  if (sessionMerchant) return sessionMerchant;
  return extractMerchantFromRequest(request);
}
