# STORY-7.3 fix plan — Coach progress review and feedback loop

> **Status today:** DONE (tracker) — all items implemented and tested: Home stats bar wired to real data (Record dropped), and team manager AI Insights/Progress now routes to a dedicated operational view instead of the player-shaped screen's permanent lock.
> **QA evidence:** docs/Coach_Feedback.docx (team/pro account section)
> **Related:** docs/index.html (tracker), docs/bug-investigations.md (QA2-04), [story-7.4-fix-plan.md](./story-7.4-fix-plan.md) (same shared component, player-role slice)

## What QA reported

Team account (Fold7, team/pro):
> "Dashboard: Pro activated, objectives on dash still say upgrade to pro [...] Stats not linked. AI insights not linked."

(The "objectives still say upgrade to pro" part is **BUG-QA3-07**, out of scope for this doc — see the STORY-5.2/5.4 fix plan. This doc covers only the "Stats not linked. AI insights not linked." part for the team role.)

## Acceptance criteria at risk

None of STORY-7.3's own ACs (AC-1 through AC-4, all about `CoachProgressReviewScreen.jsx` — coach-at-Advanced+ viewing player drill completions, filtering, DM feedback, assigning corrective drills) describe a "Home screen stats bar" or "AI Insights" card at all. **This story is arguably not the right owner of this bug** — see Open Questions. It's included here only because `BUG-QA2-04` set the precedent of blocking STORY-7.3 for the shared coach/team Home-screen mock-data issue, and I'm following that precedent rather than silently reassigning it.

## Root cause (confirmed in code)

1. **Top stats bar (team slice)** — same shared `HomeScreen` function as the player slice, `apps/mobile/src/App.jsx:247-248`:
   ```js
   : isTeam ? [{ l: "Players", v: "14" }, { l: "Record", v: "10-1" }, { l: "Sessions", v: "32" }, { l: "Next", v: "Thu" }]
   ```
   100% hardcoded literals, no `onClick`, no repo call — identical pattern and identical root cause to the player slice (`story-7.4-fix-plan.md`) and to the original coach-only `BUG-QA2-04` finding. One fix to the shared `HomeScreen` component resolves all three roles' stats-bar complaints at once; they should not be fixed three separate times.

2. **AI Insights card — confirmed root cause is NOT in this component.** For team/Pro: `FEATURE_TIER_REQUIREMENTS.ai = { coach: 'pro', player: 'pro', team: 'pro' }` (`packages/domain/src/subscription/paywall.ts:28`) — so `canAccess(user, "ai")` is `true`, the card is unlocked, and it **is** clickable: `onClick` → `tryA("ai", () => go("progress"))` (`App.jsx:320-329`).

   Tracing where that click actually goes for a team user is the real finding: `App.jsx:755` only special-cases `screen === "progress" && user.role === "coach"` (renders `CoachProgressReviewScreen`); every other role, including `team`, falls through to the generic `<ProgressScreen>` at `App.jsx:779`. Inside `ProgressScreen.jsx:66-68`:
   ```js
   const accessLevel = user ? featureAccessLevel(user.role, user.tier, 'viewProgress') : 'none';
   ```
   `FEATURE_TIER_REQUIREMENTS.viewProgress` is defined as `{ coach: 'basic', player: 'basic' }` (`packages/domain/src/subscription/paywall.ts:36`) — **there is no `team` key**. `resolveLaunchFeatureAccess` (`packages/domain/src/rbac/launch-matrix.ts:110-156`) has no `LAUNCH_ACCESS_BANDS.viewProgress.team` band either (only `player`/`coach`, `launch-matrix.ts:67-72`), so for role `team` it hits `if (!band && !minFromMap) return { allowed: false, accessLevel: 'none', requiredTier: null }` unconditionally — **permanently denied regardless of tier**, with no `requiredTier` to even point at an upgrade. `ProgressScreen.jsx:141-179` then renders the "Upgrade to Pro to unlock your full progress dashboard" tier-locked state.

   So: the AI Insights card itself is correctly wired and clickable; the dead end a team user hits is actually the **same missing-team-role bug class as QA3-07** (a role simply absent from a feature-tier requirements map), just surfacing on `viewProgress` instead of `objectives`. This is almost certainly owned by STORY-5.2 ("Launch-critical access matrix rules") / STORY-5.4, not this story — flagging for that fix plan rather than duplicating it here.

