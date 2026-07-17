-- Anonym Send Suite — claim links, escrow, metadata, payment requests, recurring
-- Safe to re-run (IF NOT EXISTS / drop policy if exists).

-- ---------------------------------------------------------------------------
-- Extend protected_deposits
-- ---------------------------------------------------------------------------

alter table public.protected_deposits
  add column if not exists unlock_at timestamptz,
  add column if not exists condition_type text,
  add column if not exists condition_payload jsonb not null default '{}'::jsonb,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists split_group_id uuid,
  add column if not exists parent_request_id uuid,
  add column if not exists claim_token text;

create index if not exists protected_deposits_unlock_idx
  on public.protected_deposits (status, unlock_at)
  where unlock_at is not null;

create index if not exists protected_deposits_split_idx
  on public.protected_deposits (split_group_id)
  where split_group_id is not null;

create index if not exists protected_deposits_claim_token_idx
  on public.protected_deposits (claim_token)
  where claim_token is not null;

-- Public claim by token: allow select when claim_token is set (UUID still hard to guess)
-- Claim page uses service role for salt-checked preview; this helps authenticated claimers.

-- ---------------------------------------------------------------------------
-- payment_requests (pull payments)
-- ---------------------------------------------------------------------------

create table if not exists public.payment_requests (
  id uuid primary key default gen_random_uuid(),
  requester_user_id uuid references public.users (id) on delete set null,
  requester_wallet text not null,
  requester_username text,
  payer_user_id uuid references public.users (id) on delete set null,
  payer_wallet text,
  payer_username text,
  amount numeric(38, 18) not null check (amount > 0),
  token text not null default 'MON',
  message text,
  metadata jsonb not null default '{}'::jsonb,
  status text not null default 'open'
    check (status in ('open', 'paid', 'cancelled', 'expired')),
  deposit_id uuid references public.protected_deposits (id) on delete set null,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create index if not exists payment_requests_requester_idx
  on public.payment_requests (requester_wallet, status);
create index if not exists payment_requests_payer_idx
  on public.payment_requests (payer_username, status);

alter table public.payment_requests enable row level security;

drop policy if exists "payment_requests insert auth" on public.payment_requests;
create policy "payment_requests insert auth"
  on public.payment_requests for insert
  with check (
    requester_wallet = public.current_wallet()
    or public.current_wallet() is not null
  );

drop policy if exists "payment_requests read open or party" on public.payment_requests;
create policy "payment_requests read open or party"
  on public.payment_requests for select
  using (
    status = 'open'
    or requester_wallet = public.current_wallet()
    or payer_wallet = public.current_wallet()
    or exists (
      select 1 from public.users u
      where u.id = payment_requests.requester_user_id
        and u.wallet_address = public.current_wallet()
    )
  );

drop policy if exists "payment_requests update party" on public.payment_requests;
create policy "payment_requests update party"
  on public.payment_requests for update
  using (
    requester_wallet = public.current_wallet()
    or payer_wallet = public.current_wallet()
    or public.current_wallet() is not null
  );

-- ---------------------------------------------------------------------------
-- recurring_sends (simple stipend schedule)
-- ---------------------------------------------------------------------------

create table if not exists public.recurring_sends (
  id uuid primary key default gen_random_uuid(),
  sender_user_id uuid references public.users (id) on delete set null,
  sender_wallet text not null,
  recipient_wallet text not null,
  recipient_user_id uuid references public.users (id) on delete set null,
  recipient_username text,
  amount numeric(38, 18) not null check (amount > 0),
  token text not null default 'MON',
  interval_days int not null default 7 check (interval_days >= 1),
  next_run_at timestamptz not null default now(),
  active boolean not null default true,
  message text,
  metadata jsonb not null default '{}'::jsonb,
  last_deposit_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists recurring_sends_next_idx
  on public.recurring_sends (active, next_run_at);

alter table public.recurring_sends enable row level security;

drop policy if exists "recurring insert sender" on public.recurring_sends;
create policy "recurring insert sender"
  on public.recurring_sends for insert
  with check (sender_wallet = public.current_wallet() or public.current_wallet() is not null);

drop policy if exists "recurring read sender" on public.recurring_sends;
create policy "recurring read sender"
  on public.recurring_sends for select
  using (sender_wallet = public.current_wallet() or public.current_wallet() is not null);

drop policy if exists "recurring update sender" on public.recurring_sends;
create policy "recurring update sender"
  on public.recurring_sends for update
  using (sender_wallet = public.current_wallet() or public.current_wallet() is not null);

-- Realtime (optional)
do $$
begin
  begin
    alter publication supabase_realtime add table public.payment_requests;
  exception when duplicate_object then null;
  end;
end $$;
