-- =============================================================================
-- 12_acquisition_prospecting.sql
-- APT-SOCIAL-PROSPECT-003 · leads from pasted follower lists.
-- Run after 09, 10 and 11. Idempotent.
--
-- DO NOT RUN the schema.sql bundled with ticket 003 — same reason as ticket 002.
-- Its acquisition_hit_rates view filters on `c.skip is null`, but this database
-- has `skip text not null default ''` from 10_acquisition_skip.sql, so that view
-- would report zero checked records for every vertical and blank every hit rate.
-- This file adds only what ticket 003 actually introduces.
-- =============================================================================

-- ---------- provenance -------------------------------------------------------
-- A company pasted from a follower list arrives with no permit data. Without a
-- source marker it is indistinguishable from a scraped contractor who filed
-- nothing — which is a very different thing.
alter table public.acquisition_companies
  add column if not exists source          text not null default 'permit_scraper',
  add column if not exists source_platform text,   -- instagram | facebook | linkedin
  add column if not exists source_account  text,   -- whose list it came from
  add column if not exists social_handle   text;   -- @handle captured at paste time

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'acq_source_valid') then
    alter table public.acquisition_companies
      add constraint acq_source_valid
      check (source in ('permit_scraper','prospecting'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'acq_source_platform_valid') then
    alter table public.acquisition_companies
      add constraint acq_source_platform_valid
      check (source_platform is null or source_platform in ('instagram','facebook','linkedin'));
  end if;
end $$;

create index if not exists acq_companies_source on public.acquisition_companies (source);

-- ---------- one row per paste ------------------------------------------------
-- So the same list is not mined twice, and the yield of each source account can
-- be compared later.
create table if not exists public.acquisition_prospect_runs (
  id                uuid primary key default gen_random_uuid(),
  platform          text not null,
  source_account    text,                  -- "abcsupplyco followers"
  pasted_lines      integer not null default 0,
  parsed_names      integer not null default 0,
  count_new         integer not null default 0,
  count_known       integer not null default 0,
  count_unsure      integer not null default 0,
  count_person      integer not null default 0,
  count_junk        integer not null default 0,
  added_to_research integer not null default 0,
  run_by            text,
  run_at            timestamptz not null default now()
);

create index if not exists acq_prospect_runs_at on public.acquisition_prospect_runs (run_at desc);

-- Same team policy as every other acquisition table.
alter table public.acquisition_prospect_runs enable row level security;
drop policy if exists acquisition_prospect_runs_team_all on public.acquisition_prospect_runs;
create policy acquisition_prospect_runs_team_all on public.acquisition_prospect_runs
  for all to authenticated
  using (public.acq_is_team()) with check (public.acq_is_team());
