/**
 * On-chain protocol interactions via Anonym vaults.
 * Never sends native value to a recipient wallet directly.
 * Always debits the sender on-chain (vault deposit or treasury hold).
 */

import {
  type Account,
  type Address,
  type Hex,
  type PublicClient,
  type WalletClient,
  decodeEventLog,
  parseEther,
  zeroAddress,
} from "viem";
import {
  campaignFactoryAbi,
  campaignVaultAbi,
  transferVaultAbi,
} from "./abis";
import {
  campaignIdToBytes32,
  computeCommitment,
  computeNullifier,
  randomSalt,
} from "./commitments";
import {
  getCampaignFallbackSettlement,
  getTransferSettlement,
  isCampaignFactoryEnabled,
  isOnChainProtocolEnabled,
  PROTOCOL,
} from "./config";
import {
  insertProtectedDeposit,
  markDepositClaimed,
  upsertCampaignVault,
  getCampaignVault,
  type ProtectedDeposit,
} from "./ledger";
import {
  ZK_ENGINE,
  generateCommitmentProof,
  type CommitmentProof,
} from "@/services/privacy";

export type ProtocolClients = {
  walletClient: WalletClient;
  publicClient: PublicClient;
  account: Account | Address;
};

export type SettlementMode = "vault" | "treasury";

function accountAddress(account: Account | Address): Address {
  return typeof account === "string" ? account : account.address;
}

/**
 * Protected P2P transfer through TransferVault (preferred) or treasury hold.
 * Always moves real MON out of the sender wallet.
 */
