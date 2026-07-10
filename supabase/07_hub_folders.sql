-- ============================================================================
-- 07_hub_folders.sql — Folders for Marketing Hub files
-- Run this in Supabase → SQL Editor (same as your earlier migrations).
-- Safe to re-run (uses IF NOT EXISTS and drop-then-create for policies).
--
-- Adds:
--   * hub_folders            — user-created folders to organize files
--   * hub_files.folder_id    — which folder a file lives in (NULL = unfiled / top level)
-- ============================================================================

-- ---- FOLDERS ---------------------------------------------------------------
create table if not exists public.hub_folders (
  id          uuid primary key default gen_random_uuid(),
  company_id  text not null,                  -- 'aps' | 'ads' | 'tgr' | 'all'
  name        text not null,
  created_by  text,
  created_at  timestamptz not null default now()
);

-- ---- Link files to folders -------------------------------------------------
-- NULL folder_id means the file is not in any folder (shown at the top level).
-- ON DELETE SET NULL means deleting a folder does NOT delete its files — they
-- simply fall back to the top level, so nothing is ever lost.
alter table public.hub_files
  add column if not exists folder_id uuid
  references public.hub_folders (id) on delete set null;

-- ---- RLS (same authenticated-team pattern as the other hub tables) ---------
alter table public.hub_folders enable row level security;

drop policy if exists "authenticated read hub_folders"   on public.hub_folders;
create policy "authenticated read hub_folders"   on public.hub_folders for select to authenticated using (true);

drop policy if exists "authenticated write hub_folders"  on public.hub_folders;
create policy "authenticated write hub_folders"  on public.hub_folders for insert to authenticated with check (true);

drop policy if exists "authenticated update hub_folders" on public.hub_folders;
create policy "authenticated update hub_folders" on public.hub_folders for update to authenticated using (true) with check (true);

drop policy if exists "authenticated delete hub_folders" on public.hub_folders;
create policy "authenticated delete hub_folders" on public.hub_folders for delete to authenticated using (true);

-- ---- Indexes ---------------------------------------------------------------
create index if not exists hub_folders_company_idx on public.hub_folders (company_id);
create index if not exists hub_files_folder_idx     on public.hub_files (folder_id);
