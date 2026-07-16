import { createClient } from "@/services/supabase/client";
import type { Transfer } from "./types";

export async function listTransfersForWallet(
  wallet: string,
): Promise<Transfer[]> {
  const supabase = createClient();
  const w = wallet.toLowerCase();
  const { data, error } = await supabase
    .from("transfers")
    .select("*")
    .or(`sender_wallet.eq.${w},receiver_wallet.eq.${w}`)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createTransfer(input: {
  sender_wallet: string;
  receiver_wallet: string;
  amount: number;
  token?: string;
  note?: string | null;
  tx_hash: string;
}): Promise<Transfer> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("transfers")
    .insert({
      sender_wallet: input.sender_wallet.toLowerCase(),
      receiver_wallet: input.receiver_wallet.toLowerCase(),
      amount: input.amount,
      token: input.token ?? "MON",
      note: input.note ?? null,
      tx_hash: input.tx_hash,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function listIncomingTransfers(
  wallet: string,
): Promise<Transfer[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("transfers")
    .select("*")
    .eq("receiver_wallet", wallet.toLowerCase())
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function listIncomingDonations(wallet: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("donations")
    .select("*")
    .eq("recipient_wallet", wallet.toLowerCase())
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
