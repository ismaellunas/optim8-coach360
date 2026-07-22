-- STORY-9.5 — Sanity publish → Supabase package metadata + RAG job queue

------------------------------------------------------------------------------
-- package_metadata  (Sanity trainingPackage read-model for marketplace/RAG)
------------------------------------------------------------------------------

create table if not exists public.package_metadata (
  sanity_document_id text primary key,
  title text not null,
  description text,
  skills text[] not null default '{}'::text[],
  age_min int,
  age_max int,
  objectives text[] not null default '{}'::text[],
  stripe_price_id text,
  drip_schedule jsonb not null default '{}'::jsonb,
  workflow_status text,
  published boolean not null default false,
  module_ids text[] not null default '{}'::text[],
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists package_metadata_published_idx
  on public.package_metadata (published)
  where published = true;

create index if not exists package_metadata_skills_idx
  on public.package_metadata using gin (skills);

alter table public.package_metadata enable row level security;

create policy package_metadata_select_published
  on public.package_metadata
  for select
  to authenticated
  using (published = true or public.is_admin(auth.uid()));

grant select on public.package_metadata to authenticated;
grant all on public.package_metadata to service_role;

create trigger package_metadata_set_updated_at
  before update on public.package_metadata
  for each row execute function public.set_updated_at();

------------------------------------------------------------------------------
-- sanity_webhook_events  (idempotent Sanity webhook processing)
------------------------------------------------------------------------------

create table if not exists public.sanity_webhook_events (
  id text primary key,
  event_type text not null,
  sanity_document_id text,
  received_at timestamptz not null default now()
);

alter table public.sanity_webhook_events enable row level security;

grant all on public.sanity_webhook_events to service_role;

------------------------------------------------------------------------------
-- rag_embedding_jobs  (queue for STORY-11.4 embedding worker)
------------------------------------------------------------------------------

create type public.rag_embedding_job_status as enum (
  'pending',
  'processing',
  'done',
  'canceled',
  'failed'
);

create table if not exists public.rag_embedding_jobs (
  id uuid primary key default gen_random_uuid(),
  sanity_document_id text not null,
  status public.rag_embedding_job_status not null default 'pending',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists rag_embedding_jobs_pending_idx
  on public.rag_embedding_jobs (status, created_at)
  where status = 'pending';

create index if not exists rag_embedding_jobs_document_idx
  on public.rag_embedding_jobs (sanity_document_id, created_at desc);

alter table public.rag_embedding_jobs enable row level security;

grant all on public.rag_embedding_jobs to service_role;

create trigger rag_embedding_jobs_set_updated_at
  before update on public.rag_embedding_jobs
  for each row execute function public.set_updated_at();
