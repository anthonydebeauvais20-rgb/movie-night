-- Applied to the project on 2026-10-27 (Supabase migration "client_errors").

-- Errors met by visitors' browsers, so problems are seen without waiting for someone to report them.
-- No account id, no IP: only what helps fix the bug. Kept 30 days.
create table public.client_errors (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  kind text not null check (kind in ('crash', 'error', 'promise', 'draw')),
  message text not null check (char_length(message) <= 1000),
  stack text check (char_length(stack) <= 4000),
  page text check (char_length(page) <= 200),
  app_version text check (char_length(app_version) <= 64),
  user_agent text check (char_length(user_agent) <= 300),
  signed_in boolean not null default false
);
create index client_errors_created_at on public.client_errors (created_at);

alter table public.client_errors enable row level security;
-- Anyone may report; nobody can read back through the API (only the project owner, from the dashboard).
create policy "Anyone can report an error" on public.client_errors
  for insert to anon, authenticated with check (true);
revoke all on public.client_errors from anon, authenticated;
grant insert on public.client_errors to anon, authenticated;

-- A runaway loop (or someone flooding the table) cannot fill the database: beyond 200 reports in
-- 10 minutes, further ones are silently dropped.
create function public.client_errors_throttle() returns trigger
  language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.client_errors where created_at > now() - interval '10 minutes') >= 200 then
    return null;
  end if;
  return new;
end $$;
revoke execute on function public.client_errors_throttle() from public, anon, authenticated;
create trigger client_errors_throttle before insert on public.client_errors
  for each row execute function public.client_errors_throttle();

create extension if not exists pg_cron;
select cron.schedule('purge-client-errors', '17 3 * * *',
  $$delete from public.client_errors where created_at < now() - interval '30 days'$$);
