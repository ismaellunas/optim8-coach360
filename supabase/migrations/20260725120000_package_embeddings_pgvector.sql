-- STORY-11.4 — package embeddings (pgvector) + similarity RPC

create extension if not exists vector with schema extensions;

------------------------------------------------------------------------------
-- package_embeddings  (one vector per published Sanity trainingPackage)
------------------------------------------------------------------------------

create table if not exists public.package_embeddings (
  sanity_document_id text primary key
    references public.package_metadata (sanity_document_id)
    on delete cascade,
  content_text text not null,
  embedding extensions.vector(1024) not null,
  model_id text not null default 'mistral-embed',
  embedded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Cosine HNSW index (operator class lives with the vector extension).
create index if not exists package_embeddings_embedding_hnsw_idx
  on public.package_embeddings
  using hnsw (embedding extensions.vector_cosine_ops);

alter table public.package_embeddings enable row level security;

create policy package_embeddings_select_published
  on public.package_embeddings
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.package_metadata pm
      where pm.sanity_document_id = package_embeddings.sanity_document_id
        and (pm.published = true or public.is_admin(auth.uid()))
    )
  );

grant select on public.package_embeddings to authenticated;
grant all on public.package_embeddings to service_role;

create trigger package_embeddings_set_updated_at
  before update on public.package_embeddings
  for each row execute function public.set_updated_at();

------------------------------------------------------------------------------
-- match_package_embeddings — cosine similarity top-k (AC-4: 5–10)
------------------------------------------------------------------------------

create or replace function public.match_package_embeddings(
  query_embedding extensions.vector(1024),
  match_count int default 8,
  match_threshold float default 0
)
returns table (
  sanity_document_id text,
  content_text text,
  similarity float
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select
    pe.sanity_document_id,
    pe.content_text,
    (1 - (pe.embedding <=> query_embedding))::float as similarity
  from public.package_embeddings pe
  inner join public.package_metadata pm
    on pm.sanity_document_id = pe.sanity_document_id
  where pm.published = true
    and (1 - (pe.embedding <=> query_embedding)) >= match_threshold
  order by pe.embedding <=> query_embedding
  limit greatest(5, least(coalesce(nullif(match_count, 0), 8), 10));
$$;

grant execute on function public.match_package_embeddings(
  extensions.vector(1024),
  int,
  float
) to service_role;

grant execute on function public.match_package_embeddings(
  extensions.vector(1024),
  int,
  float
) to authenticated;
