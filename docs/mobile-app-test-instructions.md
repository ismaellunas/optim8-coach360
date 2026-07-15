# Coach360 Mobile App — Manual Test Instructions (Epics 1–4)

**Audience:** Non-technical testers. You only need to be able to tap/click around the app.
No coding, no tools — just the app, an email inbox, and this checklist.

---

## Before You Start

### What you need

1. **The app** — either installed on your phone (iOS/Android test build) or the web/staging
   link provided by the team.
2. **At least 3 email addresses you can receive mail on.** You will create separate accounts
   for a **Coach**, a **Player**, and a **Team Manager**.
   - Tip: if you use Gmail, you can reuse one inbox with aliases, e.g.
     `yourname+coach@gmail.com`, `yourname+player@gmail.com`, `yourname+manager@gmail.com`.
     All mail arrives in your normal inbox.
3. **A Stripe TEST credit card** (no real money is charged):
   - Card number: `4242 4242 4242 4242`
   - Expiry: any future date (e.g. `12/34`)
   - CVC: any 3 digits (e.g. `123`)
   - Name/postal code: anything
4. Optionally a second phone or a private/incognito browser window, so you can be signed in
   as two different users at once (useful for the team invite tests).

### How to report results

For every test below, mark **PASS** or **FAIL**. If something fails:

- Note the **test ID** (e.g. `E3-T2`).
- Write down **what you did** and **what you saw** instead of the expected result.
- Take a **screenshot** of the screen (including any red error message).
- Note the **email address of the account** you were using and the approximate **time**.

### Two things to know before testing

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

### E2-T1: Create a Coach account with email verification

| Step | Do this | You should see |
|---|---|---|
| 1 | On the welcome screen, tap **Create account**. | A **SELECT YOUR ROLE** screen with three choices: **Coach**, **Player**, **Team Manager**. |
| 2 | Tap **Coach**, then tap **Continue**. | A **CREATE ACCOUNT** screen saying "Signing up as Coach". |
| 3 | Enter a name, your *coach* email address, and a password (at least 6 characters). Tap **Create account**. | A **CHECK YOUR EMAIL** screen telling you a verification link was sent. |
| 4 | Open your email inbox and click the verification link. | A confirmation that your email is verified. |
| 5 | Return to the app, tap **Back to sign in**, and sign in with the email and password you just used. | You are let into the app and see the coach profile setup (next test). |

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
| 1 | Sign out (Home → gear icon top-right → **Sign Out**), or use a second device/incognito window. Create a new account, this time choosing the **Player** role, using your *player* email. Verify the email and sign in. | Same sign-up flow as the coach. |
| 2 | Fill in the player profile: **age**, **position** (e.g. "Point Guard"), and optionally a photo. | The form saves without errors. |
| 3 | At the plan screen, tap **Continue with Basic for free** (we save the trial test for Epic 4). | You move on to the player tour. |
| 4 | Step through the player tour: Welcome → Your profile → Browse training content → Start your first drill → Track your progress → Join a team. | You can complete it **without** joining a team. The "Join a team" step is optional/skippable. |
| 5 | Finish the tour. | The player Home screen, with tabs at the bottom: Home, Progress, Schedule, Chat, Store. |

### E2-T4: Create a Team Manager account

| Step | Do this | You should see |
|---|---|---|
| 1 | Sign out and create a third account, choosing **Team Manager**, with your *manager* email. Verify and sign in. | The manager profile form (asks about your experience managing teams). |
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

## Quick Results Sheet

| Test | Pass / Fail | Notes |
|---|---|---|
| E1-T1 App launches | | |
| E1-T2 Keyboard/status bar | | |
| E2-T1 Coach sign-up + email verification | | |
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
