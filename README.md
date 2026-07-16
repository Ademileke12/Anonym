# Anonym

**Private Payments. Private Fundraising. Built on Monad.**

Privacy-first payment and fundraising platform on **Monad Testnet**, backed by **Supabase** (Postgres, RLS, Realtime, Storage, Auth sessions via SIWE).

---

## Feature status (master prompt checklist)

Last updated: **2026-07-16** - living document. Update when shipping features.

### Legend

| Mark | Meaning |
|------|---------|
| ✅ | Implemented end-to-end (UI + data/backend path) |
| 🟨 | Partial - core works; polish or edge cases remain |
| ❌ | Not implemented yet |
| 🧭 | Roadmap / future (explicitly out of MVP) |

---

### Core product flows

| Feature | Status | Notes |
|---------|--------|-------|
| Send private payments (transfers) | ✅ | **Protocol vault deposit** + claim; never wallet→wallet |
| Receive private payments | ✅ | `/app/receive` - profile link only; claim on dashboard |
| Raise funds (campaigns) | ✅ | Vault-backed create/donate/owner withdraw |
| Support startups | ✅ | Startup account type + public profiles |
| Donate anonymously | ✅ | Toggle anonymous / reveal username · vault deposit |
| Public fundraising profiles | ✅ | `/anonym/@username` · **no receiving wallet shown** |
| Claim protected transfers | ✅ | Dashboard claim / claim-all |
| Relationship Privacy Protocol | ✅ | Contracts + ledger + UI (on-chain when vault addrs set) |
| Wallet-only auth (SIWE → Supabase) | ✅ | Nonce + verify APIs, session cookies |
| MetaMask / Rabby / injected wallets | ✅ | wagmi `injected` + EIP-6963 |
| WalletConnect | 🟨 | Wired if `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` set |
| OKX / Backpack | 🟨 | Via injected connector when present |
| Private View (1000 MON unlock) | ✅ | On-chain pay + `private_views` + vault UI |
| Notifications (realtime) | ✅ | List, mark read, badge count, triggers |
| Dashboard analytics (live) | ✅ | Balance, raised, sent/received, activity, realtime |
| Username uniqueness (live check) | ✅ | Supabase query during onboarding |
| Onboarding Regular / Startup | ✅ | Steps + media + socials |
| Campaign countdown / auto-end | ✅ | Live timer + DB guard + `close_expired_campaigns` |
| Funding progress + realtime | ✅ | Progress bar + Supabase Realtime |
| Dark mode | ✅ | Light / dark / system |

---

### Backend & data

| Feature | Status | Notes |
|---------|--------|-------|
| Supabase Postgres schema | ✅ | + migration **06**: commitments, protected_deposits, campaign_vaults |
| RLS on all tables | ✅ | `current_wallet()` from JWT metadata |
| Database triggers | ✅ | Donation totals, transfer notify, private view notify, campaign guard |
| Realtime subscriptions | ✅ | campaigns, donations, transfers, notifications |
| Supabase Storage (avatars, logos, banners, covers) | ✅ | Upload + browser optimize + UI |
| Edge Functions (Next serverless routes) | ✅ | `/api/edge/*` record-donation, record-transfer, health |
| No Prisma / no separate Node API | ✅ | Next API routes + Supabase only |
| Middleware session refresh | ✅ | `src/middleware.ts` |
| Optimistic UI | ✅ | Donate, transfer, mark-notifications-read with rollback |
| Image auto-optimize on upload | ✅ | Canvas resize/JPEG compress client-side |

---

### Landing / marketing

| Feature | Status | Notes |
|---------|--------|-------|
| Hero + CTAs | ✅ | Headline, Launch app, grid + encrypted bricks |
| Problem section (public vs Anonym) | ✅ | Interactive compare cards |
| Animated walkthrough (mouse/clicks) | ✅ | Cursor motion + step UI |
| Features cards | ✅ | Animated feature grid |
| Privacy copy | ✅ | |
| FAQ | ✅ | |
| Animated blockchain particles | ✅ | Full canvas particle network + encrypted brick flanks |
| Product mock in hero | ✅ | Marketing illustration only |

