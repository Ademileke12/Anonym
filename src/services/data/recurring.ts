import { createClient } from "@/services/supabase/client";
import type { RecurringSend, SendMetadata } from "./send-types";

export async function createRecurringSend(input: {
  sender_user_id?: string | null;
  sender_wallet: string;
  recipient_wallet: string;
  recipient_user_id?: string | null;
  recipient_username?: string | null;
  amount: number;
  interval_days: number;
  message?: string | null;
  metadata?: SendMetadata;
}): Promise<RecurringSend> {
  const supabase = createClient();
  const next = new Date();
  next.setDate(next.getDate() + input.interval_days);
  const { data, error } = await supabase
    .from("recurring_sends")
    .insert({
      sender_user_id: input.sender_user_id ?? null,
      sender_wallet: input.sender_wallet.toLowerCase(),
      recipient_wallet: input.recipient_wallet.toLowerCase(),
      recipient_user_id: input.recipient_user_id ?? null,
      recipient_username: input.recipient_username ?? null,
      amount: input.amount,
      interval_days: input.interval_days,
      next_run_at: next.toISOString(),
      active: true,
      message: input.message ?? null,
      metadata: input.metadata ?? {},
    })
    .select()
    .single();
  if (error) throw error;
  return data as RecurringSend;
}

export async function listMyRecurring(wallet: string): Promise<RecurringSend[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("recurring_sends")
    .select("*")
    .eq("sender_wallet", wallet.toLowerCase())
    .order("created_at", { ascending: false });
  if (error) {
    if ((error as { code?: string }).code === "PGRST205") return [];
    throw error;
  }
  return (data ?? []) as RecurringSend[];
}

export async function setRecurringActive(
  id: string,
  active: boolean,
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("recurring_sends")
    .update({ active })
    .eq("id", id);
  if (error) throw error;
}
