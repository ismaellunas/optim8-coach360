<div class="cover-block">

# Coach360 Manual Test Pack

**For non-technical testers**

Complete click-through instructions for Epics 1–10, plus reference sheets you can keep open while testing.

Version: July 2026 · Document: mobile-app-test-pack

Regenerate HTML: `npm run docs:test-pack` → `docs/mobile-app-test-pack.html`

</div>

---

## Part 1 — Quick Reference (read this first)

### Where to test

Ask your team lead for the exact links for your environment. Typical URLs:

| What | Staging (testing) | Production (live) |
|---|---|---|
| **Mobile app (browser)** | `https://app-staging.coach360.com` | `https://app.coach360.com` |
| **Admin dashboard** | `https://admin-staging.coach360.com` | `https://admin.coach360.com` |
| **Native app (phone)** | TestFlight / internal build link from the team | App Store / Play Store |

You can run **all mobile tests in a desktop browser** using the mobile web link. Use a phone only for keyboard/status-bar checks (test E1-T2).

---

### Accounts you will create

Create **three separate sign-ups** during testing. Use different email addresses for each.
You do **not** need to check your inbox — email verification is **disabled** on the test
environment (Supabase email sending limits).

| Role | Example email (Gmail trick) | Used for |
|---|---|---|
| **Coach** | `yourname+coach@gmail.com` | Content, sessions, invites, subscriptions |
| **Player** | `yourname+player@gmail.com` | Joining teams, Store, locked features |
| **Team Manager** | `yourname+manager@gmail.com` | Creating teams, roster management |

**Gmail alias tip:** Messages sent to `you+anything@gmail.com` all arrive in your normal Gmail inbox.

**Admin account (Epic 5 only):** The team must give you a pre-made admin login. You cannot sign up as Admin from the mobile app.

---

### Account tracking sheet (fill in as you go)

| Role | Email used | Password (your note) | Plan chosen | Trial used? |
|---|---|---|---|---|
| Coach | | | Basic / Trial / Advanced / Pro | Yes / No |
| Player | | | Basic / Advanced / Pro | Yes / No |
| Team Manager | | | Basic | Yes / No |
| Admin | | | n/a | n/a |

---

### Stripe test card (payments only)

**Never use a real credit card in staging.** Only this test card:

| Field | Value |
|---|---|
| Card number | `4242 4242 4242 4242` |
| Expiry | Any future date (e.g. `12/34`) |
| CVC | Any 3 digits (e.g. `123`) |
| Name / postal code | Anything |

After paying, wait **~30 seconds**, then **close and reopen the app** before reporting a plan change as failed.

---

### Subscription plans (what they mean)

| Plan | What testers should know |
|---|---|
| **Free trial** | 14 days, one time per account. Full Pro access during trial. Yellow banner on Home shows days left. |
| **Basic** | Free forever. Many features locked (Chat, AI, etc.). |
| **Advanced** | Unlocks Chat and coach creation tools. |
| **Pro** | Unlocks AI Insights, Objectives, and other Pro-only features. |

---

### Roles (who can do what — simplified)

| Role | In one sentence |
|---|---|
| **Coach** | Creates training content and sessions; can optionally create a team. |
| **Player** | Consumes training; joins teams via invite; cannot invite or remove others. |
| **Team Manager** | Must create a team during setup; can invite players on Basic plan. |
| **Admin** | Uses the separate Admin website to configure feature locks (not the mobile app). |

---

### Finding your way around the mobile app

**Bottom tabs (Coach / Player / Team Manager after onboarding):**

| Tab | Name on screen | Main purpose |
|---|---|---|
| 1 | **Home** | Dashboard, trial banner, AI/Objectives cards |
| 2 | **Roster** (or Teams) | Teams list, invites, player list |
| 3 | **Schedule** | Calendar and **+ Add Session** (coaches) |
| 4 | **Chat** | Messages (Advanced+ required) |
| 5 | **Store** | Training packages marketplace |

**Other important controls:**

| Control | Where to find it |
|---|---|
| **Sign Out** | Home → **gear icon** (top right) → scroll down → **Sign Out** |
| **Manage Subscription** | Home → gear icon → **Manage Subscription** |
| **Profile / settings** | Gear icon (top right on Home) |

**Sign-out is only available after you finish onboarding** and reach the main Home screen with tabs.

---

### Common screens you will see

| Screen title | When it appears |
|---|---|
| Welcome / **Create account** / **Sign in** | Not logged in |
| **SELECT YOUR ROLE** | During sign-up |
| **CHECK YOUR EMAIL** | *Not used on test environment* — sign-up goes straight into the app |
| **CHOOSE YOUR PLAN** | After profile setup |
| **Feature Locked** | Pop-up when your plan is too low for a feature |
| **Chat Locked** | Chat tab when below Advanced |
| **INVITE PLAYERS** | Roster → Teams → Invite |
| **JOIN TEAM** | Player entering an invite code |

---

### Recommended test order

Run tests **in epic order**. Later epics reuse accounts from earlier ones.

1. **Epic 1** — Smoke (2 tests)
2. **Epic 2** — Create all three accounts (6 tests)
3. **Epic 3** — Teams and rosters (7 tests)
4. **Epic 4** — Plans and payments (10 tests) — **do before Epic 5**
5. **Epic 5** — Feature gating on mobile (10 tests)
6. **Epic 5 Admin** — Optional, needs admin login (4 tests)
7. **Epic 6** — Schedule sessions + attach content + share/notify (16 tests)
8. **Epic 7** — Player session content + drill progress + coach review + Home dashboard (15 tests)
9. **Epic 8** — Chat channels, rich messages, peer sharing (11 tests)
10. **Epic 9 Mobile** — Coach create content + Mux + private distribute (12 tests) — needs Coach Advanced+
11. **Epic 9 Admin** — Sanity Studio content schemas (optional, needs admin login) (4 tests)
12. **Epic 10** — Marketplace browse + purchase + drip engine (4 click tests; drip unlock is backend) — needs paid plan + Stripe test card; team purchase needs Coach Advanced+

**Estimated time:** 4–6 hours for a full first pass, longer if you hit payment sync delays.

---

### How to report a failure

Copy this template into email or your bug tracker:

```
Test ID: (e.g. E4-T6)
Result: FAIL
Account email: 
Role / plan: (e.g. Player, Basic)
Device / browser: (e.g. iPhone 15 Safari, or Chrome desktop)
Time (approx): 
Steps taken: (what you tapped)
Expected: (from the test table)
Actual: (what happened instead)
Screenshot: (attach)
```

For every test, mark **PASS** or **FAIL** on the Quick Results Sheet at the end of this document.

---

<div class="page-break"></div>

## Part 2 — Test Instructions

**Audience:** Non-technical testers. You only need to be able to tap/click around the app.
No coding, no tools — just the app, an email inbox, and this checklist.

Epic 5 (RBAC & tier feature gating) builds on Epic 4 — run the Epic 4 subscription tests first,
then continue with Epic 5 below.

---

## Before You Start

### What you need

1. **The app** — either installed on your phone (iOS/Android test build) or the web/staging
   link provided by the team.
2. **At least 3 distinct email addresses** for separate accounts — a **Coach**, a **Player**,
   and a **Team Manager**. You do **not** need to open your inbox during sign-up (email
   verification is turned off on the test environment).
   - Tip: if you use Gmail, you can reuse one inbox with aliases, e.g.
     `yourname+coach@gmail.com`, `yourname+player@gmail.com`, `yourname+manager@gmail.com`.
     All mail arrives in your normal inbox if you ever need it for invite-by-email tests.
3. **A Stripe TEST credit card** (no real money is charged):
   - Card number: `4242 4242 4242 4242`
   - Expiry: any future date (e.g. `12/34`)
   - CVC: any 3 digits (e.g. `123`)
   - Name/postal code: anything
4. Optionally a second phone or a private/incognito browser window, so you can be signed in
   as two different users at once (useful for the team invite tests).
5. **For Epic 5 admin tests only:** the **Admin dashboard** URL (ask the team — e.g.
   `admin-staging.coach360.com`) and an **Admin account** the team has provisioned for you.
   Admin tests are optional if you only have mobile access.

### How to report results

For every test below, mark **PASS** or **FAIL**. If something fails:

- Note the **test ID** (e.g. `E3-T2`).
- Write down **what you did** and **what you saw** instead of the expected result.
- Take a **screenshot** of the screen (including any red error message).
- Note the **email address of the account** you were using and the approximate **time**.

### Two things to know before testing

- **No email verification step.** After you tap **Create account**, you go straight into
  profile setup — there is no **CHECK YOUR EMAIL** screen and no verification link to click.
  (Verification is disabled on the test environment due to Supabase email sending limits.)
- **Payments take a moment to sync.** After paying with the test card, the app is updated by
  a background process. If your plan doesn't change immediately, **wait ~30 seconds, then
  close and reopen the app** before calling it a failure.
- **Never enter a real credit card.** Only use the test card above.

---

## Epic 1 — App Foundation (Smoke Tests)

Most of Epic 1 is behind-the-scenes setup (databases, build pipelines) that can't be tested
by clicking. Only these basics apply to you:

### E1-T1: App launches

| Step | Do this | You should see |
|---|---|---|
| 1 | Open the Coach360 app on your device. | The dark welcome screen with the orange **COACH360** logo, the tagline "Basketball coaching and player development", and two buttons: **Create account** and **Sign in**. No crash, no blank white screen. |

### E1-T2: Keyboard and screen behave on a real phone

*(Only if you are testing on an actual phone, not a browser.)*

| Step | Do this | You should see |
|---|---|---|
| 1 | Tap **Sign in** and tap into the **Email address** box. | The keyboard slides up and does **not** cover the box you are typing into. |
| 2 | Rotate the phone / check the very top of the screen. | The clock/battery status bar area is readable and the app content is not hidden underneath it. |

