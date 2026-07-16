/**
 * Privacy engine boundary.
 *
 * Today: transparent Monad transfers + platform privacy (RLS, anonymous flags).
 * Demo mode: local "shielded" simulation for UI showcases (no chain change).
 * Future: replace adapters with real ZK circuits / nullifiers / shielded pools.
 */

export type PrivacyMode = "transparent" | "shielded" | "platform";

export type PrivacyTransferRequest = {
  from: `0x${string}`;
  to: `0x${string}`;
  amount: bigint;
  note?: string;
  /** Prefer shielded path when engine supports it */
  preferShielded?: boolean;
};

export type PrivacyTransferResult = {
  txHash: `0x${string}`;
  relationshipId?: string;
  /** Commitment / nullifier placeholders for ZK */
  commitment?: string;
  nullifier?: string;
  mode: "transparent" | "shielded";
  proofMs?: number;
};

export type ZkDemoStep =
  | "idle"
  | "encrypting"
  | "proving"
  | "settling"
  | "complete";

/** Feature flag - real chain still transparent until ZK backend ships. */
export const ZK_ENGINE = {
  enabled: true,
  /** When false, chain path stays transparent; UI can still demo shielded flow. */
  onChainShielded: false,
  version: "0.1.0-demo",
} as const;

function randomHex(bytes: number) {
  const arr = new Uint8Array(bytes);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(arr);
  } else {
    for (let i = 0; i < bytes; i++) arr[i] = Math.floor(Math.random() * 256);
  }
  return `0x${Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("")}`;
}

/**
 * Production transfer adapter. UI calls this instead of viem directly.
 * When onChainShielded is true, body swaps to ZK submit without UI changes.
 */
export async function submitPrivateTransfer(
  req: PrivacyTransferRequest,
  sendTx: () => Promise<`0x${string}`>,
): Promise<PrivacyTransferResult> {
  if (ZK_ENGINE.onChainShielded && req.preferShielded) {
    // Future: prove + submit to shielded pool contract
    const start = Date.now();
    const txHash = await sendTx();
    return {
      txHash,
      mode: "shielded",
      commitment: randomHex(32),
      nullifier: randomHex(32),
      relationshipId: randomHex(16),
      proofMs: Date.now() - start,
    };
  }

  const txHash = await sendTx();
  return {
    txHash,
    mode: "transparent",
    relationshipId: randomHex(16),
  };
}

/**
 * Animated protocol + ZK-ready demo for landing (no real chain).
 * Maps to: resolve @user → commitment → vault deposit → claimable.
 */
export async function runShieldedDemo(opts?: {
  onStep?: (step: ZkDemoStep, meta?: Record<string, string>) => void;
  amountLabel?: string;
}): Promise<PrivacyTransferResult> {
  const onStep = opts?.onStep ?? (() => {});
  const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

  onStep("encrypting", { note: "Resolving @username (no public wallet)" });
  await delay(700);

  onStep("proving", { note: "Building commitment keccak256(recipient, salt)" });
  await delay(1100);

  onStep("settling", { note: "Depositing to TransferVault on Monad" });
  await delay(800);

  const result: PrivacyTransferResult = {
    txHash: randomHex(32) as `0x${string}`,
    mode: "shielded",
    commitment: randomHex(32),
    nullifier: randomHex(32),
    relationshipId: randomHex(16),
    proofMs: 1100,
  };

  onStep("complete", {
    commitment: result.commitment!.slice(0, 18) + "…",
    amount: opts?.amountLabel ?? "25 MON",
  });

  return result;
}

export function describePrivacyMode() {
  return {
    mode: (ZK_ENGINE.onChainShielded ? "shielded" : "platform") as PrivacyMode,
    engineVersion: ZK_ENGINE.version,
    summary:
      "Payments are verified on Monad while sensitive financial relationships stay protected through Anonym's privacy architecture. Shielded ZK transfers are demo-ready in the product UI and will swap onto the same privacy module when circuits ship.",
  };
}

/** Public marketing copy - vault protocol steps (ZK plugs in at commitment). */
export const ZK_DEMO_COPY: Record<
  Exclude<ZkDemoStep, "idle">,
  { title: string; body: string }
> = {
  encrypting: {
    title: "Resolve @username",
    body: "Lookup stays internal. The product never shows Alice’s receiving wallet.",
  },
  proving: {
    title: "Create commitment",
    body: "commitment = keccak256(recipient, salt). Ready for ZK proofs without a UI rewrite.",
  },
  settling: {
    title: "Deposit to vault",
    body: "MON lands in TransferVault - not Alice’s public address. No direct P2P.",
  },
  complete: {
    title: "Ready to claim",
    body: "Alice sees a claimable transfer on her dashboard and withdraws when she chooses.",
  },
};
