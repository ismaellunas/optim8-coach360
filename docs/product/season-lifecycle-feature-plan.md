# Season lifecycle (archive + rollover) — feature plan

> **Status:** Proposed — awaiting stakeholder decision. Not yet a tracker story.
> **Source:** `docs/Coach_Feedback.docx` — "Team creation — Season start / end – what happens next season?" (unanswered in `docs/delivery/open-questions.xlsx`).
> **Related:** [`flows.md`](./flows.md) (Flow 11, Team Management), `docs/bug-investigations.md` ("Not bugs" — Season start/end), `docs/delivery/story-7.3-fix-plan.md` / `story-7.4-fix-plan.md` (house style this doc follows).
> **Research:** industry pattern survey — TeamSnap, PlayHQ, Synergy Sports, Teamo, MonClubSportif (citations at bottom).

## Why this doc exists

`season_start`/`season_end` on the team profile is a client-specified field (confirmed verbatim in `Coach360_Complete_Flows-latest.docx`: "Configure Settings → Age range, season dates"), so the field itself is correctly scoped. What was never specified — and what the client's own feedback doc explicitly asks about — is what happens when a season ends. This doc proposes how to close that gap.

## Current state (confirmed in code)

- `teams.season_start` / `teams.season_end` — nullable `date` columns added in `supabase/migrations/20260706155000_team_profile_fields.sql` (STORY-3.1), with a single check constraint (`season_start <= season_end`).
- `packages/domain/src/team/schema.ts` — only validates the date range; no other business rule touches these fields.
- `apps/mobile/src/features/team/ui/TeamProfileForm.jsx` — two editable date inputs, nothing else.
- An admin RPC (`supabase/migrations/20260726200000_admin_onboarding_and_team_oversight.sql`) can also set these fields, but no admin UI surfaces it.
- **No code anywhere filters, archives, or rolls over based on these dates.** One `teams` row = one mutable season window for the life of the team. When a season ends, nothing happens; a coach who wants a "new season" has no path except manually overwriting the same two dates on the same row.

## Industry pattern (researched)

Every comparable app in this category (TeamSnap, PlayHQ, Synergy Sports, Teamo, MonClubSportif) separates this into two distinct features, not one:

1. **Archive** — when a season ends, the team/season moves to a read-only state: roster, schedule, and chat history stay viewable, but new events/players can't be added. Treated as a deliberate, usually irreversible action (TeamSnap explicitly prompts a final roster check before archiving, since it can't be undone). Players removed from the active roster keep read access to the archived season they were actually part of, but lose access to the new active season until re-added.
2. **Rollover** — a "Start new season" action lets the coach *selectively* carry forward chosen data (typically: roster, team settings) into a new season record. The event schedule and historical availability/attendance records are **not** carried forward automatically — they stay with the season that produced them.

## Two implementation options

### Option A — Lightweight: "Archive team" only, no season entity

- Add an `archived_at timestamptz` column to `teams`.
- An archived team: roster and schedule screens become read-only for it; it's excluded from the active "my teams" list and from Home stats aggregation (`loadCoachHomeData`/`loadTeamHomeData` in `App.jsx` would filter `archived_at is null`).
- No automated rollover. To start a clean season, the coach creates a **new** team via the existing `createTeam` flow and re-invites players by email (`addPlayerByEmail` already supports linking an existing account with zero friction — confirmed in the earlier roster investigation).
- **Effort: small.** One migration, an "Archive team" action + confirmation in `TeamProfileForm.jsx`/`RosterScreen.jsx`, a filter added to the handful of existing `repos.teams.listForUser` call sites.
- **Trade-off:** no roster carry-forward automation — re-inviting an existing roster to a new team is manual (though low-friction, since it's just re-adding by email, not recreating accounts).

### Option B — Full season entity (the industry-standard pattern)

- New `team_seasons` table: one-to-many from `teams` (`team_id`, `season_start`, `season_end`, `archived_at`).
- Roster membership and session history become scoped to a season, or are explicitly copied forward on rollover.
- A "Start new season" action creates a new `team_seasons` row and offers to copy the active roster forward (matching TeamSnap/Synergy's "pick what carries over" pattern, not a blind duplicate).
- Past-season schedule/roster stays attached to the season it was created under and remains viewable (read-only) after archiving.
- **Effort: large.** New table + RLS policies, a real schema change to how rosters/sessions associate to a team (or a roster-copy mechanism), a season-switcher UI, and a migration path for every existing team's single season into the new model.

## Recommendation

**Option A for now.** It directly answers the client's question ("what happens next season?" → "archive it, start a new team for the new season") with a small, low-risk change, and it doesn't foreclose Option B — Option B is a strict superset that can be layered in later without discarding Option A's archive concept (the `archived_at` column and the archive action both carry forward unchanged). Recommend Option B only if the client specifically needs season-by-season historical roster/schedule separation within the *same* team identity (e.g. "show me this team's 2025 season roster side-by-side with 2026") — that's a real requirement to confirm, not assume.

## Open questions for stakeholder sign-off

- **Option A or B?** (see trade-offs above)
- If roster re-invitation for a new season is manual (Option A): is that acceptable, or does the client expect one-click roster carry-forward?
- Does archiving need to be reversible (un-archive) for MVP, or can it be permanent, matching TeamSnap's model?
- Should archived teams be visible anywhere in the UI at all for MVP, or is "retained in the DB, not shown in-app" acceptable for now?

**Next step:** log this as a new row in `docs/delivery/open-questions.xlsx` (not done in this pass — this doc is the proposal to attach to that question, not a substitute for getting it formally answered).

## Draft acceptance criteria (Option A, pending sign-off)

1. A coach (team owner) can archive a team from `TeamProfileForm.jsx`, with a confirmation step surfacing that the action is final (or explicitly reversible, per the open question above).
2. An archived team no longer appears in the active team list, Home stats aggregation, or the roster/schedule "add" actions, but its roster and past schedule remain viewable read-only.
3. Creating a new team and re-inviting existing players by email continues to work unchanged (already shipped — STORY-3.1 / roster invite flow).
4. Admin oversight (`apps/admin`) can view archived status alongside existing team management, consistent with the existing `admin_update_team` RPC already touching these fields.

## Verification plan (once an option is chosen and implemented)

- Domain/API: `npm run typecheck` on `packages/domain` and `packages/api` after the schema/port changes.
- Mobile: `npm run lint && npm run build`.
- New test file under `tests/team/` following this repo's static-analysis convention (read source + assert expected calls/UI), covering: archive action exists and is wired to a repo call, archived teams are excluded from active-list queries, roster/schedule stay readable for an archived team.
- Full suite: `npm test`.
- Manual device check: archive a team, confirm it disappears from Home stats/active Roster, confirm its roster is still viewable, confirm a new team + re-invite flow works end-to-end.

## Sources

- [TeamSnap — Archiving a team season](https://helpme.teamsnap.com/article/1836-archiving-a-team-season)
- [TeamSnap — Accessing archived or retired seasons](https://helpme.teamsnap.com/article/444-accessing-archived-or-retired-seasons)
- [PlayHQ — Introducing Season Rollover](https://playhq.com/au/newsroom/introducing-season-rollover)
- [MonClubSportif — Archive season (desktop)](https://monclubsportif.com/kb/en/archive-season-desktop-version)
- [Synergy Sports — Season Player Roster](https://support.synergysports.com/support/solutions/articles/77000569394-season-player-roster)
- [Teamo — Feature focus: new season](https://teamo.chat/tweb/blog/feature-focus-new-season.jsp)
