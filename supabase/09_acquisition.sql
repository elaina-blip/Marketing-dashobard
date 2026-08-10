-- =============================================================================
-- 09_acquisition.sql
-- APT-SOCIAL-WORKBENCH-001  ·  Social Acquisition Workbench (Alliance Permitting)
-- Run this in: Supabase Dashboard → SQL Editor → New query → Run.
-- Idempotent: safe to re-run.
--
-- CHANGED FROM THE SUPPLIED schema.sql: acq_is_team() delegates to the existing
-- public.is_allowed(), which reads the allowed_users table. The supplied version
-- hard-coded four addresses and compared them case-sensitively, so
-- 'Elaina@alliancepermitting.com' never matched the lower-cased email in the JWT
-- and locked her out of every table and the storage bucket. Delegating also keeps
-- the promise in the README: add a row to allowed_users, no redeploy.
-- =============================================================================

-- ---------- 1. companies ----------------------------------------------------
create table if not exists public.acquisition_companies (
  id                    uuid primary key default gen_random_uuid(),

  company_name          text not null,
  vertical              text,
  total_permits         integer      not null default 0,
  priority_score        numeric      not null default 0,
  state                 text,
  metro                 text,
  primary_jurisdiction  text,
  permit_types          text,
  email                 text,
  phone                 text,
  address               text,

  -- employer rollup: >1 means several people share this email domain
  records_on_domain     integer      not null default 0,

  stage                 text         not null default 'research'
                          check (stage in ('research','follow','archive')),

  -- THREE-STATE ON PURPOSE.
  -- null  = not checked yet
  -- false = checked, confirmed not on that platform
  -- true  = found
  -- Hit rates are found / checked. Making these NOT NULL breaks that maths.
  fb_found              boolean,
  ig_found              boolean,
  li_found              boolean,

  fb_followed           date,
  ig_followed           date,
  li_followed           date,

  fb_back               boolean,
  ig_back               boolean,
  li_back               boolean,

  engagements           integer      not null default 0,
  notes                 text         not null default '',

  researched_by         text,
  researched_on         date,

  recheck               boolean      not null default false,
  last_seen_in_upload   date,

  source_document_id    uuid,

  created_at            timestamptz  not null default now(),
  updated_at            timestamptz  not null default now()
);

create index if not exists acq_companies_stage_score
  on public.acquisition_companies (stage, priority_score desc);
create index if not exists acq_companies_vertical    on public.acquisition_companies (vertical);
create index if not exists acq_companies_state       on public.acquisition_companies (state);
create index if not exists acq_companies_researched  on public.acquisition_companies (researched_on);
create index if not exists acq_companies_by          on public.acquisition_companies (researched_by);

-- merge-on-import lookups (see acquisition-logic.ts planMerge)
create index if not exists acq_companies_email_lc
  on public.acquisition_companies (lower(email));
create index if not exists acq_companies_domain_state
  on public.acquisition_companies (split_part(lower(email),'@',2), state);

-- ---------- 2. documents ----------------------------------------------------
create table if not exists public.acquisition_documents (
  id             uuid primary key default gen_random_uuid(),
  filename       text not null,
  storage_path   text not null,
  mime_type      text,
  size_bytes     bigint,
  row_count      integer,
  month_tag      text,                     -- '2026-08'
  sheet_name     text,                     -- which sheet, when xlsx
  uploaded_by    text,
  uploaded_at    timestamptz not null default now(),
  deleted_at     timestamptz               -- soft delete only
);

create index if not exists acq_docs_month on public.acquisition_documents (month_tag);
create index if not exists acq_docs_live
  on public.acquisition_documents (uploaded_at desc) where deleted_at is null;

alter table public.acquisition_companies
  drop constraint if exists acq_companies_source_fk;
alter table public.acquisition_companies
  add constraint acq_companies_source_fk
  foreign key (source_document_id) references public.acquisition_documents(id) on delete set null;

-- ---------- 3. plan ---------------------------------------------------------
-- Written by the Plan & rates tab. Every monthly target derives from this.
create table if not exists public.acquisition_plan (
  vertical            text primary key,
  research_per_month  integer not null default 0,
  fb_rate             numeric not null default 0 check (fb_rate between 0 and 1),
  ig_rate             numeric not null default 0 check (ig_rate between 0 and 1),
  li_rate             numeric not null default 0 check (li_rate between 0 and 1),
  updated_by          text,
  updated_at          timestamptz not null default now()
);

