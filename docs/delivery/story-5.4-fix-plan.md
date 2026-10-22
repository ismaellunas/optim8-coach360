# STORY-5.4 fix plan — Mobile consumption of admin gating overrides

> **Status today:** DONE (tracker), confirmed — not implicated, no code change. One test-coverage gap closed (see Resolved decisions).
> **QA evidence:** docs/Coach_Feedback.docx (team account section, via BUG-QA3-07)
> **Related:** docs/index.html (tracker), docs/delivery/story-11.1-fix-plan.md (owns the actual root cause), docs/delivery/story-5.2-fix-plan.md

## Finding: this story does not appear to be implicated — recommend leaving it DONE

Same BUG-QA3-07 pulled this story in. I checked whether the override-merge mechanism STORY-5.4 built would actually work for a `(objectives, team)` pair if an admin configured one, since that's the fix path floated in `docs/delivery/story-11.1-fix-plan.md`. It does:

- `packages/domain/src/subscription/paywall.ts:135-158` (`applyFeatureFlagOverrides`): builds `featureKeys` from `GATED_FEATURE_KEYS ∪ overrides.map(o => o.feature)`, and for each feature iterates all of `GATED_ROLES = ['coach','player','team']` (line 79), calling `resolvedTierForFeatureRole(feature, role, overrides)` for every one — including `team` — regardless of whether the *default* map has that role. `resolvedTierForFeatureRole` (lines 100-110) checks the admin override **first**, falling back to the static default only if no override exists. So a `(feature: 'objectives', role: 'team', requiredTier: 'pro')` override would be picked up and merged correctly today, with zero code changes to this story's files.
- Server-side parity: `supabase/migrations/20260717130000_has_feature_access_overrides.sql` — `has_feature_access(p_user_id, p_feature)` explicitly normalizes `profiles.app_role = 'team_manager'` to the `feature_flags` role key `'team'` (migration comment, lines 1-8) and reads `feature_flags` generically, same as the mobile merge. No role is special-cased out.

In other words: **the plumbing this story is responsible for already supports a team-role objectives override end-to-end.** The reason QA3-07 happens isn't a gap in STORY-5.4's mobile-consumption logic — it's that no such override row exists (by design or oversight — see STORY-11.1's Open Questions), and the *default* code-level map also excludes `team`. Neither of those is this story's responsibility.

## Acceptance criteria at risk

None found. AC-1 through AC-5 (merged-map fetch, injected-requirements fallback, server/mobile agreement, admin-sourced paywall copy, no-redeploy propagation) all hold up under this bug's specifics — I did not find a case where the override mechanism itself fails for the `team` role.

## Root cause

N/A — see docs/delivery/story-11.1-fix-plan.md and docs/delivery/story-5.2-fix-plan.md.

## Fix plan

No code change to this story's own files. STORY-11.1 already added the `team: 'pro'` default for `objectives` (resolved in that story's fix plan), so this story's override mechanism was never actually needed for that specific case — but the test-coverage gap this raised is real and general, so it's closed here (see Resolved decisions).

## Verification plan

- `npm run test:story-5.4`: 6/6 passing (5 original + 1 new: `test_STORY_5_4_AC2_override_adds_new_feature_role_pair_with_no_default`, using a `quiz` feature with zero existing defaults to prove the mechanism generically, independent of the now-resolved `objectives`/`team` case).

## Resolved decisions

- **Reopen decision:** confirmed not implicated — returned to DONE, no code change.
- **Test coverage gap:** confirmed and closed. Direct code read of `applyFeatureFlagOverrides` showed it already correctly handles a brand-new (feature, role) pair with no default (it iterates all `GATED_ROLES` regardless of existing defaults) — the gap was in test coverage only, not behavior. Added a regression test proving this generically.
- **Admin UI first-time override:** confirmed real gap by direct code read of `gatedFeaturesForRole()` — it only lists a feature for a role if that role already has a default tier *or* an existing override, so an admin cannot select a feature with zero existing presence for a role from the admin UI dropdown today. This is real, but lives entirely in STORY-5.3's files — not fixed here; logged as a STORY-5.3 backlog item rather than expanding this reopen into a fourth ticket.

## Open questions

None outstanding for this story.