---

## Epic 2 — Accounts, Sign-Up, and Onboarding

### E2-T1: Create a Coach account

| Step | Do this | You should see |
|---|---|---|
| 1 | On the welcome screen, tap **Create account**. | A **SELECT YOUR ROLE** screen with three choices: **Coach**, **Player**, **Team Manager**. |
| 2 | Tap **Coach**, then tap **Continue**. | A **CREATE ACCOUNT** screen saying "Signing up as Coach". |
| 3 | Enter a name, your *coach* email address, and a password (at least 6 characters). Tap **Create account**. | You enter the app immediately — **no** "check your email" step. The coach profile setup form appears (next test). |

Also try: on step 3, enter a password shorter than 6 characters — the app should stop you.

### E2-T2: Coach profile setup

| Step | Do this | You should see |
|---|---|---|
| 1 | After first sign-in as a Coach, fill in the coach profile form (it asks about your coaching background and whether you work independently or with a team). | The form saves without errors. |
| 2 | Continue past the profile step. | A **CHOOSE YOUR PLAN** screen (trial / paid tiers / "Continue with Basic for free"). This is covered in Epic 4 — for now choose **Start free trial**. |
| 3 | Continue. | A short guided tour (progress dots at the top) with steps: Welcome → Your profile → Browse training packages → Plan your first session → Share with players. |
| 4 | Step through the tour. Confirm you can **skip** the team/invite parts. | You land on the **Home** screen with your name in the header. |

### E2-T3: Create a Player account and player onboarding

| Step | Do this | You should see |
|---|---|---|
| 1 | Sign out (Home → gear icon top-right → **Sign Out**), or use a second device/incognito window. Create a new account, this time choosing the **Player** role, using your *player* email. | Same sign-up flow as the coach — you land in the app right away (no email verification). |
| 2 | Fill in the player profile: **age**, **position** (e.g. "Point Guard"), and optionally a photo. | The form saves without errors. |
| 3 | At the plan screen, tap **Continue with Basic for free** (we save the trial test for Epic 4). | You move on to the player tour. |
| 4 | Step through the player tour: Welcome → Your profile → Browse training content → Start your first drill → Track your progress → Join a team. | You can complete it **without** joining a team. The "Join a team" step is optional/skippable. |
| 5 | Finish the tour. | The player Home screen, with tabs at the bottom: Home, Progress, Schedule, Chat, Store. |

### E2-T4: Create a Team Manager account

| Step | Do this | You should see |
|---|---|---|
| 1 | Sign out and create a third account, choosing **Team Manager**, with your *manager* email. | The manager profile form (asks about your experience managing teams) — no email verification step. |
| 2 | Complete the profile. | You are required to **create a team** before you get into the main app (team creation details are tested in Epic 3, test E3-T1). |

### E2-T5: You stay signed in after closing the app

| Step | Do this | You should see |
|---|---|---|
| 1 | While signed in as any user, fully close the app (swipe it away from the app switcher on a phone, or close the browser tab). | — |
| 2 | Reopen the app. | You are **still signed in** and land back in the app — no sign-in screen. |

### E2-T6: You cannot get in without signing in

| Step | Do this | You should see |
|---|---|---|
| 1 | Sign out. | You are returned to the welcome screen. |
| 2 | Close and reopen the app. | You see the welcome/sign-in screen only. There is no way to reach Home, Roster, Chat, etc. without signing in. |

---

## Epic 3 — Teams, Invites, and Rosters

### E3-T1: Team Manager creates a team

| Step | Do this | You should see |
|---|---|---|
| 1 | Sign in as your **Team Manager** account (continuing from E2-T4). | The **Create Team** form. |
| 2 | Fill in: team name (e.g. "U14 Eagles"), a description, **minimum and maximum age** (e.g. 12 and 14), and season/league details. Upload a **team logo** photo if possible. | All fields accept input; the logo picker opens your photo library. |
| 3 | Save the team. | The team appears with its name and logo. You reach the main app. |
| 4 | Go to the **Roster** tab → **Teams** → tap **Manage** on your team. Change the description and save. | The **EDIT TEAM** screen opens, the change saves, and the updated text shows on the team card. |

### E3-T2: Coach creates a team from Roster (optional path)

| Step | Do this | You should see |
|---|---|---|
| 1 | Sign in as your **Coach** account (which is on a free trial, so it has full access). | — |
| 2 | Go to the **Roster** tab. | A Teams/Players toggle. If no team exists yet: a "No teams yet" message explaining teams are optional. |
| 3 | Tap **+ Create Team**, fill in the form, save. | The team appears in the Teams list. |

### E3-T3: Generate an invite and have a Player join

You need the **Coach** (or Team Manager) signed in on one device/window and the **Player**
on another. If you only have one device, just copy the invite code on paper and switch accounts.

| Step | Do this (as Coach or Manager) | You should see |
|---|---|---|
| 1 | Roster tab → Teams → tap **Invite** on the team. | An **INVITE PLAYERS** screen with an **Invite code** (like `ABCD1234`) and an **Invite link**, each with a **Copy** button. Text says invites expire in 14 days. |
| 2 | Tap **Copy code**. | Button briefly changes to "Copied!". |

| Step | Do this (as Player) | You should see |
|---|---|---|
| 3 | On the Home screen, find the join-team option (or open the invite link the coach shared). | A **JOIN TEAM** screen with an **Invite code** box. |
| 4 | Type the code and tap **Check code**. | The team's name appears as a preview — confirm it's the right team. |
| 5 | Tap **Join team**. | You are joined; the app returns Home and shows your team context. |

| Step | Verify (as Coach or Manager) | You should see |
|---|---|---|
| 6 | Roster tab → **Players** (or tap **Roster** on the team). | The player you just joined is listed with a "Player" badge. |

### E3-T4: A wrong invite code is rejected politely

| Step | Do this (as Player) | You should see |
|---|---|---|
| 1 | On the **JOIN TEAM** screen, type a made-up code like `WRONG123` and tap **Check code**. | A clear, human-readable error (e.g. the invite was not found or has expired). **Not** a crash or a blank screen. |

### E3-T5: Add a player manually by email

| Step | Do this (as Coach or Manager) | You should see |
|---|---|---|
| 1 | Roster tab → Teams → **Invite** on the team. Scroll below the invite code section. | A form to add a player **by email address**. |
| 2 | Enter your Player account's email and submit. | Success — the player is added to the roster (check the Players list). Entering an email that has no Coach360 account should show a clear error instead. |

### E3-T6: Remove a player from the roster

