-- Vespers — Supabase schema
-- Run this once in your Supabase project's SQL Editor.
-- Dashboard → SQL Editor → New query → paste → Run.

create table if not exists public.vespers_sessions (
  code        text primary key,
  created_at  bigint not null,
  updated_at  bigint not null,
  messages    jsonb  not null default '[]'::jsonb,
  summary     text   not null default '',
  themes      jsonb  not null default '[]'::jsonb
);

create index if not exists vespers_sessions_updated_at_idx
  on public.vespers_sessions (updated_at desc);

-- The recovery code is itself the access credential (no auth/users table).
-- Either disable RLS, or add a permissive policy. We disable for simplicity.
-- If you later switch to a service-role key, you can leave RLS on without
-- any policies and the backend will still work.
alter table public.vespers_sessions disable row level security;
