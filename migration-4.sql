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
