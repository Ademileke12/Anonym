import { createClient } from "@/services/supabase/client";
import type { PaymentRequest, SendMetadata } from "./send-types";

export async function createPaymentRequest(input: {
  requester_user_id?: string | null;
  requester_wallet: string;
  requester_username?: string | null;
  payer_username?: string | null;
  amount: number;
  message?: string | null;
  metadata?: SendMetadata;
  expires_at?: string | null;
}): Promise<PaymentRequest> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("payment_requests")
    .insert({
      requester_user_id: input.requester_user_id ?? null,
      requester_wallet: input.requester_wallet.toLowerCase(),
      requester_username: input.requester_username ?? null,
      payer_username: input.payer_username?.replace(/^@/, "").toLowerCase() ?? null,
      amount: input.amount,
      message: input.message ?? null,
      metadata: input.metadata ?? {},
      status: "open",
      expires_at: input.expires_at ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as PaymentRequest;
}

export async function getPaymentRequest(
  id: string,
): Promise<PaymentRequest | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("payment_requests")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as PaymentRequest | null;
}

export async function listMyPaymentRequests(
  wallet: string,
): Promise<PaymentRequest[]> {
  const supabase = createClient();
  const w = wallet.toLowerCase();
  const { data, error } = await supabase
    .from("payment_requests")
    .select("*")
    .or(`requester_wallet.eq.${w},payer_wallet.eq.${w}`)
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) {
    // Table may not exist yet
    if ((error as { code?: string }).code === "PGRST205") return [];
    throw error;
  }
  return (data ?? []) as PaymentRequest[];
}

export async function markPaymentRequestPaid(input: {
  id: string;
  payer_wallet: string;
  payer_user_id?: string | null;
  deposit_id?: string | null;
}): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("payment_requests")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      payer_wallet: input.payer_wallet.toLowerCase(),
      payer_user_id: input.payer_user_id ?? null,
      deposit_id: input.deposit_id ?? null,
    })
    .eq("id", input.id);
  if (error) throw error;
}

export async function cancelPaymentRequest(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("payment_requests")
    .update({ status: "cancelled" })
    .eq("id", id);
  if (error) throw error;
}
