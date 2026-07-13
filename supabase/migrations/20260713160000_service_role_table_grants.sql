-- Service role needs table-level grants for PostgREST (seed scripts, edge functions).
-- RLS is bypassed by service_role, but GRANT is still required.
-- Complements 20260706150000_authenticated_table_grants.sql (anon/authenticated only).

grant usage on schema public to service_role;

grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

alter default privileges in schema public
  grant select, insert, update, delete on tables to service_role;

alter default privileges in schema public
  grant usage, select on sequences to service_role;
