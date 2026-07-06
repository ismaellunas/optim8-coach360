-- STORY-2.1/2.2 — Persist self-signup role from auth metadata at profile creation.
-- Users cannot change role after insert (see prevent_profile_privilege_escalation).

create or replace function public.parse_signup_role(raw text)
returns public.app_role
language plpgsql
immutable
as $$
begin
  case raw
    when 'coach' then return 'coach'::public.app_role;
    when 'player' then return 'player'::public.app_role;
    when 'team_manager' then return 'team_manager'::public.app_role;
    when 'admin' then return 'admin'::public.app_role;
    else
      raise exception 'invalid_signup_role'
        using errcode = '22023',
              hint = 'role metadata must be coach, player, team_manager, or admin';
  end case;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  signup_role text;
begin
  signup_role := nullif(trim(new.raw_user_meta_data ->> 'role'), '');
  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', new.email),
    public.parse_signup_role(coalesce(signup_role, 'player'))
  );
  return new;
end;
$$;