insert into public.acquisition_plan (vertical, research_per_month, fb_rate, ig_rate, li_rate) values
  ('Homebuilders',         100, 0.80, 0.70, 0.65),
  ('Roofing',              100, 0.90, 0.55, 0.25),
  ('Windows-Doors-Siding',  75, 0.85, 0.60, 0.25),
  ('Mechanical-HVAC',       75, 0.85, 0.25, 0.30),
  ('Electrical',            50, 0.75, 0.25, 0.30),
  ('Plumbing',              50, 0.85, 0.25, 0.25),
  ('Solar',                 50, 0.80, 0.65, 0.50)
on conflict (vertical) do nothing;

-- ---------- 4. snapshots ----------------------------------------------------
-- Written at month close so Trends keeps history after rows are archived.
create table if not exists public.acquisition_snapshots (
  id             uuid primary key default gen_random_uuid(),
  month_tag      text not null,
  vertical       text not null,
  researched     integer not null default 0,
  fb_found       integer not null default 0,
  ig_found       integer not null default 0,
  li_found       integer not null default 0,
  followed       integer not null default 0,
  follow_backs   integer not null default 0,
  engagements    integer not null default 0,
  document_id    uuid references public.acquisition_documents(id) on delete set null,
  created_at     timestamptz not null default now(),
  unique (month_tag, vertical)
);

-- ---------- 5. updated_at trigger -------------------------------------------
create or replace function public.acq_touch_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists acq_companies_touch on public.acquisition_companies;
create trigger acq_companies_touch before update on public.acquisition_companies
  for each row execute function public.acq_touch_updated_at();

-- ---------- 6. RLS ----------------------------------------------------------
-- Shared team queue: any allow-listed user reads and writes everything.
alter table public.acquisition_companies  enable row level security;
alter table public.acquisition_documents  enable row level security;
alter table public.acquisition_plan       enable row level security;
alter table public.acquisition_snapshots  enable row level security;

-- One source of truth for "is this person on the team": the allowed_users table
-- from 01_schema.sql. Do not re-hard-code the list here.
create or replace function public.acq_is_team() returns boolean
language sql stable
security definer set search_path = public
as $$ select public.is_allowed(); $$;

do $$
declare t text;
begin
  foreach t in array array['acquisition_companies','acquisition_documents',
                           'acquisition_plan','acquisition_snapshots']
  loop
    execute format('drop policy if exists %I on public.%I', t || '_team_all', t);
    execute format(
      'create policy %I on public.%I for all to authenticated
         using (public.acq_is_team()) with check (public.acq_is_team())',
      t || '_team_all', t);
  end loop;
end $$;

-- ---------- 7. storage bucket ----------------------------------------------
insert into storage.buckets (id, name, public)
values ('acquisition-docs', 'acquisition-docs', false)
on conflict (id) do nothing;

-- Distinct policy name, so this does not disturb the existing
-- "attach *" (task-attachments) or "hub *" policies on storage.objects.
drop policy if exists acq_docs_storage_team on storage.objects;
create policy acq_docs_storage_team on storage.objects for all to authenticated
  using      (bucket_id = 'acquisition-docs' and public.acq_is_team())
  with check (bucket_id = 'acquisition-docs' and public.acq_is_team());

-- ---------- 8. reporting views ----------------------------------------------
-- "Researched" means any of the three flags is non-null.
create or replace view public.acquisition_hit_rates as
select
  c.vertical,
  count(*) filter (where c.fb_found is not null
                      or c.ig_found is not null
                      or c.li_found is not null)              as checked,
  count(*) filter (where c.fb_found)                          as fb_found,
  count(*) filter (where c.ig_found)                          as ig_found,
  count(*) filter (where c.li_found)                          as li_found
from public.acquisition_companies c
group by c.vertical;

create or replace view public.acquisition_daily as
select
  c.researched_on                                             as day,
  c.vertical, c.state, c.researched_by,
  count(*)                                                    as researched,
  count(*) filter (where c.fb_found)                          as fb_found,
  count(*) filter (where c.ig_found)                          as ig_found,
  count(*) filter (where c.li_found)                          as li_found
from public.acquisition_companies c
where c.researched_on is not null
group by c.researched_on, c.vertical, c.state, c.researched_by;
