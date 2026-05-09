-- Vespers v2 — long-term memory, closing rituals, letters to self.
-- Run once in your Supabase SQL Editor.

-- 1. Long-term structured memory.
alter table public.vespers_sessions
  add column if not exists memory jsonb not null default '{}'::jsonb;

-- 2. Closing rituals — append-only list of {ts, carrying, releasing, intention}.
alter table public.vespers_sessions
  add column if not exists closing_rituals jsonb not null default '[]'::jsonb;

-- 3. Letters to self.
create table if not exists public.vespers_letters (
  id          uuid primary key default gen_random_uuid(),
  code        text not null,
  mode        text not null,
  custom_mode text,
  title       text,
  content     text not null default '',
  status      text not null default 'draft',
  created_at  bigint not null,
  updated_at  bigint not null
);

create index if not exists vespers_letters_code_idx
  on public.vespers_letters (code, updated_at desc);

alter table public.vespers_letters disable row level security;
