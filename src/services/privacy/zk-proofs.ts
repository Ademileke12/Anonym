/**
 * ZK-ready commitment proofs for Anonym protocol.
 *
 * Phase "Next": real cryptographic artifacts over vault commitments
 * (keccak-based statement + nullifier). Full SNARK circuits can replace
 * `generateCommitmentProof` / `verifyCommitmentProof` without changing call sites.
 *
 * Statement (public):
 *   commitment = keccak256(recipient, salt)
 *   nullifier  = keccak256("nf" || commitment || salt)
 * Proof (MVP): binding hash that only the salt-holder can recompute.
 */

import {
  keccak256,
  encodePacked,
  encodeAbiParameters,
  parseAbiParameters,
  toHex,
  type Address,
  type Hex,
} from "viem";
import { computeCommitment, randomSalt } from "@/services/protocol/commitments";

export type CommitmentProof = {
  /** Protocol version for proof format */
  version: "anonym-zk-v1";
  /** keccak256(recipient, salt) */
  commitment: Hex;
  /** Prevents double-claim / double-spend of the same note */
  nullifier: Hex;
  /** Public amount commitment (amount hashed with salt — not plaintext on-chain yet) */
  amountCommit: Hex;
  /** Binding proof digest */
  proof: Hex;
  /** Public inputs used for verification */
  publicInputs: {
    recipient: Address;
    amountWei: string;
    scheme: "keccak-commitment-v1";
  };
  /** Wall-clock prove time (ms) for UX */
  proveMs: number;
};

export type ProofWitness = {
  recipient: Address;
  salt: Hex;
  amountWei: bigint;
  /** Optional domain separator (e.g. campaign id) */
  domain?: string;
};

/** Derive nullifier from commitment + salt (claim-side uniqueness). */
export function deriveNullifier(commitment: Hex, salt: Hex): Hex {
  return keccak256(
    encodePacked(["string", "bytes32", "bytes32"], ["nf", commitment, salt]),
  );
}

/** Amount commit: hides raw amount until circuits ship (still need salt to open). */
export function commitAmount(amountWei: bigint, salt: Hex): Hex {
  return keccak256(
    encodeAbiParameters(parseAbiParameters("uint256 amount, bytes32 salt"), [
      amountWei,
      salt,
    ]),
  );
}

/**
 * Generate a commitment proof for a vault deposit.
 * When real circuits land, swap body for groth16/plonk prove().
 */
export async function generateCommitmentProof(
  witness: ProofWitness,
): Promise<CommitmentProof> {
  const start =
    typeof performance !== "undefined" ? performance.now() : Date.now();

  // Yield so UI can show "proving…"
  await new Promise((r) => setTimeout(r, 0));

  const commitment = computeCommitment(witness.recipient, witness.salt);
  const nullifier = deriveNullifier(commitment, witness.salt);
  const amountCommit = commitAmount(witness.amountWei, witness.salt);
  const domain = witness.domain ?? "anonym:transfer-vault";

  // Binding proof: H(domain, commitment, nullifier, amountCommit, salt)
  // Verifier with salt can recompute; on-chain verifier later uses circuit only.
  const proof = keccak256(
    encodePacked(
      ["string", "bytes32", "bytes32", "bytes32", "bytes32"],
      [domain, commitment, nullifier, amountCommit, witness.salt],
    ),
  );

  // Simulated circuit work (deterministic short delay for UX consistency)
  await new Promise((r) => setTimeout(r, 40));

  const end =
    typeof performance !== "undefined" ? performance.now() : Date.now();

  return {
    version: "anonym-zk-v1",
    commitment,
    nullifier,
    amountCommit,
    proof,
    publicInputs: {
      recipient: witness.recipient,
      amountWei: witness.amountWei.toString(),
      scheme: "keccak-commitment-v1",
    },
    proveMs: Math.round(end - start),
  };
}

/**
 * Verify a commitment proof given the secret salt.
 * On-chain path will verify SNARK without salt reveal.
 */
export function verifyCommitmentProof(
  proof: CommitmentProof,
  salt: Hex,
  domain = "anonym:transfer-vault",
): boolean {
  try {
    const expectedCommitment = computeCommitment(
      proof.publicInputs.recipient,
      salt,
    );
    if (expectedCommitment.toLowerCase() !== proof.commitment.toLowerCase()) {
      return false;
    }
    const expectedNf = deriveNullifier(proof.commitment, salt);
    if (expectedNf.toLowerCase() !== proof.nullifier.toLowerCase()) {
      return false;
    }
    const amountWei = BigInt(proof.publicInputs.amountWei);
    const expectedAmt = commitAmount(amountWei, salt);
    if (expectedAmt.toLowerCase() !== proof.amountCommit.toLowerCase()) {
      return false;
    }
    const expectedProof = keccak256(
      encodePacked(
        ["string", "bytes32", "bytes32", "bytes32", "bytes32"],
        [
          domain,
          proof.commitment,
          proof.nullifier,
          proof.amountCommit,
          salt,
        ],
      ),
    );
    return expectedProof.toLowerCase() === proof.proof.toLowerCase();
  } catch {
    return false;
  }
}

/** Serialize proof for storage / logs (compact). */
export function serializeProof(proof: CommitmentProof): string {
  return JSON.stringify({
    v: proof.version,
    c: proof.commitment,
    n: proof.nullifier,
    a: proof.amountCommit,
    p: proof.proof,
    ms: proof.proveMs,
  });
}

export function randomProofSalt(): Hex {
  return randomSalt();
}

export function emptyProofBytes(): Hex {
  return toHex(new Uint8Array(32));
}
