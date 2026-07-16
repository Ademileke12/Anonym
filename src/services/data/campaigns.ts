import { createClient } from "@/services/supabase/client";
import type { Campaign, CampaignInsert, Donation, User } from "./types";

async function closeExpired() {
  try {
    const supabase = createClient();
    await supabase.rpc("close_expired_campaigns");
  } catch {
    /* RPC may not exist until migrations applied */
  }
}

export async function listPublicCampaigns(): Promise<
  (Campaign & { owner?: User | null })[]
> {
  const supabase = createClient();
  await closeExpired();

  const { data, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("visibility", "public")
    .neq("status", "draft")
    .order("created_at", { ascending: false });
  if (error) throw error;

  const campaigns = data ?? [];
  const ownerIds = [...new Set(campaigns.map((c) => c.owner_id))];
  if (ownerIds.length === 0) return [];

  const { data: owners } = await supabase
    .from("users")
    .select("*")
    .in("id", ownerIds);

  const byId = new Map((owners ?? []).map((o) => [o.id, o]));
  return campaigns.map((c) => ({ ...c, owner: byId.get(c.owner_id) ?? null }));
}

export async function listCampaignsByOwner(
  ownerId: string,
): Promise<Campaign[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getCampaign(
  id: string,
): Promise<(Campaign & { owner: User | null }) | null> {
  const supabase = createClient();
  await closeExpired();

  const { data, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const { data: owner } = await supabase
    .from("users")
    .select("*")
    .eq("id", data.owner_id)
    .maybeSingle();

  return { ...data, owner: owner ?? null };
}

export async function createCampaign(
  input: CampaignInsert,
): Promise<Campaign> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("campaigns")
    .insert({
      ...input,
      amount_raised: 0,
      status: input.status ?? "active",
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Owner manually ends an active campaign (Regular or Startup).
 * RLS: campaigns managed by owner.
 */
export async function endCampaign(
  campaignId: string,
  ownerId: string,
): Promise<Campaign> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("campaigns")
    .update({ status: "ended" })
    .eq("id", campaignId)
    .eq("owner_id", ownerId)
    .in("status", ["active", "draft"])
    .select()
    .single();
  if (error) throw error;
  if (!data) {
    throw new Error("Campaign not found or already ended");
  }
  return data;
}

export async function listDonationsForCampaign(
  campaignId: string,
): Promise<Donation[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("donations")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createDonation(input: {
  campaign_id: string;
  sender_wallet: string;
  recipient_wallet: string;
  amount: number;
  message?: string | null;
  anonymous: boolean;
  tx_hash: string;
}): Promise<Donation> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("donations")
    .insert({
      campaign_id: input.campaign_id,
      sender_wallet: input.sender_wallet.toLowerCase(),
      recipient_wallet: input.recipient_wallet.toLowerCase(),
      amount: input.amount,
      message: input.message ?? null,
      anonymous: input.anonymous,
      tx_hash: input.tx_hash,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export function subscribeCampaign(campaignId: string, onChange: () => void) {
  const supabase = createClient();
  const channel = supabase
    .channel(`campaign:${campaignId}:${crypto.randomUUID()}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "campaigns",
        filter: `id=eq.${campaignId}`,
      },
      () => onChange(),
    )
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "donations",
        filter: `campaign_id=eq.${campaignId}`,
      },
      () => onChange(),
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
