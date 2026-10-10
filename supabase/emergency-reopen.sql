-- emergency-reopen.sql
-- If the lockdown (migration-10) ever locks YOU out or breaks the site, run this in the
-- Supabase SQL editor to put the old open policies back, then tell me what you saw.
-- It re-opens the database to anyone holding the public key, so treat it as temporary.

grant select, insert, update on all tables in schema public to anon;
do $$
declare t text;
begin
  foreach t in array array['files','discussion_posts','resource_requests','request_comments','study_links','download_events']
  loop
    execute format('drop policy if exists reopen_read on public.%I', t);
    execute format('create policy reopen_read on public.%I for select using (true)', t);
  end loop;
  foreach t in array array['files','discussion_posts','resource_requests','request_comments','study_links','feedback','reports','post_votes','request_votes']
  loop
    execute format('drop policy if exists reopen_insert on public.%I', t);
    execute format('create policy reopen_insert on public.%I for insert with check (true)', t);
  end loop;
end $$;

-- migration-10 made the vote functions members-only; put back the open versions.
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
grant execute on function public.vote_post(uuid, text, integer) to anon;
grant execute on function public.vote_request(uuid, text, integer) to anon;

update storage.buckets set public = true where id = 'papers';
drop policy if exists reopen_upload on storage.objects;
create policy reopen_upload on storage.objects for insert to public with check (bucket_id = 'papers');
drop policy if exists reopen_read_files on storage.objects;
create policy reopen_read_files on storage.objects for select to public using (bucket_id = 'papers');
