-- Vespers — health-check table.
-- Written to by a daily GitHub Actions job so the Supabase free-tier project
-- never goes 7 days without an API request (which triggers auto-pause).
-- Run once in your Supabase SQL Editor.

create table if not exists public.health_checks (
  id         bigint generated always as identity primary key,
  checked_at timestamptz not null default now()
);

alter table public.health_checks disable row level security;

-- Keep the table from growing forever — a row a day for a year is nothing,
-- but this makes it self-cleaning if the schedule ever gets more frequent.
create index if not exists health_checks_checked_at_idx
  on public.health_checks (checked_at desc);
