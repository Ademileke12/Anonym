// ⚠️ THROWAWAY DEMO CHECKOUT — delete after trying the gateway.
// This is Anonym's hosted checkout, the page a shopper lands on after a
// merchant redirects them (like Stripe Checkout). It:
//   1. loads the payment intent created by the merchant backend
//   2. connects the shopper's wallet and detects if they're an Anonym user
//   3. moves REAL testnet MON through the on-chain TransferVault (protocolTransfer),
//      so funds leave the payer and settle privately in the vault
//   4. confirms the intent with the real tx hash → merchant is credited
"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { formatEther } from "viem";
import {
  useAccount,
  useBalance,
  usePublicClient,
  useWalletClient,
} from "wagmi";
import { protocolTransfer } from "@/services/protocol/vaults";
import { useMonadNetwork } from "@/hooks/use-monad-network";
import { monadTestnet } from "@/services/blockchain/chains";
import { ConnectButton } from "@/components/wallet/connect-button";
import { AnonymLogo } from "@/components/brand/logo";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatMon } from "@/lib/format";
import { CheckCircle2, Loader2, Shield, Sparkles } from "lucide-react";

type Intent = {
  id: string;
  amount: number;
  token: string;
  status: string;
  description: string | null;
  recipient_address: string | null;
  tx_hash: string | null;
  created_at: string;
};

type PlatformUser = {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
};

