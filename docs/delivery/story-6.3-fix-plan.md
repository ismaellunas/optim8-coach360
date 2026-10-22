# STORY-6.3 fix plan — Share schedule and notify recipients

> **Status today:** DONE (tracker) — week navigation and exact-date filtering implemented and tested. No design spec existed for the nav controls; shipped a conservative engineering default (prev/next arrows) rather than blocking, flagged for design review.
> **QA evidence:** docs/Coach_Feedback.docx (coach-account "Schedule" section; player-account "Progress" section — see Open Questions)
> **Related:** docs/index.html (tracker), docs/bug-investigations.md

## What QA reported

Coach-account section, under "Schedule":
> "Not updating to todays date"
> "Cannot view future/past"

Player-account section, under "Progress" (see Open Questions for why this is grouped here):
> "Not updating to todays date"
> "Cannot view future/past"
> "Cannot add my own sessions"

## Acceptance criteria at risk

- AC-3: "In-app schedule view shows upcoming sessions for players at Basic+" — partially at risk. The "upcoming" filter itself works and is tested, but the surrounding week-navigation is broken (see Root cause).

## Root cause (confirmed in code)

`apps/mobile/src/features/schedule/ui/ScheduleScreen.jsx`:

1. **No week navigation exists.** The 7-day day-strip is built at lines 818–825 by always anchoring to `new Date()` at render time:
   ```js
   const dates = Array.from({ length: 7 }, (_, index) => {
     const now = new Date();
     const diff = index - now.getDay();
     const next = new Date(now);
     next.setDate(now.getDate() + diff);
     return next.getDate();
   });
   ```
   There is no prev/next-week control anywhere in the component. The visible day-strip is permanently locked to the current Sun–Sat calendar week.

2. **Day filtering collides across weeks.** `dayData` (line 829–831) filters by weekday-of-week, not by exact calendar date:
   ```js
   const dayData = scheduleSessions.filter(
     (entry) => new Date(entry.scheduledAt).getDay() === selectedDay,
   );
   ```
   `selectedDay` is just an integer 0–6. This means tapping "Monday" returns **every** non-cancelled session that ever falls on any Monday — last week's, this week's, and next month's — merged into one list with no indication of which week each belongs to, and no way to isolate "next week's Monday" from "today's Monday." This is the concrete mechanism behind "cannot view future/past": there is no way to browse a specific future or past week at all, only an undifferentiated pile of same-weekday sessions.

3. **`selectedDay` is frozen at mount.** `useState(new Date().getDay())` (line 537) is computed once. If the app/webview stays alive across a local-midnight boundary, the highlighted "today" column goes stale until the user manually taps a different day. Minor relative to #1/#2, but contributes to "not updating to today's date."

4. **For players only**, `filterUpcomingSessions` (`packages/domain/src/session/reminders.ts:44-56`) hard-excludes anything before the start of today's local calendar day:
   ```ts
   const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
   return sessions.filter((entry) => entry.status !== 'cancelled' && new Date(entry.scheduledAt).getTime() >= startOfToday.getTime());
   ```
   This is **deliberate and already unit-tested** (`tests/sessions/story-6.3.test.js:129-138`, asserting a `past`-id entry is excluded) and matches AC-3's literal wording ("shows upcoming sessions"). For players, "cannot view past sessions" is current designed behavior, not a code defect — see Open Questions.

## Fix plan

1. **Week navigation (resolved, implemented):** `weekAnchorDate` state (defaulting to the current week via a new `startOfWeek()` helper) replaces the render-time `new Date()` anchor. Prev/next-week arrow buttons added to a new header row above the day-strip, plus a week-range label (e.g. "Oct 19 – Oct 25") and a "Today" shortcut that appears only when viewing a different week.
2. **Exact-date filtering (resolved, implemented):** `dayData` now matches the exact calendar date of the selected day cell (via a new `isSameCalendarDate()` helper), not just `getDay()`. Each of the 7 visible day cells is a concrete `Date` derived from `weekAnchorDate`, computed once per render. The same exact-date fix applies to `daysWithSessions` (the per-day orange-dot indicator), which had the identical weekday-collision bug.
3. **Stale "today" (resolved, implemented):** a `visibilitychange` listener re-derives `selectedDay` to the current weekday whenever the app becomes visible again — but only when the viewed week is still "this week," so it doesn't yank the user back to today while they're deliberately browsing a different week.
4. **`filterUpcomingSessions` for players (resolved): left unchanged.** Confirmed as intentional per AC-3 and the existing test — no "History" mode built.
5. **Week navigation bounds (resolved): unbounded.** No season-start/end check added — `goToPreviousWeek`/`goToNextWeek` always shift by exactly 7 days.
6. **Week navigation design (resolved, with a caveat):** no design spec exists in `docs/design/ui-reference.md`. Shipped the lowest-risk engineering default — simple prev/next arrow buttons, not swipe gestures or a calendar/month view — rather than blocking the whole story on a design review. Flagged as a new open question for an actual design pass.
7. **"Cannot add my own sessions" (resolved): out of scope, not built.** Logged as a new backlog item, not folded into this fix.
8. **Ambiguous "Progress" complaint source (resolved):** treated as a mislabeled Schedule complaint; no separate Progress-tab work done.

## Verification plan

- `tests/sessions/story-6.3.test.js`: 6/6 passing (4 original, including the `filterUpcomingSessions` unit assertions unchanged, + 2 new: week navigation/exact-date-filtering source assertions, unbounded-navigation assertion).
- `tests/sessions/story-6.1.test.js` and `tests/sessions/story-7.1.test.js`: re-ran, unaffected (9/9 and 4/4 passing).
- Full suite (`npx vitest run`): 258/268 non-skipped passing, same 7 pre-existing unrelated failures as before this change.
- `eslint` on changed files: 0 errors.
- Manual re-test (not done — no live device/account in this session): coach account — create one session 2 weeks in the future and one 2 weeks in the past, confirm both are reachable via the new week navigation and not conflated with the current week's same-weekday sessions; confirm the "Today" shortcut returns to the current week; confirm a long-lived session (backgrounded past midnight, then resumed) refreshes the "today" highlight.

## Resolved decisions

- **Ambiguous "Progress" complaint source:** mislabeled Schedule complaint (same reasoning as the identical STORY-7.1 question). No separate Progress-tab gap.
- **Past-sessions visibility for players:** keep "upcoming only," matches AC-3 + existing test. Log a backlog item for a future history view if demand is confirmed.
- **Player-initiated session creation:** out of scope for STORY-6.3/6.1. Logged as a new backlog story.
- **Week navigation bounds:** unbounded for MVP.
- **Week navigation design:** no spec exists — shipped simple prev/next arrows as an engineering default, flagged for design review rather than blocking.

## Open questions — new, discovered during implementation

- **Should the prev/next-arrow week navigation be reviewed by design**, now that it's shipped as an engineering default with no spec to follow? Easy to swap for a different pattern (swipe, calendar/month view) later since it's isolated to the day-strip header.
- **Should a player-facing session history view be built** (separate "Upcoming"/"History" mode)? Not built — logged per the resolved decision above, pending confirmed demand.
- **Should player-initiated session creation be built as a new story?** Not built — STORY-6.1's ACs explicitly scope creation to coaches/team managers; this is new scope, not a regression.
