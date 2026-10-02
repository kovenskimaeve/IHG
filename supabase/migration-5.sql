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
