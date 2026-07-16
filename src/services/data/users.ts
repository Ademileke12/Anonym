import { createClient } from "@/services/supabase/client";
import type { User, UserInsert, Startup, Social } from "./types";
import type { AccountType } from "@/services/supabase/types";

export async function getUserByWallet(wallet: string): Promise<User | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("wallet_address", wallet.toLowerCase())
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getUserByUsername(username: string): Promise<User | null> {
  const supabase = createClient();
  const clean = username.replace(/^@/, "").toLowerCase();
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("username", clean)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function isUsernameAvailable(
  username: string,
  exceptWallet?: string,
): Promise<boolean> {
  const supabase = createClient();
  const clean = username.toLowerCase();
  if (!/^[a-z0-9_]{3,30}$/.test(clean)) return false;

  const { data, error } = await supabase
    .from("users")
    .select("wallet_address")
    .eq("username", clean)
    .maybeSingle();
  if (error) throw error;
  if (!data) return true;
  if (exceptWallet && data.wallet_address === exceptWallet.toLowerCase()) {
    return true;
  }
  return false;
}

export async function createUserProfile(
  input: UserInsert & { account_type?: AccountType },
): Promise<User> {
  const supabase = createClient();
  const payload: UserInsert = {
    ...input,
    wallet_address: input.wallet_address.toLowerCase(),
    username: input.username.toLowerCase(),
  };
  const { data, error } = await supabase
    .from("users")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateUserProfile(
  wallet: string,
  patch: Partial<UserInsert>,
): Promise<User> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("users")
    .update(patch)
    .eq("wallet_address", wallet.toLowerCase())
    .select()
    .single();
  if (error) throw error;
  return data;
}

export type TeamMember = {
  name: string;
  role: string;
  avatar_url?: string | null;
  social_url?: string | null;
};

export async function upsertStartup(input: {
  user_id: string;
  startup_name: string;
  description?: string | null;
  mission?: string | null;
  category?: string | null;
  website?: string | null;
  logo?: string | null;
  whitepaper_url?: string | null;
  pitch_deck_url?: string | null;
  team_members?: TeamMember[];
}): Promise<Startup> {
  const supabase = createClient();
  const { data: existing } = await supabase
    .from("startups")
    .select("id")
    .eq("user_id", input.user_id)
    .maybeSingle();

  const patch = {
    startup_name: input.startup_name,
    description: input.description ?? null,
    mission: input.mission ?? null,
    category: input.category ?? null,
    website: input.website ?? null,
    logo: input.logo ?? null,
    whitepaper_url: input.whitepaper_url ?? null,
    pitch_deck_url: input.pitch_deck_url ?? null,
    team_members: input.team_members ?? [],
  };

  if (existing) {
    const { data, error } = await supabase
      .from("startups")
      .update(patch)
      .eq("id", existing.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from("startups")
    .insert({
      user_id: input.user_id,
      ...patch,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function replaceSocials(
  userId: string,
  socials: { platform: string; url: string }[],
): Promise<Social[]> {
  const supabase = createClient();
  await supabase.from("socials").delete().eq("user_id", userId);
  const rows = socials
    .filter((s) => s.url.trim())
    .map((s) => ({
      user_id: userId,
      platform: s.platform,
      url: s.url.trim(),
    }));
  if (rows.length === 0) return [];
  const { data, error } = await supabase.from("socials").insert(rows).select();
  if (error) throw error;
  return data ?? [];
}

export async function getSocials(userId: string): Promise<Social[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("socials")
    .select("*")
    .eq("user_id", userId);
  if (error) throw error;
  return data ?? [];
}

export async function getStartupByUserId(
  userId: string,
): Promise<Startup | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("startups")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * Resolve a registered Anonym user for protected transfers.
 * Requires an existing profile (username). Raw 0x is only accepted if that
 * wallet already has an Anonym account - never send to unknown addresses.
 */
export async function resolveRecipient(
  input: string,
): Promise<{ wallet: string; user: User } | null> {
  const raw = input.trim();
  if (!raw) return null;

  if (/^0x[a-fA-F0-9]{40}$/i.test(raw)) {
    const user = await getUserByWallet(raw.toLowerCase());
    if (!user) return null;
    return {
      wallet: (
        user.monad_receiving_address || user.wallet_address
      ).toLowerCase(),
      user,
    };
  }

  const username = raw.replace(/^@/, "").toLowerCase();
  if (!/^[a-z0-9_]{3,30}$/.test(username)) return null;

  const user = await getUserByUsername(username);
  if (!user) return null;

  return {
    wallet: (
      user.monad_receiving_address || user.wallet_address
    ).toLowerCase(),
    user,
  };
}

/** Live username check for transfer UI. */
export async function lookupUsernameForTransfer(
  input: string,
): Promise<
  | { status: "empty" | "invalid" | "not_found" | "found"; user?: User }
> {
  const raw = input.trim().replace(/^@/, "");
  if (!raw) return { status: "empty" };
  if (/^0x[a-fA-F0-9]{40}$/i.test(raw)) {
    const user = await getUserByWallet(raw.toLowerCase());
    return user ? { status: "found", user } : { status: "not_found" };
  }
  if (!/^[a-z0-9_]{1,30}$/i.test(raw)) return { status: "invalid" };
  if (raw.length < 3) return { status: "invalid" };
  const user = await getUserByUsername(raw.toLowerCase());
  return user ? { status: "found", user } : { status: "not_found" };
}
