---
name: implement-fix-plan
description: >
  Prepare for and implement a docs/delivery/<story>-fix-plan.md ticket. Before
  writing any code, verifies every item under that fix plan's "Open
  questions — need confirmation before implementing" section — and any
  sibling fix plan it defers to — is actually resolved in
  docs/delivery/open-questions.xlsx (Status = Answered or Deferred, not Open
  or Proposed). Only once everything is resolved does it turn the answers
  into a concrete scoped plan, implement it following this repo's tracker and
  React conventions, and update the tracker. Trigger when the user says
  "implement the fix plan for STORY-X.Y", "work on the story-X.Y fix plan",
  "proceed with implementation now that the questions are answered", asks to
  implement something from docs/delivery/, or names a
  docs/delivery/*-fix-plan.md file with intent to build it.
---

# Implement a fix plan

A fix plan in `docs/delivery/<story>-fix-plan.md` is a root-cause analysis,
not a ticket ready to build: most of them end with an explicit "Open
questions — need confirmation before implementing" section, and several
defer their actual fix to a *different* story's fix plan (e.g.
`story-5.2-fix-plan.md` and `story-5.4-fix-plan.md` both say "no change
proposed... depends on STORY-11.1's Open Questions"). Implementing before
those are resolved means guessing a product decision that was explicitly
called out as not yours to make.

This skill has two phases: **readiness gate**, then **implement**. Do not
skip or compress the readiness gate, even if the user is impatient to see
code — the entire point of this skill is that it refuses to guess.

## Phase 1 — Readiness gate

1. **Resolve the target.** Accept a story ID (`STORY-8.1`), a bare fix-plan
   filename, or a full path. Find it under `docs/delivery/`. If it doesn't
   exist, say so and stop — don't guess a nearby filename.

2. **Read the fix plan in full**, not just the Open Questions section — the
   "Root cause" and "Fix plan" sections usually list *candidate* fixes
   ("(a) ... or (b) ...") that only make sense once you know which open
   question answer picked between them.

3. **Collect every open question for this story**, plus any question from a
   *sibling* story this plan explicitly defers to. Look for phrases like
   "see STORY-X's Open Questions", "depends on the product decision in
   STORY-X's fix plan", or "no change proposed... if the decision is X". A
   plan can have zero of its own blocking questions but still be fully
   blocked by another story's unanswered one (this is the normal shape for
   `story-5.2`/`story-5.4` relative to `story-11.1`, and `story-7.3` relative
   to `story-7.4`/`story-11.2` — check `docs/delivery/` for the current set of
   fix plans and their cross-references, don't assume this list is
   exhaustive or still accurate).

4. **Read `docs/delivery/open-questions.xlsx`** and cross-reference. The
   system Python on this machine does not have `openpyxl` — use the Homebrew
   one:

   ```bash
   /opt/homebrew/bin/python3.11 -I -c "
   import openpyxl
   wb = openpyxl.load_workbook('docs/delivery/open-questions.xlsx')
   ws = wb['Open Questions']
   for r in range(5, ws.max_row + 1):
       print(r, ws.cell(r,2).value, '|', ws.cell(r,3).value, '|', ws.cell(r,4).value, '|', ws.cell(r,7).value)
   "
   ```

   Match rows by the **Fix Plan** column (exact filename) first, then by
   matching the **Topic**/**Open Question** columns against the bullets you
   collected in step 3. Don't assume row order or count is stable — the
   sheet gets edited by hand between sessions, re-read it fresh every time
   this skill runs, never reuse a row mapping from a previous run or from
   conversation memory.

5. **Evaluate readiness:**
   - Every collected question must have **Status = Answered or Deferred**.
     `Open` or `Proposed` (including Claude's own earlier draft
     recommendations, if any are still sitting in Proposed) means **not**
     resolved — a draft recommendation is not a decision.
   - A question with **no matching row at all** in the spreadsheet is also
     not resolved — don't treat "not tracked" as "no objection."
   - If a sibling story's dependency question isn't resolved, this story is
     blocked even if every one of its own rows says Answered.

