import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import { getServerAuthConfig } from "@/lib/env";

/** Service-role client - server only. Bypasses RLS. */
export function createAdminClient() {
  const { url, service } = getServerAuthConfig();
  return createClient<Database>(url, service, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
