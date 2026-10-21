-- ============================================================================
-- ISF HOLY GRAIL: FULL DATABASE RESTORE (steps 1 to 9, rebuilt in the right order)
-- Paste this WHOLE file into Supabase -> SQL Editor -> New query -> Run.
-- Safe to re-run. It does NOT include migration-10 (the lockdown): do that
-- later, once the site works. See the guide.
-- ============================================================================

-- 0. The storage bucket for uploaded PDFs (the old SQL never created it; you made it by hand)
insert into storage.buckets (id, name, public)
values ('papers', 'papers', true)
on conflict (id) do nothing;


-- ################################################################
-- FROM: supabase/schema.sql
-- ################################################################
-- Full schema for reference. Your live database already has most of this —
-- see migration-2.sql for just the NEW pieces to actually run.

create extension if not exists pgcrypto;

create table if not exists files (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('past_paper','lesson_slide','study_guide')),
  grade text not null,
  subject text not null,
  title text not null,
  file_url text not null,
  file_hash text not null unique,
  uploader_name text not null default 'Anonymous',
  made_by_student boolean not null default true,
  download_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists discussion_posts (
  id uuid primary key default gen_random_uuid(),
  channel text not null default 'General',
  parent_id uuid references discussion_posts(id) on delete cascade,
  author_name text not null default 'Anonymous',
  body text not null,
  upvotes integer not null default 0,
  downvotes integer not null default 0,
  flag_count integer not null default 0,
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists post_votes (
  post_id uuid references discussion_posts(id) on delete cascade,
  device_id text not null,
  vote smallint not null,
  primary key (post_id, device_id)
);

create table if not exists resource_requests (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  description text not null,
  upvotes integer not null default 0,
  downvotes integer not null default 0,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create table if not exists study_links (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  url text not null,
  added_by text not null default 'Anonymous',
  created_at timestamptz not null default now()
);

alter table files enable row level security;
alter table discussion_posts enable row level security;
alter table post_votes enable row level security;
alter table resource_requests enable row level security;
alter table study_links enable row level security;

drop policy if exists "public read files" on files;
create policy "public read files" on files for select using (true);
drop policy if exists "public insert files" on files;
create policy "public insert files" on files for insert with check (true);

drop policy if exists "public read posts" on discussion_posts;
create policy "public read posts" on discussion_posts for select using (true);
drop policy if exists "public insert posts" on discussion_posts;
create policy "public insert posts" on discussion_posts for insert with check (true);
drop policy if exists "public update posts" on discussion_posts;
create policy "public update posts" on discussion_posts for update using (true) with check (true);

drop policy if exists "public read votes" on post_votes;
create policy "public read votes" on post_votes for select using (true);
drop policy if exists "public insert votes" on post_votes;
create policy "public insert votes" on post_votes for insert with check (true);

drop policy if exists "public read requests" on resource_requests;
create policy "public read requests" on resource_requests for select using (true);
drop policy if exists "public insert requests" on resource_requests;
create policy "public insert requests" on resource_requests for insert with check (true);
drop policy if exists "public update requests" on resource_requests;
create policy "public update requests" on resource_requests for update using (true) with check (true);

drop policy if exists "public read study_links" on study_links;
create policy "public read study_links" on study_links for select using (true);
drop policy if exists "public insert study_links" on study_links;
create policy "public insert study_links" on study_links for insert with check (true);

insert into discussion_posts (channel, author_name, body)
select 'General', 'ISF Holy Grail', 'Welcome! Ask questions, share answers with your own working, and keep it kind.'
where not exists (select 1 from discussion_posts where channel = 'General' and author_name = 'ISF Holy Grail');

-- Note: adding discussion_posts to the supabase_realtime publication is
-- handled safely (idempotently) in migration-3.sql, not here.


-- ################################################################
-- FROM: supabase/migration-2.sql
-- ################################################################
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


-- ################################################################
-- FROM: supabase/migration-3.sql
-- ################################################################
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


-- ################################################################
-- FROM: supabase/migration-4.sql
-- ################################################################
-- migration-4.sql
-- Run this once in the Supabase SQL Editor. Safe to re-run.
--
-- Adds grade-level differentiation to Discussions: a nullable `grade` column
-- so posts can be tagged with the poster's grade and filtered by it.
-- Nullable (not required) so existing posts aren't broken by this change —
-- they just show up under "All grades" until/unless you backfill them.

alter table discussion_posts add column if not exists grade text;

-- No RLS changes needed: the existing "public read/insert/update" policies
-- on discussion_posts already cover this new column.


-- ################################################################
-- FROM: supabase/migration-5.sql
-- ################################################################
-- migration-5.sql
-- Run this once in the Supabase SQL Editor. Safe to re-run.
--
-- Adds a table of one-time beta invite codes for the closed testing phase.
-- Unlike every other table in this app, this one has NO public policies at
-- all -- not even insert. RLS is enabled with zero policies, which means
-- Postgres denies every anon/authenticated request by default. Only the
-- service-role key (used exclusively by api/beta-access.js and api/admin.js,
-- both server-side) can read or write it. This is deliberate: these codes
-- must never be listable or guessable through the public API.

create extension if not exists pgcrypto;

create table if not exists beta_invites (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  label text,
  used_at timestamptz,
  used_note text,
  created_at timestamptz not null default now()
);

alter table beta_invites enable row level security;
-- No policies added on purpose -- see comment above.


-- ################################################################
-- FROM: supabase/migration-6.sql
-- ################################################################
-- migration-6.sql
-- Run this once in the Supabase SQL Editor. Safe to re-run.
--
-- Supabase Realtime only streams changes for tables explicitly added to the
-- supabase_realtime publication. discussion_posts, resource_requests, and
-- request_comments were already added (migration-3/4). This adds the two
-- that were missing -- files and study_links -- so that Browse, Lesson
-- Slides, Study Links, and the Home page's live counts actually update
-- without a manual refresh, which they were silently not doing before this.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'files'
  ) then
    alter publication supabase_realtime add table files;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'study_links'
  ) then
    alter publication supabase_realtime add table study_links;
  end if;
