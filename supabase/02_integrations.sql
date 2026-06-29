-- ============================================================================
-- 02_integrations.sql  —  Data-source connection framework
-- Run this in Supabase → SQL Editor AFTER 01_schema.sql.
-- Creates two tables:
--   • data_connections   — safe status the dashboard can read (no secrets)
--   • connection_secrets — OAuth tokens, server-only (NO client policy)
--   • provider_metrics   — normalized metrics each provider sync writes into,
--                          which the dashboard/reports read from.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Connection status (browser-readable — contains NO tokens)
-- ---------------------------------------------------------------------------
create table if not exists public.data_connections (
  provider        text primary key,             -- 'search_console','ga4','gtm','google_ads','meta','linkedin','ahrefs','crm'
  status          text not null default 'disconnected'
                    check (status in ('disconnected','pending','connected','error')),
  account_label   text,                          -- e.g. property/account name shown in the UI
  scopes          text,                          -- granted scopes, for reference
  last_synced_at  timestamptz,
  error_detail    text,
  meta            jsonb not null default '{}'::jsonb,  -- provider-specific ids (property_id, customer_id, page_id, ig_user_id…)
  updated_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 2) Tokens — SERVER ONLY. RLS is enabled with NO policies, so the anon/auth
--    browser key can never read or write this table. Only the service-role
--    key (used by the OAuth callback + sync jobs) bypasses RLS.
-- ---------------------------------------------------------------------------
create table if not exists public.connection_secrets (
  provider          text primary key references public.data_connections(provider) on delete cascade,
  access_token      text,
  refresh_token     text,
  token_expires_at  timestamptz,
  updated_at        timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 3) Normalized metrics each provider's sync writes into.
--    The dashboard/reports read aggregated rows from here.
--    One row per (provider, metric, date) keeps it simple and chart-friendly.
-- ---------------------------------------------------------------------------
create table if not exists public.provider_metrics (
  id          bigint generated always as identity primary key,
  provider    text not null references public.data_connections(provider) on delete cascade,
  metric      text not null,                     -- 'sessions','clicks','impressions','spend','leads','followers','open_rate'…
  metric_date date not null,
  value       numeric not null default 0,
  dims        jsonb not null default '{}'::jsonb, -- optional breakdown: {channel:'organic', campaign:'…', keyword:'…'}
  updated_at  timestamptz not null default now(),
  unique (provider, metric, metric_date, dims)
);
create index if not exists provider_metrics_lookup
  on public.provider_metrics (provider, metric, metric_date);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.data_connections  enable row level security;
alter table public.connection_secrets enable row level security;  -- enabled, NO policies = server-only
alter table public.provider_metrics  enable row level security;

-- allow-listed users can READ connection status + metrics (re-uses the helper
-- pattern from 01_schema.sql: a row in allowed_users for the signed-in email).
drop policy if exists data_connections_read on public.data_connections;
create policy data_connections_read on public.data_connections
  for select using (
    exists (select 1 from public.allowed_users a where a.email = auth.jwt() ->> 'email')
  );

drop policy if exists provider_metrics_read on public.provider_metrics;
create policy provider_metrics_read on public.provider_metrics
  for select using (
    exists (select 1 from public.allowed_users a where a.email = auth.jwt() ->> 'email')
  );

-- NOTE: there are intentionally no INSERT/UPDATE/DELETE policies on any of these
-- tables. All writes happen server-side with the service-role key (OAuth
-- callback and the sync jobs), which bypasses RLS. The browser can read status
-- and metrics but can never see tokens or forge a "connected" row.

-- ---------------------------------------------------------------------------
-- Seed one disconnected row per source so the UI has something to render.
-- ---------------------------------------------------------------------------
insert into public.data_connections (provider) values
  ('search_console'), ('ga4'), ('gtm'), ('google_ads'),
  ('meta'), ('linkedin'), ('ahrefs'), ('crm')
on conflict (provider) do nothing;
