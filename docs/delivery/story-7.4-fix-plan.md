# STORY-7.4 fix plan — Player profile and dashboard by tier

> **Status today:** DONE (tracker) — all 4 open questions resolved and implemented except Drills/Streak wiring (see Fix plan item 1); tracker ticket `status` was never actually flipped off DONE (no BUG-QA3-01/BUG-QA3-03 entries exist in `docs/index.html`'s `bugs` array — this reopen only ever lived in `docs/Coach_Feedback.docx` and this fix-plan doc), so no status flip was needed — `verify.tests`/`verify.files`/`audit_notes` updated instead.
> **QA evidence:** docs/Coach_Feedback.docx (player/pro account section)
> **Related:** docs/index.html (tracker), docs/bug-investigations.md (QA2-04), [story-7.3-fix-plan.md](./story-7.3-fix-plan.md) (same shared component, team-role slice)

## What QA reported

Player account (Fold7, player/pro):
> "Dashboard — Top stats bar not updated, clickable or linked. AI insights not linked."
> "Profile: Only manage subscriptions work."

(The adjacent "Objectives not linked or clickable" line from the same feedback block is out of scope here — see the STORY-11.1 fix plan.)

## Acceptance criteria at risk

- **AC-1** "Player home shows schedule summary and progress at minimum" — **not actually at risk.** The schedule/progress sections QA2-04 verified as live (`home-schedule-summary`, `home-progress-summary`, `repos.sessions.listForUser`, `repos.sessionContent.listPlayerProgress`) are a *different* part of the Home screen than the "top stats bar" QA is now complaining about. AC-1 doesn't mention a stats bar or AI insights at all, so this AC's test (`test_STORY_7_4_AC1_...`) still passes correctly — it just never covered the components QA is flagging.
- **AC-2 / AC-3** (Pro/Basic gating) — not contradicted; the gating logic itself works as designed, see Root cause.
- No AC in this story covers Profile's "Edit Profile" / "Notifications" buttons — **resolved**: Edit Profile is being added as new STORY-7.4 scope, Notifications is deliberately out of MVP for now. See Resolved decisions.

## Root cause (confirmed in code)

1. **Top stats bar** — `apps/mobile/src/App.jsx:245-249`, inside shared `HomeScreen`:
   ```js
   var stats = isPlayer
     ? [{ l: "Drills", v: "24" }, { l: "Streak", v: "7d" }, { l: "Goals", v: "3/5" }, { l: "Rank", v: "#4" }]
     : isTeam ? [...] : [...];
   ```
   Rendered at `App.jsx:273-282` as a plain 4-box grid with **no `onClick` at all** and no repo call. For the player role this is 100% hardcoded (`"24"`, `"7d"`, `"3/5"`, `"#4"` are literals) — "not updated, not clickable, not linked" is accurate as reported. This is the *same component and same root cause* as `BUG-QA2-04` (coach dashboard), just never fixed for the player/team branches of the same ternary. Not a regression — QA2-04's original write-up only tested the coach account, so the player/team branches of this one hardcoded array were never caught until this pass.

2. **AI Insights card** — `App.jsx:320-348`. For a Pro player, `canAccess(user, "ai")` is `true` (`FEATURE_TIER_REQUIREMENTS.ai = { coach: 'pro', player: 'pro', team: 'pro' }`, `packages/domain/src/subscription/paywall.ts:28`), so the card **is** clickable (`onClick` → `tryA("ai", () => go("progress"))`) and **is** correctly gated. What's not real is the body copy: `"Your shooting accuracy improved 12% this week."` is a hardcoded string (`App.jsx:335`), not generated from any insight/recommendation repo. **Resolved:** "AI insights not linked" means "not linked to real data," not "not clickable" — the QA account was Pro, where the card is already clickable, so the content-realism reading is the only one consistent with the evidence.

3. **Profile dead buttons** — `apps/mobile/src/features/profile/ui/ProfileScreen.jsx:103-114`:
   ```jsx
   <Card onClick={function () { go('subscription'); }}>Manage Subscription</Card>
   <Card>Edit Profile</Card>
   <Card>Notifications</Card>
   <Card onClick={onSignOut}>Sign Out</Card>
   ```
   "Edit Profile" and "Notifications" have **no `onClick` prop at all** — confirmed dead, not a bug introduced by a change, just never implemented. "Manage Subscription" and "Sign Out" both work, which matches the QA report exactly ("only possible to manage subscriptions" — Sign Out wasn't mentioned as broken either way). This file isn't role-branched for which buttons render, so the same two dead buttons show for coach, player, and team — QA caught it independently in all three account sections of the feedback doc.
   **No story's `verify.files` lists `ProfileScreen.jsx` at all** — I checked every ticket for "edit profile" / "notification setting" and found no owner. This looks like scope that was never assigned to any story, not a regression of STORY-7.4 (whose own verify.files only lists `App.jsx` and its own test file).

## Fix plan

1. **Top stats bar (player slice):** Replace the player branch of the `stats` array (`App.jsx:245-246`) with real aggregates:
   - **Drills (implemented):** wired to `homeProgressSummary.drillsCompleted` (already computed in this component from `completions` via `summarizePlayerProgress`). Clickable (`go("progress")`), `data-testid="home-stat-drills"`.
   - **"Goals" (resolved, implemented):** wired to `repos.objectives.listForUser(playerId, "player")` — count of objectives not yet complete (`currentCompletions < targetCompletions`; the schema has no `archived`/`season` field, so this is the closest real equivalent to "active"). Clickable (`go("objectives")`), `data-testid="home-stat-goals"`.
   - **"Rank" (resolved, implemented): removed from the stats bar.** No ranking/leaderboard concept exists anywhere in the domain or API layer. The stats grid now renders 3 columns for the player role instead of 4.
   - **"Streak" — new finding, deferred, not implemented.** During implementation I grepped the full domain layer for any streak/consecutive-day concept: none exists. The original assumption that this was "wire to real data" was wrong — a practice streak requires new calculation logic (consecutive days with at least one completion), not just a repo call. Left hardcoded `"7d"` for now rather than inventing the algorithm unreviewed. This needs its own product/scope decision (same treatment "Rank" got) before being built — logged as a new item, see below.
2. **AI Insights copy (resolved — option (b), implemented):** player-branch copy changed from the fabricated `"Your shooting accuracy improved 12% this week."` to a generic `"Insights based on your recent activity."` The coach/team branch copy was left untouched (out of this story's slice). Re-wire to `STORY-11.2`'s recommendation engine output once that capability lands.
3. **Profile dead buttons (resolved, implemented) — new finding on scope:** `repos.profiles`'s update schemas (`PlayerProfileInput`/`CoachProfileInput`/`TeamManagerProfileInput`) have no `displayName` field at all — only `age`+`position`+`avatarUrl` (player), `bio`+`coachContext` (coach), or `bio` (team manager). "Edit Profile" was built scoped to what the repository actually supports (age/position/avatar for players, bio for coach/team manager) — **display name editing was not built**, since it would require a new schema field plus a repository/migration change, which is new scope beyond "wire the dead button." Logged as a new item below. "Notifications" is now disabled and explicitly labeled "Coming soon" rather than a silent dead button — `STORY-14.1` push notification infrastructure is still `TODO`.

## Verification plan

- Existing + new tests: `npm run test:story-7.4` — 9/9 passing (4 original + 5 new: Goals/Rank, Drills wiring, AI Insights copy, Edit Profile wiring, Notifications state).
- Full suite (`npx vitest run`): 237/247 passing (10 skipped), 7 pre-existing failures unrelated to this story (STORY-1.4 CI config, STORY-11.2/11.3/11.4 recommendation pipeline) — confirmed unaffected by this change.
- `eslint` on changed files: 0 errors (1 pre-existing warning, unrelated to this change, about `useCallback` deps on stable `setState` setters).
- Manual re-test (not done — no live device/account available in this session): player/pro account on Fold7 — confirm stats bar reflects real drill/goal counts and both are tappable; confirm Edit Profile form saves and Notifications reads "Coming soon."

## Resolved decisions

All 4 original open questions for this story are resolved and implemented, except Drills/Streak wiring in item 1 (Drills implemented, Streak deferred — see below).

- **"Goals"/"Rank" stats:** "Goals" wires to the Objectives count; "Rank" is removed from the stats bar (unimplemented, no backing concept). Implemented. See Fix plan item 1.
- **"AI insights not linked" meaning:** content-realism complaint, not a clickability bug (QA account was Pro, where the card is already clickable). Implemented with honest generic copy; real recommendation output once STORY-11.2 lands. See Fix plan item 2.
- **Edit Profile / Notifications scope:** (a) — new STORY-7.4 scope. Implemented, scoped to what `repos.profiles` actually supports (see new finding below for what's excluded). See Fix plan item 3.
- **Shared-component ownership:** keep the current STORY-7.3/7.4 split for this reopen round; file a backlog item for a future unified "Home screen live stats across roles" cleanup story rather than re-scoping now.

## Open questions — new, discovered during implementation

- **"Streak" has no backing concept anywhere in the domain layer** (confirmed by grep — `summarizePlayerProgress` has no consecutive-day logic, nothing else does either). Is a practice streak actually wanted as a feature? If yes, it needs its own definition (what counts as a "practiced" day, timezone handling, does a rest day reset it) before being built — this is new feature work, not a wiring fix. If no, drop the "Streak" tile the same way "Rank" was dropped.
- **Display-name self-service editing has no backend support.** `PlayerProfileInput`/`CoachProfileInput`/`TeamManagerProfileInput` don't include `displayName`. Is this worth adding (new schema field + repository method + possibly a migration), or is role-specific profile data (age/position/bio) sufficient for "Edit Profile" and a name change should go through support/admin instead (STORY-12.1's admin-side user editing)?
