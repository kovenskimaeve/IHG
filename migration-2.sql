-- Run this in Supabase SQL Editor. Safe to run once — adds only what's new.

create table if not exists study_links (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  url text not null,
  added_by text not null default 'Anonymous',
  created_at timestamptz not null default now()
);
alter table study_links enable row level security;
drop policy if exists "public read study_links" on study_links;
create policy "public read study_links" on study_links for select using (true);
drop policy if exists "public insert study_links" on study_links;
create policy "public insert study_links" on study_links for insert with check (true);

alter table resource_requests add column if not exists downvotes integer not null default 0;