| Step | Do this (as Coach or Manager) | You should see |
|---|---|---|
| 1 | Roster tab → **Players**. | The roster list, with a **Remove** button next to each player. |
| 2 | Tap **Remove** on your test player. | The player disappears from the list. |
| 3 | (If push notifications are enabled on the player's device) check the player's phone. | The player receives a notification about the roster change. |

### E3-T7: Tier limits on team features

Team features are only available on certain plans. Check the doors are locked correctly:

| Step | Do this | You should see |
|---|---|---|
| 1 | Sign in as the **Player** account (Basic, no trial). Go to Roster-related areas. | Players never see Invite/Remove controls. |
| 2 | If you have a **Coach on the Basic plan** (no trial): Roster → **Invite**. | A **Feature Locked** pop-up appears instead of the invite screen (coaches need a higher plan to invite). The pop-up is covered in Epic 4, test E4-T5. |
| 3 | As the **Team Manager** (Basic is enough for managers): Roster → **Invite**. | The invite screen opens normally. |

---

## Epic 4 — Plans, Free Trial, and Payments

> Reminder: use only the test card `4242 4242 4242 4242`, any future expiry, any CVC.
> After paying, give the app ~30 seconds and reopen it if the plan hasn't updated yet.

### E4-T1: The plan choice screen after sign-up

*(You already saw this in Epic 2 — this test checks the details.)*

| Step | Do this | You should see |
|---|---|---|
| 1 | Create one more fresh account (any role, new email). Complete the profile. | The **CHOOSE YOUR PLAN** screen. |
| 2 | Read the screen. | A highlighted **14-Day Free Trial** box with a **Start free trial** button; a list of paid plans (**Basic**, **Advanced**, **Pro**) each with prices and features and a **Choose …** button; and a **Continue with Basic for free** link at the bottom. |

### E4-T2: Start the free trial and see the countdown

| Step | Do this | You should see |
|---|---|---|
| 1 | On the plan screen, tap **Start free trial**. | You enter the app. |
| 2 | Look at the Home screen. | A yellow banner: **"Free Trial - X days left"**, "Full Pro access", a **Trial active** badge, and a **Subscribe** button. |
| 3 | Tap the gear icon (top right) → **Manage Subscription**. | The **SUBSCRIPTION** screen shows Current Plan, a **Trial active** badge, "**X days remaining**", and "Full Pro access until your trial ends". |
| 4 | While on trial, try a Pro feature: Home screen → the **AI Insights** card, or **Objectives**. | They open — trial gives full Pro access, nothing is locked. |

### E4-T3: The trial can only be used once

| Step | Do this | You should see |
|---|---|---|
| 1 | Using an account that **already used its trial** — sign out and back in, then look at the plan screens (e.g. a paywall pop-up, or the plan choice screen if it appears). | The trial offer is **gone**. Where it would appear you instead see "**Free trial used** — Your one-time trial has already been activated on this account and cannot be restarted." There must be no button anywhere that starts a second trial. |

### E4-T4: What a Basic user cannot do (paywall doors)

Use your **Player** account (Basic, never paid).

| Step | Do this | You should see |
|---|---|---|
| 1 | Tap the **Chat** tab. | A locked screen: "**Chat Locked** — Upgrade to Advanced to message" with an **Upgrade** button. |
| 2 | On Home, tap the **AI Insights** card (it shows a padlock and "Upgrade to Pro to unlock"). | A **Feature Locked** pop-up (next test). |

### E4-T5: The paywall pop-up itself

Trigger the pop-up as in E4-T4, then check each part:

| Check | You should see |
|---|---|
| Required plan is named | Text like "This requires **Pro** (or Advanced) …" — it tells you exactly which plan you need. |
| Plans listed | Plan cards with prices and features. Plans **below** the required one are greyed out and marked "Below required" — you cannot select them. |
| Trial button rules | **Start free trial** appears **only** if this account never used its trial. (Check with both a fresh account and a used-trial account.) |
| You can walk away | **Browse free content** takes you to the Store; **Maybe Later** closes the pop-up and you can keep using the rest of the app. Being blocked from one feature never traps you. |

### E4-T6: Upgrade with the test card (Stripe checkout)

Use the **Player** (Basic) account.

| Step | Do this | You should see |
|---|---|---|
| 1 | Open the paywall pop-up (E4-T4) and tap **Upgrade to Advanced** (or go to gear icon → **Manage Subscription** → **Upgrade** on a plan). | You are taken to a secure Stripe payment page showing the plan and monthly price. |
| 2 | Pay with the test card `4242 4242 4242 4242`. | Payment succeeds and you are returned to the app. |
| 3 | Wait ~30 seconds, reopen the app, go to gear icon → **Manage Subscription**. | **Current Plan** now shows your new plan, with a "Renews on …" date. The plan card is marked **Current**. |
| 4 | Retry the feature that was locked (e.g. Chat for Advanced). | It now works. |

### E4-T7: Billing history

| Step | Do this | You should see |
|---|---|---|
| 1 | As the account that just paid (E4-T6): gear icon → **Manage Subscription**, scroll down. | A **Billing history** section listing your payment with the amount, date, and a **paid** badge. |
| 2 | As a fresh account that never paid. | Billing history shows "No invoices yet" (or is not shown at all) — never someone else's invoices. |

### E4-T8: Upgrading again is immediate

| Step | Do this | You should see |
|---|---|---|
| 1 | As the Advanced account, go to **Manage Subscription** and tap **Upgrade** on **Pro**. | Small print reads "Applies immediately with prorated billing". |
| 2 | Complete the upgrade. | Within a minute your Current Plan shows **Pro**, and Pro features (AI Insights, Objectives) unlock right away. |

### E4-T9: Downgrading is scheduled, not immediate

| Step | Do this | You should see |
|---|---|---|
| 1 | As the Pro account, on **Manage Subscription**, tap **Downgrade** on a lower plan. | The button asks you to confirm (**Confirm downgrade**) and shows a notice about what happens to your data. |
| 2 | Tap **Confirm downgrade**. | A yellow **Downgrade scheduled** box appears: "Switching to … on \<date\>. You keep full access until then. Objectives and AI history are preserved but hidden until you upgrade again." The lower plan is marked **Scheduled**. |
| 3 | Immediately try a Pro feature. | It **still works** — you keep full access until the billing period ends. |

### E4-T10: Cancelling out of payment does nothing bad

| Step | Do this | You should see |
|---|---|---|
| 1 | Start an upgrade, but on the Stripe payment page press **Back** / close it without paying. | You return to the app on your **old plan**. No charge, no error, nothing changed. |

### Not testable by clicking (for awareness only)

These Epic 4 behaviours exist but need a developer or time travel to verify — do **not**
mark them as failed:

- **Trial expiry after 14 days** — the account should drop to Basic and locked features
  should show the paywall. (Requires waiting 14 days or a developer shortcut.)
- **"Trial ending soon" warning notification** (sent ~3 days before expiry).
- **Failed renewal payment** — the account should enter a "Payment issue" locked state
  (a red banner appears on the Subscription screen). A developer must simulate the failed
  payment. If you ever *do* see the red "Payment issue" banner unexpectedly, report it.

---

## Epic 5 — Role & Tier Feature Gating (RBAC)

Epic 5 makes sure each role only sees features their plan allows. The rules apply everywhere
in the app — a locked feature should show the same **Feature Locked** pop-up whether you
tap the tab, a card on Home, or an action button.

Use these accounts from earlier epics:

| Account | Plan needed for Epic 5 |
|---|---|
| Coach | One on **Basic** (no trial), one on **Advanced** or **active trial** |
| Player | **Basic** (already created in Epic 2 / 4) |
| Team Manager | **Basic** (already created) |
| Admin | Admin dashboard login (admin tests only) |

### E5-T1: Trial users see browse-only Store

| Step | Do this | You should see |
|---|---|---|
| 1 | Sign in as a **Coach** or **Player** on an **active free trial** (yellow trial banner on Home). | — |
| 2 | Tap the **Store** tab. | Package listings are visible. |
| 3 | Read the top of the screen. | An orange **Browse only** card: "Trial preview — purchase unlocks on a paid plan." |
| 4 | Tap any paid package, then tap **Purchase …** | Either the purchase flow opens or a **Feature Locked** pop-up appears. Note which — if purchase succeeds on trial, report it (the banner says paid plan required). |

### E5-T2: Coach on Basic cannot create content

| Step | Do this | You should see |
|---|---|---|
| 1 | Sign in as your **Coach on Basic** (chose "Continue with Basic for free" or trial expired). | Home screen. |
| 2 | Scroll the Home screen. | **No** **+ Create Content** button anywhere on Home. |

### E5-T3: Coach on Basic cannot add sessions

| Step | Do this | You should see |
|---|---|---|
| 1 | As the same **Coach on Basic**, tap the **Schedule** tab. | The weekly calendar **and** a **+ Add Session** button at the bottom (coaches always see the button — Basic tier is blocked at tap time, not by hiding it). |
| 2 | Tap **+ Add Session**. | A **Feature Locked** pop-up saying session creation requires **Advanced** (or similar). You do **not** reach the "NEW SESSION" form. |

### E5-T4: Coach on Advanced (or trial) can create content and sessions

| Step | Do this | You should see |
|---|---|---|
| 1 | Sign in as a **Coach on Advanced** (paid upgrade from Epic 4) **or** a Coach still on **active trial**. | — |
| 2 | On **Home**, look for **+ Create Content**. | The button is visible. Tap it → **CREATE CONTENT** screen with Training Drill / Video Upload / Game Strategy options. |
| 3 | Go to **Schedule** → tap **+ Add Session**. | The **NEW SESSION** form opens (no paywall). |

### E5-T5: Players and Team Managers never see Create Content

| Step | Do this | You should see |
|---|---|---|
| 1 | Sign in as your **Player** account. Check Home. | No **+ Create Content** button (players cannot create content at any tier). |
| 2 | Sign in as your **Team Manager** account. Check Home. | No **+ Create Content** button. |

### E5-T6: Chat locked below Advanced for all roles

| Step | Do this | You should see |
|---|---|---|
| 1 | As **Player on Basic**, tap **Chat**. | **Chat Locked** — "Upgrade to Advanced to message." |
| 2 | As **Coach on Basic**, tap **Chat**. | Same locked screen. |
| 3 | As **Team Manager on Basic**, tap **Chat**. | Same locked screen. |
| 4 | Upgrade any one of those accounts to **Advanced** (Epic 4 flow), reopen the app, tap **Chat** again. | The messages list opens — no lock screen. |

### E5-T7: AI features locked below Pro for all roles

| Step | Do this | You should see |
|---|---|---|
| 1 | As **Coach on Advanced** (not trial), tap the **AI Insights** card on Home. | **Feature Locked** pop-up requiring **Pro**. |
| 2 | As **Player on Advanced**, check Home for AI-related cards. | Locked or absent — not fully usable without Pro. |
| 3 | As any role on **active trial** or **Pro**, tap **AI Insights**. | It opens — trial counts as Pro-level access. |

### E5-T8: Objectives require Pro (coaches)

| Step | Do this | You should see |
|---|---|---|
| 1 | As **Coach on Advanced** (not Pro, not trial), find **Objectives** on Home. | Shows **Pro** or a locked card: "Upgrade to Pro for objectives." |
| 2 | Tap it. | **Feature Locked** pop-up requiring **Pro**. |
| 3 | As **Coach on Pro** or **active trial**, tap **Objectives** → **Manage**. | The **OBJECTIVES** list opens. |

### E5-T9: Paywall pop-up rules (RBAC consistency)

Trigger any locked feature (e.g. Chat on Basic), then verify:

| Check | You should see |
|---|---|
| Required plan named | "This requires **Advanced**" (or Pro) — exact tier named. |
| Lower plans disabled | Plan cards below the required tier are greyed out and marked **Below required**. |
| Escape hatches work | **Browse free content** and **Maybe Later** both close the pop-up; you can keep using the rest of the app. |
| Same pop-up everywhere | Tapping **Upgrade** on the Chat locked screen shows the same pop-up as tapping a locked Home card. |

### E5-T10: Team invite rules by role (matrix check)

| Step | Do this | You should see |
|---|---|---|
| 1 | **Coach on Basic** (no trial): Roster → **Invite**. | **Feature Locked** pop-up (coaches need Advanced+ to invite). |
| 2 | **Team Manager on Basic**: Roster → **Invite**. | **INVITE PLAYERS** screen opens normally (managers can invite on Basic). |
| 3 | **Player**: Roster tab. | No Invite or Remove controls anywhere. |

---

## Epic 5 — Admin Dashboard Tests

*Skip this section if you were not given an Admin account or dashboard URL.*

### E5-T11: Admin feature gating screen loads

| Step | Do this | You should see |
|---|---|---|
| 1 | Open the Admin dashboard URL in a browser. Sign in with your **Admin** account. | **Admin sign in** succeeds; you reach the dashboard. |
| 2 | Navigate to **Content** (sidebar or menu). | Page titled **Content** with subtitle about marketplace operations. |
| 3 | Scroll down. | A **Feature gating by role** section under **Content Paywall**, with three tabs: **Player**, **Coach**, **Team Manager**. |
| 4 | Tap each tab. | A table listing features (e.g. Chat, Create Content, AI) with a **Tier** dropdown per row. |

### E5-T12: Admin can change a feature tier requirement

| Step | Do this | You should see |
|---|---|---|
| 1 | On **Content** → **Feature gating by role** → **Coach** tab, find the **Chat** row. | Current tier shows **Advanced** (unless someone changed it). |
| 2 | Change the **Tier** dropdown to **Pro**. | The dropdown saves (may briefly show a loading state). No error message. |
| 3 | Change it back to **Advanced** when finished testing E5-T13. | Saves successfully. |

### E5-T13: Admin gating change reaches mobile without app update

This is a two-person or two-browser test (Admin dashboard + mobile app).

| Step | Do this | You should see |
|---|---|---|
| 1 | Confirm a **Coach on Advanced** can open **Chat** normally (E5-T6 step 4). | Messages list, not locked. |
| 2 | In the Admin dashboard (E5-T12), set **Chat / Coach** tier to **Pro**. | Saves. |
| 3 | On mobile: sign out, sign back in as that Coach (or force-close and reopen the app). | — |
| 4 | Tap **Chat**. | **Chat Locked** or **Feature Locked** requiring **Pro** — even though the account is still on Advanced. |
| 5 | **Cleanup:** Admin resets **Chat / Coach** back to **Advanced**. Sign out/in on mobile. Chat works again for Advanced coaches. | — |

### E5-T14: Admin free content catalog

| Step | Do this | You should see |
|---|---|---|
| 1 | On **Content**, scroll to **Free content catalog (Basic tier)**. | Title field, Category field, and **Add** button. |
| 2 | Enter title `Test Free Drill`, category `basics`, tap **Add**. | The item appears in the list below with a **Remove** button. |
| 3 | Tap **Remove**. | The item disappears from the list. |

> **Note:** The free catalog is managed in Admin today. If Basic-tier users do not yet see
> catalog items differently in the mobile Store, that is expected — test the Admin CRUD only.

### Not testable by clicking (for awareness only)

- **Server-side enforcement** — blocked actions are also rejected on the server (403 errors).
  You cannot verify this without developer tools; do not mark mobile PASS/FAIL based on it.
- **Full access matrix** — only launch-critical rules are live; the complete 223-rule matrix
  is deferred post-MVP.

---

## Epic 6 — Session Scheduling (STORY-6.1, STORY-6.2, STORY-6.3)

Epic 6 covers creating, viewing, editing, and cancelling practice sessions on the **Schedule**
tab, attaching library or purchased content, and sharing sessions with a team roster or
individual player (with notifications enqueued for recipients). Run Epic 3 (team + roster)
and Epic 4/5 (subscription tier) first.

**Accounts needed**

| Account | Setup |
|---|---|
| **Coach on Advanced** or **active trial** | Owns a team with at least one **active player** on the roster (Epic 3) |
| **Coach on Basic** | Same as Epic 5 — for paywall regression |
| **Player on Basic+** | Joined the coach's team and has at least one upcoming session assigned to them |
| **Team Manager on Advanced** | Owns a team (Epic 3) — optional, for TM-only rules |

**Before you start:** If Schedule shows a red load error (for example mentioning `library` or
`session`), ask a developer to apply the latest database migrations. Session content needs the
coach library table from STORY-6.2. Reminder settings need the STORY-6.3 migration.

### E6-T1: Schedule tab loads without error (regression)

| Step | Do this | You should see |
|---|---|---|
| 1 | Sign in as **Coach on Advanced** or **active trial** (with a team from Epic 3). | Home screen. |
| 2 | Tap the **Schedule** tab. | A weekly day selector (Sun–Sat) and either session cards or **No sessions scheduled**. |
| 3 | Check for red error text on the screen. | **No** red error banner about loading the schedule or library. |

### E6-T2: Coach sees **+ Add Session** on Advanced/trial (regression)

| Step | Do this | You should see |
|---|---|---|
| 1 | On **Schedule** as **Coach on Advanced** or **active trial**. | **+ Add Session** dashed button at the bottom of the screen. |
| 2 | Tap **+ Add Session**. | **NEW SESSION** form opens (no paywall). |

### E6-T3: Create a team practice session

| Step | Do this | You should see |
|---|---|---|
| 1 | On **NEW SESSION**, enter a title (e.g. "Shooting Drills"). | Fields accept input. |
| 2 | Pick **today's date** (or any future date) and a time. Set type to **Practice**. Under **Share with**, open **Team (full roster)** and select your team. | Team list includes the team you created in Epic 3. |
| 3 | Tap **Create Session**. | Returns to Schedule; a card appears on the matching weekday with your title and time. |

### E6-T4: Create a 1-on-1 session for a roster player

| Step | Do this | You should see |
|---|---|---|
| 1 | Tap **+ Add Session** again. | **NEW SESSION** form. |
| 2 | Set type to **1-on-1**. | Under **Share with**, **Individual player** dropdown appears (not Team). |
| 3 | Select a player from your roster (Epic 3 manual add or invite). Fill title, date, and time. Tap **Create Session**. | Session card shows on Schedule with "Individual session" hint text. |

Also try: if you have **no team**, the Player dropdown may be empty — you need a team roster
before scheduling 1-on-1s in the current app.

### E6-T5: Coach edits an existing session

| Step | Do this | You should see |
|---|---|---|
| 1 | Tap a session card you created as the **Coach**. | **EDIT SESSION** screen (not "SESSION DETAILS"). |
| 2 | Change the title. Tap **Save Session**. | Returns to Schedule with the updated title on the card. |

### E6-T6: Coach cancels (deletes) a session

| Step | Do this | You should see |
|---|---|---|
| 1 | Tap a session card → **EDIT SESSION**. | Edit form with **Cancel session** button at the bottom. |
| 2 | Tap **Cancel session**. | Session disappears from Schedule (hard delete — not shown as "cancelled"). |

### E6-T7: Player views session without edit controls (regression)

Players must **view** assigned sessions but **not** edit session fields or cancel the session.
Content interaction (video, mark complete) is covered in **Epic 7**.

| Step | Do this | You should see |
|---|---|---|
| 1 | Sign in as the **Player** who is on the coach's team (or the direct recipient of a 1-on-1). | — |
| 2 | Tap **Schedule**. | Upcoming team or individual sessions visible (or empty if none assigned yet). |
| 3 | Tap a session card. | Header says **SESSION DETAILS** with session title and time — **not** **EDIT SESSION**. |
| 4 | Scroll the screen. | **No** **Save Session**, **Cancel session**, **+ Add content**, or **Remove** on content rows. |

Fail if you see **EDIT SESSION** or can change session title/date/type as a player.

### E6-T8: Player cannot add sessions

| Step | Do this | You should see |
|---|---|---|
| 1 | As **Player**, stay on **Schedule**. | **No** **+ Add Session** button anywhere on the screen. |

### E6-T9: Team Manager Advanced+ — team sessions only

| Step | Do this | You should see |
|---|---|---|
| 1 | Sign in as **Team Manager on Advanced** (upgrade via Epic 4 if needed). Open **Schedule** → **+ Add Session**. | **NEW SESSION** form. |
| 2 | Open the **Session type** dropdown. | **Practice** and **Film review** available; **1-on-1** is **not** offered (team managers schedule for the roster only). |
| 3 | Create a **Practice** session for your team. | Session appears on Schedule. |

### E6-T10: Attach content from personal library (STORY-6.2)

First open of the library may show a few starter items (drill, video, strategy, package).

| Step | Do this | You should see |
|---|---|---|
| 1 | As **Coach on Advanced** or **active trial**, open **Schedule** → **+ Add Session**. | **NEW SESSION** form with a **Session content** section and **+ Add content**. |
| 2 | Tap **+ Add content**. | **ADD CONTENT** screen with **Library** and **Purchased** tabs. **Library** is selected. |
| 3 | Tap one library item (e.g. a drill). | Returns to the session form; **Session content** shows that item as **1.** with a **Library** label. |
| 4 | Fill title, date, time, and team (or player). Tap **Create Session**. | Session appears on Schedule. |

### E6-T11: Purchased tab for marketplace packages (STORY-6.2)

| Step | Do this | You should see |
|---|---|---|
| 1 | On **NEW SESSION** or **EDIT SESSION**, tap **+ Add content** → **Purchased**. | Purchased tab is available (next to Library). |
| 2 | If the list is empty | Message like **No purchased packages yet** — that is OK when this account has no marketplace purchases. |
| 3 | If a package is listed, tap it. | Returns to the form; content list shows the package as one row with a **Purchased** label (and **single unit**). |

### E6-T12: Ordered content list on session detail (STORY-6.2)

Use a session that already has at least one attached item from E6-T10 (or attach two items now).

| Step | Do this | You should see |
|---|---|---|
| 1 | As **Coach**, tap the session card. | **EDIT SESSION** with **Session content** listing items in order (**1.**, **2.**, …). |
| 2 | Optionally tap **+ Add content**, attach a second library item, then **Save Session**. | Returns to Schedule. |
| 3 | Re-open the same session. | The same ordered list is still there after save. |
| 4 | Sign in as the **Player** on that team (or 1-on-1 recipient). Open the session. | **SESSION DETAILS** shows the same ordered content list. **No** **+ Add content** or **Remove** controls. (See **E7-T1** for full player content view.) |

### E6-T13: Package attaches as a single unit (STORY-6.2)

| Step | Do this | You should see |
|---|---|---|
| 1 | As **Coach**, open **NEW SESSION** or **EDIT SESSION** → **+ Add content** → **Library**. | Library items include a **Package** (for example **Weekend Practice Pack**) marked **single unit**. |
| 2 | Tap that package. | Session content shows **one** row for the whole package — not a long list of drills inside it. |
| 3 | Save the session and re-open it. | Still one package row with **single unit** (and **Library** or **Purchased** as appropriate). |

### E6-T14: Share with team or individual player (STORY-6.3)

Confirms the share recipient UI for team roster vs one player.

| Step | Do this | You should see |
|---|---|---|
| 1 | As **Coach on Advanced** or **active trial**, open **Schedule** → **+ Add Session**. | **NEW SESSION** form with a **Share with** section. |
| 2 | Leave type as **Practice** (or **Film review**). | **Team (full roster)** dropdown is shown. |
| 3 | Change type to **1-on-1**. | Dropdown switches to **Individual player** (team picker hidden). |
| 4 | Switch back to **Practice**, pick a team, create the session. Then create a separate **1-on-1** for a roster player. | Both sessions appear on Schedule; the 1-on-1 card shows the individual-session hint. |

### E6-T15: Player on Basic+ sees upcoming shared sessions (STORY-6.3)

Use a **Player on Basic+** who is on the coach's roster (or is the 1-on-1 recipient). Prefer a session dated **today or later**.

| Step | Do this | You should see |
|---|---|---|
| 1 | Sign in as **Player on Basic+**. Tap **Schedule**. | Weekly day selector — **not** a **Schedule Locked** / Upgrade screen. |
| 2 | Select the weekday of an upcoming shared session (from E6-T3, E6-T4, or E6-T14). | Session card with title and time. |
| 3 | Tap the card. | **SESSION DETAILS** opens (see Epic 7 for content interaction). |

### E6-T16: Player without Basic+ sees Schedule Locked (STORY-6.3)

Only if you have (or the team can set) a **player account below Basic** — for example no subscription row / locked out of Basic+. Skip if you only have Basic+ players.

| Step | Do this | You should see |
|---|---|---|
| 1 | Sign in as that player. Tap **Schedule**. | **Schedule Locked** message and an **Upgrade** button (not the weekly calendar). |
| 2 | Tap **Upgrade**. | Paywall / upgrade flow opens (same pattern as other locked features). |

### Not testable by clicking (for awareness only)

- **Push notifications** on create/edit/cancel and **session reminders** (default 24 hours before)
  are enqueued in the backend but not delivered to the phone until STORY-14.1 (FCM/APNs).
  Do not expect a device notification during these tests.
- **Buying a marketplace package in-app** may not be fully wired yet — E6-T11 can pass with an
  empty Purchased list. Creating real purchase rows is a developer/setup step, not a click path.

---

<div class="page-break"></div>

## Epic 7 — Player Session Content & Progress (STORY-7.1, STORY-7.2, STORY-7.3, STORY-7.4)

Epic 7 covers the **player** experience after opening a shared session: viewing attached drills,
videos, and packages, playing video content, marking items complete, logging drill reps/time, and
tracking progress on profile and the **Progress** tab. It also covers the **coach** progress review
dashboard: filtering drill completions, sending feedback via direct message, and assigning corrective drills.
It also covers the player **Home** dashboard: the real upcoming-session summary, the real progress
card (tier-gated the same way as the **Progress** tab), and the **Objectives** card gated to Pro.

**Accounts needed:** **Player on Basic+** on a coach's roster (or 1-on-1 recipient), plus a **Coach
on Advanced** (or active trial) who has created a session with attached content (use **E6-T10** /
**E6-T12** first).

**Before you start:** The session should be dated **today or later** and include at least one
**Video** library item and, if possible, a **Package** row (library or Purchased).

### E7-T1: Player sees session detail with content list (STORY-7.1 AC-1)

| Step | Do this | You should see |
|---|---|---|
| 1 | Sign in as **Player on Basic+**. Tap **Schedule** and open a shared session (today or later). | **SESSION DETAILS** header. |
| 2 | Read the top card. | Session title, date/time, and session type (e.g. **Practice**). Coach notes if the coach added any. |
| 3 | Scroll to **Session content**. | Ordered list (**1.**, **2.**, …) with kind labels (**Drill**, **Video**, **Package**, etc.) and titles matching what the coach attached. |

### E7-T2: Video playback for library and purchased content (STORY-7.1 AC-2)

The coach must attach a **Video** item from **Library** when building the session (**E6-T10** — e.g.
**Form Shooting Demo**). **Drill** rows only show **Mark complete**, not a video player.

| Step | Do this | You should see |
|---|---|---|
| 1 | On **SESSION DETAILS**, find a **Video** row (**Video · Library** label). | A video player with play controls below the title. |
| 2 | Tap **Play** on the video. | Video starts playing (demo clip for seeded library videos, or Mux HLS for coach uploads after **E9-T10**). |
| 3 | If the session has a **Package** row (**Purchased** or **Library**), check that row. | A video player for the package unit; tap **Play** and confirm playback works. |

Fail if you see **No video with supported format and MIME type found** — refresh the app and confirm the session includes a **Video** row (not only drills).

### E7-T3: Content available on scheduled session day (STORY-7.1 AC-3)

Sessions are **calendar events** — there is no separate "live session mode." Content is available
when the session is on your schedule for **today or a future day**.

| Step | Do this | You should see |
|---|---|---|
| 1 | Open a shared session dated **today or later**. | **Session content** rows are interactive (**Mark complete**, video player) — not a locked message. |
| 2 | If you have a session dated **before today** still visible, open it. | Locked banner: **Content unlocks on the session day.** Rows show **Complete this when the session is available.** — **no** **Mark complete** buttons or video players. |

Skip step 2 if you have no past-dated sessions.

### E7-T4: Mark content complete per item (STORY-7.1 AC-4)

| Step | Do this | You should see |
|---|---|---|
| 1 | On **SESSION DETAILS**, pick a content row that shows **To do**. | **Mark complete** button is enabled. |
| 2 | Tap **Mark complete**. | Badge changes to **Done**; button shows **Completed** (disabled). |
| 3 | Go back to Schedule, then re-open the same session. | That item still shows **Done**. |
| 4 | Mark a second item if the session has more than one. | Each row tracks completion independently. |

### E7-T5: Log drill complete with optional reps and time (STORY-7.2 AC-1)

The coach must attach at least one **Drill** row when building the session (**E6-T10**).

| Step | Do this | You should see |
|---|---|---|
| 1 | On **SESSION DETAILS**, find a **Drill** row that shows **To do**. | **Reps (optional)** and **Time (min, optional)** fields below the drill title. |
| 2 | Enter **50** reps and **10** minutes (or leave fields blank). Tap **Log drill complete**. | Badge changes to **Done**; button shows **Completed** (disabled). Logged values appear under the title (e.g. **50 reps · 10 min**). |
| 3 | Go back to Schedule, then re-open the same session. | Drill still shows **Done** with your logged reps/time. |

### E7-T6: Session and profile progress update (STORY-7.2 AC-2)

Complete at least two content items in one session (use **E7-T4** and **E7-T5**).

| Step | Do this | You should see |
|---|---|---|
| 1 | On **SESSION DETAILS**, check the top session card. | **Session progress** bar with a percentage (e.g. **50%** when half the items are done). |
| 2 | Tap **Home** → open your **Profile** (avatar or settings path you normally use). | **Training progress** card with drill count and items completed. |
| 3 | Tap the **Progress** tab. | **Drills completed** stat reflects drills you logged; count matches your session work. |

### E7-T7: Basic tier progress scope (STORY-7.2 AC-3)

Use **Player on Basic** (not trial, not Pro).

| Step | Do this | You should see |
|---|---|---|
| 1 | Tap **Progress**. | **Basic progress** banner explaining limited stats; **Drills completed** count visible. |
| 2 | Check for practice-minute trends or coach feedback sections. | **Not** shown on Basic — only the completion count and banner (full dashboard is Pro). |
| 3 | On **Profile**, read the progress card footnote. | Mentions upgrading to **Pro** for full stats. |

### E7-T8: Advanced player sees Progress paywall (STORY-7.2 AC-3)

Use **Player on Advanced** (paid Advanced, not trial). Skip if you have no Advanced player account.

| Step | Do this | You should see |
|---|---|---|
| 1 | Tap **Progress**. | Locked message: upgrade to **Pro** for the full progress dashboard, with an **Upgrade** button. |

### E7-T9: Coach views player progress dashboard (STORY-7.3 AC-1)

Use **Coach on Advanced** (or active trial). A player on the coach's roster should have logged at
least one drill (**E7-T5**).

| Step | Do this | You should see |
|---|---|---|
| 1 | Sign in as **Coach on Advanced+**. On **Home**, tap the **Player progress** card. | **PLAYER PROGRESS** screen with drill/completion summary stats. |
| 2 | Scroll to **Drill completions**. | At least one row showing drill label, player name, date/time, and optional reps/time. |

### E7-T10: Filter drill completions by player and date (STORY-7.3 AC-2)

Requires two players with logged drills, or skip player filter if you only have one.

| Step | Do this | You should see |
|---|---|---|
| 1 | On **PLAYER PROGRESS**, open the **Player** filter. | Dropdown lists players who have completions (**All players** plus each name). |
| 2 | Select one player. | List shows only that player's completions. |
| 3 | Set **From** / **To** dates around a known completion day. | List narrows to completions in that range. |
| 4 | Clear filters. | Full list returns. |

### E7-T11: Coach sends feedback via direct message (STORY-7.3 AC-3)

Coach must be **Advanced+** (chat tier).

| Step | Do this | You should see |
|---|---|---|
| 1 | On **PLAYER PROGRESS**, tap **Send feedback** on a completion row. | **Chat** opens to a direct message thread with that player; message field may have a prefilled draft. |
| 2 | Type a short note and tap send. | Your message appears in the thread (orange bubble on the right). |
| 3 | Go back to **Chat** list, then reopen the player thread. | Message persists. |

### E7-T12: Coach assigns corrective drill from review (STORY-7.3 AC-4)

| Step | Do this | You should see |
|---|---|---|
| 1 | On **PLAYER PROGRESS**, tap **Assign drill** on a completion row. | Success note (e.g. **Corrective drill assigned.**). |
| 2 | Sign in as that **Player**. Tap **Schedule** and check upcoming sessions. | New individual session with the corrective drill attached. |
| 3 | As **Coach**, tap **Share via schedule** on another completion (optional). | **Schedule** opens with a **NEW SESSION** form prefilled for that player and drill. |

### E7-T13: Player Home shows real schedule summary and progress (STORY-7.4 AC-1)

Use **Player on Basic+** with at least one upcoming session (**E6-T10**-style) and at least one
logged drill (**E7-T5**).

| Step | Do this | You should see |
|---|---|---|
| 1 | Sign in as the player. Land on **Home**. | **Upcoming** section shows your real next session (title, individual/team, day and time) — not a placeholder. |
| 2 | If you have no upcoming sessions, check the same section. | **No upcoming sessions yet.** message instead of a fake card. |
| 3 | Scroll to **Your progress**. | Card shows your real **drills** count (matches **Progress** tab / **Profile**). |

### E7-T14: Home progress and Objectives gated to Pro (STORY-7.4 AC-2)

Use **Player on Pro** for step 1, then **Player on Basic or Advanced** (not Pro) for step 2.

| Step | Do this | You should see |
|---|---|---|
| 1 | Sign in as **Player on Pro**. On **Home**, check **Your progress**. | Drill count **and** practice-minutes stat both shown (full dashboard). |
| 2 | Check the **Objectives** section. | Real objectives list, no lock icon; label reads **Manage**. |
| 3 | Sign in as a player **below Pro**. Check **Objectives**. | Locked card with **Upgrade to Pro for objectives**; label reads **Pro**. |

### E7-T15: Basic tier partial dashboard on Home (STORY-7.4 AC-3)

Use **Player on Basic** (not trial, not Pro).

| Step | Do this | You should see |
|---|---|---|
| 1 | Sign in as **Player on Basic**. On **Home**, check **Your progress**. | Drill count only — **no** practice-minutes stat. |
| 2 | Read the note under the drill count. | **Basic tier — upgrade to Pro for the full dashboard.** |

### Not testable by clicking (for awareness only)

- **STORY-7.4 AC-4** (6-tab profile scope confirmed against MVP) is a product-scope decision, not a
  clickable behavior — the shipped app intentionally has Profile + Progress + Objectives, not a
  6-tab deep-dive profile.

---

<div class="page-break"></div>

## Epic 8 — Chat & Communication (STORY-8.1, STORY-8.2, STORY-8.3)

**Accounts needed:** Coach and Player on **Advanced+** (or active trial), with the player on the coach's team roster. Chat is locked below Advanced (see **E5-T6**). For peer engagement metrics (**E8-T10**), also use a **Coach on Pro** (or trial).

**Before you start:** Apply chat database migrations on the test environment if your team has not already (`chat_channels` / Realtime, rich-message / `chat-media` for STORY-8.2, and peer-share message types for STORY-8.3). Ask your lead if messages or video attach fail.

### E8-T1: Messages list uses real conversations (STORY-8.1 AC-1, AC-2)

| Step | Do this | You should see |
|---|---|---|
| 1 | Sign in as **Coach on Advanced+**. Tap **Chat**. | **MESSAGES** list opens (not **Chat Locked**). |
| 2 | If the list is empty, tap **New message** (orange **+** or the empty-state button). | **NEW MESSAGE** screen listing roster players. |
| 3 | Tap a player with no prior chat. | Direct message thread opens (may be empty). |
| 4 | Send a short message, go back to **MESSAGES**. | That player conversation appears in the list. Team chats (group icon) may also appear if you have teams. |

### E8-T2: Send and receive in real time (STORY-8.1 AC-3)

Needs two devices/browsers (or two profiles): Coach and Player, both Advanced+.

| Step | Do this | You should see |
|---|---|---|
| 1 | Coach opens a DM thread with the player. Player opens the same thread on another session. | Both see the thread. |
| 2 | Coach types a short message and taps send. | Orange bubble appears on coach side within about **2 seconds**. |
| 3 | Watch the player session **without** pulling to refresh. | Same message appears on the player side within about **2 seconds**. |

### E8-T3: Unread badge and list persist (STORY-8.1 AC-4)

| Step | Do this | You should see |
|---|---|---|
| 1 | As **Player**, stay on **Home** (not inside the thread). As **Coach**, send a new DM to that player. | — |
| 2 | As **Player**, tap **Chat**. | Conversation list shows the thread; an orange **unread** count badge appears on that row. |
| 3 | Open the thread, read the message, go back to the list. | Unread badge is gone (or count drops). |
| 4 | Close and reopen the app, tap **Chat** again. | Same conversations and last messages still appear (list persisted). |

### E8-T4: Send text in a team chat (STORY-8.2 AC-1)

| Step | Do this | You should see |
|---|---|---|
| 1 | Sign in as **Coach on Advanced+**. Tap **Chat**. | **MESSAGES** list (not locked). |
| 2 | Open a **team** conversation (group/users icon). | Team thread opens. |
| 3 | Type a short text message and tap send. | Your orange text bubble appears in the thread. |
| 4 | Optional: open a **DM** thread and send text the same way. | Text also sends in the DM. |

### E8-T5: Attach a drill/content link card (STORY-8.2 AC-2)

Needs a coach with at least one library or purchased content item (same as Schedule → Add content).

| Step | Do this | You should see |
|---|---|---|
| 1 | Open any chat thread. Tap the **+** attach button left of the message box. | **ATTACH** screen. |
| 2 | Tap **Drill / content link**. | **ATTACH CONTENT** with Library / Purchased tabs. |
| 3 | Tap an item from the list. | You return to the thread; a **content card** (kind badge + title + “Open content”) appears. |
| 4 | Tap the content card. | **CONTENT LINK** detail shows the title and kind. |

### E8-T6: Attach and play a video in chat (STORY-8.2 AC-3)

| Step | Do this | You should see |
|---|---|---|
| 1 | In a chat thread, tap **+** → **Video**. | Device file picker for videos. |
| 2 | Choose a short video file. | After upload, a video player appears in the thread. |
| 3 | Tap play on the in-chat video. | Video plays inline (controls visible). |

### E8-T7: Image and voice stay disabled (STORY-8.2 AC-4)

| Step | Do this | You should see |
|---|---|---|
| 1 | In a chat thread, tap **+** to open **ATTACH**. | Menu lists Drill/content link, Video, Image, Voice note. |
| 2 | Look at **Image** and **Voice note**. | Both look disabled (“Coming later”); you cannot select them. |
| 3 | Hover or long-press the disabled rows if your browser/device shows a tip. | Tooltip explains they are not available in MVP. |

### E8-T8: Share an achievement to team chat (STORY-8.3 AC-1)

Player must be on **Advanced+** (or trial) and belong to at least one team.

| Step | Do this | You should see |
|---|---|---|
| 1 | Sign in as **Player on Advanced+**. Tap **Progress**. | **MY PROGRESS** opens. A **Share with teammates** card shows **Share achievement** and **Share tip**. |
| 2 | Tap **Share achievement**. | **SHARE ACHIEVEMENT** screen with a team chat picker and an achievement preview. |
| 3 | Keep (or pick) a team chat, tap **Post to team chat**. | You return to Progress (or leave the share screen). |
| 4 | Tap **Chat**, open that **team** conversation. | An **Achievement** card appears in the team thread. |

### E8-T9: Share a tip to team chat (STORY-8.3 AC-2)

| Step | Do this | You should see |
|---|---|---|
| 1 | As **Player on Advanced+**, go to **Progress** → **Share tip**. | **SHARE TIP** screen with Title and Tip fields and a team chat picker. |
| 2 | Enter a short title and tip text, tap **Post to team chat**. | Share screen closes. |
| 3 | Open the team chat in **Chat**. | A **Tip** card shows your title and tip text. |

### E8-T10: Coach peer engagement at Pro (STORY-8.3 AC-3)

| Step | Do this | You should see |
|---|---|---|
| 1 | Sign in as **Coach on Advanced** (not Pro). Tap **Progress**. | Progress dashboard. A **Peer sharing engagement** card asks to **Upgrade** (locked). |
| 2 | Sign in as **Coach on Pro** (or trial). Tap **Progress**. | **Peer sharing engagement** metrics card (Shares, Sharers, Achievements, Tips). Recent titles may appear if teammates shared. |

### E8-T11: Peer shares stay team-only (STORY-8.3 AC-4)

| Step | Do this | You should see |
|---|---|---|
| 1 | As **Player on Advanced+**, open **Share achievement** or **Share tip**. | Team chat dropdown only — no DM / one-to-one option. |
| 2 | If the player has no team, open the share screen. | Message that you need to join a team; peer shares go to team chat only. |

### Not testable by clicking (for awareness only)

- **Push notifications** when the app is backgrounded are **STORY-14.1** / DEP-07.

---

## Epic 9 — Content Authoring (STORY-9.1 Studio + STORY-9.2 / STORY-9.3 / STORY-9.4 Mobile)

### Mobile — Coach content creation (STORY-9.2)

*Needs a **Coach on Advanced or Pro** (or active trial). Local testing also needs Edge Functions running (`npm run functions:serve`) for video → Mux. For full playback after upload (**E9-T10**), the cloud `mux-webhook` function must be deployed and a Mux webhook must point at it.*

**Accounts needed:** Coach Advanced+ from Epic 4/5.

### E9-T5: Create a training drill with instructions (STORY-9.2 AC-1)

| Step | Do this | You should see |
|---|---|---|
| 1 | Sign in as **Coach on Advanced+**. On **Home**, tap **+ Create Content**. | **CREATE CONTENT** with Training Drill / Video Upload / Game Strategy. |
| 2 | Tap **Training Drill**. Enter a **Title** (e.g. `QA Crossover Drill`) and **Instructions**. Optionally attach an image/file. Tap **Save to library**. | **CONTENT SAVED** with the drill title. |
| 3 | Tap **View library**. | **MY LIBRARY** lists the new drill near the top (appears immediately). |

### E9-T6: Upload a video and start Mux processing (STORY-9.2 AC-2)

| Step | Do this | You should see |
|---|---|---|
| 1 | From **CREATE CONTENT**, tap **Video Upload**. Enter a title and short description. Tap the upload area and pick a short video file. Tap **Save to library**. | Upload progress (%), then **CONTENT SAVED** with **Mux transcoding initiated**. |
| 2 | Tap **View library**. | The video appears in **MY LIBRARY** (may show **mux pending** until processing finishes — see E9-T10). |

### E9-T7: Bundle into a package or attach to a session (STORY-9.2 AC-3)

| Step | Do this | You should see |
|---|---|---|
| 1 | In **MY LIBRARY**, check one or more drills/videos/strategies (not an existing package). Enter a **Package title** (e.g. `QA Weekend Pack`). Tap **Create package**. | Success message; a new **package** row appears in the library. |
| 2 | On any library item, tap **Session** (or from **CONTENT SAVED**, tap **Attach to session**). | **Schedule** opens a new session form with that content already listed under session content. |

### E9-T8: New content shows in library right away (STORY-9.2 AC-4)

| Step | Do this | You should see |
|---|---|---|
| 1 | Create another drill (E9-T5). On **CONTENT SAVED**, note the title. Tap **View library**. | That exact title is in **MY LIBRARY** without leaving the app or waiting for a refresh cycle. |
| 2 | From **CREATE CONTENT**, tap **Open my library**. | Same library list loads with your created items. |

### Mobile — Video upload & playback pipeline (STORY-9.3)

*Same Coach Advanced+ account. For E9-T10, Mux webhook + `mux-webhook` Edge Function must be live (or wait a few minutes after upload if already configured).*

### E9-T9: Reject oversized video files (STORY-9.3 AC-1)

| Step | Do this | You should see |
|---|---|---|
| 1 | From **CREATE CONTENT**, tap **Video Upload**. Note the upload area says **max 500 MB**. | Hint text about the size limit. |
| 2 | If you have a video **over 500 MB**, try selecting it. Otherwise skip this step and mark N/A. | Red error: video is too large / under 500 MB. File is not kept selected. |
| 3 | Select a normal short video (well under 500 MB). | File name shows under the upload area; no size error. |

### E9-T10: Mux finishes and library shows playable video (STORY-9.3 AC-2)

| Step | Do this | You should see |
|---|---|---|
| 1 | Complete **E9-T6** with a short clip. Stay on **MY LIBRARY** (or reopen it after a minute or two). | Status moves from **mux pending** to **ready** (refresh library if needed). |
| 2 | On the ready video row, find the player. | An in-library video player appears (not just the pending label). |
| 3 | Tap **Play**. | Video plays from Mux (streamable), not a broken / unavailable message. |

### E9-T11: Adaptive playback in a player session (STORY-9.3 AC-3)

| Step | Do this | You should see |
|---|---|---|
| 1 | From a **ready** Mux video in **MY LIBRARY**, tap **Session** and schedule it for today (or attach via **CONTENT SAVED**). Share the session with a player as in Epic 6. | Session saved with the video attached. |
| 2 | Sign in as that **Player**. Open the session on **Schedule** → **SESSION DETAILS**. | Video row shows a player. |
| 3 | Tap **Play**. | Video plays smoothly on the device (phone browser or Capacitor app). |

### E9-T12: Upload progress and clear errors (STORY-9.3 AC-4)

| Step | Do this | You should see |
|---|---|---|
| 1 | Start **Video Upload** with a short file. Tap **Save to library** and watch the form while it uploads. | Progress bar and percent (e.g. **Uploading 40%…**), then **CONTENT SAVED**. |
| 2 | Start another upload, then turn on airplane mode mid-upload (or disconnect Wi‑Fi). | Red error about upload failure (not a blank screen). Turn network back on afterward. |

### Mobile — Private content distribution (STORY-9.4)

*Needs a **Coach on Advanced+** with a team that has at least one **active player** on the roster (Epic 3). Apply the latest database migrations so **Distribute** can save assignments. Individual clients must be on a team roster first (even a one-player team) — there is no share-outside-roster path.*

**Accounts needed:** Coach Advanced+ with roster player(s); that Player on Basic+.

### E9-T13: Distribute to full team or one roster player (STORY-9.4 AC-1)

| Step | Do this | You should see |
|---|---|---|
| 1 | As **Coach**, open **+ Create Content** → **Open my library** (or finish creating an item and **View library**). | **MY LIBRARY** with at least one item. |
| 2 | On a library item, tap **Distribute**. | **DISTRIBUTE** screen with the item title and **Share with** options. |
| 3 | Tap **Team (full roster)**, pick your team, tap **Share content**. | Returns to **MY LIBRARY** (no error). |
| 4 | Distribute again: tap **Individual player**, pick a roster player, tap **Share content**. | Returns to **MY LIBRARY** again. |

### E9-T14: Player opens assigned content on Content tab (STORY-9.4 AC-3)

| Step | Do this | You should see |
|---|---|---|
| 1 | Sign in as the **Player** who was on the team / individual recipient from E9-T13. | Home screen. |
| 2 | Tap the **Content** tab (was labeled Store for players). | **CONTENT** screen with **Assigned to you** near the top. |
| 3 | Tap the assigned card. | **ASSIGNED** detail opens (instructions for drills/strategies, playable video when ready, package item list). |
| 4 | Tap back. | Returns to **CONTENT** list; marketplace may still appear below. |

### E9-T15: Solo clients need a team first (STORY-9.4 AC-4 / Q 12.6)

| Step | Do this | You should see |
|---|---|---|
| 1 | As **Coach**, if you have **no roster players**, open **Distribute** on a library item and choose **Individual player**. | Empty player list and a note to add the client to a team on **Roster** first. |
| 2 | On **Roster**, create a team if needed and add the player (invite or manual add). Return to **Distribute**. | That player appears in the **Individual player** dropdown. |
| 3 | Confirm you cannot share to someone who is not on any of your team rosters. | Only roster players are listed — no email field for non-roster share. |

### E9-T16: Assignment notifies recipients (STORY-9.4 AC-2)

*Push delivery to the device is still backend/ops (DEP-07). This check confirms the app enqueues the assignment notification when you share.*

| Step | Do this | You should see |
|---|---|---|
| 1 | As **Coach**, complete **E9-T13** (share to team or player). | Share succeeds and returns to library. |
| 2 | As the **Player**, open **Content**. | The assigned item is listed under **Assigned to you** (in-app delivery of the assignment). |

### Admin — Sanity Studio (STORY-9.1)

*Admin website only. Skip if you were not given an Admin account.*

**Accounts needed:** Admin account + Admin dashboard URL.

### E9-T1: Studio opens with content document types (STORY-9.1 AC-1)

| Step | Do this | You should see |
|---|---|---|
| 1 | Open the Admin dashboard. Sign in as **Admin**. | Dashboard loads. |
| 2 | Open **Content**, then tap **Open Sanity Studio**. | Sanity Studio loads (URL contains `/admin/studio`). You may be asked to log in with Sanity — use the account that has access to the Coach360 Sanity project. |
| 3 | Look at the left document list / Create menu. | Types include **Drill**, **Video**, **Strategy / Playbook**, **Training package**, and **Module**. |

### E9-T2: Studio route is under /admin/studio (STORY-9.1 AC-2)

| Step | Do this | You should see |
|---|---|---|
| 1 | From Admin **Content**, tap **Open Sanity Studio**. | Browser address shows `/admin/studio` (same Admin site, not a random third-party URL). |
| 2 | Refresh the page while still on Studio. | Studio reloads without dumping you on the login dead-end (you may need to re-auth if the session expired). |

### E9-T3: Package hierarchy program → module → lesson → item (STORY-9.1 AC-3)

| Step | Do this | You should see |
|---|---|---|
| 1 | In Studio, create a **Drill** titled `QA Hierarchy Drill` and publish/save it. | Document saves. |
| 2 | Create a **Lesson**, add the drill under **Content items**, save. | Lesson lists the drill. |
| 3 | Create a **Module**, add that lesson under **Lessons**, save. | Module lists the lesson. |
| 4 | Create a **Training package**, add that module under **Modules**, save. | Package lists the module — chain is package → module → lesson → drill. |

### E9-T4: Workflow status and published flag (STORY-9.1 AC-4)

| Step | Do this | You should see |
|---|---|---|
| 1 | Open a **Training package** (or create one). Find **Workflow status**. | Options include **Draft**, **Pending review**, **Approved**, and **Rejected**. |
| 2 | Set status to **Pending review**, then **Approved**. Toggle **Published** on. | Both fields save. Published can be on while status is Approved. |

### E9-T17: Store shows published Sanity packages (STORY-9.5 AC-4)

*Needs `VITE_SANITY_PROJECT_ID` / `VITE_SANITY_DATASET` and either a public dataset or `VITE_SANITY_READ_TOKEN` (Viewer). Seed packages from `npm run seed:sanity` should already exist.*

| Step | Do this | You should see |
|---|---|---|
| 1 | Sign in as a **Coach** (or Team Manager) who can browse the marketplace. | Home screen. |
| 2 | Open the **Store** tab. | Catalog loads (not stuck on an error). |
| 3 | Look for package titles from Studio (e.g. **Elite Shooting System**, **Lockdown Defense**, **Court Vision Mastery**). | Those titles appear as cards. |
| 4 | Tap one package. | Package detail shows title and description from Sanity. |

### Not testable by clicking (for awareness only)

- **Mux webhook configuration** (dashboard URL + signing secret) is ops setup, not an in-app screen — required for E9-T10.
- **Native push delivery** (FCM/APNs) for content assignment remains DEP-07 / STORY-14.x — E9-T16 covers in-app assigned list after share.
- **Sanity → Supabase webhook** (STORY-9.5 AC-1–AC-3): configure in Sanity manage after `functions:serve` / tunnel; verify with curl or by publishing a package and checking `package_metadata` / `rag_embedding_jobs` in Supabase. See smoke-test notes in the STORY-9.5 handoff.

---

<div class="page-break"></div>

## Epic 10 — Marketplace Browse, Purchase & Drip Engine (STORY-10.1, STORY-10.2)

*Needs published Sanity packages (see **E9-T17** / `npm run seed:sanity`) with **Display price**, **Rating**, and a **Stripe price ID** on each package, plus `package_metadata` synced so checkout can resolve the price. Edge Functions must be running for package checkout (`create-package-checkout-session`) and Stripe webhooks (`stripe-webhook`). Use the Stripe test card from Part 1.*

**Accounts needed:** Coach or Player on **Basic+** for personal purchase; **Coach on Advanced or Pro** with a team for team purchase.

### E10-T1: Store lists title, price, rating, and skills (STORY-10.1 AC-1)

| Step | Do this | You should see |
|---|---|---|
| 1 | Sign in as a **Coach** (or Player) who can browse the marketplace. | Home screen. |
| 2 | Open **Store** (Coach/Team Manager) or **Content** (Player). | Catalog cards load. |
| 3 | Scan a package card (e.g. **Elite Shooting System**). | Card shows **title**, **price** (e.g. `$29`), **rating** (★), and **skills** tags (not only a single filter badge). |
| 4 | Tap the card. | Package detail repeats title, rating, skills, and price on the purchase button. |

### E10-T2: No outline or drip preview before purchase (STORY-10.1 AC-2 / OQ-4.6)

| Step | Do this | You should see |
|---|---|---|
| 1 | Open an **unowned** package detail from **Store** / **Content**. | Title, description, skills, rating, module/lesson count. |
| 2 | Look for outline, module list, trailer, sample lesson, or drip schedule preview. | Those are **not** shown before purchase. |

### E10-T3: Purchase with Stripe records ownership (STORY-10.1 AC-3)

| Step | Do this | You should see |
|---|---|---|
| 1 | On an unowned package, keep **Personal** selected (Coach) or use the default purchase button (Player). Tap **Purchase $…**. | Stripe Checkout opens (or paywall first if plan is too low). |
| 2 | Pay with the test card `4242 4242 4242 4242`. | Checkout succeeds and returns to the app. |
| 3 | Wait ~30 seconds, reopen **Store** / package detail. | Package shows **Owned** (or ownership after refresh). |

### E10-T4: Coach Advanced+ can purchase for a team (STORY-10.1 AC-4)

| Step | Do this | You should see |
|---|---|---|
| 1 | Sign in as a **Coach on Advanced or Pro** with at least one team. Open an unowned package. | **Personal** / **For team** options appear. |
| 2 | Tap **For team**, pick a team, tap **Purchase for team $…**. | Stripe Checkout opens. |
| 3 | Complete payment with the test card. | Checkout succeeds. |
| 4 | (Optional) Sign in as a **Coach on Basic** and open the same package. | No **For team** option — personal purchase only (or paywall if locked). |

### Not testable by clicking (for awareness only)

- **Stripe webhook → `purchases` row** is verified in automated tests; if ownership never appears after a successful Checkout, check `stripe-webhook` logs and that `sync_purchase_from_stripe` migration is applied.
- **STORY-10.2 drip engine (AC-1–AC-5)** — no drip timeline UI yet (that is STORY-10.3). After purchase, the webhook seeds `drip_progress` (first module unlocked immediately; later modules on the package cadence). Due unlocks run via `process-drip-unlocks` and enqueue `drip_module_unlocked` (native push is still DEP-07 / STORY-14.1). Confirmed product rules: same cadence for all tiers (OQ-14.3); upgrading mid-drip does not unlock remaining modules early (OQ-14.5).
- **Redistribute purchased content to roster** remains a later marketplace story — this epic covers buying + drip schedule seeding, not team redistribution UX.

---

<div class="page-break"></div>

## Part 3 — Quick Results Sheet

Print this page and check off results as you go.

| Test | Pass / Fail | Notes |
|---|---|---|
| E1-T1 App launches | | |
| E1-T2 Keyboard/status bar | | |
| E2-T1 Coach sign-up | | |
| E2-T2 Coach profile + tour | | |
| E2-T3 Player sign-up + tour | | |
| E2-T4 Team Manager sign-up | | |
| E2-T5 Stays signed in | | |
| E2-T6 No access without sign-in | | |
| E3-T1 Manager creates/edits team | | |
| E3-T2 Coach creates team | | |
| E3-T3 Invite code/link + player joins | | |
| E3-T4 Bad invite code rejected | | |
| E3-T5 Manual add by email | | |
| E3-T6 Remove player | | |
| E3-T7 Tier limits on team features | | |
| E4-T1 Plan choice screen | | |
| E4-T2 Trial + countdown | | |
| E4-T3 Trial only once | | |
| E4-T4 Locked features for Basic | | |
| E4-T5 Paywall pop-up details | | |
| E4-T6 Upgrade with test card | | |
| E4-T7 Billing history | | |
| E4-T8 Immediate upgrade | | |
| E4-T9 Scheduled downgrade | | |
| E4-T10 Cancel payment safely | | |
| E5-T1 Trial browse-only Store | | |
| E5-T2 Coach Basic — no Create Content | | |
| E5-T3 Coach Basic — no Add Session | | |
| E5-T4 Coach Advanced/trial — create content & sessions | | |
| E5-T5 Player/Manager — no Create Content | | |
| E5-T6 Chat locked below Advanced (all roles) | | |
| E5-T7 AI locked below Pro (all roles) | | |
| E5-T8 Objectives require Pro (coaches) | | |
| E5-T9 Paywall pop-up RBAC rules | | |
| E5-T10 Team invite rules by role | | |
| E5-T11 Admin feature gating screen | | |
| E5-T12 Admin change tier requirement | | |
| E5-T13 Admin change reflects on mobile | | |
| E5-T14 Admin free content catalog | | |
| E6-T1 Schedule loads without error | | |
| E6-T2 Coach sees + Add Session (Advanced/trial) | | |
| E6-T3 Create team practice session | | |
| E6-T4 Create 1-on-1 roster session | | |
| E6-T5 Coach edits session | | |
| E6-T6 Coach cancels session | | |
| E6-T7 Player read-only session details | | |
| E6-T8 Player no + Add Session | | |
| E6-T9 Team Manager team-only session types | | |
| E6-T10 Attach content from personal library | | |
| E6-T11 Purchased tab for marketplace packages | | |
| E6-T12 Ordered content list on session detail | | |
| E6-T13 Package attaches as a single unit | | |
| E6-T14 Share with team or individual player | | |
| E6-T15 Player Basic+ sees upcoming sessions | | |
| E6-T16 Player below Basic sees Schedule Locked | | |
| E7-T1 Player session detail + content list | | |
| E7-T2 Video playback library + purchased | | |
| E7-T3 Content on scheduled session day | | |
| E7-T4 Mark content complete per item | | |
| E7-T5 Log drill with reps/time | | |
| E7-T6 Session + profile progress | | |
| E7-T7 Basic tier progress scope | | |
| E7-T8 Advanced Progress paywall | | |
| E7-T9 Coach player progress dashboard | | |
| E7-T10 Filter completions player/date | | |
| E7-T11 Coach DM feedback | | |
| E7-T12 Assign corrective drill | | |
| E7-T13 Home real schedule + progress | | |
| E7-T14 Home progress + Objectives gated Pro | | |
| E7-T15 Basic partial dashboard on Home | | |
| E8-T1 Real conversation list (team + DM) | | |
| E8-T2 Real-time message delivery | | |
| E8-T3 Unread badge + list persists | | |
| E8-T4 Send text in team chat | | |
| E8-T5 Attach content link card | | |
| E8-T6 Attach and play chat video | | |
| E8-T7 Image/voice disabled with tip | | |
| E8-T8 Share achievement to team chat | | |
| E8-T9 Share tip to team chat | | |
| E8-T10 Coach peer engagement at Pro | | |
| E8-T11 Peer shares team-only | | |
| E9-T1 Studio content document types | | |
| E9-T2 Studio at /admin/studio | | |
| E9-T3 Package hierarchy chain | | |
| E9-T4 Workflow status + published | | |
| E9-T5 Create training drill | | |
| E9-T6 Video upload initiates Mux | | |
| E9-T7 Bundle package or attach session | | |
| E9-T8 Library shows new content | | |
| E9-T9 Reject oversized video | | |
| E9-T10 Mux ready + library playback | | |
| E9-T11 Adaptive playback in session | | |
| E9-T12 Upload progress and errors | | |
| E9-T13 Distribute to team or player | | |
| E9-T14 Player Content tab shows assigned | | |
| E9-T15 Solo clients need team roster first | | |
| E9-T16 Assignment shows for player after share | | |
| E9-T17 Store shows published Sanity packages | | |
| E10-T1 Store lists title, price, rating, skills | | |
| E10-T2 No outline/drip preview before purchase | | |
| E10-T3 Stripe package purchase records ownership | | |
| E10-T4 Coach Advanced+ team purchase | | |

**Tester name:** ______________________ **Date completed:** ______________________

**Environment tested:** Staging / Production / Other: ______________________

**Mobile URL used:** ______________________ **Admin URL used:** ______________________
