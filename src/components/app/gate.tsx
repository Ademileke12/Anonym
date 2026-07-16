"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { Skeleton } from "@/components/ui/skeleton";
import { ConnectButton } from "@/components/wallet/connect-button";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/**
 * Ensures Supabase is configured, wallet session exists, and profile is complete.
 */
export function AppGate({ children }: { children: React.ReactNode }) {
  const { ready, configured, isAuthenticated, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isOnboarding = pathname.startsWith("/app/onboarding");

  useEffect(() => {
    if (!ready || !configured) return;
    if (isAuthenticated && !user && !isOnboarding) {
      router.replace("/app/onboarding");
    }
    if (isAuthenticated && user && isOnboarding) {
      router.replace("/app");
    }
  }, [ready, configured, isAuthenticated, user, isOnboarding, router]);

  if (!ready) {
    return (
      <div className="space-y-4 p-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!configured) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center p-6">
        <Card className="max-w-lg text-center" elevated>
          <h1 className="text-xl font-semibold tracking-tight">
            Connect Supabase to go live
          </h1>
          <p className="mt-2 text-sm text-muted">
            Mock data has been removed. Add your project keys to{" "}
            <code className="rounded bg-subtle px-1.5 py-0.5 text-xs">
              .env.local
            </code>{" "}
            and run the SQL migrations under{" "}
            <code className="rounded bg-subtle px-1.5 py-0.5 text-xs">
              supabase/migrations
            </code>
            .
          </p>
          <ul className="mt-4 space-y-1 text-left text-sm text-muted">
            <li>
              <code className="text-xs">NEXT_PUBLIC_SUPABASE_URL</code>
            </li>
            <li>
              <code className="text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>
            </li>
            <li>
              <code className="text-xs">SUPABASE_SERVICE_ROLE_KEY</code>
            </li>
            <li>
              <code className="text-xs">AUTH_WALLET_SECRET</code>
            </li>
          </ul>
          <Button asChild className="mt-6" variant="secondary">
            <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer">
              Open Supabase dashboard
            </a>
          </Button>
        </Card>
      </div>
    );
  }

  if (!isAuthenticated && !isOnboarding) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center p-6">
        <Card className="max-w-md text-center" elevated>
          <h1 className="text-xl font-semibold tracking-tight">
            Connect to open Anonym
          </h1>
          <p className="mt-2 text-sm text-muted">
            Wallet-only authentication via SIWE. Sign a message to prove
            ownership — no email or password.
          </p>
          <div className="mt-6 flex flex-col items-center gap-3">
            <ConnectButton label="Connect wallet" />
          </div>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
