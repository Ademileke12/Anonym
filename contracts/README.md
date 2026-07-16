# Anonym Protocol - Smart Contracts

Monad-compatible Solidity vaults: **no direct sender → recipient transfers**.

## Path B env vars (public addresses only)

| Variable | Source |
|----------|--------|
| `NEXT_PUBLIC_RECIPIENT_RESOLVER` | Deploy `RecipientResolver` |
| `NEXT_PUBLIC_TRANSFER_VAULT` | Deploy `TransferVault(resolver)` |
| `NEXT_PUBLIC_ANONYM_VAULT` | Same as TransferVault (optional) |
| `NEXT_PUBLIC_CAMPAIGN_FACTORY` | Deploy `CampaignVaultFactory` |
| `NEXT_PUBLIC_PROTOCOL_TREASURY` | Your EOA public address (fallback hold) |

**Never** put a private key in Next.js `.env`.

## Deploy to Monad Testnet

1. Fund your deployer wallet with testnet MON (same account as treasury is fine).
2. Export the **deployer private key** only in your terminal:

```bash
cd contracts
export PRIVATE_KEY=0x...          # deployer key — shell only
export MONAD_RPC=https://testnet-rpc.monad.xyz
# optional; defaults to 0xf95F2865C05b5a8cd39fb8E55804b9916f7DC314
export PROTOCOL_TREASURY=0xf95F2865C05b5a8cd39fb8E55804b9916f7DC314

chmod +x deploy-monad.sh
./deploy-monad.sh
```

Or manually:

```bash
forge install foundry-rs/forge-std --no-commit
forge build
forge script script/Deploy.s.sol:Deploy \
  --rpc-url https://testnet-rpc.monad.xyz \
  --broadcast \
  --private-key $PRIVATE_KEY
```

3. Copy printed `NEXT_PUBLIC_*` lines into `../.env.local`.
4. Restart `pnpm dev`.

## Flow

```
Alice → TransferVault.deposit(commitment)  [real MON debit]
Bob   → claim(depositId, salt, nullifier) → Bob wallet

Donor → CampaignVault.contribute → vault
Owner → withdraw → owner wallet
```

## Commitment (MVP)

```
commitment = keccak256(abi.encodePacked(recipient, salt))
```

Salt is stored only in Supabase for the recipient (RLS).
