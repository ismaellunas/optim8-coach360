-- STORY-5.3 — Admin-configurable feature gating and free content catalog.
--
-- feature_flags overrides the code-defined FEATURE_TIER_REQUIREMENTS matrix
-- per (feature_key, role). free_content_catalog lists items admins mark as
-- browsable at Basic tier without a purchase. Both are readable by any
-- authenticated client (mobile picks up changes live, no redeploy — AC-4)
-- and writable only by admins (public.is_admin, defined in
-- 20260627100001_rls_policies.sql).

------------------------------------------------------------------------------
-- feature_flags
------------------------------------------------------------------------------

create table if not exists public.feature_flags (
  feature_key text not null,
  role text not null check (role in ('coach', 'player', 'team')),
  required_tier text not null check (required_tier in ('basic', 'advanced', 'pro')),
  paywall_title text,
  paywall_message text,
  updated_at timestamptz not null default now(),
  primary key (feature_key, role)
);

alter table public.feature_flags enable row level security;

create policy feature_flags_select_authenticated
  on public.feature_flags
  for select
  to authenticated
  using (true);

create policy feature_flags_write_admin
  on public.feature_flags
  for all
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

grant select on public.feature_flags to authenticated;
grant insert, update, delete on public.feature_flags to authenticated;
grant all on public.feature_flags to service_role;

------------------------------------------------------------------------------
-- free_content_catalog
------------------------------------------------------------------------------

create table if not exists public.free_content_catalog (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text,
  created_at timestamptz not null default now()
);

alter table public.free_content_catalog enable row level security;

create policy free_content_catalog_select_authenticated
  on public.free_content_catalog
  for select
  to authenticated
  using (true);

create policy free_content_catalog_write_admin
  on public.free_content_catalog
  for all
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

grant select on public.free_content_catalog to authenticated;
grant insert, update, delete on public.free_content_catalog to authenticated;
grant all on public.free_content_catalog to service_role;
