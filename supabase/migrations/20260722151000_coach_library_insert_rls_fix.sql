-- STORY-9.2 follow-up: fix coach_library_items insert RLS mismatches.
-- Default owner_id from JWT so client inserts cannot pass a stale/mismatched id.

alter table public.coach_library_items
  alter column owner_id set default auth.uid();

-- Keep policies explicit for authenticated role (same rules, clearer WITH CHECK).
drop policy if exists coach_library_items_owner_insert on public.coach_library_items;
create policy coach_library_items_owner_insert
  on public.coach_library_items for insert
  to authenticated
  with check (owner_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists coach_library_items_owner_select on public.coach_library_items;
create policy coach_library_items_owner_select
  on public.coach_library_items for select
  to authenticated
  using (owner_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists coach_library_items_owner_update on public.coach_library_items;
create policy coach_library_items_owner_update
  on public.coach_library_items for update
  to authenticated
  using (owner_id = auth.uid() or public.is_admin(auth.uid()))
  with check (owner_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists coach_library_items_owner_delete on public.coach_library_items;
create policy coach_library_items_owner_delete
  on public.coach_library_items for delete
  to authenticated
  using (owner_id = auth.uid() or public.is_admin(auth.uid()));
