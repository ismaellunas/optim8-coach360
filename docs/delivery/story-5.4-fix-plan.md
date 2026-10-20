# STORY-5.4 fix plan — Mobile consumption of admin gating overrides

> **Status today:** DONE (tracker) — provisionally reopened alongside STORY-5.2/11.1/11.2/7.3/7.4 as part of the QA3 cross-reference pass
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

No change proposed. If the product decision (see STORY-11.1's Open Questions) is "add a default `team` tier for objectives in code," that's a `paywall.ts` edit under STORY-11.1, not this story. If the decision is "leave the default as-is and have an admin configure an override instead," this story's existing mechanism already supports that — the blocker, if any, would be whether the **admin UI** (STORY-5.3, not STORY-5.4) lets an admin add the first override for a (feature, role) pair that has no default. I did not investigate the admin UI in depth — flagged below.

## Verification plan

- If left DONE: no new verification needed beyond existing `npm run test:story-5.4` (5/5 passing per audit_notes).
- If the team-objectives override path is actually exercised for the first time in production, it would be worth adding one regression test confirming `applyFeatureFlagOverrides` correctly adds a *new* (feature, role) pair that wasn't in the static defaults at all (today's tests likely only cover overriding an *existing* default tier — I did not confirm this either way; see Open Questions).

## Open questions — need confirmation before implementing

- **Should STORY-5.4 actually be reopened, or returned to DONE?** My read is "not implicated" — flagging for your explicit sign-off before I'd flip it back.
- **Does `tests/rbac/story-5.4.test.js` cover the case of adding a brand-new (feature, role) override where no default existed?** I did not read that test file in this pass (out of scope for a planning-only document focused on root cause, not test-coverage audit) — worth a quick check before fully trusting AC-1/AC-2 for this specific scenario.
- **Can an admin actually create a first-time `(objectives, team)` override through the admin UI today**, or does `gatedFeaturesForRole`-style filtering (STORY-5.3, `paywall.ts:113-129`) prevent surfacing a feature for a role it has no default tier for? This is the one real gap I can imagine existing, but it's in STORY-5.3's files, not this story's — I'd want explicit direction before expanding this reopen to a fourth ticket.
