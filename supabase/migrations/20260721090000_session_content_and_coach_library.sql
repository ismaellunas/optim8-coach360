-- STORY-6.2 — session content attachment (OQ-3.3 both, OQ-3.4 package as unit).
--
-- sessions.content_refs already exists (jsonb default []). This migration adds a
-- provisional coach personal library until Sanity / STORY-9.x lands.

create table if not exists public.coach_library_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('drill', 'video', 'strategy', 'package')),
  title text not null check (char_length(trim(title)) > 0),
  created_at timestamptz not null default now()
);

create index if not exists coach_library_items_owner_id_idx
  on public.coach_library_items (owner_id);

alter table public.coach_library_items enable row level security;

drop policy if exists coach_library_items_owner_select on public.coach_library_items;
create policy coach_library_items_owner_select
  on public.coach_library_items for select
  using (owner_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists coach_library_items_owner_insert on public.coach_library_items;
create policy coach_library_items_owner_insert
  on public.coach_library_items for insert
  with check (owner_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists coach_library_items_owner_update on public.coach_library_items;
create policy coach_library_items_owner_update
  on public.coach_library_items for update
  using (owner_id = auth.uid() or public.is_admin(auth.uid()))
  with check (owner_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists coach_library_items_owner_delete on public.coach_library_items;
create policy coach_library_items_owner_delete
  on public.coach_library_items for delete
  using (owner_id = auth.uid() or public.is_admin(auth.uid()));

grant select, insert, update, delete on public.coach_library_items to authenticated;
grant all on public.coach_library_items to service_role;

comment on column public.sessions.content_refs is
  'Ordered session content refs: [{kind, source, id, title, sortOrder}]. source=library|purchase; kind may be package as a single unit (OQ-3.4).';
