-- STORY-7.1 — per-player session content completion tracking

create table if not exists public.session_content_completions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  player_id uuid not null references public.profiles (id) on delete cascade,
  content_key text not null check (char_length(trim(content_key)) > 0),
  completed_at timestamptz not null default now(),
  unique (session_id, player_id, content_key)
);

create index if not exists session_content_completions_session_player_idx
  on public.session_content_completions (session_id, player_id);

alter table public.session_content_completions enable row level security;

drop policy if exists session_content_completions_player_select on public.session_content_completions;
create policy session_content_completions_player_select
  on public.session_content_completions for select
  using (
    player_id = auth.uid()
    or exists (
      select 1
      from public.sessions s
      where s.id = session_id
        and (
          s.coach_id = auth.uid()
          or public.is_admin(auth.uid())
        )
    )
  );

drop policy if exists session_content_completions_player_insert on public.session_content_completions;
create policy session_content_completions_player_insert
  on public.session_content_completions for insert
  with check (
    player_id = auth.uid()
    and exists (
      select 1
      from public.sessions s
      where s.id = session_id
        and (
          s.player_id = auth.uid()
          or (
            s.team_id is not null
            and public.is_team_member(s.team_id, auth.uid())
          )
        )
    )
  );

drop policy if exists session_content_completions_player_update on public.session_content_completions;
create policy session_content_completions_player_update
  on public.session_content_completions for update
  using (player_id = auth.uid())
  with check (player_id = auth.uid());

grant select, insert, update on public.session_content_completions to authenticated;
grant all on public.session_content_completions to service_role;

comment on table public.session_content_completions is
  'Per-player completion for session content refs (key = kind:source:id).';
