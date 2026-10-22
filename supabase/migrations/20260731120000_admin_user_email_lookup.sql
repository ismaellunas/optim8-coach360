-- STORY-12.1 (resolved, QA3-10) — admin can view real user emails.
--
-- profiles has no email column (confirmed by grep across migrations); the
-- real email lives in auth.users. Rather than expose a raw auth.users
-- select to authenticated/anon, add a SECURITY DEFINER RPC gated to admins
-- only, mirroring the existing admin-check pattern (get_billing_revenue_summary)
-- and the existing auth.users join precedent (lookup_profile_id_by_email).
--
-- View-only for Phase 1 (resolved decision) — no admin-initiated email change
-- here; editing auth email has re-verification implications that are a
-- separate, bigger feature.

create or replace function public.admin_list_user_emails(p_profile_ids uuid[])
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role public.app_role;
  result jsonb;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select role into caller_role from public.profiles where id = auth.uid();
  if caller_role is distinct from 'admin' then
    raise exception 'admin_required';
  end if;

  select coalesce(jsonb_object_agg(u.id, u.email), '{}'::jsonb)
    into result
  from auth.users u
  where u.id = any(p_profile_ids);

  return result;
end;
$$;

revoke all on function public.admin_list_user_emails(uuid[]) from public;
grant execute on function public.admin_list_user_emails(uuid[]) to authenticated;
