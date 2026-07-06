-- Client table grants — RLS controls rows; roles still need table-level access.
-- Without these, PostgREST returns "permission denied for table …" before RLS runs.

grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on all tables in schema public to anon;

grant usage, select on all sequences in schema public to authenticated;
