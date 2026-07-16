#!/usr/bin/env bash
# Deploy Path B vaults to Monad Testnet and print .env.local lines.
# Usage:
#   export PRIVATE_KEY=0xYOUR_DEPLOYER_PRIVATE_KEY
#   ./deploy-monad.sh
#
# Never commit PRIVATE_KEY. Never put it in Next.js env.

set -euo pipefail
cd "$(dirname "$0")"

RPC="${MONAD_RPC:-https://testnet-rpc.monad.xyz}"
TREASURY="${PROTOCOL_TREASURY:-0xf95F2865C05b5a8cd39fb8E55804b9916f7DC314}"

if [[ -z "${PRIVATE_KEY:-}" ]]; then
  echo "ERROR: Set PRIVATE_KEY for the deployer wallet (funded with testnet MON)."
  echo "  export PRIVATE_KEY=0x..."
  echo "Deployer public address should match your funded account (e.g. $TREASURY)."
  exit 1
fi

if ! command -v forge >/dev/null 2>&1; then
  echo "Installing Foundry..."
  curl -L https://foundry.paradigm.xyz | bash
  # shellcheck disable=SC1091
  source "$HOME/.bashrc" 2>/dev/null || true
  export PATH="$HOME/.foundry/bin:$PATH"
  foundryup
fi

if [[ ! -d lib/forge-std ]]; then
  echo "Installing forge-std..."
  forge install foundry-rs/forge-std
fi
if [[ ! -f remappings.txt ]]; then
  echo 'forge-std/=lib/forge-std/src/' > remappings.txt
fi

echo "Building..."
forge build

echo "Deploying to $RPC ..."
OUT=$(forge script script/Deploy.s.sol:Deploy \
  --rpc-url "$RPC" \
  --broadcast \
  --private-key "$PRIVATE_KEY" \
  -vvv)

echo "$OUT"

RESOLVER=$(echo "$OUT" | grep -oE 'NEXT_PUBLIC_RECIPIENT_RESOLVER=0x[a-fA-F0-9]+' | tail -1 | cut -d= -f2)
VAULT=$(echo "$OUT" | grep -oE 'NEXT_PUBLIC_TRANSFER_VAULT=0x[a-fA-F0-9]+' | tail -1 | cut -d= -f2)
FACTORY=$(echo "$OUT" | grep -oE 'NEXT_PUBLIC_CAMPAIGN_FACTORY=0x[a-fA-F0-9]+' | tail -1 | cut -d= -f2)

if [[ -z "$VAULT" ]]; then
  echo ""
  echo "Could not parse addresses from forge output. Check logs above."
  exit 1
fi

ENV_FILE="../.env.local"
echo ""
echo "=== Paste into .env.local (or auto-updating $ENV_FILE) ==="
{
  echo ""
  echo "# Anonym Protocol Path B (Monad Testnet) — public addresses only"
  echo "NEXT_PUBLIC_RECIPIENT_RESOLVER=$RESOLVER"
  echo "NEXT_PUBLIC_TRANSFER_VAULT=$VAULT"
  echo "NEXT_PUBLIC_ANONYM_VAULT=$VAULT"
  echo "NEXT_PUBLIC_CAMPAIGN_FACTORY=$FACTORY"
  echo "NEXT_PUBLIC_PROTOCOL_TREASURY=$TREASURY"
} | tee /tmp/anonym-protocol-env.txt

# Upsert keys in .env.local without touching secrets
if [[ -f "$ENV_FILE" ]]; then
  for key in \
    NEXT_PUBLIC_RECIPIENT_RESOLVER \
    NEXT_PUBLIC_TRANSFER_VAULT \
    NEXT_PUBLIC_ANONYM_VAULT \
    NEXT_PUBLIC_CAMPAIGN_FACTORY \
    NEXT_PUBLIC_PROTOCOL_TREASURY; do
    val=$(grep "^${key}=" /tmp/anonym-protocol-env.txt | cut -d= -f2-)
    if grep -q "^${key}=" "$ENV_FILE"; then
      sed -i "s|^${key}=.*|${key}=${val}|" "$ENV_FILE"
    else
      echo "${key}=${val}" >> "$ENV_FILE"
    fi
  done
  echo ""
  echo "Updated $ENV_FILE — restart pnpm dev."
fi

echo ""
echo "Done. Verify TransferVault on explorer, then send a protected transfer."
