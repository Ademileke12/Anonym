import { keccak256, encodePacked, toHex, type Hex, type Address } from "viem";

/** Random 32-byte salt for commitments */
export function randomSalt(): Hex {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return toHex(bytes);
}

/**
 * MVP commitment: keccak256(recipient || salt)
 * Mirrors RecipientResolver.computeCommitment on-chain.
 * Does NOT include amount (stored separately on vault deposit).
 */
export function computeCommitment(recipient: Address, salt: Hex): Hex {
  return keccak256(encodePacked(["address", "bytes32"], [recipient, salt]));
}

/** Nullifier placeholder - unique per claim to prevent double-spend */
export function computeNullifier(depositId: bigint | string, salt: Hex): Hex {
  return keccak256(
    encodePacked(
      ["string", "bytes32"],
      [`claim:${depositId}`, salt],
    ),
  );
}

/** Hash campaign UUID for factory campaignId bytes32 */
export function campaignIdToBytes32(campaignUuid: string): Hex {
  return keccak256(encodePacked(["string"], [campaignUuid]));
}
