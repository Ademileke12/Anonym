-- Anonym - initial schema
-- Privacy-first payments + fundraising on Monad.
--
-- Auth is wallet-only (SIWE). We map an authenticated wallet to a Supabase
-- session; `auth.jwt() ->> 'wallet_address'` carries the lowercased address.
-- RLS is enabled on every table; policies key off the session wallet.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- Lowercased wallet address of the current session, or null.
create or replace function public.current_wallet()
returns text
language sql
stable
as $$
  select lower(nullif(auth.jwt() ->> 'wallet_address', ''));
$$;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.account_type as enum ('regular', 'startup');

create type public.campaign_status as enum ('draft', 'active', 'ended', 'completed');

create type public.campaign_visibility as enum ('public', 'private');

create type public.notification_type as enum (
  'donation_received',
  'campaign_completed',
  'transfer_received',
  'goal_reached',
  'private_view_unlocked'
);

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------

create table public.users (
  id uuid primary key default gen_random_uuid(),
  wallet_address text not null unique,
  username text not null unique,
  display_name text,
  bio text,
  avatar_url text,
  cover_image text,
  account_type public.account_type not null default 'regular',
  monad_receiving_address text,
  country text,
  website text,
  created_at timestamptz not null default now(),
  constraint username_format check (username ~ '^[a-z0-9_]{3,30}$'),
  constraint wallet_lowercase check (wallet_address = lower(wallet_address))
);

create index users_wallet_idx on public.users (wallet_address);
create index users_username_idx on public.users (username);

alter table public.users enable row level security;

-- Public profiles are readable by anyone.
create policy "users are publicly readable"
  on public.users for select
  using (true);

-- A wallet can create only its own row.
create policy "users insert own"
  on public.users for insert
  with check (wallet_address = public.current_wallet());

create policy "users update own"
  on public.users for update
  using (wallet_address = public.current_wallet())
  with check (wallet_address = public.current_wallet());

-- ---------------------------------------------------------------------------
-- startups
-- ---------------------------------------------------------------------------

create table public.startups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  startup_name text not null,
  logo text,
  description text,
  mission text,
  category text,
  website text,
  created_at timestamptz not null default now(),
  unique (user_id)
);

create index startups_user_idx on public.startups (user_id);

alter table public.startups enable row level security;

create policy "startups are publicly readable"
  on public.startups for select
  using (true);

create policy "startups managed by owner"
  on public.startups for all
  using (
    exists (
      select 1 from public.users u
      where u.id = startups.user_id
        and u.wallet_address = public.current_wallet()
    )
  )
  with check (
    exists (
      select 1 from public.users u
      where u.id = startups.user_id
        and u.wallet_address = public.current_wallet()
    )
  );

-- ---------------------------------------------------------------------------
-- socials
-- ---------------------------------------------------------------------------

create table public.socials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  platform text not null,
  url text not null
);

create index socials_user_idx on public.socials (user_id);

alter table public.socials enable row level security;

create policy "socials are publicly readable"
  on public.socials for select
  using (true);

create policy "socials managed by owner"
  on public.socials for all
  using (
    exists (
      select 1 from public.users u
      where u.id = socials.user_id
        and u.wallet_address = public.current_wallet()
    )
  )
  with check (
    exists (
      select 1 from public.users u
      where u.id = socials.user_id
        and u.wallet_address = public.current_wallet()
    )
  );

-- ---------------------------------------------------------------------------
-- campaigns
-- ---------------------------------------------------------------------------

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users (id) on delete cascade,
  title text not null,
  description text,
  reason text,
  category text,
  goal_amount numeric(38, 18) not null check (goal_amount > 0),
  amount_raised numeric(38, 18) not null default 0 check (amount_raised >= 0),
  deadline timestamptz,
  monad_receiving_address text,
  banner_image text,
  featured_image text,
  status public.campaign_status not null default 'active',
  visibility public.campaign_visibility not null default 'public',
  created_at timestamptz not null default now()
);

create index campaigns_owner_idx on public.campaigns (owner_id);
create index campaigns_status_idx on public.campaigns (status);