export async function protocolTransfer(params: {
  clients: ProtocolClients;
  senderWallet: string;
  senderUserId?: string | null;
  recipientWallet: string;
  recipientUserId?: string | null;
  amountMon: string;
  message?: string | null;
  anonymous?: boolean;
}): Promise<{
  deposit: ProtectedDeposit;
  txHash: Hex;
  mode: SettlementMode;
  zkProof?: CommitmentProof;
}> {
  const {
    clients,
    senderWallet,
    recipientWallet,
    amountMon,
    message,
    anonymous = true,
  } = params;
  const amount = Number(amountMon);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Invalid amount");
  }

  const { walletClient, publicClient, account } = clients;
  if (!walletClient.account && !account) {
    throw new Error("Wallet account required to sign the deposit");
  }

  const salt = randomSalt();
  const value = parseEther(amountMon);

  // Phase Next: generate commitment proof before on-chain deposit
  let zkProof: CommitmentProof | undefined;
  let commitment: Hex = computeCommitment(recipientWallet as Address, salt);
  if (ZK_ENGINE.commitmentProofs) {
    zkProof = await generateCommitmentProof({
      recipient: recipientWallet as Address,
      salt,
      amountWei: value,
      domain: "anonym:transfer-vault",
    });
    commitment = zkProof.commitment;
  }

  const settlement = getTransferSettlement();

  // ── Full TransferVault path (deposit + later claim) ──────────────────────
  if (settlement.mode === "vault") {
    const hash = await walletClient.writeContract({
      address: settlement.address,
      abi: transferVaultAbi,
      functionName: "deposit",
      args: [commitment],
      value,
      account,
      chain: walletClient.chain,
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status === "reverted") {
      throw new Error("Vault deposit reverted on-chain");
    }

    let onChainId: string | null = null;
    for (const log of receipt.logs) {
      try {
        const decoded = decodeEventLog({
          abi: transferVaultAbi,
          data: log.data,
          topics: log.topics,
        });
        if (decoded.eventName === "Deposited") {
          onChainId = String(decoded.args.depositId);
          break;
        }
      } catch {
        /* skip */
      }
    }

    if (!onChainId) {
      const count = await publicClient.readContract({
        address: settlement.address,
        abi: transferVaultAbi,
        functionName: "depositCount",
      });
      onChainId = String(count);
    }

    const deposit = await insertProtectedDeposit({
      kind: "transfer",
      commitment_hash: commitment,
      salt,
      vault_address: settlement.address,
      on_chain_deposit_id: onChainId,
      tx_hash: hash,
      sender_user_id: params.senderUserId ?? null,
      sender_wallet: senderWallet,
      recipient_user_id: params.recipientUserId ?? null,
      recipient_wallet: recipientWallet,
      anonymous,
      amount,
      message: message ?? null,
      status: "claimable",
      nullifier: zkProof?.nullifier ?? null,
    });

    return { deposit, txHash: hash, mode: "vault", zkProof };
  }

  // ── Treasury hold: real debit, claim needs vault later ───────────────────
  const hash = await walletClient.sendTransaction({
    account,
    chain: walletClient.chain,
    to: settlement.address,
    value,
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status === "reverted") {
    throw new Error("Treasury deposit reverted on-chain");
  }

  const deposit = await insertProtectedDeposit({
    kind: "transfer",
    commitment_hash: commitment,
    salt,
    vault_address: settlement.address,
    on_chain_deposit_id: null,
    tx_hash: hash,
    sender_user_id: params.senderUserId ?? null,
    sender_wallet: senderWallet,
    recipient_user_id: params.recipientUserId ?? null,
    recipient_wallet: recipientWallet,
    anonymous,
    amount,
    message: message ?? null,
    status: "claimable",
    nullifier: zkProof?.nullifier ?? null,
  });

  return { deposit, txHash: hash, mode: "treasury", zkProof };
}

/**
 * Claim a protected transfer - releases MON from TransferVault to claimer.
 * Does NOT silently mark claimed without paying out.
 */
export async function protocolClaimTransfer(params: {
  clients: ProtocolClients;
  deposit: ProtectedDeposit;
}): Promise<Hex> {
  const { clients, deposit } = params;
  const salt = deposit.salt as Hex;

  const vault =
    deposit.vault_address?.startsWith("0x") && deposit.vault_address.length === 42
      ? (deposit.vault_address as Address)
      : PROTOCOL.transferVault;

  const canClaimOnVault = Boolean(
    vault && deposit.on_chain_deposit_id && isOnChainProtocolEnabled(),
  );

  if (!canClaimOnVault) {
    throw new Error(
      deposit.tx_hash
        ? "This deposit was held at a treasury address, not TransferVault. Deploy TransferVault, set NEXT_PUBLIC_TRANSFER_VAULT, and new deposits will be claimable. Existing treasury holds must be released by the treasury operator."
        : "No on-chain vault deposit found. This entry was never funded on-chain (old ledger-only record). It cannot pay out MON.",
    );
  }

  const nullifier = computeNullifier(deposit.on_chain_deposit_id!, salt);
  const { walletClient, publicClient, account } = clients;
  const hash = await walletClient.writeContract({
    address: vault!,
    abi: transferVaultAbi,
    functionName: "claim",
    args: [BigInt(deposit.on_chain_deposit_id!), salt, nullifier],
    account,
    chain: walletClient.chain,
  });
  await publicClient.waitForTransactionReceipt({ hash });
  await markDepositClaimed(deposit.id, hash);
  return hash;
}

async function waitOk(
  publicClient: PublicClient,
  hash: Hex,
): Promise<void> {
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status === "reverted") {
    throw new Error("Transaction reverted on-chain");
  }
}

async function isContractAddress(
  publicClient: PublicClient,
  address: Address,
): Promise<boolean> {
  try {
    const code = await publicClient.getBytecode({ address });
    return Boolean(code && code !== "0x" && code.length > 2);
  } catch {
    return false;
  }
}

/**
 * Ensure campaign has a real CampaignVault when factory is set.
 * Avoids treating PROTOCOL_TREASURY (EOA) as a vault contract.
 */