end $$;


-- ################################################################
-- FROM: supabase/migration-7.sql
-- ################################################################
-- migration-7.sql
-- Run this once in the Supabase SQL Editor. Safe to re-run.

-- ============================================================
-- 1. FIX: uploads failing with "new row violates row-level security policy"
-- ============================================================
-- Toggling a bucket "Public" in the Supabase dashboard only grants public
-- READ access. Row Level Security on storage.objects is on by default and
-- had no INSERT policy at all for the 'papers' bucket, so every upload was
-- rejected before this. This is a different RLS system from the one
-- covering your regular tables (schema.sql etc.) -- storage has its own.
drop policy if exists "public upload to papers" on storage.objects;
create policy "public upload to papers" on storage.objects
  for insert to public with check (bucket_id = 'papers');

drop policy if exists "public read papers" on storage.objects;
create policy "public read papers" on storage.objects
  for select to public using (bucket_id = 'papers');

-- ============================================================
-- 2. Report flow: Report submits a reason, doesn't take anything down.
--    An admin reviews it in /admin and decides. Works for both discussion
--    posts and study links (target_type distinguishes them).
--    content_snapshot captures what was reported at report-time, so admins
--    can still see context even if the content is later edited or deleted.
-- ============================================================
create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('discussion_post', 'study_link')),
  target_id uuid not null,
  reason text not null,
  detail text,
  content_snapshot text,
  device_id text,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

alter table reports enable row level security;
drop policy if exists "public insert reports" on reports;
create policy "public insert reports" on reports for insert with check (true);
-- No select policy on purpose: reports are only readable by admins, via the
-- service-role key in api/admin.js -- same pattern as the feedback table.

-- ============================================================
-- 3. Give top-level discussion posts a short topic/title, separate from
--    the channel they're posted in -- so a broad channel like
--    "Q&A::Mathematics" can hold many distinct questions that are each
--    identifiable at a glance, not just an unlabeled wall of text.
-- ============================================================
alter table discussion_posts add column if not exists topic text;


