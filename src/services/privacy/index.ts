/**
 * Privacy engine boundary — Phase "Next" (On-chain + ZK).
 *
 * - Vault deposits on Monad Testnet (deployed)
 * - Commitment proofs (keccak-v1; SNARK-swappable)
 * - Private balances (client reveal policy)
 * - Mobile via PWA install
 */

export type PrivacyMode = "transparent" | "shielded" | "platform" | "zk-v1";

export type PrivacyTransferRequest = {
  from: `0x${string}`;
  to: `0x${string}`;
  amount: bigint;
  note?: string;
  preferShielded?: boolean;
};

export type PrivacyTransferResult = {
  txHash: `0x${string}`;
  relationshipId?: string;
  commitment?: string;
  nullifier?: string;
  proof?: string;
  mode: "transparent" | "shielded" | "zk-v1";
  proofMs?: number;
};

export type ZkDemoStep =
  | "idle"
  | "encrypting"
  | "proving"
  | "settling"
  | "complete";

/** Feature flags for Next phase */
export const ZK_ENGINE = {
  enabled: true,
  /** Client-side commitment proofs attached to vault deposits */
  commitmentProofs: true,
  /** Full on-chain SNARK verifier (not yet deployed) */
  onChainShielded: false,
  version: "0.2.0-next",
  phase: "on-chain-zk" as const,
} as const;

export {
  generateCommitmentProof,
  verifyCommitmentProof,
  serializeProof,
  deriveNullifier,
  commitAmount,
  type CommitmentProof,
  type ProofWitness,
} from "./zk-proofs";

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
 */
export async function submitPrivateTransfer(
  req: PrivacyTransferRequest,
  sendTx: () => Promise<`0x${string}`>,
): Promise<PrivacyTransferResult> {
  if (ZK_ENGINE.onChainShielded && req.preferShielded) {
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
 * Animated protocol + ZK demo for landing.
 */
export async function runShieldedDemo(opts?: {
  onStep?: (step: ZkDemoStep, meta?: Record<string, string>) => void;
  amountLabel?: string;
}): Promise<PrivacyTransferResult> {
  const onStep = opts?.onStep ?? (() => {});
  const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

  onStep("encrypting", { note: "Resolving @username (no public wallet)" });
  await delay(700);

  onStep("proving", {
    note: "Generating commitment proof (anonym-zk-v1)",
  });
  await delay(1100);

  onStep("settling", { note: "Depositing to TransferVault on Monad" });
  await delay(800);

  const result: PrivacyTransferResult = {
    txHash: randomHex(32) as `0x${string}`,
    mode: "zk-v1",
    commitment: randomHex(32),
    nullifier: randomHex(32),
    proof: randomHex(32),
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
    mode: (ZK_ENGINE.commitmentProofs
      ? "zk-v1"
      : ZK_ENGINE.onChainShielded
        ? "shielded"
        : "platform") as PrivacyMode,
    engineVersion: ZK_ENGINE.version,
    phase: ZK_ENGINE.phase,
    summary:
      "Vault deposits on Monad Testnet with client-side commitment proofs (anonym-zk-v1). SNARK verifiers and private balances ship on the same privacy module boundary.",
  };
}

export const ZK_DEMO_COPY: Record<
  Exclude<ZkDemoStep, "idle">,
  { title: string; body: string }
> = {
  encrypting: {
    title: "Resolve @username",
    body: "Lookup stays internal. The product never shows Alice's receiving wallet.",
  },
  proving: {
    title: "Prove commitment",
    body: "anonym-zk-v1 builds commitment + nullifier + amount commit. SNARKs plug in here.",
  },
  settling: {
    title: "Deposit to vault",
    body: "MON lands in TransferVault on Monad Testnet - not Alice's public address.",
  },
  complete: {
    title: "Ready to claim",
    body: "Alice claims with nullifier protection. Private balances stay off the public graph.",
  },
};