async function api(payload: Record<string, unknown>) {
  const res = await fetch("/api/playground", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json();
}

function CheckoutInner() {
  const params = useSearchParams();
  const router = useRouter();
  const intentId = params.get("intent");

  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { isCorrectNetwork, ensureMonadTestnet } = useMonadNetwork();
  const { data: balance } = useBalance({
    address: address as `0x${string}` | undefined,
    chainId: monadTestnet.id,
    query: { enabled: Boolean(address) },
  });

  const [intent, setIntent] = useState<Intent | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [platformUser, setPlatformUser] = useState<PlatformUser | null>(null);
  const [checkedPlatform, setCheckedPlatform] = useState(false);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Load the intent the merchant created.
  const refreshIntent = useCallback(async () => {
    const json = await api({ action: "get", id: intentId });
    if (json.ok) {
      setIntent(json.data);
      if (json.data.status === "paid" || json.data.status === "settled") {
        setDone(true);
      }
    } else {
      setLoadError(json.error || "Could not load this payment.");
    }
  }, [intentId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!intentId) {
        if (!cancelled) setLoadError("No payment intent in the URL.");
        return;
      }
      if (!cancelled) await refreshIntent();
    })();
    return () => {
      cancelled = true;
    };
  }, [intentId, refreshIntent]);

  // "Is this shopper already on Anonym?" — personalizes the checkout.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isConnected || !address) {
        if (!cancelled) {
          setPlatformUser(null);
          setCheckedPlatform(false);
        }
        return;
      }
      const json = await api({ action: "lookup", wallet: address });
      if (cancelled) return;
      setPlatformUser(json.ok ? json.data : null);
      setCheckedPlatform(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [isConnected, address]);

  const amount = intent?.amount ?? 0;
  const balanceMon = balance ? Number(formatEther(balance.value)) : null;
  const insufficient = balanceMon != null && balanceMon < amount;

  async function pay() {
    if (!intent || !address || !walletClient || !publicClient) {
      setPayError("Connect your wallet on Monad Testnet first.");
      return;
    }
    if (!intent.recipient_address) {
      setPayError(
        "This merchant has no payout address configured (set NEXT_PUBLIC_PROTOCOL_TREASURY).",
      );
      return;
    }
    setPaying(true);
    setPayError(null);
    try {
      await ensureMonadTestnet();

      // Real on-chain deposit: debits MON from the payer into the vault,
      // committed to the merchant payout address. This is the privacy step.
      const result = await protocolTransfer({
        clients: {
          walletClient,
          publicClient,
          account: walletClient.account ?? (address as `0x${string}`),
        },
        senderWallet: address,
        recipientWallet: intent.recipient_address,
        amountMon: String(amount),
        message: intent.description,
        anonymous: true,
        metadata: { source: "anonym-checkout", intent_id: intent.id },
      });

      // Confirm the intent with the REAL tx hash + vault deposit id.
      const depositId = result.deposit.on_chain_deposit_id
        ? Number(result.deposit.on_chain_deposit_id)
        : undefined;
      const confirm = await api({
        action: "confirm",
        id: intent.id,
        tx_hash: result.txHash,
        deposit_id: depositId,
      });
      if (!confirm.ok) {
        setPayError(
          `Paid on-chain (${result.txHash.slice(0, 10)}…) but confirming with the merchant failed: ${confirm.error}`,
        );
        return;
      }
      setIntent(confirm.data);
      setDone(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // Wallet rejection is a normal, non-scary outcome.
      setPayError(
        /reject|denied|cancel/i.test(msg) ? "Payment cancelled." : msg,
      );
    } finally {
      setPaying(false);
    }
  }

  // ── Chrome ────────────────────────────────────────────────────────────────
  const shell = (children: React.ReactNode) => (
    <div className="flex min-h-screen flex-col bg-subtle">
      <header className="border-b border-line bg-base">
        <div className="mx-auto flex max-w-lg items-center justify-between px-5 py-3.5">
          <AnonymLogo size={22} />
          <span className="inline-flex items-center gap-1.5 text-xs text-muted">
            <Shield className="size-3.5" />
            Secure checkout
          </span>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-5 py-10">
        {children}
      </main>
      <footer className="pb-8 text-center text-xs text-muted">
        Payments settled privately on Monad · Powered by Anonym
      </footer>
    </div>
  );

  if (loadError) {
    return shell(
      <Card elevated>
        <h1 className="text-lg font-semibold">Checkout unavailable</h1>
        <p className="mt-2 text-sm text-muted">{loadError}</p>
        <Button className="mt-5" onClick={() => router.push("/playground")}>
          Back to store
        </Button>
      </Card>,
    );
  }

  if (!intent) {
    return shell(
      <div className="flex items-center justify-center gap-2 text-muted">
        <Loader2 className="size-4 animate-spin" />
        Loading payment…
      </div>,
    );
  }

  if (done) {
    return shell(
      <Card elevated className="text-center">
        <CheckCircle2 className="mx-auto size-12 text-chip-green-fg" />
        <h1 className="mt-4 text-xl font-semibold">Payment complete</h1>
        <p className="mt-2 text-sm text-muted">
          {formatMon(intent.amount)} {intent.token} settled privately through
          the Anonym vault. The merchant has been credited.
        </p>
        {intent.tx_hash ? (
          <p className="mt-3 break-all rounded-lg bg-subtle px-3 py-2 font-mono text-[11px] text-muted">
            {intent.tx_hash}
          </p>
        ) : null}
        <Button
          className="mt-5 w-full"
          onClick={() => router.push("/playground")}
        >
          Back to store
        </Button>
      </Card>,
    );
  }

  return shell(
    <Card elevated padded={false} className="overflow-hidden">
      {/* Order summary */}
      <div className="border-b border-line p-6">
        <span className="text-xs font-medium uppercase tracking-wide text-muted">
          Paying
        </span>
        <div className="mt-1 flex items-baseline gap-1.5">
          <span className="text-3xl font-bold">{formatMon(intent.amount)}</span>
          <span className="text-base font-medium text-muted">
            {intent.token}
          </span>
        </div>
        {intent.description ? (
          <p className="mt-1 text-sm text-muted">{intent.description}</p>
        ) : null}
      </div>

      <div className="space-y-5 p-6">
        {/* Wallet + platform detection */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium">Your wallet</span>
            {isConnected && isCorrectNetwork ? (
              <Badge variant="green">Monad Testnet</Badge>
            ) : null}
          </div>
          <ConnectButton label="Connect wallet to pay" className="w-full" />

          {isConnected && checkedPlatform ? (
            platformUser ? (
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-chip-purple-bg px-3 py-2 text-sm text-chip-purple-fg">
                <Sparkles className="size-4" />
                <span>
                  Welcome back,{" "}
                  <span className="font-semibold">
                    @{platformUser.username}
                  </span>{" "}
                  — you&apos;re on Anonym.
                </span>
              </div>
            ) : (
              <p className="mt-3 text-xs text-muted">
                New to Anonym? No account needed — pay directly with your
                wallet.
              </p>
            )
          ) : null}

          {isConnected && balanceMon != null ? (
            <p className="mt-2 text-xs text-muted">
              Balance: {formatMon(balanceMon, 4)} {intent.token}
            </p>
          ) : null}
        </div>

        {/* Privacy note */}
        <div className="flex items-start gap-2 rounded-lg bg-subtle p-3 text-xs text-muted">
          <Shield className="mt-0.5 size-3.5 shrink-0" />
          <span>
            Your {intent.token} is routed through an Anonym vault, not sent
            wallet-to-wallet. The merchant is credited without seeing your
            address on-chain.
          </span>
        </div>

        {/* Pay */}
        <Button
          className="w-full"
          size="lg"
          disabled={!isConnected || paying || insufficient}
          onClick={() => void pay()}
        >
          {paying ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Confirming on-chain…
            </>
          ) : insufficient ? (
            `Insufficient ${intent.token} balance`
          ) : (
            `Pay ${formatMon(intent.amount)} ${intent.token} anonymously`
          )}
        </Button>

        {payError ? (
          <p className="text-sm text-chip-red-fg">{payError}</p>
        ) : null}
      </div>
    </Card>,
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-subtle text-muted">
          <Loader2 className="size-5 animate-spin" />
        </div>
      }
    >
      <CheckoutInner />
    </Suspense>
  );
}
