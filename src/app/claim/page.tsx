"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  useAccount,
  useConnect,
  usePublicClient,
  useWalletClient,
} from "wagmi";
import { protocolClaimTransfer } from "@/services/protocol/vaults";
import { useMonadNetwork } from "@/hooks/use-monad-network";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AnonymLogo } from "@/components/brand/logo";
import { formatMon } from "@/lib/format";
import { Loader2, Shield, Wallet } from "lucide-react";

type Preview = {
  deposit: {
    id: string;
    amount: number;
    token: string;
    status: string;
    recipient_wallet: string;
    message: string | null;
    metadata?: Record<string, string>;
    unlock_at?: string | null;
    vault_address?: string | null;
    on_chain_deposit_id?: string | null;
    salt?: string;
  };
  claimable: boolean;
  blockReason: string | null;
  needsVault: boolean;
};

function ClaimInner() {
  const search = useSearchParams();
  const id = search.get("id") ?? "";
  const salt = search.get("salt") ?? "";
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending: connecting } = useConnect();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { ensureMonadTestnet } = useMonadNetwork();

  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id || !salt) {
      setError("Invalid claim link — missing id or salt.");
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `/api/claim/preview?id=${encodeURIComponent(id)}&salt=${encodeURIComponent(salt)}`,
      );
      const json = (await res.json()) as Preview & { error?: string };
      if (!res.ok) throw new Error(json.error || "Preview failed");
      setPreview(json);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load claim");
      setPreview(null);
    } finally {
      setLoading(false);
    }
  }, [id, salt]);

  useEffect(() => {
    void load();
  }, [load]);

  function depositForClaim() {
    if (!preview) return null;
    return {
      ...preview.deposit,
      salt,
      kind: "transfer" as const,
      commitment_id: null,
      commitment_hash: "",
      sender_user_id: null,
      sender_wallet: null,
      recipient_user_id: null,
      anonymous: true,
      created_at: new Date().toISOString(),
      claimed_at: null,
      claim_tx_hash: null,
      campaign_id: null,
      tx_hash: null,
    };
  }

  async function claim() {
    if (!preview || !walletClient || !publicClient || !address) return;
    const recipient = preview.deposit.recipient_wallet.toLowerCase();
    if (address.toLowerCase() !== recipient) {
      setError(
        `Connect the recipient wallet (${recipient.slice(0, 6)}…${recipient.slice(-4)}) to claim.`,
      );
      return;
    }
    setClaiming(true);
    setError(null);
    try {
      await ensureMonadTestnet();
      const deposit = depositForClaim();
      if (!deposit) return;
      const hash = await protocolClaimTransfer({
        clients: {
          walletClient,
          publicClient,
          account: walletClient.account ?? (address as `0x${string}`),
        },
        deposit: deposit as Parameters<typeof protocolClaimTransfer>[0]["deposit"],
      });
      setDone(hash);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Claim failed");
    } finally {
      setClaiming(false);
    }
  }

  return (
    <div className="min-h-screen bg-base">
      <header className="border-b border-line">
        <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4">
          <Link href="/">
            <AnonymLogo size={26} />
          </Link>
          <Badge variant="outline" className="gap-1 text-[11px]">
            <Shield className="size-3" /> Claim
          </Badge>
        </div>
      </header>

      <main className="mx-auto max-w-lg space-y-4 p-4 py-10">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Claim protected MON</h1>
          <p className="mt-1 text-sm text-muted">
            Vault deposit, not a direct wallet transfer. Connect the recipient
            wallet to release funds.
          </p>
        </div>

        {loading ? (
          <Card className="flex items-center justify-center py-12">
            <Loader2 className="size-6 animate-spin text-muted" />
          </Card>
        ) : error && !preview ? (
          <Card>
            <p className="text-sm text-muted">{error}</p>
            <Button asChild className="mt-4" variant="secondary">
              <Link href="/app">Open Anonym</Link>
            </Button>
          </Card>
        ) : preview ? (
          <Card className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-faint">
                  Amount
                </p>
                <p className="text-2xl font-bold tabular-nums">
                  {formatMon(preview.deposit.amount)}{" "}
                  {preview.deposit.token || "MON"}
                </p>
              </div>
              <Badge variant="outline">{preview.deposit.status}</Badge>
            </div>

            {preview.deposit.message ? (
              <p className="text-sm text-muted">Note: {preview.deposit.message}</p>
            ) : null}

            {preview.deposit.metadata &&
            Object.keys(preview.deposit.metadata).length > 0 ? (
              <div className="rounded-xl border border-line bg-subtle px-3 py-2 text-xs text-muted">
                {Object.entries(preview.deposit.metadata)
                  .filter(([, v]) => v)
                  .map(([k, v]) => (
                    <p key={k}>
                      <span className="font-medium text-ink">{k}:</span> {v}
                    </p>
                  ))}
              </div>
            ) : null}

            {preview.blockReason ? (
              <p className="rounded-xl border border-line bg-subtle px-3 py-2 text-sm text-muted">
                {preview.blockReason}
              </p>
            ) : null}

            {done ? (
              <p className="text-sm font-medium text-ink">
                Claimed · tx {done.slice(0, 14)}…
              </p>
            ) : null}

            {error ? (
              <p className="text-sm text-muted">{error}</p>
            ) : null}

            {!isConnected ? (
              <Button
                className="w-full"
                disabled={connecting}
                onClick={() => {
                  const c = connectors[0];
                  if (c) void connect({ connector: c });
                }}
              >
                <Wallet className="size-4" />
                {connecting ? "Connecting…" : "Connect wallet to claim"}
              </Button>
            ) : (
              <Button
                className="w-full"
                disabled={
                  claiming ||
                  !preview.claimable ||
                  preview.deposit.status === "claimed"
                }
                onClick={() => void claim()}
              >
                {claiming ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Shield className="size-4" />
                )}
                {preview.deposit.status === "claimed"
                  ? "Already claimed"
                  : claiming
                    ? "Confirm in wallet…"
                    : "Claim to this wallet"}
              </Button>
            )}

            {address ? (
              <p className="text-center text-[11px] text-faint">
                Connected {address.slice(0, 6)}…{address.slice(-4)}
              </p>
            ) : null}
          </Card>
        ) : null}
      </main>
    </div>
  );
}

export default function ClaimPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted" />
        </div>
      }
    >
      <ClaimInner />
    </Suspense>
  );
}
