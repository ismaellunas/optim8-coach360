# Coach360 — Open QA bugs

**Date:** 2026-09-09  
**Device:** Samsung Z Fold7 (SM-F966B/DS), One UI 8.5, Android 16, Knox 3.13  
**Account:** coach / trial  
**Sources:** tester notes from the Fold7 pass. Root causes confirmed in the current mobile app (not the August 2026 sheet).

Tracker landing (`docs/index.html`) shows **open bugs only**. Resolved history: [`bug-investigations-archive.md`](./bug-investigations-archive.md) and `bugs_archive` in the tracker JSON.

## Summary

| ID | Bug | Root cause (short) | Status |
|---|---|---|---|
| QA2-01 | Dark grey text on dark background | `coach-t3` `#5a6278` on `coach-bg` `#0b0e14` (~3:1) | Open |
| QA2-02 | Android back exits the app | No Capacitor `backButton` handler; in-app chevrons only | Open |
| QA2-03 | Create Content sits under the tab bar | Home CTA is last; `ScreenContainer` `pb-24` short of TabBar + Fold inset | Open |
| QA2-04 | Coach dashboard not updating | Home stats, upcoming, objectives preview, and AI copy are still hardcoded | Open |
| QA2-05 | Where to manage created content | My Library exists but is only reached via Create Content | Open |
| QA2-06 | Forgot password | Not implemented on sign-in | Open |

**Resolved this pass:** Store empty in the native app (QA2-07) — Sanity CORS. See archive.

## QA2-01 — Muted text is hard to read

**Reason (confirmed).** Design tokens in `apps/mobile/src/index.css`: `--color-coach-t3: #5a6278` on `--color-coach-bg: #0b0e14`. Labels, timestamps, and helper copy use `text-coach-t3` throughout. Contrast is about 3:1 (fails WCAG AA 4.5:1 for small text). `coach-t2` (`#8b93a7`) is closer to passing.

**Resolution.** Open — raise muted text luminance (or use `coach-t2` for body-sized labels).

## QA2-02 — Android back / gesture exits the app

**Reason (confirmed).** Navigation is in-app screen state (`go(...)`, `PageHeader onBack`). There is no `App.addListener('backButton')` (or equivalent) in the Capacitor shell. Android system back / gesture therefore closes the WebView.

**Resolution.** Open — intercept hardware back: pop in-app screens when possible, exit only on root tabs.

## QA2-03 — Create Content sits under the bottom nav

**Reason (confirmed).** Coach Home renders `+ Create Content` as the last block (`apps/mobile/src/App.jsx` HomeScreen). `ScreenContainer` uses `pb-24` (96px). `TabBar` is `fixed` with gradient, tab row, and `pb-[env(safe-area-inset-bottom)]`. On Fold7 with gesture navigation that inset plus the tab chrome exceeds 96px, so the CTA clips.

**Resolution.** Open — increase home/tab bottom padding (and/or move Create Content above the fold). Worse on foldables than on a 430px phone frame.

## QA2-04 — Coach dashboard does not update

**Reason (confirmed).** Coach Home still uses mock arrays: Players/Teams/Sessions/Drills counts, two fake upcoming sessions, two fake objective bars (“Improve 3PT %”, “Defensive rotations”), and static AI copy. Player Home *does* load `listForUser` / `listPlayerProgress`. Real objectives live on `ObjectivesScreen` (Dashboard → Objectives → **Manage**); the home cards are not wired to that data.

**Resolution.** Open — replace coach Home mocks with live roster/session/objective queries. Until then, testers should treat Dashboard numbers as placeholders.

## QA2-05 — No place to manage created content

**Reason (confirmed).** `CoachLibraryScreen` (`MY LIBRARY`) is real and lists created items immediately. It is not a tab. The only routes are Home → **+ Create Content** → **Open my library**, or **View library** after save. Assigning to a session also works from Schedule. Coach tabs are Home / Roster / Schedule / Chat / Store.

**Resolution.** Open — add a durable Library entry (tab, Home link, or Roster/Profile). Path for testers today: Create Content → Open my library.

## QA2-06 — Forgot password missing

**Reason (confirmed).** `SignInScreen` has email, password, and “Create an account” only. No `resetPasswordForEmail` (or similar) in the mobile auth feature.

**Resolution.** Open — not in this build. Password reset is a Supabase Auth dashboard workaround until a client flow exists.

---

## Not bugs (answered from implementation)

These came up in the same pass. They are product scope or how-to, not defects.

| Topic | What the app does |
|---|---|
| **Objectives** | Dashboard → Objectives → **Manage**. Trial maps to Pro access. Home preview cards are fake (QA2-04). |
| **Link a player who already has an account** | Roster → Invite → add **by email**. Requires an existing profile. Does not create a second account. No account → use invite link/code. |
| **Remove a linked player** | Sets roster `status` to `removed`. Does **not** delete the player’s Auth/profile. |
| **Season start / end** | Metadata on the team profile only. No next-season rollover or archive. Dates can be edited. |
| **Recurring sessions** | Out of MVP (OQ-3.2). One-off date/time only. No series edit. |
| **Dashboard divider / background images** | Not in the design system. Dark cards only. Enhancement. |
| **Chat with players** | Team channels appear on their own. Player DMs: Chat → orange **+** / **New message**, then a roster player who has **signed up**. Invited-but-not-joined players do not appear. |
| **Store** | Working in the mobile app after Sanity CORS allowlisted Capacitor origins (QA2-07, archived). Native Stripe return-to-app can still fail (`window.location.origin` is `https://localhost`); treat that as a follow-up if it shows up, not as a catalogue outage. |
