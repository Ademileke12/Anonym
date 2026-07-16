-- SIWE nonces, wallet claim resolution, automation triggers, realtime.

-- ---------------------------------------------------------------------------
-- current_wallet: support custom claim + user_metadata from SIWE sessions
-- ---------------------------------------------------------------------------

create or replace function public.current_wallet()
returns text
language sql
stable
as $$
  select lower(nullif(coalesce(
    auth.jwt() ->> 'wallet_address',
    auth.jwt() -> 'user_metadata' ->> 'wallet_address',
    auth.jwt() -> 'app_metadata' ->> 'wallet_address'
  ), ''));
$$;

-- ---------------------------------------------------------------------------
-- SIWE nonces (server-only via service role; no public policies)
-- ---------------------------------------------------------------------------

create table public.auth_nonces (
  address text primary key,
  nonce text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.auth_nonces enable row level security;
-- No policies: only service role (bypasses RLS) may read/write.

-- ---------------------------------------------------------------------------
-- Notifications: allow insert via security definer triggers only
-- ---------------------------------------------------------------------------

create or replace function public.notify_user(
  p_user_id uuid,
  p_type public.notification_type,
  p_title text,
  p_body text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null then
    return;
  end if;
  insert into public.notifications (user_id, type, title, body)
  values (p_user_id, p_type, p_title, p_body);
end;
$$;

-- ---------------------------------------------------------------------------
-- On donation: bump amount_raised, complete campaign, notify owner
-- ---------------------------------------------------------------------------

create or replace function public.on_donation_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid;
  v_goal numeric;
  v_raised numeric;
  v_title text;
  v_status public.campaign_status;
begin
  update public.campaigns
  set amount_raised = amount_raised + new.amount
  where id = new.campaign_id
  returning owner_id, goal_amount, amount_raised, title, status
  into v_owner_id, v_goal, v_raised, v_title, v_status;

  if v_owner_id is not null then
    perform public.notify_user(
      v_owner_id,
      'donation_received',
      'Donation received',
      case
        when new.anonymous then format('Anonymous support of %s MON on "%s"', new.amount, v_title)
        else format('Support of %s MON on "%s"', new.amount, v_title)
      end
    );

    if v_raised >= v_goal and v_status in ('active', 'draft') then
      update public.campaigns
      set status = 'completed'
      where id = new.campaign_id;

      perform public.notify_user(
        v_owner_id,
        'goal_reached',
        'Funding goal reached',
        format('"%s" hit its goal of %s MON', v_title, v_goal)
      );
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_donation_insert on public.donations;
create trigger trg_donation_insert
  after insert on public.donations
  for each row execute function public.on_donation_insert();

-- ---------------------------------------------------------------------------
-- On transfer: notify recipient user if they have a profile
-- ---------------------------------------------------------------------------

create or replace function public.on_transfer_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  select id into v_user_id
  from public.users
  where wallet_address = lower(new.receiver_wallet)
  limit 1;

  if v_user_id is not null then
    perform public.notify_user(
      v_user_id,
      'transfer_received',
      'Transfer received',
      format('%s %s received', new.amount, coalesce(new.token, 'MON'))
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_transfer_insert on public.transfers;
create trigger trg_transfer_insert
  after insert on public.transfers
  for each row execute function public.on_transfer_insert();

-- ---------------------------------------------------------------------------
-- Expire active campaigns past deadline (callable / also on read helpers)
-- ---------------------------------------------------------------------------

create or replace function public.close_expired_campaigns()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.campaigns
  set status = 'ended'
  where status = 'active'
    and deadline is not null
    and deadline < now();
end;
$$;

-- Auto-close on donation attempt / select via trigger before insert donation check
create or replace function public.guard_active_campaign()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status public.campaign_status;
  v_deadline timestamptz;
begin
  perform public.close_expired_campaigns();

  select status, deadline into v_status, v_deadline
  from public.campaigns
  where id = new.campaign_id;

  if v_status is null then
    raise exception 'Campaign not found';
  end if;

  if v_status <> 'active' then
    raise exception 'Campaign is not accepting donations';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_donation_guard on public.donations;
create trigger trg_donation_guard
  before insert on public.donations
  for each row execute function public.guard_active_campaign();

-- ---------------------------------------------------------------------------
-- Realtime publication
-- ---------------------------------------------------------------------------

do $$
begin
  begin
    alter publication supabase_realtime add table public.campaigns;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.donations;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.transfers;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.notifications;
  exception when duplicate_object then null;
  end;
end $$;
