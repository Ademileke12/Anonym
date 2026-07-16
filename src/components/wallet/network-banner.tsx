"use client";

import { useMonadNetwork } from "@/hooks/use-monad-network";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { useAccount } from "wagmi";

/** Sticky banner when wallet is on the wrong chain. */
export function NetworkBanner() {
  const { isConnected } = useAccount();
  const {
    isCorrectNetwork,
    ensureMonadTestnet,
    isSwitching,
    targetName,
    rpcUrl,
  } = useMonadNetwork();
  const { toast } = useToast();

  if (!isConnected || isCorrectNetwork) return null;

  return (
    <div className="flex flex-col items-center gap-2 border-b border-chip-orange-fg/20 bg-chip-orange-bg px-4 py-2.5 text-sm text-chip-orange-fg sm:flex-row sm:flex-wrap sm:justify-center sm:gap-3">
      <div className="flex items-center gap-2">
        <AlertTriangle className="size-4 shrink-0" />
        <span>
          Wrong network. Use <strong>{targetName}</strong> (chain{" "}
          <strong>10143</strong>).
        </span>
      </div>
      <Button
        size="sm"
        variant="secondary"
        className="h-8 border-chip-orange-fg/30 bg-card text-ink"
        disabled={isSwitching}
        onClick={() => {
          void ensureMonadTestnet()
            .then(() =>
              toast({
                title: `Switched to ${targetName}`,
                tone: "success",
              }),
            )
            .catch((e) =>
              toast({
                title: "Could not switch network",
                description:
                  e instanceof Error
                    ? e.message.slice(0, 220)
                    : "Add manually: RPC " + rpcUrl + " · ID 10143 · MON",
                tone: "error",
              }),
            );
        }}
      >
        {isSwitching ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : null}
        Switch / add Monad Testnet
      </Button>
      <span className="hidden text-[11px] opacity-80 lg:inline">
        Manual: {rpcUrl} · 10143 · MON
      </span>
    </div>
  );
}
