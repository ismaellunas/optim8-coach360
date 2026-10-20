# STORY-7.4 fix plan — Player profile and dashboard by tier

> **Status today:** DONE (tracker) — reopened, contradicted by BUG-QA3-01 and BUG-QA3-03
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
- No AC in this story covers Profile's "Edit Profile" / "Notifications" buttons — see Open Questions.

## Root cause (confirmed in code)

1. **Top stats bar** — `apps/mobile/src/App.jsx:245-249`, inside shared `HomeScreen`:
   ```js
   var stats = isPlayer
     ? [{ l: "Drills", v: "24" }, { l: "Streak", v: "7d" }, { l: "Goals", v: "3/5" }, { l: "Rank", v: "#4" }]
     : isTeam ? [...] : [...];
   ```
   Rendered at `App.jsx:273-282` as a plain 4-box grid with **no `onClick` at all** and no repo call. For the player role this is 100% hardcoded (`"24"`, `"7d"`, `"3/5"`, `"#4"` are literals) — "not updated, not clickable, not linked" is accurate as reported. This is the *same component and same root cause* as `BUG-QA2-04` (coach dashboard), just never fixed for the player/team branches of the same ternary. Not a regression — QA2-04's original write-up only tested the coach account, so the player/team branches of this one hardcoded array were never caught until this pass.

2. **AI Insights card** — `App.jsx:320-348`. For a Pro player, `canAccess(user, "ai")` is `true` (`FEATURE_TIER_REQUIREMENTS.ai = { coach: 'pro', player: 'pro', team: 'pro' }`, `packages/domain/src/subscription/paywall.ts:28`), so the card **is** clickable (`onClick` → `tryA("ai", () => go("progress"))`) and **is** correctly gated. What's not real is the body copy: `"Your shooting accuracy improved 12% this week."` is a hardcoded string (`App.jsx:335`), not generated from any insight/recommendation repo. So "AI insights not linked" means "not linked to real data," not "not clickable" — worth confirming with the tester which they meant (see Open Questions).

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

1. **Top stats bar (player slice):** Replace the player branch of the `stats` array (`App.jsx:245-246`) with real aggregates: drills-completed count and total practice streak from `repos.sessionContent.listPlayerProgress(playerId)` (already fetched into `completions` in this same component — reuse it, don't double-fetch), plus whatever "Goals" / "Rank" are supposed to mean (see Open Questions — those two have no backing data source anywhere in the repo layer today). Add `onClick` handlers that navigate somewhere sensible (e.g., Drills → `go("progress")`).
2. **AI Insights copy:** Either (a) wire the card body to `STORY-11.2`'s recommendation engine output (`packages/domain` metadata-based recommendations) once that story's fix lands, or (b) if AI-generated per-player insight text doesn't exist yet as a backend capability, change the copy to something that isn't a specific fabricated claim (e.g., a generic prompt) until real AI insight text is available. This decision belongs with whoever owns STORY-11.3/11.4 (Mistral/RAG) — don't guess which.
3. **Profile dead buttons:** Decide scope (see Open Questions) then either build "Edit Profile" (name/email/avatar form wired to the profile repository) and "Notifications" (push/email preference toggles — note `STORY-14.1` Push notification infrastructure is still `TODO`, so a Notifications screen may have nothing to configure yet), or remove the buttons/mark them "Coming soon" if out of MVP scope.

## Verification plan

- Existing tests to re-run: `npm run test:story-7.4` (should still pass — AC-1 through AC-4 don't need to change) plus a new assertion so the top-stats-bar fix can't silently regress back to hardcoded values.
- New test cases needed (new file or extend `story-7.4.test.js`): assert player home stats grid reads from `completions`/`upcomingSessions` state, not literals; assert `ProfileScreen` "Edit Profile" and "Notifications" cards have real `onClick` handlers (or are explicitly removed) once scope is decided.
- Manual re-test: player/pro account on Fold7 — confirm stats bar reflects real drill count after logging a drill; confirm Profile buttons either work or are no longer presented as tappable.

## Open questions — need confirmation before implementing

- **"Top stats bar not... linked"** — for player, "Goals" and "Rank" have no corresponding data anywhere I can find in `packages/domain` or `packages/api` (no leaderboard/ranking concept, no "goals" distinct from Objectives). Is "Goals" meant to be the Objectives count, and is "Rank" a feature that doesn't exist yet and should be removed from the stats bar rather than wired up?
- **"AI insights not linked"** — does this mean the tester expected it to be clickable and it wasn't (contradicts what I found in code — it should be clickable for Pro), or did they mean the content isn't real/personalized? I'm treating it as the latter based on the code, but this should be confirmed against the actual tester before work starts, since the fix is completely different (navigation bug vs. content-generation gap).
- **Edit Profile / Notifications scope** — these buttons exist in the UI but are owned by no story and no AC. Is this: (a) new scope to add to STORY-7.4, (b) a separate story that should be created, or (c) deliberately out of MVP and the buttons should be removed/disabled with a "coming soon" state? I'm not picking one without a product decision.
- **Shared-component ownership** — the hardcoded `stats` array and `AI Insights` card in `HomeScreen` serve coach, player, and team in one function. This fix plan only covers the player slice; the team slice is in [story-7.3-fix-plan.md](./story-7.3-fix-plan.md). Should there be one unified story for "Home screen live stats across roles" instead of splitting the fix across STORY-7.3/7.4 (current precedent from BUG-QA2-04)? Flagging rather than assuming — the current split works but is arguably an artifact of which story happened to get blocked first.
