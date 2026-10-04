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
