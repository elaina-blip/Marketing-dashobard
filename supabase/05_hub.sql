-- ============================================================================
-- 05_hub.sql — Marketing Hub tables
-- Run this in Supabase → SQL Editor (same as your earlier migrations).
-- Creates four tables: hub_files, hub_contacts, hub_brand_assets, hub_templates.
-- File/logo BINARIES live in the Storage bucket "hub" (created separately in the
-- Storage UI — see the step-by-step). These tables only store metadata + the
-- storage path.
-- ============================================================================

-- ---- FILES (spreadsheets, PDFs) -------------------------------------------
create table if not exists public.hub_files (
  id           uuid primary key default gen_random_uuid(),
  company_id   text not null,                 -- 'aps' | 'ads' | 'tgr' | 'all'
  name         text not null,                 -- original filename shown in the UI
  kind         text not null default 'file',  -- 'sheet' | 'pdf' | 'file'
  storage_path text not null,                 -- path inside the "hub" bucket
  size_bytes   bigint,
  created_by   text,
  created_at   timestamptz not null default now()
);

-- ---- CONTACTS -------------------------------------------------------------
create table if not exists public.hub_contacts (
  id          uuid primary key default gen_random_uuid(),
  company_id  text not null,                  -- 'aps' | 'ads' | 'tgr' | 'all'
  name        text not null,
  role        text,
  contact_type text,                          -- 'Vendor' | 'Press' | 'Influencer' | 'Ad platform' | ...
  email       text,
  phone       text,
  notes       text,
  created_at  timestamptz not null default now()
);

-- ---- BRAND ASSETS (logos + colors + type + voice) -------------------------
-- One row per asset. asset_type tells the UI how to render it.
create table if not exists public.hub_brand_assets (
  id           uuid primary key default gen_random_uuid(),
  company_id   text not null,                 -- 'aps' | 'ads' | 'tgr'
  asset_type   text not null,                 -- 'logo' | 'color' | 'font' | 'voice'
  label        text,                          -- e.g. "Primary", "Dark logo", "Tagline"
  value        text,                          -- hex for color, text for voice/font
  storage_path text,                          -- for logo images (in the "hub" bucket)
  sort_order   int default 0,
  created_at   timestamptz not null default now()
);

-- ---- TEMPLATES ------------------------------------------------------------
create table if not exists public.hub_templates (
  id          uuid primary key default gen_random_uuid(),
  company_id  text not null default 'all',
  category    text not null,                  -- 'caption' | 'email' | 'calendar' | 'framework'
  title       text not null,
  body        text,
  created_at  timestamptz not null default now()
);

-- ---- Row Level Security ----------------------------------------------------
-- Mirror the app's model: any signed-in, allow-listed user can read/write.
-- (Your API routes already gate on public.allowed_users; here we let any
-- authenticated user in, matching how tasks/attachments behave for the team.)
alter table public.hub_files        enable row level security;
alter table public.hub_contacts     enable row level security;
alter table public.hub_brand_assets enable row level security;
alter table public.hub_templates    enable row level security;

do $$
declare tbl text;
begin
  foreach tbl in array array['hub_files','hub_contacts','hub_brand_assets','hub_templates']
  loop
    execute format(
      'drop policy if exists "authenticated read %1$s" on public.%1$s;', tbl);
    execute format(
      'create policy "authenticated read %1$s" on public.%1$s for select to authenticated using (true);', tbl);

    execute format(
      'drop policy if exists "authenticated write %1$s" on public.%1$s;', tbl);
    execute format(
      'create policy "authenticated write %1$s" on public.%1$s for insert to authenticated with check (true);', tbl);

    execute format(
      'drop policy if exists "authenticated update %1$s" on public.%1$s;', tbl);
    execute format(
      'create policy "authenticated update %1$s" on public.%1$s for update to authenticated using (true) with check (true);', tbl);

    execute format(
      'drop policy if exists "authenticated delete %1$s" on public.%1$s;', tbl);
    execute format(
      'create policy "authenticated delete %1$s" on public.%1$s for delete to authenticated using (true);', tbl);
  end loop;
end $$;

-- ---- Helpful indexes -------------------------------------------------------
create index if not exists hub_files_company_idx     on public.hub_files (company_id);
create index if not exists hub_contacts_company_idx  on public.hub_contacts (company_id);
create index if not exists hub_brand_company_idx     on public.hub_brand_assets (company_id);
create index if not exists hub_templates_company_idx on public.hub_templates (company_id);
