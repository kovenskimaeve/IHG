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
