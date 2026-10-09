-- migration-8.sql
-- Run once in the Supabase SQL Editor. Safe to re-run.
--
-- Powers the "Trending this week" tile on the Past Papers hub. files.download_count
-- is a lifetime total, so it can't answer "most downloaded in the last 7 days".
-- This logs one row per download instead. Only /api/download (service role) ever
-- writes to it; the public can only read it, never insert fake events.

create table if not exists download_events (
  id uuid primary key default gen_random_uuid(),
  file_id uuid not null references files(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists download_events_created_idx on download_events (created_at desc);

alter table download_events enable row level security;
drop policy if exists "public read download events" on download_events;
create policy "public read download events" on download_events for select using (true);
-- no insert/update/delete policy on purpose
