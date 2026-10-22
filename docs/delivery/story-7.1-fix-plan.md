# STORY-7.1 fix plan — Player session view and content consumption

> **Status today:** DONE (tracker), confirmed — not reopened. Both open questions resolved; no code change needed.
> **QA evidence:** docs/Coach_Feedback.docx (player-account "Progress" section)
> **Related:** docs/index.html (tracker), docs/bug-investigations.md, docs/delivery/story-6.3-fix-plan.md

## What QA reported

Player-account section, under "Progress":
> "Not updating to todays date"
> "Cannot view future/past"
> "Cannot add my own sessions"

## Acceptance criteria at risk

- None of this story's ACs are directly contradicted by code evidence. See Root cause.
  - AC-1 "Player sees session detail with attached content list" — confirmed implemented, `apps/mobile/src/features/session/ui/PlayerSessionDetailScreen.jsx`.
  - AC-2 "Video playback works for shared and purchased content" — confirmed implemented via `SessionVideoPlayer` + `resolveMediaUrl`.
  - AC-4 "Completion state tracked per content item" — confirmed implemented via `repos.sessionContent.markComplete` / `listCompletions`.

## Root cause (confirmed in code)

`apps/mobile/src/features/session/ui/PlayerSessionDetailScreen.jsx` renders exactly one `session` object passed in via props — it has **no date filtering, no "today" concept, and no future/past navigation of its own**. It is a pure detail/consumption view for whichever single session the caller hands it.

The only caller is `ScheduleScreen.jsx`, which sets `viewingSession` from an entry in its own `dayData` list (see `docs/delivery/story-6.3-fix-plan.md` for the confirmed week-navigation/date-filtering bug there). So:

- If a session doesn't appear in `ScheduleScreen`'s list (because of the week-navigation and day-of-week filtering bugs documented in the STORY-6.3 plan), the player can never reach `PlayerSessionDetailScreen` for it — but that is a defect in STORY-6.3's screen, not this one.
- Once a player does open a session's detail screen, there is nothing in this component that depends on "today's date" or "future/past" — it has no such code path to be broken.

**Conclusion: I cannot confirm any defect in STORY-7.1's own acceptance criteria or implementation.** The QA complaint appears to be entirely explained by the STORY-6.3 schedule-list bug (see that plan) — once a player reaches a session's detail screen, consumption and completion tracking work as specified.

## Fix plan

No code changes proposed against this story. If the STORY-6.3 fix (week navigation + exact-date filtering) lands, players will be able to reach the correct sessions, and this screen's existing behavior should satisfy its ACs without modification.

## Verification plan

- Existing tests to re-run: `tests/sessions/story-7.1.test.js` (regression check only — no behavior change expected).
- No new test cases proposed for this story specifically.
- Manual re-test: after the STORY-6.3 fix lands, confirm a player can open detail/content/completion flows for a session scheduled in a future week and one in a past week (not just the current week), to confirm the only blocker was discoverability via the schedule list.

## Resolved decisions

- **Reopen decision:** (a) — leave STORY-7.1 at DONE, not reopened. No confirmed defect in this story's own code; the complaint traces entirely to STORY-6.3.
- **"Progress" complaint ambiguity:** treat as the same mislabeled-Schedule complaint as STORY-6.3's identical question (consistent answer across both stories) — the tester meant the Schedule tab, filed under the wrong heading. No separate Progress-tab gap to build.

## Open questions

None outstanding for this story.
