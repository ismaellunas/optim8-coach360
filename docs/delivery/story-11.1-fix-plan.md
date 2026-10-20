# STORY-11.1 fix plan — Objectives UI — coach set, player view

> **Status today:** DONE (tracker) — reopened, contradicted by BUG-QA3-01, BUG-QA3-02, BUG-QA3-07
> **QA evidence:** docs/Coach_Feedback.docx (coach, player, and team account sections)
> **Related:** docs/index.html (tracker), docs/bug-investigations.md (QA2-04, already resolved-as-explained, background only)

## What QA reported

- Coach: "Dashboard objectives no linked" / "Dashboard objectives not clickable" / "Where do I set the objectives?"
- Player (player/pro account): "Objectives not linked or clickable." / "Suggested objectives slow to load. Should be able to add my own as well."
- Team (team/pro account): "Pro activated, objectives on dash still say upgrade to pro."

## Acceptance criteria at risk

- **AC-1** "Coach at Pro sets objectives for individual players and teams" — not contradicted. `ObjectivesScreen` (`apps/mobile/src/features/objectives/ui/ObjectivesScreen.jsx:93,391,541`) gates the create form on `isCoach` and fetches/saves via `repos.objectives`. This works as designed; the coach complaint is about the **Home dashboard preview card**, not this screen (see Root cause).
- **AC-2** "Player at Pro views assigned objectives and progress rings" — **partially at risk**. `ObjectivesScreen` itself loads real data (`repos.objectives.listForUser(userId, role)`, `ObjectivesScreen.jsx:123`) and renders `ObjectiveProgressRing` for real rows — that part holds up. But the **Home screen's "Objectives" preview card**, which is what QA actually saw first, is hardcoded mock data for every role (see below), which is what "not linked" most likely refers to.
- **AC-4** "Objective schema supports player and team goals ... (details TBD post-MVP if needed)" — the "TBD post-MVP" clause directly covers QA3-02's "add my own" ask; see Open Questions.

## Root cause (confirmed in code)

1. **Home "Objectives" preview card is hardcoded for every role**, not just coach. `apps/mobile/src/App.jsx:386-411`:
   - Line 389: `{canAccess(user, "objectives") ? "Manage" : "Pro"}` — the header link.
   - Lines 391-404: when access is granted, the component renders a **literal hardcoded array** — `[{ n: "Improve 3PT %", p: 72, ... }, { n: "Defensive rotations", p: 45, ... }]` — not `repos.objectives` data, for coach, player, *and* team alike. This block is not branched by `isPlayer`/`isTeam` the way the "Upcoming" section above it (`App.jsx:355-383`) is.
   - The rendered mock cards also carry **no `onClick`** (lines 393-403) — only the "Manage" label (line 389) navigates to `ObjectivesScreen`. So even when unlocked, the preview cards themselves are inert, matching the "not clickable" complaint literally.
   - This is the same category of defect as the already-resolved-as-explained QA2-04 (coach Home stats/upcoming/objectives are mock data) — QA2-04's notes say "Player home progress/schedule is live," but that referred to the **Upcoming** section only; the Objectives preview card was never covered by that fix and remains fake for all roles.

2. **Team role is unconditionally denied the `objectives` feature regardless of tier — this is the real cause of QA3-07**, not a tier/bug in the access-check logic itself:
   - `packages/domain/src/subscription/paywall.ts:26`: `objectives: { coach: 'pro', player: 'pro' }` — **there is no `team` key**.
   - `packages/domain/src/rbac/launch-matrix.ts:110-156` (`resolveLaunchFeatureAccess`): for `feature: 'objectives', role: 'team'`, `LAUNCH_ACCESS_BANDS['objectives']` is undefined (not in that table, `launch-matrix.ts:52-76`) and `reqs['objectives']?.['team']` is `undefined`. Both being falsy hits `launch-matrix.ts:126-128`: `if (!band && !minFromMap) return { allowed: false, accessLevel: 'none', requiredTier: null }`.
   - `apps/mobile/src/App.jsx:84-92` (`canAccess`) calls this directly with `user.role` — for a team-manager account `user.role === "team"` (`App.jsx:175`), so `canAccess(user, "objectives")` is **always `false`**, independent of `user.tier`. That is exactly "Pro activated, objectives on dash still say upgrade to pro": the UI isn't mis-reading the tier, the feature is simply never granted to the `team` role at any tier today.
   - This is **not a STORY-5.2 defect** — STORY-5.2's own ACs (chat AC-1, AI AC-2, content-creation AC-3, ◎/○ bands AC-4, deferred-matrix AC-5) never mention `objectives`; the `objectives` row in `FEATURE_TIER_REQUIREMENTS` predates/sits outside that story's AC scope. STORY-5.2 does not need reopening for this. Recommend confirming this with the user before closing it back to DONE, since I'm inferring scope from AC text rather than a change-log.
   - STORY-11.1's own title is literally "coach set, **player** view" — the AC-1 phrase "sets objectives for individual players and **teams**" is about the *target* of an objective (a team-wide goal), not about the Team Manager *role* being able to view the Objectives screen. So today's behavior (team role has zero access) may be exactly as designed, not a regression — see Open Questions.

3. **No player-authored objectives**: `ObjectivesScreen.jsx:391,541` gate the entire create/edit form on `isCoach` (`role === 'coach'`, line 93). There is no code path for a player (or team) to create their own objective. This matches QA3-02's "should be able to add my own as well" exactly — it was never built, consistent with AC-4's "TBD post-MVP" language.

