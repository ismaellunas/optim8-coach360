# STORY-5.2 fix plan — Launch-critical access matrix rules

> **Status today:** DONE (tracker), confirmed — not reopened. Resolved: this story was never responsible for the `objectives`/team gap (see Resolved decisions); STORY-5.2's own tracker `status` was never actually flipped off DONE, so no tracker change was needed here. A new AC-6 should be added once STORY-11.1's team-objectives fix ships, for traceability.
> **QA evidence:** docs/Coach_Feedback.docx (team account section, via BUG-QA3-07)
> **Related:** docs/index.html (tracker), docs/delivery/story-11.1-fix-plan.md (owns the actual root cause), docs/delivery/story-5.4-fix-plan.md

## Finding: this story does not appear to be implicated — recommend leaving it DONE

BUG-QA3-07 ("Pro activated, objectives on dash still say upgrade to pro" for a team account) was the reason this story was pulled into the reopen list. Having read the code, the root cause sits entirely in `packages/domain/src/subscription/paywall.ts:26` (the `objectives` feature's tier-requirement map has no `team` entry) and `apps/mobile/src/App.jsx:386-411` (the Home screen renders a hardcoded preview card for all roles). Full detail is in `docs/delivery/story-11.1-fix-plan.md`, which owns this bug.

STORY-5.2's five acceptance criteria are specifically:
- AC-1: chat gated at Advanced+ for all roles
- AC-2: AI features gated at Pro (OQ-6.5)
- AC-3: coach content creation gated at Advanced+
- AC-4: ◎/○ read-only and partial-access behaviors for the documented launch feature list (`LAUNCH_ACCESS_BANDS` — `browseMarketplace`, `viewTrainingMaterials`, `watchSharedVideo`, `viewProgress`, `teamRoster`)
- AC-5: full 223-rule matrix expansion deferred post-MVP

None of these five ACs mention `objectives`, and `objectives` does not appear in `LAUNCH_ACCESS_BANDS` (`launch-matrix.ts:52-76`) at all — it's a plain binary entry in `FEATURE_TIER_REQUIREMENTS` that predates or sits outside this story's explicit scope. The `objectives` row's test coverage lives under `tests/objectives/story-11.1.test.js`, not `tests/rbac/story-5.2.test.js`. There's no evidence STORY-5.2 touched or was responsible for the `objectives` row's role coverage.

## Acceptance criteria at risk

None — confirmed. "Team was always meant to have `objectives` access" is not the decision that was made; see Resolved decisions.

## Root cause

N/A — see docs/delivery/story-11.1-fix-plan.md.

## Fix plan

No change to this story's implementation. Once STORY-11.1's team-objectives fix lands (`team: 'pro'` added to `FEATURE_TIER_REQUIREMENTS.objectives` in `paywall.ts`), add a new **AC-6** to this ticket documenting that band, plus a corresponding test case — this is a traceability/ticket-ownership addition, not a code change against this story.

## Verification plan

- No new verification needed beyond the existing `npm run test:story-5.2` (5/5 passing per audit_notes) until AC-6 is added; at that point, add a `tests/rbac/story-5.2.test.js` case asserting `resolveLaunchFeatureAccess({ role: 'team', tier: 'pro', feature: 'objectives' })` is allowed, mirroring the equivalent test added under STORY-11.1.

## Resolved decisions

- **Reopen decision:** STORY-5.2 is not reopened — confirmed not responsible for the `objectives`/team gap, which is cleanly STORY-11.1's scope.
- **AC ownership of team objectives:** add a new AC-6 to this ticket once STORY-11.1's fix ships, rather than letting it be a silent default-map edit with no corresponding AC/test here.

## Open questions

None outstanding for this story.
