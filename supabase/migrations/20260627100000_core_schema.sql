-- STORY-1.1 — Core transactional schema
-- Tables that do NOT live in Sanity (see docs/architecture/content-model.md#what-does-not-live-in-sanity):
--   profiles, teams, rosters, subscriptions, sessions, purchases, drip_progress
--
-- Tier-gating RLS and admin overrides are deferred to STORY-5.1.

create extension if not exists "pgcrypto";

------------------------------------------------------------------------------
-- Enums
------------------------------------------------------------------------------

create type public.app_role as enum (
  'coach',
  'player',
  'team_manager',
  'admin'
);

create type public.subscription_tier as enum (
  'trial',
  'basic',
  'advanced',
  'pro'
);

create type public.subscription_status as enum (
  'trialing',
  'active',
  'past_due',
  'canceled',
  'incomplete'
);

create type public.roster_role as enum (
  'player',
  'assistant_coach',
  'manager'
);

create type public.roster_status as enum (
  'invited',
  'active',
  'removed'
);

create type public.session_type as enum (
  'practice',
  'film',
  'individual',
  'game',
  'fitness'
);

------------------------------------------------------------------------------
-- profiles  (1:1 with auth.users)
------------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.app_role not null default 'player',
  display_name text,
  avatar_url text,
  bio text,
  is_suspended boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_role_idx on public.profiles (role);

------------------------------------------------------------------------------
-- teams
------------------------------------------------------------------------------

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  age_min int,
  age_max int,
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint teams_age_range_valid check (
    age_min is null or age_max is null or age_min <= age_max
  )
);

create index teams_created_by_idx on public.teams (created_by);

------------------------------------------------------------------------------
-- rosters  (team membership)
------------------------------------------------------------------------------

create table public.rosters (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  roster_role public.roster_role not null default 'player',
  status public.roster_status not null default 'active',
  joined_at timestamptz not null default now(),
  unique (team_id, profile_id)
);

create index rosters_team_id_idx on public.rosters (team_id);
create index rosters_profile_id_idx on public.rosters (profile_id);

------------------------------------------------------------------------------
-- subscriptions  (Stripe read-model cache)
------------------------------------------------------------------------------

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles (id) on delete cascade,
  tier public.subscription_tier not null default 'trial',
  status public.subscription_status not null default 'trialing',
  stripe_customer_id text,
  stripe_subscription_id text unique,
  current_period_end timestamptz,
  trial_ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index subscriptions_status_idx on public.subscriptions (status);

------------------------------------------------------------------------------
-- sessions  (scheduled practice instances — NOT auth sessions)
------------------------------------------------------------------------------

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles (id) on delete restrict,
  team_id uuid references public.teams (id) on delete set null,
  title text not null,
  notes text,
  scheduled_at timestamptz not null,
  duration_minutes int not null default 60,
  session_type public.session_type not null default 'practice',
  content_refs jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index sessions_coach_id_idx on public.sessions (coach_id);
create index sessions_team_id_idx on public.sessions (team_id);
create index sessions_scheduled_at_idx on public.sessions (scheduled_at);

------------------------------------------------------------------------------
-- purchases  (marketplace purchases)
------------------------------------------------------------------------------

create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.profiles (id) on delete restrict,
  sanity_document_id text not null,
  stripe_payment_intent_id text unique,
  amount_cents int not null check (amount_cents >= 0),
  currency text not null default 'usd',
  purchased_at timestamptz not null default now()
);

create index purchases_buyer_id_idx on public.purchases (buyer_id);
create index purchases_sanity_document_id_idx on public.purchases (sanity_document_id);

------------------------------------------------------------------------------
-- drip_progress  (per-user unlock state for marketplace modules)
------------------------------------------------------------------------------

create table public.drip_progress (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  purchase_id uuid not null references public.purchases (id) on delete cascade,
  module_id text not null,
  unlocked_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (purchase_id, module_id)
);

create index drip_progress_profile_id_idx on public.drip_progress (profile_id);

------------------------------------------------------------------------------
-- updated_at triggers
------------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger teams_set_updated_at
  before update on public.teams
  for each row execute function public.set_updated_at();

create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

create trigger sessions_set_updated_at
  before update on public.sessions
  for each row execute function public.set_updated_at();

------------------------------------------------------------------------------
-- handle_new_user — auto-create a profile row when auth.users gets a new row.
-- Role defaults to 'player'; STORY-2.2 (role picker) will update this.
------------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', new.email));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

------------------------------------------------------------------------------
-- Realtime publication — include sessions for live schedule updates
------------------------------------------------------------------------------

alter publication supabase_realtime add table public.sessions;