export async function ensureCampaignVault(params: {
  clients: ProtocolClients;
  campaignId: string;
  ownerWallet: string;
}): Promise<{ address: string; isContract: boolean }> {
  const { walletClient, publicClient, account } = params.clients;
  const existing = await getCampaignVault(params.campaignId);

  if (isCampaignFactoryEnabled() && PROTOCOL.campaignFactory) {
    const cid = campaignIdToBytes32(params.campaignId);
    let vault =
      (await publicClient.readContract({
        address: PROTOCOL.campaignFactory,
        abi: campaignFactoryAbi,
        functionName: "vaultOf",
        args: [cid],
      })) ?? zeroAddress;

    if (vault === zeroAddress) {
      const hash = await walletClient.writeContract({
        address: PROTOCOL.campaignFactory,
        abi: campaignFactoryAbi,
        functionName: "createVault",
        args: [cid, params.ownerWallet as Address],
        account,
        chain: walletClient.chain,
      });
      await waitOk(publicClient, hash);
      vault =
        (await publicClient.readContract({
          address: PROTOCOL.campaignFactory,
          abi: campaignFactoryAbi,
          functionName: "vaultOf",
          args: [cid],
        })) ?? zeroAddress;
    }

    if (vault === zeroAddress) {
      throw new Error("Campaign vault creation failed");
    }

    await upsertCampaignVault({
      campaign_id: params.campaignId,
      vault_address: vault,
      owner_wallet: params.ownerWallet,
    }).catch((e) => console.warn("upsertCampaignVault", e));

    return { address: vault, isContract: true };
  }

  // Prefer existing contract address over treasury EOA
  if (existing?.vault_address?.startsWith("0x") && existing.vault_address.length === 42) {
    const addr = existing.vault_address as Address;
    const contract = await isContractAddress(publicClient, addr);
    if (contract) return { address: addr, isContract: true };
  }

  const hold = getCampaignFallbackSettlement();
  await upsertCampaignVault({
    campaign_id: params.campaignId,
    vault_address: hold,
    owner_wallet: params.ownerWallet,
  }).catch((e) => console.warn("upsertCampaignVault", e));

  return {
    address: hold,
    isContract: await isContractAddress(publicClient, hold),
  };
}

/**
 * Donate to campaign vault - always debits sender. Never direct to owner wallet.
 * On-chain success is source of truth; ledger write is best-effort (won't fail the donate if paid).
 */
export async function protocolDonate(params: {
  clients: ProtocolClients;
  campaignId: string;
  ownerWallet: string;
  senderWallet: string;
  senderUserId?: string | null;
  amountMon: string;
  message?: string | null;
  anonymous?: boolean;
}): Promise<{
  deposit: ProtectedDeposit | null;
  txHash: Hex;
  vault: string;
  mode: SettlementMode;
  ledgerError?: string;
}> {
  const amount = Number(params.amountMon);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Invalid amount");

  const ensured = await ensureCampaignVault({
    clients: params.clients,
    campaignId: params.campaignId,
    ownerWallet: params.ownerWallet,
  });
  const vault = ensured.address;

  const salt = randomSalt();
  const commitment = computeCommitment(params.ownerWallet as Address, salt);
  const value = parseEther(params.amountMon);
  const { walletClient, publicClient, account } = params.clients;

  let txHash: Hex;
  let mode: SettlementMode;

  if (
    vault.startsWith("0x") &&
    vault.length === 42 &&
    ensured.isContract
  ) {
    txHash = await walletClient.writeContract({
      address: vault as Address,
      abi: campaignVaultAbi,
      functionName: "contribute",
      args: [commitment],
      value,
      account,
      chain: walletClient.chain,
    });
    await waitOk(publicClient, txHash);
    mode = "vault";
  } else if (vault.startsWith("0x") && vault.length === 42) {
    // EOA treasury hold - plain value transfer
    txHash = await walletClient.sendTransaction({
      account,
      chain: walletClient.chain,
      to: vault as Address,
      value,
    });
    await waitOk(publicClient, txHash);
    mode = "treasury";
  } else {
    throw new Error(
      "Campaign has no on-chain vault. Set NEXT_PUBLIC_CAMPAIGN_FACTORY or NEXT_PUBLIC_PROTOCOL_TREASURY.",
    );
  }

  // Ledger write after payment - do not fail the whole donate if this fails
  let deposit: ProtectedDeposit | null = null;
  let ledgerError: string | undefined;
  try {
    deposit = await insertProtectedDeposit({
      kind: "donation",
      commitment_hash: commitment,
      salt,
      vault_address: vault,
      tx_hash: txHash,
      campaign_id: params.campaignId,
      sender_user_id: params.senderUserId ?? null,
      sender_wallet: params.senderWallet,
      recipient_user_id: null,
      recipient_wallet: params.ownerWallet,
      anonymous: params.anonymous ?? true,
      amount,
      message: params.message ?? null,
      status: "claimable",
    });
  } catch (e) {
    ledgerError = e instanceof Error ? e.message : "Ledger write failed";
    console.warn("protocolDonate ledger", e);
  }

  // Always write to legacy donations table for public visibility on campaign page
  try {
    const { createDonation } = await import("@/services/data/campaigns");
    await createDonation({
      campaign_id: params.campaignId,
      sender_wallet: params.senderWallet,
      recipient_wallet: params.ownerWallet,
      amount,
      message: params.message ?? null,
      anonymous: params.anonymous ?? true,
      tx_hash: txHash,
    });
  } catch (e2) {
    console.warn("protocolDonate legacy donation", e2);
  }

  return { deposit, txHash, vault, mode, ledgerError };
}

