# STORY-6.3 fix plan — Share schedule and notify recipients

> **Status today:** DONE (tracker) — reopened, contradicted by BUG-QA3-04
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

1. Replace the render-time `new Date()` anchor with a `weekAnchorDate` piece of state (defaulting to the current week), and add prev/next-week controls to the day-strip header.
2. Change `dayData` filtering to match on the exact calendar date of each visible day cell (year/month/date triple), not just `getDay()`. Compute each day cell to a concrete `Date` once per render and compare against `entry.scheduledAt`'s calendar date.
3. Re-derive "today" (for highlighting and for `selectedDay` defaults) on screen focus / app-resume rather than only at mount, so a long-lived session doesn't show a stale "today."
4. Leave `filterUpcomingSessions` behavior for players unchanged pending the product decision in Open Questions — if "past" needs to become visible to players, this will need a mode switch (e.g. "Upcoming" vs "History" tab), not just a filter tweak, since the current AC and test both codify "upcoming only."

## Verification plan

- Existing tests to re-run: `tests/sessions/story-6.3.test.js` (must keep the `filterUpcomingSessions` unit assertions passing — specifically the `past`/`today`/`soon`/`gone` fixture at lines 129–138) and `tests/sessions/story-6.1.test.js`.
- New test cases needed:
  - Two sessions on the same weekday in different weeks must not both appear when one specific week is selected.
  - Navigating to next/previous week changes the visible date range and `dayData` accordingly.
  - "Today" highlight updates after a simulated date change (app resume) without requiring a tap.
- Manual re-test: coach account, create one session 2 weeks in the future and one 2 weeks in the past; confirm both are reachable via the new week navigation and are not conflated with the current week's same-weekday sessions. Repeat for a player account viewing a shared team schedule.

## Open questions — need confirmation before implementing

- **Ambiguous source of the "Progress" complaint.** The exact phrase "Not updating to todays date / Cannot view future/past" appears under the **"Progress"** heading in the player-account section of `Coach_Feedback.docx`, but `apps/mobile/src/features/progress/ui/ProgressScreen.jsx` has no date, calendar, or future/past concept at all (see `docs/delivery/story-7.1-fix-plan.md` for that screen's actual content). I'm assuming the tester meant the Schedule tab and mislabeled it under "Progress" in the doc, because the identical phrasing is attributed to "Schedule" in the coach-account section. **This needs confirmation from whoever ran the Fold7 pass** — if the tester really meant the Progress screen, there's a different (currently unscoped) feature gap, not this bug.
- **Is "players can't view past sessions" actually unwanted behavior, or is QA flagging intended scope as a defect?** Current code + AC-3 wording + an existing unit test all agree players should only see upcoming sessions. If product wants a player-facing history view, that's a scope addition (new "History" mode), not a bug fix — needs a decision before implementation sizing.
- **Is "Cannot add my own sessions" (player) in scope for this story at all?** STORY-6.1 AC-1 explicitly scopes session creation to coaches (and AC-2 to Team Managers at Advanced+); there is no player-initiated session creation anywhere in the codebase. This reads as a feature request outside STORY-6.3/6.1's current scope, not a regression — confirm whether it should be tracked as a new story or dropped as out-of-scope.
- **Should week navigation be unbounded**, or capped to a team's season start/end (tracked only as metadata per STORY-3.1, with no enforcement today)? Affects whether the fix needs to read team season dates at all.
- **No design spec exists** for week navigation controls (arrows vs. swipe vs. separate calendar/month view) in `docs/design/ui-reference.md` — needs design input before implementation, not an engineering-only call.
