-- ============================================================
--  MIGRATION 03 — Track who completed each task, and when.
--  Run this in: Supabase Dashboard → SQL Editor → New query → Run
--  Safe to re-run (uses IF NOT EXISTS).
-- ============================================================

alter table public.tasks add column if not exists completed_by text;
alter table public.tasks add column if not exists completed_at timestamptz;

-- Optional index if you ever want to filter "everything Elaina finished"
create index if not exists tasks_completed_by_idx on public.tasks (completed_by);