6. **If anything is unresolved:** stop. Report exactly which question(s),
   from which file(s), are still open/proposed/deferred/untracked, and ask
   the user to resolve them (in the spreadsheet, or inline in chat if they'd
   rather answer verbally right now) before continuing. Do not pick an
   answer yourself to unblock the work, even a "reasonable default" — that's
   the exact failure mode this skill exists to prevent. Do not treat a
   `Deferred` item as license to build it anyway "just in case."

## Phase 2 — Plan and implement (only once Phase 1 passes)

7. **Re-derive the concrete scope.** Using the Answered/Deferred rows, turn
   the fix plan's candidate options into one unambiguous set of changes. If
   the resolution is "no code defect, return story to DONE" (e.g. the
   `story-5.2`/`story-5.4`/`story-7.1`/`story-8.3` pattern in this repo's
   current fix plans), the "implementation" is a tracker-status change plus
   unlinking the bug, not a code change — don't invent work. If a `Deferred`
   answer removes part of the plan's scope, drop that part entirely rather
   than building a partial version of it.

8. **Surface the scoped plan for approval** before touching files — same
   convention as `/implement-story`: a short, concrete list of what will
   change and why, citing which answered question authorized each part. Get
   explicit go-ahead.

9. **Read the repo's own conventions before editing anything**, per
   `CLAUDE.md`:
   - `.cursor/rules/tracker-json.mdc` before touching `docs/index.html`'s
     embedded tracker JSON (immutable fields, status vocabulary, `verify`
     block schema).
   - `.cursor/rules/react-conventions.mdc` before touching
     `apps/mobile/src/**/*.{js,jsx}` or `apps/admin/src/**/*.{ts,tsx}`
     (extract-then-wire workflow, lint rules, test naming
     `test_STORY_X_Y_AC#_*`).
   - `.cursor/rules/ui-design-system.mdc` and `docs/design/ui-reference.md`
     before touching UI — reuse existing primitives, don't hardcode tokens.
   If any of these files are missing from the repo, say so explicitly rather
   than silently skipping the check.

10. **Check for shared-component collisions** before editing. Several fix
    plans in this repo explicitly share one function across roles (e.g.
    `story-7.3`'s team slice and `story-7.4`'s player slice both edit the
    same `HomeScreen` in `App.jsx`). If the story you're implementing shares
    code with a sibling story that is *not* being implemented right now,
    touch only that story's role/branch and say so in your summary — don't
    opportunistically fix the sibling's slice too, and don't leave the
    shared function half-migrated in a way that breaks the untouched role.

11. **Implement exactly the scoped plan from step 7** — nothing the open
    questions marked deferred or out-of-scope, nothing beyond what the
    answered questions authorized.

12. **Fix the test, not just the code**, where the fix plan calls out a
    specific test-quality gap (several plans in this repo note that the
    existing test only does source-string regex matching and "cannot fail on
    this bug regardless"). Replace or extend that test so it actually
    exercises the behavior, using the `test_STORY_X_Y_AC#_*` naming
    convention — don't just re-run the old one and call it green.

13. **Run the fix plan's own Verification plan**: existing test command(s)
    for the story, new test cases it calls for, and as much of the manual
    re-test steps as can be done without a live device/account (flag the
    rest as needing manual verification).

14. **Update the tracker** (`docs/index.html`'s embedded JSON) to reflect the
    outcome — status flip, `blocks` array change if a bug is being
    unlinked/resolved — following `tracker-json.mdc`'s schema. Don't
    hand-edit fields that rule marks immutable.

15. **Stop there.** Don't run `/compose-tests` or `/create-pr` automatically
    — those are separate skills in this repo's workflow
    (`implement-story → compose-tests → create-pr`), and don't commit
    anything unless explicitly asked, per `CLAUDE.md`'s commit policy.

## Multiple stories in one pass

If asked to process several fix plans (or "all of them"), run Phase 1
independently for each — don't batch the readiness check and assume one
story's resolved questions apply to another. Implement the ones that pass
Phase 1; for the rest, report what's still blocking each one and stop there
instead of guessing to keep moving.
