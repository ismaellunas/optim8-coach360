---
name: compose-tests
description: >-
  Add manual click-through test cases to docs/mobile-app-test-pack.md for
  completed tracker stories from docs/index.html. Use after /implement-story and
  before /create-pr, or when the user asks to update the mobile test pack,
  compose manual tests, or document story ACs for non-technical testers.
disable-model-invocation: true
---

# Compose Tests (Manual Test Pack)

You add **manual click-through test cases** to `docs/mobile-app-test-pack.md` for completed (or just-implemented) stories from the development tracker at `docs/index.html` (`#tracker-data`).

This skill sits between `/implement-story` and `/create-pr`:

```
implement-story → compose-tests → create-pr
```

**This is not about Vitest / CI unit tests.** Automated `tests/**/*.test.js` coverage stays with `/implement-story`. Here you write non-technical tester instructions in the mobile app test pack.

## Scope stories from (in order)

1. Explicit IDs in the user message (e.g. `STORY-6.2`)
2. Else stories touched on the current branch — parse `#tracker-data`, include STORYs whose `verify.files` appear in `git diff main...HEAD --name-only` (or default base), **or** stories marked `DONE` / `IN_REVIEW` / `IN_PROGRESS` in this conversation
3. If still empty, ask which story IDs to cover

Skip stories that are admin-only (no mobile UI) **unless** the pack already has an Admin section pattern (Epic 5 Admin) and the story belongs there.

## Process

### Phase 1 — Inventory (read-only)

1. Parse `#tracker-data` for each in-scope story: `title`, `description`, `acceptance_criteria`, `status`, parent epic.
2. Read the matching epic section in `docs/mobile-app-test-pack.md` (and neighboring tests) so new cases match tone, IDs, and prerequisites.
3. Inspect only UI paths needed to name real buttons/screens (`verify.files`, shipped screen). Do not invent UI that is not in the app.
4. Print a short **gap matrix**, then proceed (no approval gate unless the user asked for a plan first):

| Story | AC | Statement | Existing pack test | Action |
| --- | --- | --- | --- | --- |
| STORY-6.2 | AC-1 | … | E6-T? or — | add / update / skip |

### Phase 2 — Compose pack entries

5. **Write one or more pack tests per story** so every clickable acceptance criterion is covered. Prefer one focused `E{N}-T{M}` per AC when steps differ; combine only when ACs are inseparable in one flow.

6. **Follow the existing format exactly:**

```markdown
### E6-T10: Short plain-language title

Optional one-line setup note for the tester.

| Step | Do this | You should see |
|---|---|---|
| 1 | … | … |
| 2 | … | … |
```

Rules for copy:

- Audience: **non-technical testers** — tap/click only; no code, repos, or Zod/API jargon
- Use real on-screen labels (**Schedule**, **+ Add content**, **NEW SESSION**, etc.)
- Steps must be reproducible from accounts already described in Part 1 / earlier epics
- Add **Accounts needed** / **Before you start** only when the epic section is new or prerequisites change
- Put backend-only or unshipped behavior under **Not testable by clicking (for awareness only)** — do not fake click paths
- When a prior “out of scope” note named this story, **remove or rewrite** that note so it no longer contradicts the new tests

7. **IDs:** Continue the epic’s sequence (`E6-T10` after `E6-T9`). Never renumber existing IDs. New epic → `## Epic N — <Title> (STORY-X.Y …)` matching Epic 6 style.

8. **Update Part 3 — Quick Results Sheet** with one row per new test ID (same short title style as existing rows).

9. **Update Part 1 — Recommended test order** when you add a new epic or materially change epic coverage (counts and epic list).

### Phase 3 — Regenerate HTML

10. Run:

```bash
npm run docs:test-pack
```

Confirm `docs/mobile-app-test-pack.html` updates. Do not hand-edit the HTML.

### Phase 4 — Hand off to create-pr

11. Print results and a **PR Test plan** block:

```markdown
## Test plan
- [ ] Manual: `docs/mobile-app-test-pack.md` — E{N}-T{M} … (STORY-X.Y)
- [ ] Regenerate HTML checked: `npm run docs:test-pack`
- [ ] Automated (if already present from implement-story): `npm run test:story-X.Y`
```

## Constraints

- Primary edit target: `docs/mobile-app-test-pack.md` (+ regenerated HTML)
- Do **not** rewrite Vitest files or tracker `acceptance_criteria[].test` / `verify.tests` unless the user also asks for that
- Do not invent product behavior; mirror shipped UI and tracker AC statements
- Do not open a PR (`/create-pr`) or audit unrelated tickets (`/audit-tracker`)
- Never commit unless explicitly asked

## Output

Print:

1. Gap matrix (before → after)
2. New/updated test IDs and which ACs they cover
3. Files changed (`mobile-app-test-pack.md`, `.html` if regenerated)
4. PR Test plan markdown

End with: *"Test pack updated. Run `/create-pr` when ready to open the pull request."*
