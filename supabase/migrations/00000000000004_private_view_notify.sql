-- Notify user when Private View is unlocked
create or replace function public.on_private_view_insert()
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
  where wallet_address = lower(new.wallet)
  limit 1;

  if v_user_id is not null then
    perform public.notify_user(
      v_user_id,
      'private_view_unlocked',
      'Private View unlocked',
      'Your Reveal Vault is active. Incoming private payments are visible.'
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_private_view_insert on public.private_views;
create trigger trg_private_view_insert
  after insert on public.private_views
  for each row execute function public.on_private_view_insert();
