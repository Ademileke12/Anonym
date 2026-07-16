import { createConfig, http, fallback } from "wagmi";
import {
  injected,
  metaMask,
  walletConnect,
  coinbaseWallet,
} from "wagmi/connectors";
import {
  APP_CHAIN,
  monadTestnet,
  MONAD_TESTNET,
  MONAD_TESTNET_RPC_LIST,
} from "./chains";

const walletConnectProjectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID?.trim();

const appUrl =
  typeof window !== "undefined"
    ? window.location.origin
    : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

/** Fallback HTTP transports across public Monad Testnet RPCs */
const testnetTransport = fallback(
  MONAD_TESTNET_RPC_LIST.map((url) =>
    http(url, {
      batch: true,
      retryCount: 2,
      timeout: 12_000,
    }),
  ),
);

/**
 * Wagmi config for Monad Testnet (chain 10143).
 * Uses multi-RPC fallback so a single bad endpoint does not brick the app.
 */
export const wagmiConfig = createConfig({
  chains: [monadTestnet],
  connectors: [
    metaMask({
      dappMetadata: {
        name: "Anonym",
        url: appUrl,
        iconUrl: `${appUrl}/logo.svg`,
      },
    }),
    injected({
      shimDisconnect: true,
      unstable_shimAsyncInject: 2_000,
    }),
    coinbaseWallet({
      appName: "Anonym",
      appLogoUrl: `${appUrl}/logo.svg`,
      preference: "all",
    }),
    ...(walletConnectProjectId
      ? [
          walletConnect({
            projectId: walletConnectProjectId,
            metadata: {
              name: "Anonym",
              description:
                "Private Payments. Private Fundraising. Built on Monad.",
              url: appUrl,
              icons: [`${appUrl}/logo.svg`],
            },
            showQrModal: true,
          }),
        ]
      : []),
  ],
  transports: {
    [monadTestnet.id]: testnetTransport,
  },
  multiInjectedProviderDiscovery: true,
  ssr: true,
});

export { APP_CHAIN, monadTestnet, MONAD_TESTNET };

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
