import {
  monadTestnet as viemMonadTestnet,
  monad as viemMonad,
} from "viem/chains";
import { defineChain } from "viem";

/**
 * Monad Testnet (chain id 10143 / 0x279f).
 *
 * Official refs:
 * - https://docs.monad.xyz/developer-essentials/testnets
 * - https://faucet.monad.xyz/add-network
 * - viem/chains `monadTestnet`
 *
 * MetaMask is picky about EIP-3085 payloads - keep currency name short ("MON")
 * and provide HTTPS RPC URLs that respond to eth_chainId.
 */

/** Public HTTPS RPCs known to answer chain id 10143 */
export const MONAD_TESTNET_RPCS = [
  "https://testnet-rpc.monad.xyz",
  "https://rpc-testnet.monadinfra.com",
  "https://monad-testnet.drpc.org",
  "https://10143.rpc.thirdweb.com",
] as const;

function normalizeRpc(url: string | undefined | null): string | null {
  if (!url) return null;
  const t = url.trim();
  if (!t) return null;
  // MetaMask rejects non-https in production contexts
  if (!t.startsWith("https://") && !t.startsWith("http://localhost")) {
    return null;
  }
  // strip trailing slash for consistency (MetaMask accepts both)
  return t.replace(/\/+$/, "");
}

const envRpc = normalizeRpc(process.env.NEXT_PUBLIC_MONAD_TESTNET_RPC);

/** Ordered RPC list: env override first, then public fallbacks (unique). */
export const MONAD_TESTNET_RPC_LIST: string[] = [
  ...new Set(
    [envRpc, ...MONAD_TESTNET_RPCS].filter(Boolean) as string[],
  ),
];

const primaryRpc = MONAD_TESTNET_RPC_LIST[0] ?? "https://testnet-rpc.monad.xyz";

/**
 * App chain definition - always based on official viem monadTestnet,
 * with multi-RPC HTTP list for resilience.
 */
export const monadTestnet = defineChain({
  ...viemMonadTestnet,
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: {
    name: "MON",
    symbol: "MON",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: MONAD_TESTNET_RPC_LIST as unknown as readonly [string, ...string[]],
    },
  },
  blockExplorers: {
    default: {
      name: "Monad Explorer",
      url: "https://testnet.monadexplorer.com",
    },
  },
  testnet: true,
});

/** Monad mainnet (chain id 143) for future use. */
export const monadMainnet = viemMonad;

/** App targets testnet by default. */
export const APP_CHAIN = monadTestnet;

/**
 * EIP-3085 payload for wallet_addEthereumChain.
 * IMPORTANT: MetaMask validates RPC by calling eth_chainId - currency
 * `name` must be short; avoid long strings like "Testnet MON Token".
 */
export const MONAD_TESTNET = {
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrl: primaryRpc,
  rpcUrls: MONAD_TESTNET_RPC_LIST,
  explorer: "https://testnet.monadexplorer.com",
  /** Hex chain id for EIP-3085 / EIP-3326 */
  chainIdHex: "0x279f",
  addEthereumChainParameter: {
    chainId: "0x279f",
    chainName: "Monad Testnet",
    nativeCurrency: {
      name: "MON",
      symbol: "MON",
      decimals: 18,
    },
    rpcUrls: [...MONAD_TESTNET_RPC_LIST],
    blockExplorerUrls: ["https://testnet.monadexplorer.com"],
  },
} as const;