---

### UI system

| Feature | Status | Notes |
|---------|--------|-------|
| Attio-inspired light theme | ✅ | |
| Dark theme | ✅ | Token-based `html.dark` |
| Framer Motion | 🟨 | Landing + some app motion; not every page transition |
| Skeleton loading | 🟨 | Dashboard, campaigns, profiles, etc. |
| Empty states | ✅ | |
| Toasts | ✅ | |
| Accessibility | 🟨 | Labels, focus rings; full a11y audit not done |
| Glassmorphism | 🟨 | Navbar blur only |

---

### Explicitly deferred (roadmap)

| Feature | Status |
|---------|--------|
| Zero-knowledge / shielded payments | 🟨 | Privacy module + animated iPhone demo; on-chain shielded flag off until circuits |
| Private balances | 🧭 |
| DAO treasury privacy | 🧭 |
| Payroll / memberships / subscriptions / grants | 🧭 |
| Encrypted messaging | 🧭 |
| Mobile apps | 🧭 |
| Monad mainnet | 🧭 Chain config swap |
| Startup team members / whitepaper / pitch deck fields | ✅ | Migration 05 + settings/onboarding/public profile |
| Landing iPhone ZK showcase | ✅ | Light/dark aware device frame |
| Landing use-cases / stats / roadmap / CTA | ✅ | New sections |

---

## What shipped recently (session changelog)

### Phase 1 - Scaffold & design
- Next.js app, Attio design tokens, shadcn-style UI primitives
- Logo mark (privacy aperture), landing sections, dark mode foundation

### Phase 2 - Live data (no mock store)
- Removed localStorage demo
- SIWE auth APIs + Supabase sessions
- Data repositories: users, campaigns, donations, transfers, notifications, private views
- On-chain send for donate / transfer / private-view unlock
- Migrations 01–03 (schema, storage buckets, triggers, realtime)

### Phase 3 - Stability & theme
- Fixed theme toggle (true light ↔ dark)
- Removed landing “Sign in”
- Fixed Next.js `global-error` client-manifest 500 (custom `global-error.tsx`, turbopack root, cache clear)
- Dark mode tokens + settings appearance control

### Phase 4 - Missing prompt features
- **Storage uploads** + optimize: avatars, logos, covers, campaign banners
- **Receive page** (`/app/receive`) with QR + copy links
- **Wallet balance** on dashboard (wagmi `useBalance`)
- **Notification badges** (sidebar + topbar, realtime unread count)
- **Onboarding / settings media** fields
- **Campaign images** on create + card/detail display
- **Public profile** cover/avatar/logo display
- **Private campaign link** copy
- **Middleware** session refresh
- Migration **04** private-view unlock notification trigger
- This **feature status** matrix

### Phase 5 - Edge routes, startup extras, landing + ZK demo
- **Next “edge” API routes**: `/api/edge/record-donation`, `record-transfer`, `health`
- **Startup extras**: team members, whitepaper URL, pitch deck (migration **05**)
- **Particle field** full-canvas background (theme-aware) + bricks
- **iPhone ZK demo** section with shielded send animation (light/dark)
- **Landing sections**: stats, use cases, roadmap, CTA band
- **Optimistic UI** on donate, transfer, notifications
- Expanded **privacy module** (`runShieldedDemo`, ZK step copy, feature flags)

---

## Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js App Router, React, TypeScript, Tailwind v4, Framer Motion, Lucide |
| Backend | Supabase (Auth sessions, Postgres, RLS, Realtime, Storage) |
| Wallet | wagmi + viem (Monad Testnet) |
| Auth | SIWE → Supabase session (`wallet_address` metadata) |

---

## Setup

### 1. Supabase project