-- ################################################################
-- FROM: supabase/migration-8.sql
-- ################################################################
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


-- ################################################################
-- FROM: migration-8.sql
-- ################################################################
-- migration-8.sql
-- Run once in the Supabase SQL Editor. Safe to re-run.
--
-- Past papers can now be tagged Summative / Formative / Other (with a short
-- free-text label for Other), separately from grade and subject.
-- Both columns are nullable, so existing uploads are unaffected -- they just
-- show no paper-type badge until/unless you backfill them.

alter table files add column if not exists paper_type text
  check (paper_type is null or paper_type in ('summative', 'formative', 'other'));
alter table files add column if not exists paper_type_other text;


-- ################################################################
-- FROM: supabase/migration-9.sql
-- ################################################################
-- migration-9.sql  --  RUN THIS FIRST. Purely additive: nothing is closed or removed,
-- so the live site keeps working exactly as before. Safe to re-run.
--
-- Adds: the admin archive, rate limiting, per-device invite codes, upload batches
-- (paper + answers grouped as one), tamper-proof voting, and a link-scheme check.

create extension if not exists pgcrypto;

-- 1. Admin archive: anything an admin "deletes" is copied here first --------------------
create table if not exists admin_archive (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  original_id uuid,
  summary text,
  data jsonb not null,
  archived_at timestamptz not null default now(),
  restored_at timestamptz
);
alter table admin_archive enable row level security;   -- no policies: service role only

-- 2. Rate limiting (stores a salted hash of the visitor, never an IP) --------------------
create table if not exists rate_limits (
  id text primary key,
  count integer not null default 0,
  window_start timestamptz not null default now()
);
alter table rate_limits enable row level security;     -- no policies: service role only

-- 3. Invite codes remember which browser redeemed them ----------------------------------
alter table beta_invites add column if not exists device_hash text;

-- 4. Upload batches: files uploaded together share a batch_id -----------------------------
alter table files add column if not exists batch_id uuid;
alter table files add column if not exists file_role text not null default 'paper';
alter table files drop constraint if exists files_file_role_check;
alter table files add constraint files_file_role_check check (file_role in ('paper', 'answers', 'other'));
create index if not exists files_batch_idx on files (batch_id);

-- 5. Request votes (so a request can be voted on once per device, like posts) ------------
create table if not exists request_votes (
  request_id uuid not null references resource_requests(id) on delete cascade,
  device_id text not null,
  vote smallint not null check (vote in (-1, 1)),
  primary key (request_id, device_id)
);
alter table request_votes enable row level security;

-- 6. Study links must be http(s). Stops javascript: links. (NOT VALID = applies to new rows
--    only, so an old bad row can't block this migration; the admin panel lists them.)
alter table study_links drop constraint if exists study_links_url_scheme;
alter table study_links add constraint study_links_url_scheme check (url ~* '^https?://') not valid;

-- 7. Membership check used by the lockdown policies (migration-10) -----------------------
create or replace function public.is_member() returns boolean
language sql stable as $$ select coalesce(auth.jwt() ->> 'app_role', '') = 'member' $$;

-- 8. Voting through functions, so nobody can set a vote count to whatever they like ------
create or replace function public.vote_post(p_post uuid, p_device text, p_vote integer) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_vote not in (-1, 1) then raise exception 'bad vote'; end if;
  insert into post_votes (post_id, device_id, vote) values (p_post, left(p_device, 100), p_vote);
  if p_vote = 1 then update discussion_posts set upvotes = upvotes + 1 where id = p_post;
  else update discussion_posts set downvotes = downvotes + 1 where id = p_post; end if;
end $$;

create or replace function public.vote_request(p_request uuid, p_device text, p_vote integer) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_vote not in (-1, 1) then raise exception 'bad vote'; end if;
  insert into request_votes (request_id, device_id, vote) values (p_request, left(p_device, 100), p_vote);
  if p_vote = 1 then update resource_requests set upvotes = upvotes + 1 where id = p_request;
  else update resource_requests set downvotes = downvotes + 1 where id = p_request; end if;
end $$;

