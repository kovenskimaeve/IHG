-- migration-10.sql  --  THE LOCKDOWN. Run only AFTER:
--   (1) migration-9.sql has been run,
--   (2) SUPABASE_JWT_SECRET is set in Vercel and the new code is deployed,
--   (3) you have entered an access code on the live site and confirmed it still loads.
-- Safe to re-run. If anything goes wrong, run emergency-reopen.sql to undo it.
--
-- After this, the public anon key (which is visible in the site's JavaScript) can do
-- NOTHING on its own. Every read/write needs the signed session issued after a valid
-- access code. Nobody, even a member, can edit or delete rows directly; votes go
-- through functions and admin changes go through /api/admin.

-- 1. Functions: members only --------------------------------------------------------------
create or replace function public.vote_post(p_post uuid, p_device text, p_vote integer) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_member() then raise exception 'not allowed'; end if;
  if p_vote not in (-1, 1) then raise exception 'bad vote'; end if;
  insert into post_votes (post_id, device_id, vote) values (p_post, left(p_device, 100), p_vote);
  if p_vote = 1 then update discussion_posts set upvotes = upvotes + 1 where id = p_post;
  else update discussion_posts set downvotes = downvotes + 1 where id = p_post; end if;
end $$;

create or replace function public.vote_request(p_request uuid, p_device text, p_vote integer) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_member() then raise exception 'not allowed'; end if;
  if p_vote not in (-1, 1) then raise exception 'bad vote'; end if;
  insert into request_votes (request_id, device_id, vote) values (p_request, left(p_device, 100), p_vote);
  if p_vote = 1 then update resource_requests set upvotes = upvotes + 1 where id = p_request;
  else update resource_requests set downvotes = downvotes + 1 where id = p_request; end if;
end $$;

revoke execute on function public.vote_post(uuid, text, integer) from public, anon;
revoke execute on function public.vote_request(uuid, text, integer) from public, anon;
grant execute on function public.vote_post(uuid, text, integer) to authenticated;
grant execute on function public.vote_request(uuid, text, integer) to authenticated;

-- 2. Remove every existing policy on the app's tables, whatever it was called -------------
do $$
declare r record;
begin
  for r in
    select schemaname, tablename, policyname from pg_policies
    where schemaname = 'public' and tablename in (
      'files', 'discussion_posts', 'post_votes', 'resource_requests', 'request_comments',
      'request_votes', 'study_links', 'feedback', 'reports', 'download_events')
  loop
    execute format('drop policy %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- 3. Members can read what they need ------------------------------------------------------
create policy member_read on files             for select to authenticated using (public.is_member());
create policy member_read on discussion_posts  for select to authenticated using (public.is_member());
create policy member_read on resource_requests for select to authenticated using (public.is_member());
create policy member_read on request_comments  for select to authenticated using (public.is_member());
create policy member_read on study_links       for select to authenticated using (public.is_member());
create policy member_read on download_events   for select to authenticated using (public.is_member());
-- feedback, reports, post_votes, request_votes: deliberately NO read policy (admin only)

-- 4. Members can add things, within sensible limits ---------------------------------------
create policy member_insert on files for insert to authenticated with check (
  public.is_member()
  and type in ('past_paper', 'lesson_slide', 'study_guide')
  and char_length(title) between 1 and 200
  and char_length(uploader_name) <= 60
  and download_count = 0);

create policy member_insert on discussion_posts for insert to authenticated with check (
  public.is_member()
  and char_length(body) between 1 and 4000
  and char_length(author_name) <= 60
  and upvotes = 0 and downvotes = 0 and flag_count = 0 and hidden = false);

create policy member_insert on resource_requests for insert to authenticated with check (
  public.is_member()
  and subject <> 'Feedback'
  and char_length(description) between 1 and 1000
  and upvotes = 0 and downvotes = 0 and status = 'open');

create policy member_insert on request_comments for insert to authenticated with check (
  public.is_member()
  and char_length(body) between 1 and 2000
  and char_length(author_name) <= 60);

create policy member_insert on study_links for insert to authenticated with check (
  public.is_member()
  and url ~* '^https?://'
  and char_length(url) <= 500
  and char_length(name) <= 120);

create policy member_insert on feedback for insert to authenticated with check (
  public.is_member() and char_length(message) between 1 and 2000);

create policy member_insert on reports for insert to authenticated with check (
  public.is_member() and char_length(reason) <= 200);
-- No UPDATE or DELETE policies anywhere: only /api/admin (service role) can change or remove rows.

-- 5. File storage: private bucket, PDFs only, 25 MB max, uploads by members only ------------
update storage.buckets
   set public = false, file_size_limit = 26214400, allowed_mime_types = array['application/pdf']
 where id = 'papers';

do $$
declare r record;
begin
  for r in
    select policyname from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and (coalesce(qual, '') like '%papers%' or coalesce(with_check, '') like '%papers%')
  loop
    execute format('drop policy %I on storage.objects', r.policyname);
  end loop;
end $$;

create policy member_upload_papers on storage.objects for insert to authenticated with check (
  bucket_id = 'papers'
  and public.is_member()
  and (storage.foldername(name))[1] in ('past_paper', 'lesson_slide', 'study_guide'));
-- No read policy: PDFs are only ever served by /api/download and /api/preview, which check the session.

-- 6. Belt and braces: the anon role gets no direct table access at all --------------------
revoke all on all tables in schema public from anon;
