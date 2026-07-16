import { createClient } from "@/services/supabase/client";
import type { PrivateView } from "./types";

export async function getActivePrivateView(
  wallet: string,
): Promise<PrivateView | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("private_views")
    .select("*")
    .eq("wallet", wallet.toLowerCase())
    .order("unlocked_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) {
    return null;
  }
  return data;
}

export async function unlockPrivateView(input: {
  wallet: string;
  tx_hash: string;
  expires_at?: string | null;
}): Promise<PrivateView> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("private_views")
    .insert({
      wallet: input.wallet.toLowerCase(),
      tx_hash: input.tx_hash,
      expires_at:
        input.expires_at ??
        new Date(Date.now() + 365 * 86400000).toISOString(),
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}
