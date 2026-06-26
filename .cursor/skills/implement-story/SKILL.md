---
name: implement-story
description: >-
  Plan and implement a tracker story from docs/index.html with tests mapped to
  acceptance criteria. Use when implementing STORY-X.Y tickets from the development
  tracker. Always produces a plan for approval before changing code.
disable-model-invocation: true
---

# Implement Story

You are implementing a single story from the development tracker at `docs/index.html`. That file contains an embedded JSON block (`<script id="tracker-data" type="application/json">`) that is the single source of truth for all tickets.

**The story to implement is provided in the user's message** (e.g. `STORY-2.1`). If no story ID was given, ask for one before proceeding.

**Do not write code, tests, or tracker edits until the user approves the plan** (after phase 2). If the user says "go ahead", "proceed", or "implement", that counts as approval.

## Process

### Phase 1 — Read (no changes)

1. **Read the ticket.** Parse `#tracker-data`, find the story, and read its `description`, `requirements`, and `acceptance_criteria`. If you need the original requirement wording, read only the relevant `docs/` section it cites.
2. **Read stack and integration guidance.** For client work, read `docs/architecture/tech-stack.md` and the relevant section of `docs/architecture/best-practices.md`. Single stack: Vite + React + Capacitor — no Expo/Next.js migration.
3. **Read UI design system** when the story touches screens or components: `docs/design/ui-reference.md` and primitives from `src/ui/index.js`. Reuse existing primitives; do not introduce new color systems or UI libraries unless the story explicitly requires it.
4. **Read only what the plan needs.** Inspect existing source files, patterns, and dependencies required to implement this story. Do not scan the wider codebase beyond that.

### Phase 2 — Plan (no changes)

4. **Produce an implementation plan** and print it to chat. Wait for user approval before phase 3.

   The plan must include:

   - **Summary** — one paragraph on what will be built and why
   - **Acceptance criteria map** — for each AC: what will be implemented, proposed test name, and how the test proves the criterion
   - **Files** — paths to create or modify (no `(inferred)` guesses)
   - **Test command** — the `verify.command` you intend to set (e.g. `npm test -- --reporter=json -t STORY_2_1`)
   - **Risks / blockers** — dependencies on other stories, open questions (`open_questions` in tracker), or criteria that may need `test: null` with justification
   - **Out of scope** — what you will deliberately not touch
   - **UI approach** (if applicable) — which primitives from `src/ui/` and which existing screen to mirror

   End with: *"Approve this plan to proceed, or tell me what to change."*

### Phase 3 — Implement (after approval)

5. **Implement the story.** Write the code that satisfies every acceptance criterion. Follow the existing conventions of the codebase in the files you touch. Stick to the approved plan unless the user redirects you.

6. **Write a test for each acceptance criterion.** For every entry in `acceptance_criteria`, write an automated test that proves that specific criterion. The test should fail before your implementation and pass after. Name tests so they're traceable to the criterion (e.g. `test_STORY_2_1_AC1_*`).

7. **Run the tests and confirm they pass.** If a criterion genuinely cannot be expressed as an automated test, leave its test as `null` and explain why in the writeback (step 8).

8. **Write back the pointers** into the story in `docs/index.html`, modifying only this story's object:
   - For each acceptance criterion, set its `test` field to the identifier of the test that proves it (e.g. `tests/auth.test.js::test_STORY_2_1_AC1_login_success`), or leave `null` if step 7 found none.
   - Set `verify.files` to the actual source paths you created or changed (real paths — replace any `(inferred)` guesses).
   - Set `verify.tests` to the test identifiers you wrote.
   - Set `verify.command` to a command that runs exactly this story's tests with machine-readable output.
   - Set `status` to `DONE` if all criteria have passing tests; `IN_REVIEW` if implemented but any criterion relies on a `null` test; `IN_PROGRESS` if you could not finish.
   - Set `last_updated` to today's date (ISO 8601).
   - Write a one-line `audit_notes` summary of what was implemented and the test outcome.

## Constraints

- **Plan before code** — phases 1–2 are read-only. No file edits until the user approves the plan.
- **Single stack** — Vite + React + Capacitor only; see `docs/architecture/tech-stack.md`.
- Modify only the target story object in the JSON. Do not touch other tickets, the `verify`/`acceptance_criteria` structure itself, or any HTML/JS outside `#tracker-data`.
- Within the story, do not reword `title`, `description`, `requirements`, or the statement of any acceptance criterion. You are filling in `test`, `verify`, `status`, `last_updated`, and `audit_notes` only.
- Keep the JSON schema, key ordering, and formatting intact.
- Never commit unless explicitly asked.

## Output

**After planning (phase 2):** print the plan only — no code changes.

**After implementation (phase 3):** apply the code, tests, and JSON writeback. Print:
- Files created/changed
- Tests written and their pass/fail result
- Story's old → new status
- Deviations from the approved plan (if any)
