-- Applied to the project on 2026-10-13 (Supabase migration "library_and_user_state").

-- One row per title in one of a user's lists. Removing a title keeps a "deleted" row (tombstone) so the
-- removal reaches the user's other devices instead of being undone by them.
create table public.library_items (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  list text not null check (list in ('seen', 'watchlist', 'ignored')),
  media_type text not null check (media_type in ('movie', 'tv')),
  tmdb_id integer not null check (tmdb_id > 0),
  title text not null check (char_length(title) <= 500),
  poster_path text check (char_length(poster_path) <= 200),
  year text not null default '' check (char_length(year) <= 10),
  date_added timestamptz not null,
  rating smallint check (rating between 1 and 10),
  comment text not null default '' check (char_length(comment) <= 5000),
  favorite boolean not null default false,
  deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, list, media_type, tmdb_id)
);

-- Settings that follow the account (country, platforms, filters) and the recent draws.
create table public.user_state (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  settings jsonb not null default '{}'::jsonb check (pg_column_size(settings) <= 20000),
  history jsonb not null default '[]'::jsonb check (pg_column_size(history) <= 50000),
  updated_at timestamptz not null default now()
);

alter table public.library_items enable row level security;
alter table public.user_state enable row level security;

create policy "Own library items" on public.library_items
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Own state" on public.user_state
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Visitors who are not signed in get nothing at all.
revoke all on public.library_items, public.user_state from anon;
grant select, insert, update, delete on public.library_items, public.user_state to authenticated;
