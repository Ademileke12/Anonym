-- Anonym - storage buckets for user-uploaded media.
-- Public-read buckets; writes restricted to the authenticated wallet session.

insert into storage.buckets (id, name, public)
values
  ('avatars', 'avatars', true),
  ('logos', 'logos', true),
  ('banners', 'banners', true),
  ('covers', 'covers', true)
on conflict (id) do nothing;

-- Anyone can read public media.
create policy "public media is readable"
  on storage.objects for select
  using (bucket_id in ('avatars', 'logos', 'banners', 'covers'));

-- Authenticated wallet sessions can upload/manage media.
create policy "authenticated can upload media"
  on storage.objects for insert
  with check (
    bucket_id in ('avatars', 'logos', 'banners', 'covers')
    and public.current_wallet() is not null
  );

create policy "authenticated can update own media"
  on storage.objects for update
  using (
    bucket_id in ('avatars', 'logos', 'banners', 'covers')
    and public.current_wallet() is not null
  );

create policy "authenticated can delete own media"
  on storage.objects for delete
  using (
    bucket_id in ('avatars', 'logos', 'banners', 'covers')
    and public.current_wallet() is not null
  );
