import { createClient } from "@/services/supabase/client";
import type { Hex } from "viem";

export type ProtectedStatus =
  | "pending"
  | "claimable"
  | "claimed"
  | "withdrawn"
  | "cancelled";

export type ProtectedKind = "transfer" | "donation" | "campaign_withdraw";

export type ProtectedDeposit = {
  id: string;
  kind: ProtectedKind;
  commitment_id: string | null;
  commitment_hash: string;
  salt: string;
  vault_address: string | null;
  on_chain_deposit_id: string | null;
  tx_hash: string | null;
  claim_tx_hash: string | null;
  campaign_id: string | null;
  sender_user_id: string | null;
  sender_wallet: string | null;
  recipient_user_id: string | null;
  recipient_wallet: string;
  anonymous: boolean;
  amount: number;
  token: string;
  message: string | null;
  status: ProtectedStatus;
  created_at: string;
  claimed_at: string | null;
};

/** PostgREST: table missing from schema cache (migration 06 not applied). */
export function isMissingProtocolTable(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: string; message?: string };
  if (e.code === "PGRST205") return true;
  if (e.code === "42P01") return true; // undefined_table (raw postgres)
  const msg = (e.message ?? "").toLowerCase();
  return (
    msg.includes("could not find the table") ||
    msg.includes("does not exist") ||
    msg.includes("schema cache")
  );
}

const MIGRATION_HINT =
  "Run supabase/migrations/00000000000006_protocol_ledger.sql in the Supabase SQL Editor, then reload the schema (or wait ~1 min).";

function protocolMissingError(context: string): Error {
  return new Error(
    `Protocol tables missing (${context}). ${MIGRATION_HINT}`,
  );
}

export async function insertProtectedDeposit(input: {
  kind: ProtectedKind;
  commitment_hash: string;
  salt: string;
  vault_address?: string | null;
  on_chain_deposit_id?: string | null;
  tx_hash?: string | null;
  campaign_id?: string | null;
  sender_user_id?: string | null;
  sender_wallet?: string | null;
  recipient_user_id?: string | null;
  recipient_wallet: string;
  anonymous?: boolean;
  amount: number;
  token?: string;
  message?: string | null;
  status?: ProtectedStatus;
  /** ZK nullifier (anonym-zk-v1) */
  nullifier?: string | null;
}): Promise<ProtectedDeposit> {
  const supabase = createClient();

  const { data: commitment, error: cErr } = await supabase
    .from("commitments")
    .insert({
      commitment_hash: input.commitment_hash,
      nullifier_placeholder: input.nullifier ?? null,
      vault_address: input.vault_address ?? null,
      amount: input.amount,
      token: input.token ?? "MON",
      status: input.status ?? "claimable",
    })
    .select()
    .single();

  if (cErr) {
    if (isMissingProtocolTable(cErr)) {
      throw protocolMissingError("commitments / protected_deposits");
    }
    throw cErr;
  }

  const { data, error } = await supabase
    .from("protected_deposits")
    .insert({
      kind: input.kind,
      commitment_id: commitment.id,
      commitment_hash: input.commitment_hash,
      salt: input.salt,
      vault_address: input.vault_address ?? null,
      on_chain_deposit_id: input.on_chain_deposit_id ?? null,
      tx_hash: input.tx_hash ?? null,
      campaign_id: input.campaign_id ?? null,
      sender_user_id: input.sender_user_id ?? null,
      sender_wallet: input.sender_wallet?.toLowerCase() ?? null,
      recipient_user_id: input.recipient_user_id ?? null,
      recipient_wallet: input.recipient_wallet.toLowerCase(),
      anonymous: input.anonymous ?? true,
      amount: input.amount,
      token: input.token ?? "MON",
      message: input.message ?? null,
      status: input.status ?? "claimable",
    })
    .select()
    .single();

  if (error) {
    if (isMissingProtocolTable(error)) {
      throw protocolMissingError("protected_deposits");
    }
    throw error;
  }
  return data as ProtectedDeposit;
}

export async function listClaimableForWallet(
  wallet: string,
): Promise<ProtectedDeposit[]> {
  const supabase = createClient();
  const w = wallet.toLowerCase();
  const { data, error } = await supabase
    .from("protected_deposits")
    .select("*")
    .eq("recipient_wallet", w)
    .eq("status", "claimable")
    .order("created_at", { ascending: false });
  if (error) {
    if (isMissingProtocolTable(error)) return [];
    throw error;
  }
  return (data ?? []) as ProtectedDeposit[];
}

export async function listProtectedActivity(
  wallet: string,
): Promise<ProtectedDeposit[]> {
  const supabase = createClient();
  const w = wallet.toLowerCase();
  const { data, error } = await supabase
    .from("protected_deposits")
    .select("*")
    .or(`sender_wallet.eq.${w},recipient_wallet.eq.${w}`)
    .order("created_at", { ascending: false })
    .limit(40);
  if (error) {
    if (isMissingProtocolTable(error)) return [];
    throw error;
  }
  return (data ?? []) as ProtectedDeposit[];
}

export async function markDepositClaimed(
  id: string,
  claimTxHash: string | null,
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("protected_deposits")
    .update({
      status: "claimed",
      claimed_at: new Date().toISOString(),
      claim_tx_hash: claimTxHash,
    })
    .eq("id", id);
  if (error) {
    if (isMissingProtocolTable(error)) {
      throw protocolMissingError("protected_deposits");
    }
    throw error;
  }

  const { data: row } = await supabase
    .from("protected_deposits")
    .select("commitment_id")
    .eq("id", id)
    .maybeSingle();

  if (row?.commitment_id) {
    await supabase
      .from("commitments")
      .update({ status: "claimed" })
      .eq("id", row.commitment_id);
  }
}

export async function getCampaignVault(campaignId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("campaign_vaults")
    .select("*")
    .eq("campaign_id", campaignId)
    .maybeSingle();
  if (error) {
    if (isMissingProtocolTable(error)) return null;
    throw error;
  }
  return data as {
    id: string;
    campaign_id: string;
    vault_address: string;
    owner_wallet: string;
  } | null;
}

export async function upsertCampaignVault(input: {
  campaign_id: string;
  vault_address: string;
  owner_wallet: string;
  created_tx_hash?: string | null;
}) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("campaign_vaults")
    .upsert(
      {
        campaign_id: input.campaign_id,
        vault_address: input.vault_address,
        owner_wallet: input.owner_wallet.toLowerCase(),
        created_tx_hash: input.created_tx_hash ?? null,
      },
      { onConflict: "campaign_id" },
    )
    .select()
    .single();
  if (error) {
    if (isMissingProtocolTable(error)) {
      throw protocolMissingError("campaign_vaults");
    }
    throw error;
  }
  return data;
}

/**
 * Quick check used by UI banners. Returns false if migration 06 is not applied.
 */
export async function isProtocolLedgerReady(): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from("protected_deposits")
    .select("id")
    .limit(1);
  if (!error) return true;
  return !isMissingProtocolTable(error);
}

export type { Hex };
