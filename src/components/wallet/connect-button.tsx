"use client";

import { useState } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/providers/auth-provider";
import { useMonadNetwork } from "@/hooks/use-monad-network";
import { shortAddress } from "@/lib/format";
import { useToast } from "@/components/ui/toast";
import { ChevronDown, Loader2, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { APP_CHAIN } from "@/services/blockchain/chains";

type ConnectButtonProps = {
  className?: string;
  size?: "sm" | "md" | "lg";
  label?: string;
  /** Shorter label + tighter address on narrow screens */
  compact?: boolean;
};

export function ConnectButton({
  className,
  size = "md",
  label = "Connect wallet",
  compact = false,
}: ConnectButtonProps) {
  const { address, isConnected, chainId } = useAccount();
  const { connectors, connectAsync, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { isAuthenticated, connectSession, signOut, user, configured } =
    useAuth();
  const { ensureMonadTestnet, isCorrectNetwork } = useMonadNetwork();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [signing, setSigning] = useState(false);

  /** Unique connectors by name (MetaMask may appear via both metaMask + injected). */
  const uniqueConnectors = connectors.filter(
    (c, i, arr) => arr.findIndex((x) => x.name === c.name) === i,
  );

  async function afterConnect() {
    setSigning(true);
    try {
      await new Promise((r) => setTimeout(r, 150));
      try {
        await ensureMonadTestnet();
      } catch (e) {
        toast({
          title: "Switch to Monad Testnet",
          description:
            e instanceof Error
              ? e.message
              : "Add Monad Testnet (chain 10143) in your wallet.",
          tone: "error",
        });
      }
      await connectSession();
      toast({
        title: "Signed in",
        description: `Ready on ${APP_CHAIN.name}.`,
        tone: "success",
      });
    } catch (e) {
      toast({
        title: "Sign-in failed",
        description: e instanceof Error ? e.message : "Try again",
        tone: "error",
      });
    } finally {
      setSigning(false);
      setOpen(false);
    }
  }

  async function handleConnect(connectorId?: string) {
    if (!configured) {
      toast({
        title: "Backend not configured",
        description: "Add Supabase keys to .env.local first.",
        tone: "error",
      });
      return;
    }
    try {
      const connector =
        uniqueConnectors.find((c) => c.id === connectorId) ??
        uniqueConnectors[0];
      if (!connector) {
        toast({
          title: "No wallet found",
          description:
            "Install MetaMask, Rabby, OKX, Coinbase Wallet, or use WalletConnect.",
          tone: "error",
        });
        return;
      }
      await connectAsync({
        connector,
        chainId: APP_CHAIN.id,
      });
      await afterConnect();
    } catch (e) {
      toast({
        title: "Connection failed",
        description: e instanceof Error ? e.message : "Try again",
        tone: "error",
      });
    }
  }

  if (isAuthenticated && (address || user || walletDisplay())) {
    const display = user?.username
      ? `@${user.username}`
      : shortAddress(address ?? user?.wallet_address, compact ? 3 : 4);
    return (
      <div className={cn("relative", className)}>
        <Button
          variant="secondary"
          size={size}
          onClick={() => setOpen((v) => !v)}
          className={cn("max-w-[9.5rem] gap-1.5 sm:max-w-none sm:gap-2", compact && "px-2.5 sm:px-4")}
        >
          <span
            className={cn(
              "size-2 shrink-0 rounded-full",
              isCorrectNetwork ? "bg-chip-green-fg" : "bg-chip-orange-fg",
            )}
          />
          <span className="truncate text-xs sm:text-sm">{display}</span>
          <ChevronDown className="size-3.5 shrink-0 opacity-60" />
        </Button>
        {open ? (
          <div className="absolute right-0 top-full z-50 mt-2 w-[min(100vw-2rem,14rem)] overflow-hidden rounded-[var(--radius-panel)] border border-line bg-card py-1 shadow-[var(--shadow-elevated)] sm:w-56">
            <div className="border-b border-line px-3 py-2 text-xs text-muted">
              Network:{" "}
              <span className="font-medium text-ink">
                {isCorrectNetwork
                  ? APP_CHAIN.name
                  : `Wrong (id ${chainId ?? "-"})`}
              </span>
            </div>
            {!isCorrectNetwork ? (
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm font-medium text-chip-orange-fg hover:bg-subtle"
                onClick={() => {
                  void ensureMonadTestnet()
                    .then(() =>
                      toast({
                        title: `Switched to ${APP_CHAIN.name}`,
                        tone: "success",
                      }),
                    )
                    .catch((e) =>
                      toast({
                        title: "Switch failed",
                        description:
                          e instanceof Error ? e.message : "Open wallet settings",
                        tone: "error",
                      }),
                    );
                }}
              >
                Switch to Monad Testnet
              </button>
            ) : null}
            <button
              type="button"
              className="w-full px-3 py-2 text-left text-sm text-muted hover:bg-subtle hover:text-ink"
              onClick={async () => {
                setOpen(false);
                await signOut();
              }}
            >
              Sign out
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  if (isConnected && address && !isAuthenticated) {
    return (
      <Button
        size={size}
        className={className}
        onClick={() => void afterConnect()}
        disabled={signing}
      >
        {signing ? <Loader2 className="animate-spin" /> : <Wallet />}
        Sign in
      </Button>
    );
  }

  return (
    <div className={cn("relative", className)}>
      <Button
        size={size}
        onClick={() => {
          if (uniqueConnectors.length <= 1) void handleConnect();
          else setOpen((v) => !v);
        }}
        disabled={isPending || signing}
        className={cn(compact && "px-3 sm:px-4")}
      >
        {isPending || signing ? <Loader2 className="animate-spin" /> : null}
        <span className={cn(compact && "sm:hidden")}>
          {compact ? "Connect" : label}
        </span>
        {compact ? (
          <span className="hidden sm:inline">{label}</span>
        ) : null}
      </Button>
      {open && uniqueConnectors.length > 1 ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-[min(100vw-2rem,14rem)] overflow-hidden rounded-[var(--radius-panel)] border border-line bg-card py-1 shadow-[var(--shadow-elevated)] sm:w-56">
          <p className="border-b border-line px-3 py-2 text-[11px] text-muted">
            Monad Testnet · chain {APP_CHAIN.id}
          </p>
          {uniqueConnectors.map((c) => (
            <button
              key={c.uid}
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-subtle"
              onClick={() => void handleConnect(c.id)}
            >
              {c.name}
            </button>
          ))}
          <button
            type="button"
            className="flex w-full items-center gap-2 border-t border-line px-3 py-2.5 text-left text-sm text-muted hover:bg-subtle"
            onClick={() => {
              disconnect();
              setOpen(false);
            }}
          >
            Cancel
          </button>
        </div>
      ) : null}
    </div>
  );

  function walletDisplay() {
    return Boolean(user?.wallet_address);
  }
}