4. **Suggestions "slow to load" (QA3-02) — confirmed, not just plausible.** `loadSuggestions` (`ObjectivesScreen.jsx:135-185`) awaits `repos.marketplacePurchases.listOwned()` (line 147) *then* `repos.packageRecommendations.listRecommendations(...)` (line 164), which calls the `recommend-packages` Edge Function. That function (`supabase/functions/recommend-packages/index.ts:184,239-240`) makes **two sequential external Mistral API calls per request** when `aiConfig.llmRerankEnabled` is true: `await embedTextWithMistral(queryText)` (line 184), then `await rerankPackagesWithMistral(providerPayload)` (line 239-240). `llmRerankEnabled` defaults to `true` (`supabase/functions/recommend-packages/handler.ts:100-107`, `DEFAULT_AI_RECOMMENDATION_CONFIG`). Two sequential external LLM calls plus the client-side serial awaits is a fully sufficient, confirmed explanation for the reported slowness — no further measurement needed to establish *that* it's slow, only to quantify by how much.
   - **This directly contradicts STORY-11.2's own `audit_notes`**, which states "No RAG/LLM (11.3/11.4)" — see the STORY-11.2 fix plan for that discrepancy; it's out of this document's scope to resolve but it changes the fix (disable/short-circuit the LLM path vs. just reordering client awaits).

## Fix plan

1. **Wire the Home "Objectives" preview card to real data**, mirroring how the "Upcoming" section already branches per role (`App.jsx:355-383`):
   - Replace the hardcoded array (`App.jsx:392`) with the same `repos.objectives.listForUser(userId, role)` call `ObjectivesScreen` already uses, scoped to whatever subset of objectives already exists at render time for Home (e.g. top 2 by recency).
   - Make the rendered cards clickable (`onClick` → `go("objectives")`), not just the header "Manage" label.
   - Do this for all three roles consistently — don't special-case player/coach again, since the underlying bug is "this block was never touched," not "player data is wrong."
2. **Team objectives access** — hold until Open Questions below are answered; two candidate fixes depending on the answer:
   - (a) Add `team: 'pro'` (or another tier the product team specifies) to `FEATURE_TIER_REQUIREMENTS.objectives` in `paywall.ts:26`, **or**
   - (b) Confirm/fix the admin feature-gating screen (STORY-5.3 scope) so an admin can add a `(objectives, team)` override through `FeatureFlagOverride` without a code change — `GATED_ROLES` (`paywall.ts:79`) already includes `'team'`, so the override mechanism itself supports it; the gap may only be in the admin UI's feature list filtering (`gatedFeaturesForRole`, `paywall.ts:113-129`), which only shows a feature for a role if it already has a default tier or an existing override — i.e. there may be no way to add the *first* override for a (feature, role) pair that was never gated by default. This needs a look at the admin UI (`apps/admin`), which is outside my assigned scope for this document.
3. **Player/team self-authored objectives**: do not build until the Open Question below is resolved — this is explicitly called out as "TBD post-MVP" in the story's own AC-4.
4. **Suggestions latency**: defer the actual fix to the STORY-11.2 plan (it owns `recommend-packages` and the LLM rerank toggle). Client-side, `loadSuggestions` can still parallelize `listOwned()` with the team/age lookups via `Promise.all` before the single `listRecommendations` call, since they don't depend on each other — a small win regardless of the server-side decision.

## Verification plan

- Existing tests to re-run: `npm run test:story-11.1`, `npm run test:story-11.2`, `npm run test:story-5.2`, `npm run test:story-5.4`.
- New test cases needed:
  - Home screen: objectives preview card renders real `repos.objectives` data and is clickable, for coach, player, and team roles (if team is granted access — depends on Open Questions).
  - If team access is added: `test_STORY_11_1_AC1_coach_pro_sets_player_and_team_objectives`-style case for team-role read access, plus a `launch-matrix` unit test asserting `resolveLaunchFeatureAccess({ role: 'team', tier: 'pro', feature: 'objectives' })` is allowed.
- Manual re-test steps: Fold7, team/pro account — confirm Home no longer shows "Upgrade to Pro" once the access decision lands; player/pro account — confirm Home objectives card shows real data and is tappable; confirm "suggestions" load time with a stopwatch against current (unfixed) baseline before claiming a fix.

## Open questions — need confirmation before implementing

- **Was Team Manager ever meant to have any access to the Objectives feature (even read-only), or is "no access at any tier" intentional given STORY-11.1 is scoped as "coach set, player view" with no team-viewer role mentioned anywhere in its ACs?** This decides whether QA3-07 is a bug at all, or whether the fix is "hide the Objectives card entirely for team-manager accounts" instead of unlocking it.
- **If Team Manager should get access: at what tier, and read-only or full (can a team manager set team objectives, or only view what the coach set)?** This determines whether `paywall.ts:26` needs a `team: 'pro'` entry, a different tier, or a `readonlyTiers` band in `LAUNCH_ACCESS_BANDS`.
- **Should STORY-5.2 be reopened too**, since it owns the launch-critical access matrix broadly, even though none of its explicit ACs mention `objectives`? I'm treating STORY-5.2 as not implicated, but that's an inference from AC wording, not a confirmed non-goal.
- **Is player/team self-authored objectives in scope for this reopen, or still "post-MVP" as AC-4 says?** If still deferred, QA3-02's "add my own" half should be logged as a backlog item, not folded into this fix.
- **(Owned by STORY-11.2, flagged here for awareness)** The suggestions latency has a confirmed root cause — two sequential Mistral calls per request — which contradicts STORY-11.2's "No RAG/LLM" audit note. See that story's fix plan for the resolution path.
