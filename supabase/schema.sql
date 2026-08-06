-- Run this once in Supabase: Project → SQL Editor → New query → paste → Run

create extension if not exists pgcrypto;

create table files (
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

create table discussion_posts (
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

create table post_votes (
  post_id uuid references discussion_posts(id) on delete cascade,
  device_id text not null,
  vote smallint not null,
  primary key (post_id, device_id)
);

create table resource_requests (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  description text not null,
  upvotes integer not null default 0,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

alter table files enable row level security;
alter table discussion_posts enable row level security;
alter table post_votes enable row level security;
alter table resource_requests enable row level security;

create policy "public read files" on files for select using (true);
create policy "public insert files" on files for insert with check (true);

create policy "public read posts" on discussion_posts for select using (true);
create policy "public insert posts" on discussion_posts for insert with check (true);
create policy "public update posts" on discussion_posts for update using (true) with check (true);

create policy "public read votes" on post_votes for select using (true);
create policy "public insert votes" on post_votes for insert with check (true);

create policy "public read requests" on resource_requests for select using (true);
create policy "public insert requests" on resource_requests for insert with check (true);
create policy "public update requests" on resource_requests for update using (true) with check (true);

-- Seed one welcome post in General so Discussions isn't empty on day one.
insert into discussion_posts (channel, author_name, body)
values ('General', 'ISF Holy Grail', 'Welcome! Ask questions, share answers with your own working, and keep it kind.');

-- Enable realtime updates for live discussions
alter publication supabase_realtime add table discussion_posts;
