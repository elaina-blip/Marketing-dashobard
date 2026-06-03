-- ============================================================
--  MARKETING COMMAND CENTER — Supabase schema
--  Run this in: Supabase Dashboard → SQL Editor → New query → Run
--  Safe to re-run: uses IF NOT EXISTS / idempotent guards where possible.
-- ============================================================

-- ---------- Extensions ----------
create extension if not exists "pgcrypto";   -- for gen_random_uuid()

-- ============================================================
--  1. ALLOW-LIST  (only these 4 emails may ever sign in)
-- ============================================================
create table if not exists public.allowed_users (
  email text primary key,
  name  text,
  role  text not null default 'member' check (role in ('owner','manager','member'))
);

insert into public.allowed_users (email, name, role) values
  ('elaina@alliancepermitting.com',      'Elaina',   'owner'),
  ('marshallc@alliancedatasolutions.ai', 'Marshall', 'manager'),
  ('westons@alliancepermitting.com',     'Weston',   'member'),
  ('deva@alliancedatasolutions.ai',      'Dena',     'member')
on conflict (email) do nothing;

-- Helper: is the currently-authenticated user on the allow-list?
create or replace function public.is_allowed()
returns boolean
language sql stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.allowed_users
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- ============================================================
--  2. COMPANIES
-- ============================================================
create table if not exists public.companies (
  id    text primary key,           -- 'aps' | 'ads' | 'tgr'
  name  text not null,
  short text not null,
  site  text,
  color text
);

insert into public.companies (id, name, short, site, color) values
  ('aps','Alliance Permitting Service','APS','alliancepermitting.com','#F47B27'),
  ('ads','Alliance Data Solutions','ADS','alliancedatasolutions.ai','#3FA7D6'),
  ('tgr','TigerLeads AI','TGR','tigerleads.ai','#E4B100')
on conflict (id) do nothing;

-- ============================================================
--  3. TASKS
-- ============================================================
create table if not exists public.tasks (
  id          uuid primary key default gen_random_uuid(),
  company_id  text not null references public.companies(id) on delete cascade,
  track       text not null check (track in ('seo','paid_social')),
  phase       text not null,
  title       text not null,
  why         text,
  cadence     text check (cadence in ('one-time','weekly','monthly','quarterly')),
  tools       text,
  priority    text not null default 'medium' check (priority in ('high','medium','low')),
  status      text not null default 'not_started' check (status in ('not_started','in_progress','blocked','done')),
  deadline    date,
  platform    text,                 -- for recurring social posts (Facebook/Instagram/...)
  recurring   boolean not null default false,
  sort_order  int default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists tasks_company_track_idx on public.tasks (company_id, track);
create index if not exists tasks_deadline_idx       on public.tasks (deadline);
create index if not exists tasks_recurring_idx      on public.tasks (recurring, deadline);

-- ============================================================
--  4. TASK ASSIGNEES   (multi-assignee: many rows per task)
-- ============================================================
create table if not exists public.task_assignees (
  task_id uuid not null references public.tasks(id) on delete cascade,
  name    text not null,            -- team member display name
  primary key (task_id, name)
);

-- ============================================================
--  5. NOTES   (threaded, attributed)
-- ============================================================
create table if not exists public.notes (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null references public.tasks(id) on delete cascade,
  author     text not null,         -- name or email of writer
  body       text not null,
  created_at timestamptz not null default now()
);
create index if not exists notes_task_idx on public.notes (task_id);

-- ============================================================
--  6. ATTACHMENTS   (files live in Storage; this table tracks them + links)
-- ============================================================
create table if not exists public.attachments (
  id          uuid primary key default gen_random_uuid(),
  task_id     uuid not null references public.tasks(id) on delete cascade,
  kind        text not null check (kind in ('file','link')),
  name        text not null,        -- filename or link label
  url         text,                 -- public/signed URL (link) or storage path (file)
  storage_path text,                -- path inside the storage bucket (files only)
  mime        text,
  size        bigint,
  added_by    text,
  created_at  timestamptz not null default now()
);
create index if not exists attachments_task_idx on public.attachments (task_id);

-- ============================================================
--  6b. COMPANY LOGINS (shared across all allowed users)
-- ============================================================
create table if not exists public.company_logins (
  id         uuid primary key default gen_random_uuid(),
  company_id text not null references public.companies(id) on delete cascade,
  media      text not null default '',
  username   text not null default '',
  password   text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists company_logins_company_idx on public.company_logins (company_id, sort_order);

-- ============================================================
--  7. updated_at trigger on tasks
-- ============================================================
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists tasks_touch on public.tasks;
create trigger tasks_touch before update on public.tasks
  for each row execute function public.touch_updated_at();

-- ============================================================
--  8. ROW LEVEL SECURITY
--     Every table: only allow-listed, signed-in users can do anything.
-- ============================================================
alter table public.companies      enable row level security;
alter table public.tasks          enable row level security;
alter table public.task_assignees enable row level security;
alter table public.notes          enable row level security;
alter table public.attachments    enable row level security;
alter table public.company_logins enable row level security;
alter table public.allowed_users  enable row level security;

-- companies: allow-listed users can read; no client writes (seeded above)
drop policy if exists companies_read on public.companies;
create policy companies_read on public.companies
  for select using (public.is_allowed());

-- Generic full-access policy for the working tables
do $$
declare t text;
begin
  foreach t in array array['tasks','task_assignees','notes','attachments','company_logins']
  loop
    execute format('drop policy if exists %1$s_all on public.%1$s;', t);
    execute format(
      'create policy %1$s_all on public.%1$s for all
         using (public.is_allowed()) with check (public.is_allowed());', t);
  end loop;
end $$;

-- allowed_users: readable by allow-listed users (so the app can show team list); no client writes
drop policy if exists allowed_read on public.allowed_users;
create policy allowed_read on public.allowed_users
  for select using (public.is_allowed());

-- ============================================================
--  9. STORAGE BUCKET for task attachments
-- ============================================================
insert into storage.buckets (id, name, public)
values ('task-attachments','task-attachments', false)
on conflict (id) do nothing;

-- Storage policies: only allow-listed users can read/write objects in this bucket
drop policy if exists "attach read"   on storage.objects;
drop policy if exists "attach write"  on storage.objects;
drop policy if exists "attach delete" on storage.objects;

create policy "attach read" on storage.objects
  for select using (bucket_id = 'task-attachments' and public.is_allowed());
create policy "attach write" on storage.objects
  for insert with check (bucket_id = 'task-attachments' and public.is_allowed());
create policy "attach delete" on storage.objects
  for delete using (bucket_id = 'task-attachments' and public.is_allowed());

-- ============================================================
--  DONE. Next: run the seed script (seed_tasks.sql or the app's seed route)
--  to load the SEO + Paid/Social masters and recurring posts.
-- ============================================================