1. Create project at [supabase.com/dashboard](https://supabase.com/dashboard)
2. Copy URL, anon key, service role key

### 2. Migrations (in order)

```text
supabase/migrations/00000000000001_init.sql
supabase/migrations/00000000000002_storage.sql
supabase/migrations/00000000000003_siwe_triggers_realtime.sql
supabase/migrations/00000000000004_private_view_notify.sql
supabase/migrations/00000000000005_startup_extras.sql
supabase/migrations/00000000000006_protocol_ledger.sql
```

SQL editor or: `supabase db push`

> **Required for protocol UI:** apply migration **06** so `protected_deposits` / `commitments` / `campaign_vaults` exist.

### 3. Env

```bash
cp .env.example .env.local
```

| Variable | Required | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Browser client |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | SIWE session issuance |
| `AUTH_WALLET_SECRET` | yes | HMAC for wallet auth |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | no | WalletConnect |
| `NEXT_PUBLIC_PRIVATE_VIEW_TREASURY` | for Private View pay | 1000 MON recipient |
| `NEXT_PUBLIC_TRANSFER_VAULT` | no | On-chain transfer vault (else ledger mode) |
| `NEXT_PUBLIC_ANONYM_VAULT` | no | Shared vault fallback |
| `NEXT_PUBLIC_CAMPAIGN_FACTORY` | no | Deploys per-campaign vaults |
| `NEXT_PUBLIC_RECIPIENT_RESOLVER` | no | On-chain username resolver (optional) |
| `NEXT_PUBLIC_PROTOCOL_TREASURY` | no | Hold address for ledger-mode deposits |

### 4. Run

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000

> **Node:** Supabase JS warns on Node 20. Prefer **Node 22+** when possible.

---

## App routes

| Route | Description |
|-------|-------------|
| `/` | Landing |
| `/app` | Dashboard · Protected Activity · claim UI |
| `/app/onboarding` | Account type, username, profile media |
| `/app/transfer` | Protected send to @username via vault |
| `/app/receive` | Profile share · claimable count (no public wallet) |
| `/app/campaigns` | Browse |
| `/app/campaigns/new` | Create (+ vault registration) |
| `/app/campaigns/[id]` | Donate Securely · owner vault withdraw |
| `/app/private-view` | Premium vault |
| `/app/notifications` | Alerts |
| `/app/settings` | Profile media + theme |
| `/anonym/@username` | Public profile |

---

## Architecture

```
src/
  app/api/auth/       # SIWE nonce / verify / logout
  middleware.ts       # Session cookie refresh
  services/
    data/             # Supabase repositories
    storage/          # Optimized uploads
    blockchain/       # Monad chain config / legacy helpers
    protocol/         # Relationship Privacy Protocol (vaults, ledger, commitments)
    privacy/          # ZK-ready transfer adapter
    supabase/         # clients + types
  contracts/src/      # AnonymVault, TransferVault, CampaignVault, Factory
  components/         # UI, landing, app shell
  providers/          # auth, theme, wagmi
```

### Relationship Privacy Protocol

**Rule:** no direct wallet → wallet value transfer in product flows.

| Flow | Path |
|------|------|
| Transfer | Sender deposits to **TransferVault** with `commitment = keccak256(recipient, salt)` → recipient **claims** from dashboard |
| Campaign donate | Sender **contributes** to **CampaignVault** → owner **withdraws** vault balance (not per-donation P2P) |
| Receive / public profile | Share `@username` only - **never** show receiving address |

**Modes**

1. **On-chain** - set `NEXT_PUBLIC_TRANSFER_VAULT` / `NEXT_PUBLIC_CAMPAIGN_FACTORY` after deploying `contracts/src/*`
2. **Ledger protocol** - same UI + `protected_deposits` / commitments in Supabase; settlement deferred or via optional `NEXT_PUBLIC_PROTOCOL_TREASURY`

Application ledger (`protected_deposits`) is the UX source of truth; vaults are chain settlement.

**Privacy boundary:** product code calls `services/protocol/vaults` - not raw `sendTransaction` to a peer wallet.

---

## Scripts

```bash
pnpm dev
pnpm build
pnpm start
pnpm lint
```

---

## Next recommended work

1. Deploy vault contracts to Monad Testnet and set env addresses  
2. Turn on `ZK_ENGINE.onChainShielded` when real circuits/contracts ship  
3. Rate limits / CAPTCHA on `/api/edge/*`  
4. Full page-transition motion + a11y audit  
5. Pin Node 22 in `engines` / CI
