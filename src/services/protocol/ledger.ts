import { createClient } from "@/services/supabase/client";
import type { Hex } from "viem";
import type {
  ConditionPayload,
  ConditionType,
  SendMetadata,
} from "@/services/data/send-types";

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
  unlock_at?: string | null;
  condition_type?: string | null;
  condition_payload?: ConditionPayload;
  metadata?: SendMetadata;
  split_group_id?: string | null;
  parent_request_id?: string | null;
  claim_token?: string | null;
};

/** PostgREST: table missing from schema cache (migration not applied). */
export function isMissingProtocolTable(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: string; message?: string };
  if (e.code === "PGRST205") return true;
  if (e.code === "42P01") return true;
  const msg = (e.message ?? "").toLowerCase();
  return (
    msg.includes("could not find the table") ||
    msg.includes("does not exist") ||
    msg.includes("schema cache")
  );
}

const MIGRATION_HINT =
  "Run supabase/migrations/00000000000006_protocol_ledger.sql and 00000000000007_send_suite.sql in the Supabase SQL Editor.";

function protocolMissingError(context: string): Error {
  return new Error(`Protocol tables missing (${context}). ${MIGRATION_HINT}`);
}

export function isDepositClaimableNow(d: ProtectedDeposit): {
  ok: boolean;
  reason?: string;
} {
  if (d.status !== "claimable" && d.status !== "pending") {
    return { ok: false, reason: `Status is ${d.status}` };
  }
  if (d.unlock_at) {
    const t = new Date(d.unlock_at).getTime();
    if (Number.isFinite(t) && t > Date.now()) {
      return {
        ok: false,
        reason: `Escrow unlocks ${new Date(d.unlock_at).toLocaleString()}`,
      };
    }
  }
  const cond = (d.condition_type ?? "none") as ConditionType;
  if (cond && cond !== "none" && cond !== "after_date") {
    const payload = d.condition_payload ?? {};
    if (!payload.satisfied) {
      return {
        ok: false,
        reason:
          payload.label ||
          (cond === "github_pr"
            ? "Waiting for GitHub PR condition"
            : cond === "url_attest"
              ? "Waiting for form / attestation"
              : "Condition not satisfied yet"),
      };
    }
  }
  return { ok: true };
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
  nullifier?: string | null;
  unlock_at?: string | null;
  condition_type?: ConditionType | string | null;
  condition_payload?: ConditionPayload;
  metadata?: SendMetadata;
  split_group_id?: string | null;
  parent_request_id?: string | null;
  claim_token?: string | null;
}): Promise<ProtectedDeposit> {
  const supabase = createClient();
  const claimToken = input.claim_token ?? crypto.randomUUID();

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

  const row: Record<string, unknown> = {
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
  };

  // Extended columns (migration 07) — omit if not applied yet via try/catch
  row.unlock_at = input.unlock_at ?? null;
  row.condition_type = input.condition_type ?? "none";
  row.condition_payload = input.condition_payload ?? {};
  row.metadata = input.metadata ?? {};
  row.split_group_id = input.split_group_id ?? null;
  row.parent_request_id = input.parent_request_id ?? null;
  row.claim_token = claimToken;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let { data, error } = await (supabase.from("protected_deposits") as any)
    .insert(row)
    .select()
    .single();

  // Fallback without extended columns if migration 07 missing
  if (error && /column|schema cache/i.test(error.message ?? "")) {
    const base = {
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
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const retry = await (supabase.from("protected_deposits") as any)
      .insert(base)
      .select()
      .single();
    data = retry.data;
    error = retry.error;
  }

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
  // Hide escrow / unsatisfied conditions until they can actually be claimed
  return ((data ?? []) as ProtectedDeposit[]).filter(
    (d) => isDepositClaimableNow(d).ok,
  );
}

/** Claimable-status rows that are still locked by escrow or conditions. */
export async function listPendingLocksForWallet(
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
  return ((data ?? []) as ProtectedDeposit[]).filter(
    (d) => !isDepositClaimableNow(d).ok,
  );
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

export async function getDepositById(
  id: string,
): Promise<ProtectedDeposit | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("protected_deposits")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    if (isMissingProtocolTable(error)) return null;
    throw error;
  }
  return data as ProtectedDeposit | null;
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

export async function markConditionSatisfied(depositId: string): Promise<void> {
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row } = await (supabase.from("protected_deposits") as any)
    .select("condition_payload")
    .eq("id", depositId)
    .maybeSingle();
  const payload = {
    ...((row?.condition_payload as ConditionPayload) ?? {}),
    satisfied: true,
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("protected_deposits") as any)
    .update({ condition_payload: payload })
    .eq("id", depositId);
  if (error) throw error;
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
