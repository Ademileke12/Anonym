"use client";

import { useCallback, useMemo } from "react";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import {
  APP_CHAIN,
  MONAD_TESTNET,
  MONAD_TESTNET_RPC_LIST,
} from "@/services/blockchain/chains";

type Eip1193Provider = {
  request: (args: {
    method: string;
    params?: unknown[];
  }) => Promise<unknown>;
};

function getErrorCode(err: unknown): number | undefined {
  if (!err || typeof err !== "object") return undefined;
  if ("code" in err && typeof (err as { code: unknown }).code === "number") {
    return (err as { code: number }).code;
  }
  // Nested provider errors
  if (
    "data" in err &&
    err.data &&
    typeof err.data === "object" &&
    "originalError" in err.data
  ) {
    return getErrorCode(
      (err.data as { originalError: unknown }).originalError,
    );
  }
  return undefined;
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object" && "message" in err) {
    return String((err as { message: unknown }).message);
  }
  return String(err);
}

/**
 * Ensures the connected wallet is on Monad Testnet.
 * Tries switch → add chain with each public RPC until one is accepted.
 */
export function useMonadNetwork() {
  const chainId = useChainId();
  const { isConnected, connector } = useAccount();
  const { switchChainAsync, isPending, error } = useSwitchChain();

  const isCorrectNetwork = !isConnected || chainId === APP_CHAIN.id;

  const ensureMonadTestnet = useCallback(async () => {
    if (!isConnected) {
      throw new Error("Connect a wallet first");
    }
    if (chainId === APP_CHAIN.id) return true;

    // 1) Prefer wagmi switch (works if chain already known)
    try {
      await switchChainAsync({ chainId: APP_CHAIN.id });
      return true;
    } catch (err) {
      const code = getErrorCode(err);
      const msg = getErrorMessage(err).toLowerCase();
      const needsAdd =
        code === 4902 ||
        code === -32603 ||
        code === -32002 ||
        msg.includes("4902") ||
        msg.includes("unrecognized chain") ||
        msg.includes("not added") ||
        msg.includes("does not exist") ||
        msg.includes("invalid") ||
        msg.includes("chain");

      if (!needsAdd) throw err;

      const provider = (await connector?.getProvider?.()) as
        | Eip1193Provider
        | undefined;
      if (!provider?.request) {
        throw new Error(
          "Wallet provider unavailable. Add Monad Testnet manually: RPC https://testnet-rpc.monad.xyz · Chain ID 10143 · Symbol MON",
        );
      }

      // 2) Try wallet_addEthereumChain with each RPC (MetaMask only uses first
      //    rpcUrls entry for validation - so try one at a time)
      let lastError: unknown = err;
      for (const rpc of MONAD_TESTNET_RPC_LIST) {
        try {
          await provider.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: MONAD_TESTNET.chainIdHex,
                chainName: "Monad Testnet",
                nativeCurrency: {
                  name: "MON",
                  symbol: "MON",
                  decimals: 18,
                },
                rpcUrls: [rpc],
                blockExplorerUrls: [MONAD_TESTNET.explorer],
              },
            ],
          });
          // Switch after add
          try {
            await switchChainAsync({ chainId: APP_CHAIN.id });
          } catch {
            await provider.request({
              method: "wallet_switchEthereumChain",
              params: [{ chainId: MONAD_TESTNET.chainIdHex }],
            });
          }
          return true;
        } catch (addErr) {
          lastError = addErr;
          const addMsg = getErrorMessage(addErr).toLowerCase();
          // User rejected - stop trying
          if (
            getErrorCode(addErr) === 4001 ||
            addMsg.includes("reject") ||
            addMsg.includes("denied") ||
            addMsg.includes("cancel")
          ) {
            throw addErr;
          }
          // try next RPC
        }
      }

      throw new Error(
        `Could not add Monad Testnet. Add it manually in your wallet:\n` +
          `Network: Monad Testnet\n` +
          `RPC: ${MONAD_TESTNET.rpcUrl}\n` +
          `Chain ID: 10143\n` +
          `Symbol: MON\n` +
          `Explorer: ${MONAD_TESTNET.explorer}\n` +
          `(${getErrorMessage(lastError)})`,
      );
    }
  }, [isConnected, chainId, switchChainAsync, connector]);

  return useMemo(
    () => ({
      chainId,
      targetChainId: APP_CHAIN.id,
      targetName: APP_CHAIN.name,
      isCorrectNetwork,
      isSwitching: isPending,
      ensureMonadTestnet,
      switchError: error,
      explorerUrl: MONAD_TESTNET.explorer,
      rpcUrl: MONAD_TESTNET.rpcUrl,
      rpcList: MONAD_TESTNET_RPC_LIST,
    }),
    [chainId, isCorrectNetwork, isPending, ensureMonadTestnet, error],
  );
}
