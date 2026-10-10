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