alter table public.campaigns enable row level security;

-- Public campaigns readable by all; private/others' still readable by owner.
create policy "public campaigns are readable"
  on public.campaigns for select
  using (
    visibility = 'public'
    or exists (
      select 1 from public.users u
      where u.id = campaigns.owner_id
        and u.wallet_address = public.current_wallet()
    )
  );

create policy "campaigns managed by owner"
  on public.campaigns for all
  using (
    exists (
      select 1 from public.users u
      where u.id = campaigns.owner_id
        and u.wallet_address = public.current_wallet()
    )
  )
  with check (
    exists (
      select 1 from public.users u
      where u.id = campaigns.owner_id
        and u.wallet_address = public.current_wallet()
    )
  );

-- ---------------------------------------------------------------------------
-- donations
-- ---------------------------------------------------------------------------

create table public.donations (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  sender_wallet text,
  recipient_wallet text,
  amount numeric(38, 18) not null check (amount > 0),
  message text,
  anonymous boolean not null default true,
  tx_hash text unique,
  created_at timestamptz not null default now()
);

create index donations_campaign_idx on public.donations (campaign_id);
create index donations_recipient_idx on public.donations (recipient_wallet);

alter table public.donations enable row level security;

-- Non-anonymous donations are publicly readable (for supporter lists).
-- Anonymous donations are visible only to sender or recipient.
create policy "donations read"
  on public.donations for select
  using (
    anonymous = false
    or sender_wallet = public.current_wallet()
    or recipient_wallet = public.current_wallet()
  );

-- A donor records their own donation (sender must be the session wallet).
create policy "donations insert by sender"
  on public.donations for insert
  with check (sender_wallet = public.current_wallet());

-- ---------------------------------------------------------------------------
-- transfers
-- ---------------------------------------------------------------------------

create table public.transfers (
  id uuid primary key default gen_random_uuid(),
  sender_wallet text not null,
  receiver_wallet text not null,
  amount numeric(38, 18) not null check (amount > 0),
  token text not null default 'MON',
  note text,
  tx_hash text unique,
  created_at timestamptz not null default now()
);

create index transfers_sender_idx on public.transfers (sender_wallet);
create index transfers_receiver_idx on public.transfers (receiver_wallet);

alter table public.transfers enable row level security;

-- Only the two parties can read a transfer (private by default).
create policy "transfers read by parties"
  on public.transfers for select
  using (
    sender_wallet = public.current_wallet()
    or receiver_wallet = public.current_wallet()
  );

create policy "transfers insert by sender"
  on public.transfers for insert
  with check (sender_wallet = public.current_wallet());

-- ---------------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------------

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  type public.notification_type not null,
  title text not null,
  body text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index notifications_user_idx on public.notifications (user_id, read);

alter table public.notifications enable row level security;

create policy "notifications read own"
  on public.notifications for select
  using (
    exists (
      select 1 from public.users u
      where u.id = notifications.user_id
        and u.wallet_address = public.current_wallet()
    )
  );

create policy "notifications update own"
  on public.notifications for update
  using (
    exists (
      select 1 from public.users u
      where u.id = notifications.user_id
        and u.wallet_address = public.current_wallet()
    )
  )
  with check (
    exists (
      select 1 from public.users u
      where u.id = notifications.user_id
        and u.wallet_address = public.current_wallet()
    )
  );

-- ---------------------------------------------------------------------------
-- private_views  (premium "Private View" / Reveal Vault unlocks)
-- ---------------------------------------------------------------------------

create table public.private_views (
  id uuid primary key default gen_random_uuid(),
  wallet text not null,
  tx_hash text unique,
  unlocked_at timestamptz not null default now(),
  expires_at timestamptz
);

create index private_views_wallet_idx on public.private_views (wallet);

alter table public.private_views enable row level security;

create policy "private views read own"
  on public.private_views for select
  using (wallet = public.current_wallet());

create policy "private views insert own"
  on public.private_views for insert
  with check (wallet = public.current_wallet());
