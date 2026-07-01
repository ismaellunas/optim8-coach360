-- STORY-1.3 — Block self-service role and suspension changes (security prerequisite).
-- Non-admin users may update profile fields but not role or is_suspended.

create or replace function public.prevent_profile_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if public.is_admin(auth.uid()) then
    return new;
  end if;

  if new.role is distinct from old.role then
    raise exception 'role_change_forbidden'
      using errcode = '42501',
            hint = 'Only admins may change user roles.';
  end if;

  if new.is_suspended is distinct from old.is_suspended then
    raise exception 'suspension_change_forbidden'
      using errcode = '42501',
            hint = 'Only admins may change suspension status.';
  end if;

  return new;
end;
$$;

create trigger profiles_prevent_privilege_escalation
  before update on public.profiles
  for each row
  execute function public.prevent_profile_privilege_escalation();
