import { NextResponse } from "next/server";
import {
  createWalletClient,
  createPublicClient,
  http,
  type Hex,
  type Address,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { createClient } from "@supabase/supabase-js";
import { transferVaultAbi } from "@/services/protocol/abis";
import { computeNullifier } from "@/services/protocol/commitments";
import { monadTestnet } from "@/services/blockchain/chains";

/**
 * Gasless claim relay — optional.
 * Set CLAIM_RELAYER_PRIVATE_KEY (server only, never NEXT_PUBLIC).
 * Relayer must be funded with testnet MON for gas; claim still pays recipient from vault.
 *
 * Note: TransferVault.claim sends funds to msg.sender (the relayer) unless the
 * contract is claimer-aware. Current TransferVault pays msg.sender — so gasless
 * requires either (a) contract upgrade with claimTo, or (b) relayer that is the
 * recipient. For MVP we only relay when claimer === recipient and document this.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      id?: string;
      salt?: string;
      claimer?: string;
    };
    const { id, salt, claimer } = body;
    if (!id || !salt || !claimer) {
      return NextResponse.json(
        { error: "id, salt, claimer required" },
        { status: 400 },
      );
    }

    const pk = process.env.CLAIM_RELAYER_PRIVATE_KEY;
    if (!pk) {
      return NextResponse.json(
        {
          error:
            "Gasless claim not configured. Set CLAIM_RELAYER_PRIVATE_KEY or claim from your wallet.",
        },
        { status: 501 },
      );
    }

    const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!base || !service) {
      return NextResponse.json({ error: "Server not configured" }, { status: 500 });
    }

    const admin = createClient(base, service, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: deposit, error } = await admin
      .from("protected_deposits")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error || !deposit) {
      return NextResponse.json({ error: "Deposit not found" }, { status: 404 });
    }

    const saltNorm = salt.startsWith("0x") ? salt : `0x${salt}`;
    if (String(deposit.salt).toLowerCase() !== saltNorm.toLowerCase()) {
      return NextResponse.json({ error: "Invalid salt" }, { status: 403 });
    }

    if (
      deposit.recipient_wallet.toLowerCase() !== claimer.toLowerCase()
    ) {
      return NextResponse.json(
        {
          error:
            "Claimer must match recipient wallet (vault pays msg.sender).",
        },
        { status: 400 },
      );
    }

    if (!deposit.on_chain_deposit_id || !deposit.vault_address?.startsWith("0x")) {
      return NextResponse.json(
        { error: "Deposit is not vault-claimable" },
        { status: 400 },
      );
    }

    if (deposit.unlock_at && new Date(deposit.unlock_at).getTime() > Date.now()) {
      return NextResponse.json({ error: "Escrow not unlocked yet" }, { status: 400 });
    }

    const account = privateKeyToAccount(
      (pk.startsWith("0x") ? pk : `0x${pk}`) as Hex,
    );
    // Only works if relayer key IS the recipient — otherwise use wallet claim
    if (account.address.toLowerCase() !== claimer.toLowerCase()) {
      return NextResponse.json(
        {
          error:
            "Relayer key must match claimer for current TransferVault (pays msg.sender). Use in-wallet claim instead.",
        },
        { status: 400 },
      );
    }

    const rpc =
      process.env.NEXT_PUBLIC_MONAD_TESTNET_RPC ||
      "https://testnet-rpc.monad.xyz";
    const publicClient = createPublicClient({
      chain: monadTestnet,
      transport: http(rpc),
    });
    const walletClient = createWalletClient({
      account,
      chain: monadTestnet,
      transport: http(rpc),
    });

    const nullifier = computeNullifier(
      deposit.on_chain_deposit_id,
      saltNorm as Hex,
    );

    const hash = await walletClient.writeContract({
      address: deposit.vault_address as Address,
      abi: transferVaultAbi,
      functionName: "claim",
      args: [BigInt(deposit.on_chain_deposit_id), saltNorm as Hex, nullifier],
      account,
      chain: monadTestnet,
    });
    await publicClient.waitForTransactionReceipt({ hash });

    await admin
      .from("protected_deposits")
      .update({
        status: "claimed",
        claimed_at: new Date().toISOString(),
        claim_tx_hash: hash,
      })
      .eq("id", id);

    return NextResponse.json({ ok: true, txHash: hash });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Relay failed" },
      { status: 500 },
    );
  }
}
