# STORY-7.3 fix plan — Coach progress review and feedback loop

> **Status today:** DONE (tracker) — reopened, contradicted by BUG-QA3-08
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

1. **Top stats bar (team slice):** Same fix as the player slice — replace the hardcoded team array (`App.jsx:248`) with real aggregates (active roster count, win/loss record if that data exists anywhere — see Open Questions, it may not — upcoming session count from `repos.sessions`). Coordinate with [story-7.4-fix-plan.md](./story-7.4-fix-plan.md) so this isn't implemented twice against the same function.
2. **AI Insights for team:** No fix needed in this component once the `viewProgress` (and by extension `objectives`) requirements map gets a `team` entry — that's the actual blocker. Cross-reference the STORY-5.2/5.4 fix plan; don't duplicate the RBAC fix here.
3. Once the RBAC fix lands, verify `ProgressScreen.jsx` actually renders something sensible for a team-manager role — right now even its "full" branch (`statCards`, `features.canViewTrends` Coach Feedback block) is written entirely in player-progress terms ("Drills completed," "Practice minutes," "Coach Feedback"). A team manager isn't a player with drill completions — giving them `accessLevel: 'full'` on `viewProgress` without a team-specific view would just replace one broken screen with a nonsensical one. See Open Questions.

## Verification plan

- Existing tests to re-run: `npm run test:story-7.3` (unaffected — none of its ACs touch this code path) and whatever RBAC test suite covers `viewProgress`/`FEATURE_TIER_REQUIREMENTS` once STORY-5.2/5.4 add a team entry.
- New test cases needed: an assertion (likely in `tests/rbac/`) that `featureAccessLevel('team', 'pro', 'viewProgress')` resolves to something other than a permanent `'none'`; a Home-screen test asserting the team stats grid is wired to real data, mirroring whatever gets added for the player slice.
- Manual re-test: team/pro account on Fold7 — confirm stats bar reflects real roster/session data, and confirm tapping AI Insights lands on a screen that makes sense for a team manager (not a player-shaped progress dashboard).

## Open questions — need confirmation before implementing

- **Is STORY-7.3 the right owner at all?** Its description and every AC are about the coach's player-progress-review screen, not the Home screen or team role. Should this bug instead sit under a renamed/new story for "Home screen live data across roles," rather than being bolted onto STORY-7.3 by precedent? I'm not reassigning tracker ownership without confirmation.
- **Team "Record" stat (`10-1`)** — I found no win/loss, game-result, or scoring concept anywhere in `packages/domain` or the Supabase schema. Is this a real feature that hasn't been built yet, or should "Record" be dropped from the team stats bar entirely?
- **What should a team manager see when they tap "AI Insights" / "Progress"?** The existing `ProgressScreen` is written entirely around an individual player's drill completions. Does a team manager get: (a) an aggregate team-progress view (new screen, new scope), (b) nothing (card should be hidden/locked for team role instead of fixed), or (c) something else? This determines whether the fix is "add team to the requirements map" or "build a new team-progress screen" — materially different scope, not something to assume.
