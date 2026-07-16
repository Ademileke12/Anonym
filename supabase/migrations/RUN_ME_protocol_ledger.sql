-- Anonym Relationship Privacy Protocol - internal ledger
-- Source of truth for UX; vault contracts are chain settlement.
--
-- Safe to re-run: uses IF NOT EXISTS / exception guards.
-- Do NOT paste migrations 01–05 here - only this file.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

do $$ begin
  create type public.protected_status as enum (
    'pending',
    'claimable',
    'claimed',
    'withdrawn',
    'cancelled'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.protected_kind as enum (
    'transfer',
    'donation',
    'campaign_withdraw'
  );
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- commitments (cryptographic placeholders for ZK)
-- ---------------------------------------------------------------------------

create table if not exists public.commitments (
  id uuid primary key default gen_random_uuid(),
  commitment_hash text not null unique,
  nullifier_placeholder text,
  vault_address text,
  amount numeric(38, 18) not null check (amount > 0),
  token text not null default 'MON',
  status public.protected_status not null default 'pending',
  created_at timestamptz not null default now()
);

create index if not exists commitments_hash_idx
  on public.commitments (commitment_hash);

alter table public.commitments enable row level security;

drop policy if exists "commitments insert auth" on public.commitments;
create policy "commitments insert auth"
  on public.commitments for insert
  with check (public.current_wallet() is not null);

drop policy if exists "commitments read all auth" on public.commitments;
create policy "commitments read all auth"
  on public.commitments for select
  using (public.current_wallet() is not null);

drop policy if exists "commitments update auth" on public.commitments;
create policy "commitments update auth"
  on public.commitments for update
  using (public.current_wallet() is not null);

-- ---------------------------------------------------------------------------
-- protected_deposits - application ledger
-- ---------------------------------------------------------------------------

create table if not exists public.protected_deposits (
  id uuid primary key default gen_random_uuid(),
  kind public.protected_kind not null,
  commitment_id uuid references public.commitments (id) on delete set null,
  commitment_hash text not null,
  salt text not null,
  vault_address text,
  on_chain_deposit_id text,
  tx_hash text,
  claim_tx_hash text,
  campaign_id uuid references public.campaigns (id) on delete set null,
  sender_user_id uuid references public.users (id) on delete set null,
  sender_wallet text,
  recipient_user_id uuid references public.users (id) on delete set null,
  recipient_wallet text not null,
  anonymous boolean not null default true,
  amount numeric(38, 18) not null check (amount > 0),
  token text not null default 'MON',
  message text,
  status public.protected_status not null default 'claimable',
  created_at timestamptz not null default now(),
  claimed_at timestamptz
);

create index if not exists protected_deposits_recipient_idx
  on public.protected_deposits (recipient_wallet, status);
create index if not exists protected_deposits_sender_idx
  on public.protected_deposits (sender_wallet);
create index if not exists protected_deposits_campaign_idx
  on public.protected_deposits (campaign_id);
create index if not exists protected_deposits_recipient_user_idx
  on public.protected_deposits (recipient_user_id, status);

alter table public.protected_deposits enable row level security;

drop policy if exists "protected deposits insert sender" on public.protected_deposits;
create policy "protected deposits insert sender"
  on public.protected_deposits for insert
  with check (
    sender_wallet = public.current_wallet()
    or public.current_wallet() is not null
  );

drop policy if exists "protected deposits read parties" on public.protected_deposits;
create policy "protected deposits read parties"
  on public.protected_deposits for select
  using (
    sender_wallet = public.current_wallet()
    or recipient_wallet = public.current_wallet()
    or exists (
      select 1 from public.users u
      where u.id = protected_deposits.recipient_user_id
        and u.wallet_address = public.current_wallet()
    )
    or exists (
      select 1 from public.users u
      where u.id = protected_deposits.sender_user_id
        and u.wallet_address = public.current_wallet()
    )
  );

drop policy if exists "protected deposits update recipient" on public.protected_deposits;
create policy "protected deposits update recipient"
  on public.protected_deposits for update
  using (
    recipient_wallet = public.current_wallet()
    or exists (
      select 1 from public.users u
      where u.id = protected_deposits.recipient_user_id
        and u.wallet_address = public.current_wallet()
    )
    or sender_wallet = public.current_wallet()
  );

-- ---------------------------------------------------------------------------
-- campaign_vaults - map campaign → vault address
-- ---------------------------------------------------------------------------

create table if not exists public.campaign_vaults (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null unique references public.campaigns (id) on delete cascade,
  vault_address text not null,
  owner_wallet text not null,
  created_tx_hash text,
  created_at timestamptz not null default now()
);

alter table public.campaign_vaults enable row level security;

drop policy if exists "campaign vaults public read" on public.campaign_vaults;
create policy "campaign vaults public read"
  on public.campaign_vaults for select
  using (true);

drop policy if exists "campaign vaults insert owner" on public.campaign_vaults;
create policy "campaign vaults insert owner"
  on public.campaign_vaults for insert
  with check (
    owner_wallet = public.current_wallet()
    or exists (
      select 1 from public.campaigns c
      join public.users u on u.id = c.owner_id
      where c.id = campaign_vaults.campaign_id
        and u.wallet_address = public.current_wallet()
    )
  );

-- ---------------------------------------------------------------------------
-- Extend campaigns
-- ---------------------------------------------------------------------------

alter table public.campaigns
  add column if not exists vault_address text,
  add column if not exists protocol_mode boolean not null default true;

-- ---------------------------------------------------------------------------
-- Notify recipient on protected deposit
-- ---------------------------------------------------------------------------

create or replace function public.on_protected_deposit_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  v_user_id := new.recipient_user_id;
  if v_user_id is null then
    select id into v_user_id from public.users
    where wallet_address = lower(new.recipient_wallet) limit 1;
  end if;

  if v_user_id is not null and new.kind = 'transfer' then
    perform public.notify_user(
      v_user_id,
      'transfer_received',
      'Protected transfer available',
      format('You have a protected transfer of %s %s. Claim it from your dashboard.', new.amount, new.token)
    );
  end if;

  if new.kind = 'donation' and new.campaign_id is not null then
    update public.campaigns
    set amount_raised = amount_raised + new.amount
    where id = new.campaign_id;

    select owner_id into v_user_id from public.campaigns where id = new.campaign_id;
    if v_user_id is not null then
      perform public.notify_user(
        v_user_id,
        'donation_received',
        'Protected contribution received',
        format('New protected contribution of %s %s. Campaign total updated.', new.amount, new.token)
      );
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_protected_deposit_insert on public.protected_deposits;
create trigger trg_protected_deposit_insert
  after insert on public.protected_deposits
  for each row execute function public.on_protected_deposit_insert();

-- Realtime
do $$
begin
  begin
    alter publication supabase_realtime add table public.protected_deposits;
  exception when duplicate_object then null;
  end;
end $$;
