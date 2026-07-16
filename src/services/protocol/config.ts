import type { Address } from "viem";
import { isAddress, zeroAddress } from "viem";

function addr(env: string | undefined): Address | null {
  const v = env?.trim();
  if (v && isAddress(v) && v.toLowerCase() !== zeroAddress) {
    return v as Address;
  }
  return null;
}

/**
 * Protocol contract addresses (Monad Testnet).
 *
 * Settlement is always on-chain (real MON leaves the sender):
 * 1. TransferVault / CampaignVault when set (full deposit + claim/withdraw)
 * 2. Else PROTOCOL_TREASURY hold address (debit only; claim needs vault deploy)
 *
 * Virtual "ledger only" sends (no debit) are not allowed.
 */
export const PROTOCOL = {
  anonymVault: addr(process.env.NEXT_PUBLIC_ANONYM_VAULT),
  transferVault: addr(
    process.env.NEXT_PUBLIC_TRANSFER_VAULT ||
      process.env.NEXT_PUBLIC_ANONYM_VAULT,
  ),
  campaignFactory: addr(process.env.NEXT_PUBLIC_CAMPAIGN_FACTORY),
  recipientResolver: addr(process.env.NEXT_PUBLIC_RECIPIENT_RESOLVER),
  /** Hold address when vaults are not deployed yet (must be a real 0x address). */
  protocolTreasury: addr(
    process.env.NEXT_PUBLIC_PROTOCOL_TREASURY ||
      process.env.NEXT_PUBLIC_PRIVATE_VIEW_TREASURY,
  ),
} as const;

export function isOnChainProtocolEnabled() {
  return Boolean(PROTOCOL.transferVault);
}

export function isCampaignFactoryEnabled() {
  return Boolean(PROTOCOL.campaignFactory);
}

/** True when we can debit MON on send (vault and/or treasury). */
export function canSettleOnChain() {
  return Boolean(PROTOCOL.transferVault || PROTOCOL.protocolTreasury);
}

/**
 * Where transfer deposits settle. Prefer TransferVault (claimable), else treasury hold.
 */
export function getTransferSettlement():
  | { mode: "vault"; address: Address }
  | { mode: "treasury"; address: Address } {
  if (PROTOCOL.transferVault) {
    return { mode: "vault", address: PROTOCOL.transferVault };
  }
  if (PROTOCOL.protocolTreasury) {
    return { mode: "treasury", address: PROTOCOL.protocolTreasury };
  }
  throw new Error(
    "No settlement address configured. Set NEXT_PUBLIC_TRANSFER_VAULT (recommended) or NEXT_PUBLIC_PROTOCOL_TREASURY so MON actually leaves the sender wallet.",
  );
}

/**
 * Where campaign contributions settle without a per-campaign vault.
 */
export function getCampaignFallbackSettlement(): Address {
  if (PROTOCOL.protocolTreasury) return PROTOCOL.protocolTreasury;
  throw new Error(
    "No campaign settlement address. Deploy CampaignVaultFactory (NEXT_PUBLIC_CAMPAIGN_FACTORY) or set NEXT_PUBLIC_PROTOCOL_TREASURY.",
  );
}

export function protocolSettlementLabel(): string {
  if (PROTOCOL.transferVault) return "TransferVault (claimable)";
  if (PROTOCOL.protocolTreasury) return "Protocol treasury (hold)";
  return "Not configured";
}
