# STORY-5.2 fix plan — Launch-critical access matrix rules

> **Status today:** DONE (tracker) — provisionally reopened alongside STORY-11.1/11.2/5.4/7.3/7.4 as part of the QA3 cross-reference pass
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

None, pending confirmation in Open Questions below. If the decision is "team was always meant to have `objectives` access," then arguably AC-4 or AC-5 should have covered it and this story would need a line added — but that's speculative, not something I can confirm from the code or the ticket text.

## Root cause

N/A — see docs/delivery/story-11.1-fix-plan.md.

## Fix plan

No change proposed to this story's implementation. If the Open Question below is answered "yes, this was launch-critical access-matrix scope," the fix (adding `team` to the `objectives` row, or wiring it into `LAUNCH_ACCESS_BANDS`) would land in `paywall.ts`/`launch-matrix.ts` as part of the STORY-11.1 fix, and this ticket's ACs/tests would need a new AC-6 (or amended AC-4) plus a corresponding test case to actually claim ownership of it going forward.

## Verification plan

- If left DONE: no new verification needed beyond the existing `npm run test:story-5.2` (5/5 passing per audit_notes).
- If reopened for real: add a `tests/rbac/story-5.2.test.js` case asserting `resolveLaunchFeatureAccess({ role: 'team', tier: 'pro', feature: 'objectives' })` matches whatever the product decision turns out to be.

## Open questions — need confirmation before implementing

- **Should STORY-5.2 actually be reopened, or returned to DONE?** My read is that this story was never responsible for the `objectives`/team gap — it's cleanly attributable to STORY-11.1's scope instead. I'd like explicit confirmation before flipping this one back to DONE, since "the AC text doesn't mention it" is an inference, not a guarantee that whoever scoped STORY-5.2 didn't intend `objectives` to be covered by AC-4/AC-5's "documented launch feature list" and simply forgot to list it.
- **If team objectives access becomes launch-critical,** should it be added to this story's AC-4 (as a new ◎/✓ band) rather than being a silent default-map edit under STORY-11.1? That's a ticket-ownership/scoping call, not a technical one.
