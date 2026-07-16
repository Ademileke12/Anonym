/** True when browser/public Supabase keys are present. */
export function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

/** Server-only secrets for SIWE session issuance. */
export function getServerAuthConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const walletSecret =
    process.env.AUTH_WALLET_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "dev-only-change-me";

  if (!url || !anon) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  if (!service) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  }

  return { url, anon, service, walletSecret };
}

export function privateViewTreasury(): `0x${string}` | null {
  const a = process.env.NEXT_PUBLIC_PRIVATE_VIEW_TREASURY;
  if (a && a.startsWith("0x") && a.length === 42) return a as `0x${string}`;
  return null;
}
