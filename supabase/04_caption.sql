-- ============================================================
--  MIGRATION 04 — Add a caption field to tasks (for post copy).
--  Run this in: Supabase Dashboard → SQL Editor → New query → Run
--  Safe to re-run (uses IF NOT EXISTS).
-- ============================================================

alter table public.tasks add column if not exists caption text;
