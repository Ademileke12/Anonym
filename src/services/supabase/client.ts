"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";
import { isSupabaseConfigured } from "@/lib/env";

let browserClient: ReturnType<typeof createBrowserClient<Database>> | null =
  null;

/** Supabase client for browser components. Throws if env is missing. */
export function createClient() {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  if (browserClient) return browserClient;

  browserClient = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  return browserClient;
}

export function tryCreateClient() {
  if (!isSupabaseConfigured()) return null;
  return createClient();
}
