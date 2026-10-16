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
