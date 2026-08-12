-- =============================================================================
-- 10_acquisition_skip.sql
-- Adds the "not a target" flag from workbench v13.
-- Run after 09_acquisition.sql. Idempotent: safe to re-run.
--
-- Deliberately NOT a boolean. It holds the reason ('not a target' by default), so
-- a future UI can distinguish a big-box retailer from a corrupt record without
-- another migration. Empty string means the row is a normal target.
--
-- This is not the same as marking a platform red. Red means "checked, no
-- account" and belongs in the hit rate. Skipped means out of scope entirely and
-- is excluded from both sides of found ÷ checked.
-- =============================================================================

alter table public.acquisition_companies
  add column if not exists skip text not null default '';

create index if not exists acq_companies_skip
  on public.acquisition_companies (skip) where skip <> '';

-- The reporting views count "researched" as any non-null flag. A skipped row
-- must not qualify, or it inflates the denominator of every rate.
create or replace view public.acquisition_hit_rates as
select
  c.vertical,
  count(*) filter (where c.skip = ''
                     and (c.fb_found is not null
                       or c.ig_found is not null
                       or c.li_found is not null))              as checked,
  count(*) filter (where c.skip = '' and c.fb_found)            as fb_found,
  count(*) filter (where c.skip = '' and c.ig_found)            as ig_found,
  count(*) filter (where c.skip = '' and c.li_found)            as li_found
from public.acquisition_companies c
group by c.vertical;

create or replace view public.acquisition_daily as
select
  c.researched_on                                               as day,
  c.vertical, c.state, c.researched_by,
  count(*)                                                      as researched,
  count(*) filter (where c.fb_found)                            as fb_found,
  count(*) filter (where c.ig_found)                            as ig_found,
  count(*) filter (where c.li_found)                            as li_found
from public.acquisition_companies c
where c.researched_on is not null
  and c.skip = ''
group by c.researched_on, c.vertical, c.state, c.researched_by;