## Fix plan

1. **Top stats bar (team slice) — resolved, implemented:** `HomeScreen`'s team branch now fetches the team manager's team (`repos.teams.listForUser`), active roster count (`repos.rosters.listMembers`), and upcoming sessions (`repos.sessions.listForUser`), replacing the hardcoded array. "Record" dropped entirely (no win/loss concept exists). Tiles: Players (roster count, → Roster tab), Sessions (upcoming count, → Schedule), Next (next session's weekday, → Schedule) — all clickable.
2. **AI Insights for team — resolved, implemented, smaller fix than expected:** the dead end wasn't actually a `viewProgress`/`FEATURE_TIER_REQUIREMENTS` gap that needed a paywall-map edit — `canAccess(user, "ai")` was already `true` for team/Pro, so no tier change was needed. The fix is routing: `App.jsx` now special-cases `screen === "progress" && user.role === "team"` (mirroring the existing coach special-case) to render a dedicated `TeamProgressScreen` instead of falling through to the player-shaped `ProgressScreen`, which is what hit the permanent `viewProgress` lock. `FEATURE_TIER_REQUIREMENTS.viewProgress` was left unchanged since nothing else gates this new screen on it.
3. **Team manager Progress/AI Insights view (resolved — option (c); implemented, scaled to real data):** new `TeamProgressScreen.jsx` — team roster size, upcoming session count, and team-scope objectives (reusing the same `repos.objectives.listForUser(userId, 'team')` call and progress-bar pattern from `ObjectivesScreen`). **Scaled down from the original resolved answer:** attendance/RSVP rates and "who hasn't opened the app" engagement signals were NOT built — no attendance/RSVP/last-active tracking exists anywhere in this schema (confirmed by grep), so that's new instrumentation work, not a wiring fix. Flagged as a new open question rather than fabricated. Explicitly excludes individual performance data, skill assessments, and coach feedback, consistent with the resolved privacy boundary.

## Verification plan

- `npm run test:story-7.3`: 6/6 passing (4 original + 2 new: Home stats bar team-slice real-data wiring, `TeamProgressScreen` routing + data-source assertions).
- Full suite (`npx vitest run`): 250/260 non-skipped passing, same 7 pre-existing unrelated failures as before this change.
- `eslint` on changed files: 0 errors.
- Manual re-test (not done — no live device/account in this session): team/pro account on Fold7 — confirm Home stats bar reflects real roster/session data and is tappable, confirm tapping AI Insights lands on the new team progress view (not a locked player-shaped dashboard).

## Resolved decisions

- **Story ownership:** keep the current precedent — STORY-7.3 owns the team-slice fix, consistent with the same decision on STORY-7.4's identical question. Not reassigned to a new story.
- **Team "Record" stat:** dropped — no win/loss/scoring concept exists anywhere in this codebase.
- **Team manager AI Insights/Progress:** option (c) — a purpose-built team-scoped operational view, not an aggregate copy of the player view and not a locked card. Implemented, scoped to real available data (see Fix plan item 3 for what's deliberately not built).

## Open questions — new, discovered during implementation

- **Should attendance/RSVP tracking and "who hasn't opened the app" engagement signals be built as new features?** Not possible today — no instrumentation exists anywhere in this schema. This is genuinely new scope (a new table, UI for marking attendance, last-active tracking), not something fixable within this bug-fix pass. The current `TeamProgressScreen` covers roster/sessions/objectives only.