/**
 * Campaign owner withdraws from vault (not per-donation auto-send).
 */
export async function protocolWithdrawCampaign(params: {
  clients: ProtocolClients;
  vaultAddress: string;
  amountMon?: string;
}): Promise<Hex> {
  if (!params.vaultAddress.startsWith("0x") || params.vaultAddress.length !== 42) {
    throw new Error(
      "No on-chain campaign vault. Deploy CampaignVaultFactory and create the campaign vault to withdraw.",
    );
  }

  // Plain EOA treasury cannot be withdrawn via CampaignVault ABI
  if (
    PROTOCOL.protocolTreasury &&
    params.vaultAddress.toLowerCase() === PROTOCOL.protocolTreasury.toLowerCase()
  ) {
    throw new Error(
      "Funds were sent to PROTOCOL_TREASURY (EOA hold). Only that wallet can move them. Deploy CampaignVaultFactory for self-serve owner withdraw.",
    );
  }

  const { walletClient, publicClient, account } = params.clients;
  let hash: Hex;
  if (params.amountMon) {
    hash = await walletClient.writeContract({
      address: params.vaultAddress as Address,
      abi: campaignVaultAbi,
      functionName: "withdraw",
      args: [parseEther(params.amountMon)],
      account,
      chain: walletClient.chain,
    });
  } else {
    hash = await walletClient.writeContract({
      address: params.vaultAddress as Address,
      abi: campaignVaultAbi,
      functionName: "withdrawAll",
      account,
      chain: walletClient.chain,
    });
  }
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

export async function readCampaignVaultBalance(
  publicClient: PublicClient,
  vaultAddress: string,
): Promise<bigint> {
  if (!vaultAddress.startsWith("0x") || vaultAddress.length !== 42) {
    return BigInt(0);
  }
  // EOA treasury - use native balance
  if (
    PROTOCOL.protocolTreasury &&
    vaultAddress.toLowerCase() === PROTOCOL.protocolTreasury.toLowerCase()
  ) {
    return publicClient.getBalance({ address: vaultAddress as Address });
  }
  try {
    return await publicClient.readContract({
      address: vaultAddress as Address,
      abi: campaignVaultAbi,
      functionName: "balance",
    });
  } catch {
    return publicClient.getBalance({ address: vaultAddress as Address });
  }
}

export { accountAddress };
