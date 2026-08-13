-- =============================================================================
-- 11_acquisition_enrich.sql
-- APT-SOCIAL-ENRICH-002 · profile enrichment columns.
-- Run after 09_acquisition.sql and 10_acquisition_skip.sql. Idempotent.
--
-- DO NOT RUN the schema.sql bundled with ticket 002 on this database. It assumes
-- `skip` is a NULLABLE column it is creating for the first time, and its
-- acquisition_hit_rates view filters on `c.skip is null`. This database already
-- has `skip text not null default ''` from 10_acquisition_skip.sql, so
-- `skip is null` is never true — that view would report zero checked records for
-- every vertical and silently blank out every hit rate in Plan & rates.
-- This file applies the same enrichment columns against the column as it exists.
--
-- Suggestions are written to their own columns and are NEVER promoted to the
-- found flags by any automated path. In live testing AI search reported "no
-- accounts" for a company with an active Facebook page, and a plain web search
-- returned a same-named business in Australia. Enrichment fills the field; a
-- person keeps the verdict. A wrong follow is worse than a missing one.
-- =============================================================================

alter table public.acquisition_companies
  add column if not exists fb_suggested      text,
  add column if not exists ig_suggested      text,
  add column if not exists li_suggested      text,
  add column if not exists enrich_source     text,
  add column if not exists enrich_note       text,
  add column if not exists enrich_confidence text,
  add column if not exists enriched_at       timestamptz;

-- Constraints added separately: `add column if not exists ... check (...)` re-adds
-- the constraint on a re-run and fails once the column already exists.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'acq_enrich_source_valid') then
    alter table public.acquisition_companies
      add constraint acq_enrich_source_valid
      check (enrich_source is null or enrich_source in ('footer','ai'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'acq_enrich_confidence_valid') then
    alter table public.acquisition_companies
      add constraint acq_enrich_confidence_valid
      check (enrich_confidence is null or enrich_confidence in ('high','medium','low'));
  end if;
end $$;

-- The review queue: rows carrying a suggestion nobody has confirmed or rejected.
create index if not exists acq_companies_suggested
  on public.acquisition_companies (enriched_at desc)
  where fb_suggested is not null or ig_suggested is not null or li_suggested is not null;

-- The work queue for the next enrichment run.
create index if not exists acq_companies_unenriched
  on public.acquisition_companies (priority_score desc)
  where enriched_at is null and stage = 'research';
