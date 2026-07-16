<div align="center">

# 🔐 Anonym

### Private Payments. Private Fundraising. Built on Monad.

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![Monad](https://img.shields.io/badge/Monad-Testnet-7c3aed?logo=ethereum)](https://monad.xyz)
[![Supabase](https://img.shields.io/badge/Supabase-Database-3ecf8e?logo=supabase)](https://supabase.com)

</div>

---

## What is Anonym?

Anonym is a **privacy-first payment and fundraising platform** built on **Monad Testnet**. Unlike traditional crypto transfers that expose sender/receiver relationships on a public blockchain, Anonym routes every value transfer through **smart contract vaults** — so no direct wallet-to-wallet transaction ever appears on-chain.

Users interact via **@usernames**, not wallet addresses. When you send MON to a friend, you deposit into a **TransferVault** with a commitment hash. Your recipient claims it from their dashboard. The blockchain sees a deposit to a vault — not a transfer between two people. Relationships stay off the public graph.

The platform also supports **vault-backed fundraising campaigns**. Supporters donate into a campaign vault, and owners withdraw the balance when ready. No per-donation P2P hops. No public receive addresses on profiles.

---

## The Problem

> Every wallet-to-wallet transfer on a public blockchain creates a **permanent, traceable link** between two addresses.

Analyzers can map your entire financial relationship graph — who you pay, who pays you, how often, and how much. For activists, startups, donors, and privacy-conscious users, this is unacceptable.

Traditional privacy coins mix transactions but still expose amounts and timing. **Anonym takes a different approach: no direct transfers happen at all.** Value moves through vaults, and only the vault address is public.

---

## The Solution — Relationship Privacy Protocol

Anonym's core innovation is the **Relationship Privacy Protocol**: a vault-based settlement system where value never moves directly between user wallets.

```
┌──────────┐    deposit     ┌──────────────┐    claim     ┌──────────┐
│  Sender   │ ─────────────▸│ TransferVault │ ────────────▸│Recipient │
│ @alice    │  MON + commitment hash       │  MON from vault│ @bob    │
└──────────┘                └──────────────┘              └──────────┘
```

### How it works

1. **Sender** calls `send` on the TransferVault, depositing MON with a `commitment = keccak256(recipient, salt)` and the recipient's @username
2. **Recipient** sees the pending deposit on their dashboard and clicks **Claim**
3. **Settlement** happens on-chain — MON moves from the vault to the recipient, but the blockchain only sees vault interactions, not peer-to-peer transfers

For **campaigns**, supporters deposit into a **CampaignVault** (one per campaign, deployed by the CampaignVaultFactory). The owner withdraws the full balance when ready — never per-donation P2P.

---

## ✨ Features

<table>
  <tr>
    <td width="50%">

### 🕵️ Private Payments
- Send MON to any **@username** — never a wallet address
- Recipients claim transfers from their dashboard
- No public receive address on profiles
- Realtime activity feed with privacy-protected counterparties

    </td>
    <td width="50%">

### 🎯 Vault-Backed Fundraising
- Create public or private-link campaigns
- Supporters donate into a campaign vault (anonymous or revealed)
- Owners withdraw vault balance — not per-donation P2P
- Campaign countdown timers, progress bars, realtime updates

    </td>
  </tr>
  <tr>
    <td>

### 🔒 Privacy
- No direct wallet-to-wallet transfers in any product flow
- Public profiles show @username only — no receiving wallet
- Protected activity stream — counterparty relationships stay off-chain
- Optional anonymous/revealed donation toggle

    </td>
    <td>

### 👛 Wallet Auth
- Sign-In with Ethereum (SIWE) → Supabase session cookies
- MetaMask, Rabby, WalletConnect, OKX Wallet, and other EIP-1193 injected wallets
- Wallet-only authentication — no email or password

    </td>
  </tr>
  <tr>
    <td colspan="2">

### 🎨 UX
Dark mode with system preference detection · Realtime notifications (Supabase Realtime) · Optimistic UI on sends, claims, and donations · Mobile-responsive with slide-out navigation · Onboarding flow (Regular / Startup account types)

    </td>
  </tr>
</table>

---

## 📜 Deployed Contracts

All contracts are live on **Monad Testnet (chain ID 10143)**:

| Contract | Address | Explorer |
|----------|---------|----------|
| **TransferVault** | `0x53A617438fCd546fF7af234e832Ce270b12B3c1C` | [View](https://testnet.monadexplorer.com/address/0x53A617438fCd546fF7af234e832Ce270b12B3c1C) |
| **CampaignVaultFactory** | `0xdc9742472db1EBc1FF2c836Ac352010F4fab2210` | [View](https://testnet.monadexplorer.com/address/0xdc9742472db1EBc1FF2c836Ac352010F4fab2210) |
| **RecipientResolver** | `0xdf84DF12e02703b4673E59B8eB33232904841bfE` | [View](https://testnet.monadexplorer.com/address/0xdf84DF12e02703b4673E59B8eB33232904841bfE) |

---

## 🛠 Tech Stack

| Layer | Tech |
|-------|------|
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4 |
| **Animations** | Framer Motion |
| **Icons** | Lucide React |
| **Backend** | Supabase (Auth sessions, Postgres, Row-Level Security, Realtime, Storage) |
| **Wallet** | wagmi v2 + viem (Monad Testnet) |
| **Auth** | SIWE → Supabase session (`wallet_address` in JWT metadata) |
| **Smart Contracts** | Solidity, Foundry |
| **Network** | Monad Testnet (chain 10143) |

---

## 🚀 Getting Started

### Install & Run

```bash
git clone https://github.com/Ademileke12/Anonym.git
cd Anonym
pnpm install
cp .env.example .env.local   # fill in your keys
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

### Database Migrations

Run all migrations in order via Supabase SQL Editor:

| # | Migration |
|---|-----------|
| 1 | `00000000000001_init.sql` — core schema |
| 2 | `00000000000002_storage.sql` — storage buckets |
| 3 | `00000000000003_siwe_triggers_realtime.sql` — auth triggers + realtime |
| 4 | `00000000000004_private_view_notify.sql` — private view notifications |
| 5 | `00000000000005_startup_extras.sql` — startup profile fields |
| 6 | `00000000000006_protocol_ledger.sql` — protocol ledger + commitments |

---

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/auth/           # SIWE nonce / verify / logout
│   └── app/                # Protected routes (dashboard, transfer, campaigns)
├── components/
│   ├── landing/            # Marketing site sections
│   ├── app/                # App shell (sidebar, topbar, mobile nav)
│   ├── ui/                 # Reusable primitives (button, card, badge, toast)
│   └── wallet/             # Wallet connect button, network banner
├── services/
│   ├── protocol/           # Relationship Privacy Protocol (vaults, ledger)
│   ├── data/               # Supabase data repositories
│   ├── blockchain/         # Monad chain config, wagmi setup
│   └── supabase/           # Client + admin + types
├── providers/              # Auth, theme, wagmi providers
└── lib/                    # Utilities, formatting, constants

contracts/src/              # Solidity: TransferVault, CampaignVault, Factory
supabase/migrations/        # Database schema migrations
```

---

<div align="center">

**Built with ❤️ for the Monad ecosystem**

</div>
