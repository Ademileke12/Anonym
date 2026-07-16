"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAccount, useDisconnect, useSignMessage } from "wagmi";
import { createSiweMessage } from "viem/siwe";
import { isSupabaseConfigured } from "@/lib/env";
import { tryCreateClient } from "@/services/supabase/client";
import { getUserByWallet } from "@/services/data/users";
import type { User } from "@/services/data/types";
import { SIWE_STATEMENT } from "@/lib/constants";
import { monadTestnet } from "@/services/blockchain/chains";

type AuthContextValue = {
  ready: boolean;
  configured: boolean;
  wallet: string | null;
  user: User | null;
  isAuthenticated: boolean;
  connectSession: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setUser: (user: User | null) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { address } = useAccount();
  const { disconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();
  const [ready, setReady] = useState(false);
  const [wallet, setWallet] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const configured = isSupabaseConfigured();

  const refreshUser = useCallback(async () => {
    if (!wallet || !configured) {
      setUser(null);
      return;
    }
    try {
      const profile = await getUserByWallet(wallet);
      setUser(profile);
    } catch (e) {
      console.error("refreshUser", e);
    }
  }, [wallet, configured]);

  // Restore Supabase session on mount
  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!configured) {
        setReady(true);
        return;
      }
      const supabase = tryCreateClient();
      if (!supabase) {
        setReady(true);
        return;
      }

      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (session) {
        const meta = session.user.user_metadata as {
          wallet_address?: string;
        };
        const app = session.user.app_metadata as { wallet_address?: string };
        const w = (
          meta?.wallet_address ||
          app?.wallet_address ||
          ""
        ).toLowerCase();
        if (w && !cancelled) {
          setWallet(w);
          try {
            const profile = await getUserByWallet(w);
            if (!cancelled) setUser(profile);
          } catch {
            /* profile optional until onboarding */
          }
        }
      }

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (_event, next) => {
        if (!next) {
          setWallet(null);
          setUser(null);
          return;
        }
        const meta = next.user.user_metadata as { wallet_address?: string };
        const app = next.user.app_metadata as { wallet_address?: string };
        const w = (
          meta?.wallet_address ||
          app?.wallet_address ||
          ""
        ).toLowerCase();
        setWallet(w || null);
        if (w) {
          try {
            setUser(await getUserByWallet(w));
          } catch {
            setUser(null);
          }
        }
      });

      if (!cancelled) setReady(true);
      return () => subscription.unsubscribe();
    }

    let unsub: (() => void) | undefined;
    void init().then((fn) => {
      if (typeof fn === "function") unsub = fn;
    });

    return () => {
      cancelled = true;
      unsub?.();
    };
  }, [configured]);

  const connectSession = useCallback(async () => {
    if (!configured) {
      throw new Error(
        "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY.",
      );
    }
    if (!address) throw new Error("Connect a wallet first");

    const walletAddr = address.toLowerCase() as `0x${string}`;

    const nonceRes = await fetch("/api/auth/nonce", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: walletAddr }),
    });
    const nonceJson = (await nonceRes.json()) as {
      nonce?: string;
      error?: string;
    };
    if (!nonceRes.ok || !nonceJson.nonce) {
      throw new Error(nonceJson.error || "Failed to get nonce");
    }

    const domain =
      typeof window !== "undefined" ? window.location.host : "localhost:3000";
    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : "http://localhost:3000";

    const message = createSiweMessage({
      domain: domain.includes("localhost") ? domain : domain.split(":")[0],
      address: walletAddr,
      statement: SIWE_STATEMENT,
      uri: origin,
      version: "1",
      chainId: monadTestnet.id,
      nonce: nonceJson.nonce,
    });

    const signature = await signMessageAsync({ message });

    const verifyRes = await fetch("/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, signature }),
    });
    const verifyJson = (await verifyRes.json()) as {
      session?: {
        access_token: string;
        refresh_token: string;
      };
      wallet?: string;
      user?: User | null;
      error?: string;
    };

    if (!verifyRes.ok || !verifyJson.session) {
      throw new Error(verifyJson.error || "Sign-in failed");
    }

    const supabase = tryCreateClient();
    if (!supabase) throw new Error("Supabase client unavailable");

    const { error } = await supabase.auth.setSession({
      access_token: verifyJson.session.access_token,
      refresh_token: verifyJson.session.refresh_token,
    });
    if (error) throw error;

    setWallet(verifyJson.wallet || walletAddr);
    setUser(verifyJson.user ?? null);
    if (!verifyJson.user && verifyJson.wallet) {
      try {
        setUser(await getUserByWallet(verifyJson.wallet));
      } catch {
        setUser(null);
      }
    }
  }, [address, configured, signMessageAsync]);

  const signOut = useCallback(async () => {
    const supabase = tryCreateClient();
    if (supabase) await supabase.auth.signOut();
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      /* ignore */
    }
    setWallet(null);
    setUser(null);
    disconnect();
  }, [disconnect]);

  const value = useMemo<AuthContextValue>(
    () => ({
      ready,
      configured,
      wallet,
      user,
      isAuthenticated: Boolean(wallet),
      connectSession,
      signOut,
      refreshUser,
      setUser,
    }),
    [
      ready,
      configured,
      wallet,
      user,
      connectSession,
      signOut,
      refreshUser,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
