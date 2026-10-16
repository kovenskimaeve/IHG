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
