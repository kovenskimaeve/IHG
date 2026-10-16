-- migration-3.sql
-- Run this once in the Supabase SQL Editor (Project -> SQL Editor -> New query -> paste -> Run).
-- Safe to re-run: every statement is idempotent (drop-then-create, or "if not exists").
--
-- What this fixes:
--   1. Guarantees discussion_posts + resource_requests are readable/insertable by
--      EVERYONE (not just the person who wrote a row) — this is the actual, current,
--      source-of-truth policy, replacing whatever policies exist on your live DB now
--      (the old schema.sql used "create policy if not exists", which is not valid
--      Postgres syntax and likely silently failed when you ran it, which is the most
--      likely reason things weren't behaving as public as intended).
--   2. Adds request_comments so people can reply to a resource request, not just vote.
--   3. Adds a dedicated, genuinely private `feedback` table: anyone can submit, but
--      NOBODY can read it back through the public API — only the /api/admin
--      serverless function (which uses the service-role key and bypasses RLS
--      entirely) can. Old feedback that was living inside resource_requests
--      (subject = 'Feedback') is moved over and removed from the public table.

create extension if not exists pgcrypto;

-- ============================================================
-- 1. discussion_posts / post_votes — fully public read+write
-- ============================================================
alter table discussion_posts enable row level security;
alter table post_votes enable row level security;

drop policy if exists "public read posts" on discussion_posts;
drop policy if exists "public insert posts" on discussion_posts;
drop policy if exists "public update posts" on discussion_posts;
create policy "public read posts" on discussion_posts for select using (true);
create policy "public insert posts" on discussion_posts for insert with check (true);
create policy "public update posts" on discussion_posts for update using (true) with check (true);
-- intentionally no delete policy: deletes only happen via /api/admin (service role)

drop policy if exists "public read votes" on post_votes;
drop policy if exists "public insert votes" on post_votes;
create policy "public read votes" on post_votes for select using (true);
create policy "public insert votes" on post_votes for insert with check (true);

-- ============================================================
-- 2. resource_requests — fully public read+write (feedback rows
--    are migrated out of here in step 4, so this table is 100% public)
-- ============================================================
alter table resource_requests enable row level security;

drop policy if exists "public read requests" on resource_requests;
drop policy if exists "public insert requests" on resource_requests;
drop policy if exists "public update requests" on resource_requests;
create policy "public read requests" on resource_requests for select using (true);
create policy "public insert requests" on resource_requests for insert with check (true);
create policy "public update requests" on resource_requests for update using (true) with check (true);

-- ============================================================
-- 3. request_comments — new table so Requests can be discussed, not just voted on
-- ============================================================
create table if not exists request_comments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references resource_requests(id) on delete cascade,
  author_name text not null default 'Anonymous',
  body text not null,
  created_at timestamptz not null default now()
);

alter table request_comments enable row level security;
drop policy if exists "public read request comments" on request_comments;
drop policy if exists "public insert request comments" on request_comments;
create policy "public read request comments" on request_comments for select using (true);
create policy "public insert request comments" on request_comments for insert with check (true);

-- ============================================================
-- 4. files / study_links — fully public read+write (unchanged, re-asserted)
-- ============================================================
alter table files enable row level security;
alter table study_links enable row level security;

drop policy if exists "public read files" on files;
drop policy if exists "public insert files" on files;
create policy "public read files" on files for select using (true);
create policy "public insert files" on files for insert with check (true);

drop policy if exists "public read study_links" on study_links;
drop policy if exists "public insert study_links" on study_links;
create policy "public read study_links" on study_links for select using (true);
create policy "public insert study_links" on study_links for insert with check (true);

-- ============================================================
-- 5. feedback — NEW, genuinely private table.
--    RLS is enabled with an INSERT policy only. With RLS on and no SELECT
--    policy, Postgres denies all reads to anon/authenticated by default —
--    only the service-role key (used exclusively by /api/admin) can read it.
-- ============================================================
create table if not exists feedback (
  id uuid primary key default gen_random_uuid(),
  message text not null,
  created_at timestamptz not null default now()
);

alter table feedback enable row level security;
drop policy if exists "public insert feedback" on feedback;
create policy "public insert feedback" on feedback for insert with check (true);
-- no select/update/delete policy on purpose — public has zero read access

-- Move any old feedback that was hiding inside resource_requests (and was
-- technically publicly readable there) into the private table, then remove it.
insert into feedback (message, created_at)
select description, created_at from resource_requests where subject = 'Feedback';

delete from resource_requests where subject = 'Feedback';

-- ============================================================
-- 6. Realtime — make sure live updates work on the tables the app subscribes to
-- ============================================================
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'discussion_posts'
  ) then
    alter publication supabase_realtime add table discussion_posts;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'resource_requests'
  ) then
    alter publication supabase_realtime add table resource_requests;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'request_comments'
  ) then
    alter publication supabase_realtime add table request_comments;
  end if;
end $$;
