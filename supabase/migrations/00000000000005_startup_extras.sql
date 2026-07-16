-- Optional startup fields: team, whitepaper, pitch deck

alter table public.startups
  add column if not exists whitepaper_url text,
  add column if not exists pitch_deck_url text,
  add column if not exists team_members jsonb not null default '[]'::jsonb;

comment on column public.startups.team_members is
  'JSON array of { name, role, avatar_url?, social_url? }';
comment on column public.startups.whitepaper_url is 'Public URL to whitepaper PDF/docs';
comment on column public.startups.pitch_deck_url is 'Public URL to pitch deck';
