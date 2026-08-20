-- =============================================================================
-- 13_acquisition_enrich_audit.sql
-- Enrichment audit trail + website verification (enrich engines v2).
-- Run after 09–12. Idempotent.
--
-- DO NOT RUN the bundled schema.sql — fourth time, same reason. Its
-- acquisition_hit_rates view filters on `c.skip is null`, but this database has
-- `skip text not null default ''` from 10_acquisition_skip.sql, so that view
-- would report zero checked records for every vertical and blank every hit rate
-- in Plan & rates. This file adds only what the new engines introduce.
-- =============================================================================

-- ---------- audit trail ------------------------------------------------------
-- Every row an enrichment pass TOUCHED is stamped, whether or not anything was
-- found. Without this a checked-and-empty row is indistinguishable from one that
-- was never attempted, which makes a pass look like it skipped work it did.
alter table public.acquisition_companies
  add column if not exists enrich_outcome  text,
  add column if not exists enrich_pass     text,

  -- Human verdict on whether the derived website is really this company's.
  -- null = not checked · true = correct site · false = wrong site
  add column if not exists site_verified   boolean,
  add column if not exists site_checked_by text,
  add column if not exists site_checked_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'acq_enrich_outcome_valid') then
    alter table public.acquisition_companies
      add constraint acq_enrich_outcome_valid
      check (enrich_outcome is null or enrich_outcome in
             ('found','none','js_shell','blocked','error','no_domain','skipped'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'acq_enrich_pass_valid') then
    alter table public.acquisition_companies
      add constraint acq_enrich_pass_valid
      check (enrich_pass is null or enrich_pass in ('footer','ai','both'));
  end if;
end $$;

create index if not exists acq_companies_enrich_outcome
  on public.acquisition_companies (enrich_outcome);

-- Rows a paid pass should still try: the free pass found nothing usable, but
-- the reason was a client-rendered page or a bot wall rather than a genuine
-- absence. These are exactly the sites that most need the AI pass.
create index if not exists acq_companies_ai_worth_trying
  on public.acquisition_companies (priority_score desc)
  where enrich_outcome in ('js_shell','blocked','error');
