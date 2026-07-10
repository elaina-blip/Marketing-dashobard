-- ============================================================================
-- 08_hub_folder_nesting.sql — Nested folders (folders inside folders)
-- Run this in Supabase → SQL Editor (same as your earlier migrations).
-- Safe to re-run (IF NOT EXISTS).
--
-- Adds hub_folders.parent_id: NULL = top-level folder; otherwise the folder
-- lives inside the referenced parent. Deleting a parent folder sets its
-- children's parent_id to NULL (they move up to the top level rather than
-- disappearing) — matching how file deletion already behaves.
-- ============================================================================

alter table public.hub_folders
  add column if not exists parent_id uuid
  references public.hub_folders (id) on delete set null;

create index if not exists hub_folders_parent_idx on public.hub_folders (parent_id);
