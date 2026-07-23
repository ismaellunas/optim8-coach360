# Coach360 — Stakeholder Discovery Questions

> **Purpose:** Product and technical decisions needed before implementation.  
> **Index:** [`../README.md`](../README.md)  
> **Source flows:** [`flows.md`](./flows.md) (Flows 1–18, Part 3 Access Control Matrix)  
> **Architecture context:** [`../architecture/content-model.md`](../architecture/content-model.md), [`../architecture/ai-integration.md`](../architecture/ai-integration.md)  
> **Related:** [`../delivery/delivery-estimate.md`](../delivery/delivery-estimate.md) §4.0.3 (open scope items)

**How to use this doc:** Capture answers in the **Answer** column during stakeholder sessions. Mark **P0** items first — they block scope commitment and estimates.

---

## Summary — P0 blockers (resolve first)

| Ref | Question (short) | Flow |
| --- | --- | --- |
| 2.1 | What does “track own progress” mean at Basic tier? — **resolved 2026-07-23: Basic ◎ log + count; Advanced ○ locked; Pro ✓ full dashboard** | 2 |
| 2.2 | What is included in “Full MVP access” at Pro tier? | 2 |
| 2.3 | Advanced tier boundaries: coach & communicate, distribute content, plan & schedule — **resolved 2026-07-23: full coaching tools at Advanced; Pro = +AI/objectives/analytics** | 2 |
| 3.1 | Session = calendar event only, or in-session runtime experience? — **resolved 2026-07-21: calendar only** | 3 |
| 3.2 | How are sessions scheduled (recurrence, calendar sync)? — **resolved 2026-07-21: date/time picker only** | 3 |
| 3.7 | Notifications on create/update/cancel/reminder? — **resolved 2026-07-21: immediate + 24h reminder** | 3 |
| 4.1 | Who creates marketplace packages — admins, coaches, or both? | 4, 7, 12 |
| 6.1 | What does “set objectives” at Pro include? | 6 |
| 6.5 | AI at Advanced (○ partial) vs Pro only — which is correct? — **resolved 2026-07-16: Pro only** | 6, Part 3 |

---

## Flow 1 — User Onboarding & Profile Creation

| # | Question | Why it matters | Answer | Owner | Date |
| --- | --- | --- | --- | --- | --- |
| 1.1 | Which sign-up methods are required at launch: email only, magic link, Apple/Google OAuth, or all? | Auth scope and App Store compliance | | | |
| 1.2 | For youth players, is parental consent or age verification required before account creation? | Legal/compliance and onboarding UX | | | |
| 1.3 | Can one person hold multiple roles (e.g. coach + team manager), or is role selection permanent? | Profile and RBAC model | | | |
| 1.4 | What profile fields are mandatory vs optional per role (photo, bio, credentials, team, age)? | Form design and data model | | | |
| 1.5 | Should team managers be blocked from completing onboarding until a team is created, or only guided to do so? | Flow 1 vs Flow 11 boundary | **Blocked.** Team managers must create a team (Create Team form, no skip) before subscription and the main app. Invite players only after a team exists (Roster). | product | 2026-07-14 |

---

## Flow 2 — Subscription & Trial Flow

| # | Question | Why it matters | Answer | Owner | Date |
| --- | --- | --- | --- | --- | --- |
| 2.1 | **P0** — What does **“track own progress”** mean at **Basic** tier — drill logs only, completion %, stats, or full profile dashboard? | Undefined in tier breakdown (`what progress?`) | **Basic players** can log drill completions (mark done + optional reps/time) and see a **completion count only** on Progress/Profile (◎, + upgrade banner). Full stats / practice-minute trends / progress dashboard are **Pro** ✓. **Advanced player Progress UI is ○ until Pro** — not the same as Basic ◎; Advanced sees an Upgrade-to-Pro lock (peer share on Progress remains Advanced+). Matches shipped STORY-7.2 / STORY-7.4 and `LAUNCH_ACCESS_BANDS.viewProgress` (player: `readonlyTiers: ['basic'], fullFrom: 'pro'`). | product | 2026-07-23 |
| 2.2 | **P0** — What exactly is included in **“Full MVP access”** at **Pro** tier beyond what Advanced already gets? | Undefined in tier breakdown | | | |
| 2.3 | **P0** — At **Advanced**, what are the precise boundaries for **coach & communicate**, **distribute content**, and **plan & schedule** vs Pro? | Three `(Need more Info)` items in estimate | **Advanced = full coaching tools without AI.** Communicate: full chat (team, DM, peer) at Advanced; Pro adds nothing for chat. Distribute: create + assign/share to own players/teams at Advanced; Pro adds nothing for distribution. Plan & schedule: full session planning at Advanced; Pro adds nothing for schedule. **○** = unlocks at a higher tier (same legend as OQ-6.5), not partial access — Advanced features above are ✓ at Advanced. **Pro** = Advanced + AI + objectives + full analytics. | product | 2026-07-23 |
| 2.4 | What is the trial duration, and is it one trial per user, per device, or per Apple/Google account? | Trial logic (Flows 2, 9) | | | |
| 2.5 | Does trial always grant **full Pro access**, or a subset? | Access matrix vs Flow 2 diagram | | | |
| 2.6 | Are subscription tiers priced per user, per team, or per organization? | Stripe product design | | | |
| 2.7 | Are marketplace **content purchases** separate from subscription tiers, bundled, or both? | Flow 2 Basic “purchase content” + Flow 4 | | | |
| 2.8 | **Stripe only**, or **Apple IAP / Google Play Billing** for subscriptions and/or content? | +8–16 h if dual billing | | | |

---

## Flow 3 — Coach Planning & Scheduling

| # | Question | Why it matters | Answer | Owner | Date |
| --- | --- | --- | --- | --- | --- |
| 3.1 | **P0** — Is a “session” a **calendar event only**, or is there an **in-session experience** (live run-through, timers, check-ins) when it starts? | Major scope gap in estimate | **Calendar event only for MVP.** A session is a scheduled plan (date, time, type, recipients, ordered content list). No live run-through, timers, or check-ins at start. Matches shipped STORY-6.1. | product | 2026-07-21 |
| 3.2 | **P0** — How do coaches schedule sessions — date/time picker, recurrence, calendar sync (Google/Apple)? | Flow 3 vs calendar sync in hours doc | **Date/time picker only for MVP.** No recurrence series and no Google/Apple calendar sync. Matches shipped STORY-6.1. | product | 2026-07-21 |
| 3.3 | When adding content to a session, can coaches pick from **library**, **marketplace packages**, **both**, or only create new items? | Flow 3 ↔ Flow 12 ↔ Flow 4 | **Both.** Coaches attach from personal library and marketplace-purchased packages. Creating new items stays in Flow 12 (Create Content), not required mid-schedule. | product | 2026-07-21 |
| 3.4 | Can a session contain a **full package** as one item, or only individual drills/videos/strategies? | Content packaging model | **Full package as one item.** A session’s ordered list may include atomic items (drill / video / strategy) and a package as a single unit (not auto-expanded into child rows). | product | 2026-07-21 |
| 3.5 | What session types are required at MVP (practice, film review, 1-on-1, game, conditioning)? | Prototype lists 5 types; confirm for MVP | | | |
| 3.6 | Who can create sessions — coaches only, or team managers too (matrix says TM can at Advanced+)? | Role permissions | | | |
| 3.7 | What notifications fire on create, update, cancel, and reminder (how far in advance)? | DEP-07 push scope | **Immediate on create, update, and cancel.** Reminder default **24 hours** before session start; admin-configurable via `platform_settings` key `session_reminder_hours_before`. Push delivery remains DEP-07 / STORY-14.1; MVP enqueues via notification port (same as roster/session change). | product | 2026-07-21 |

---

## Flow 4 — Marketplace & Content Dripping

| # | Question | Why it matters | Answer | Owner | Date |
| --- | --- | --- | --- | --- | --- |
| 4.1 | **P0** — Who creates marketplace packages — **admins only**, **coaches only**, or **both** (with approval)? | Open question in Flow 4 intro | | | |
| 4.2 | Can coach-created content (Flow 12) be **listed for sale** in the marketplace, or only distributed privately? | Marketplace supply model | | | |
| 4.3 | What is the approval workflow before a package goes live (draft → review → publish)? | Flow 7 admin + DEP-05 | | | |
| 4.4 | Who sets **pricing** — admin only, coaches with admin approval, or fixed catalog? | Admin matrix “configure pricing” | | | |
| 4.5 | Does **team age range** (Flow 11) hard-filter marketplace listings, or only affect AI recommendations? | Filtering rules | | | |
| 4.6 | Can users **preview** package contents before purchase (trailer, sample lesson, outline)? | Marketplace UX | **No.** Pre-purchase catalog shows marketing metadata only (title, description, price, rating, skills, module count). No trailer, sample lesson, outline, or drip schedule preview before purchase (STORY-10.1 / OQ-4.6). | product | 2026-07-23 |
| 4.7 | After purchase, can content be **re-downloaded offline**, or streaming only? | Mobile storage scope | | | |
| 4.8 | What currencies and regions are supported at launch? | Stripe + localization | | | |

---

## Flow 5 — Chat & Communication

| # | Question | Why it matters | Answer | Owner | Date |
| --- | --- | --- | --- | --- | --- |
| 5.1 | Build chat in-house (Supabase Realtime) or use **Stream / Sendbird**? | +40–80 h risk if built from scratch | | | |
| 5.2 | What message types are in scope: text, images, video, drill links, voice notes? | Flow 5: “text, video, drills, feedback” | | | |
| 5.3 | Is chat **real-time only**, or must it support offline/queued messages? | Infrastructure choice | | | |
| 5.4 | Are team managers limited to **broadcasts** (matrix) or full two-way chat? | TM vs coach permissions | | | |
| 5.5 | Is chat moderation automated, manual (admin), or both? | Flow 7 moderation | | | |
| 5.6 | Message retention period and export requirements? | Compliance / admin | | | |

---

## Flow 6 — AI Engine & Objectives

| # | Question | Why it matters | Answer | Owner | Date |
| --- | --- | --- | --- | --- | --- |
| 6.1 | **P0** — What does **“set objectives”** at Pro include — coach-set only, player-visible, team-level, measurable KPIs? | `(Need more Info)` in Flow 2 Pro tier | | | |
| 6.2 | Which **AI provider** is approved (Mistral per tech stack, or OpenAI/Anthropic)? | DEP-01 | | | |
| 6.3 | What inputs drive **package recommendations** — objectives, progress, age, behavior, all of the above? | RAG design (DEP-02) | | | |
| 6.4 | Is **RAG required at MVP**, or can v1 use metadata filters + simple ranking? | DEP-02 scope (+10–20 h risk) | | | |
| 6.5 | **P0** — AI features show **○ partial at Advanced** in the matrix but principles say **“AI exclusively at Pro”** — which is correct? | Tier gating contradiction | **Pro only — no contradiction.** The matrix legend defines ○ as “available at higher tier”, not partial access: AI rows showing ○ at Advanced mean AI unlocks at Pro. Matches the design principle “AI exclusively at Pro” and the shipped STORY-5.1 gating (`ai` requires Pro for coach and player). MVP gates all AI features at Pro for every role; admin bypasses tiers. | product | 2026-07-16 |
| 6.6 | Should AI suggestions include a **human-readable “why”** shown to the user? | Marketplace + objectives UX | | | |
| 6.7 | What player/coach data may be sent to the AI provider (PII, minors)? | Privacy and vendor agreements | | | |
| 6.8 | Who can configure AI parameters — admin only, or coaches too? | Flow 7 admin matrix | | | |

---

## Flow 7 — Admin Interface

| # | Question | Why it matters | Answer | Owner | Date |
| --- | --- | --- | --- | --- | --- |
| 7.1 | Should **content authoring** happen in **Sanity Studio** (separate/embedded UI) vs custom forms in the admin dashboard? | CMS integration model | | | |
| 7.2 | Which admin actions are MVP vs post-launch (suspend user, subscription override, marketplace approve, analytics)? | Flow 7 is 10 h + DEP-05 8 h | | | |
| 7.3 | How are **admin accounts** provisioned — Supabase manual, invite link, SSO? | Flow 1: backend-only admins | | | |
| 7.4 | Can admins **edit** coach-created content, or only approve/reject? | Marketplace curation | | | |
| 7.5 | What analytics are required at launch (revenue, DAU, content completion, AI quality)? | Monitor pillar | | | |
| 7.6 | Is **onboarding configuration** (wizard steps, welcome copy) admin-editable at MVP? | Admin matrix Flow 15/16 | | | |

---

## Flow 8 — Player Experience (End-to-End)

| # | Question | Why it matters | Answer | Owner | Date |
| --- | --- | --- | --- | --- | --- |
| 8.1 | What does a player do to **“complete”** a drill — mark done, log reps/time, upload video proof? | Progress tracking definition | | | |
| 8.2 | Can players interact with session content **before** the scheduled time, or only when the session is active? | Ties to Flow 3 runtime question | | | |
| 8.3 | What appears on the player home/dashboard at each tier? | Player UX scope | | | |
| 8.4 | Is the **6-tab player profile** (overview, objectives, stats, games, content, notes) all in MVP? | Prototype vs flows scope | | | |

---

## Flow 9 — Trial Expiration & Conversion

| # | Question | Why it matters | Answer | Owner | Date |
| --- | --- | --- | --- | --- | --- |
| 9.1 | When trial ends without payment, confirm downgrade to **Basic** with Advanced/Pro features locked? | Italic rule in Flow 9 | | | |
| 9.2 | Trial warning timing — **3 days** before expiry fixed, or configurable by admin? | Notification schedule | | | |
| 9.3 | After trial expiry, is purchased marketplace content retained, or only subscription-gated features change? | Content ownership rules | **Retain.** Purchased marketplace packages stay usable after trial → Basic. Only subscription-gated features (Advanced/Pro) lock; ownership of paid content does not. | product | 2026-07-13 |

---

## Flow 10 — Content Paywall Encounter

| # | Question | Why it matters | Answer | Owner | Date |
| --- | --- | --- | --- | --- | --- |
| 10.1 | Should paywall always offer **trial** if unused, or hide trial on certain screens? | Flow 10 italic rule | **Always offer** Start Trial on every paywall when the account has not used its one trial (`canActivateTrial`). Do not hide trial on specific screens. | product | 2026-07-14 |
| 10.2 | Does tapping a locked feature **block navigation** or show a modal and allow browsing elsewhere? | Design principle: non-blocking | **Modal, non-blocking.** Show paywall overlay; dismiss (Maybe Later / Browse free content) clears the modal and leaves the user on their current screen/tabs. | product | 2026-07-14 |
| 10.3 | Who defines **which features** map to which tier — hardcoded, admin-configurable, or both? | Admin “set feature gating per tier” | **Both.** Code keeps a default `FEATURE_TIER_REQUIREMENTS` matrix; admin can override the required tier per feature **per role** in the DB (e.g. `chat` for coach vs. player independently). Uncustomized role/feature pairs keep the code default. | product | 2026-07-15 |
| 10.4 | Is there a **free content catalog** at Basic, and who maintains it? | Admin matrix Flow 10 | **Yes, admin-maintained freeform list** (title/category), not yet tied to real marketplace content records since that data model doesn't exist in Supabase yet. | product | 2026-07-15 |

---

## Flow 11 — Team Setup & Roster Management

| # | Question | Why it matters | Answer | Owner | Date |
| --- | --- | --- | --- | --- | --- |
| 11.1 | Invite mechanics — **link**, **code**, **email**, or all? | Flow 11 | | | |
| 11.2 | Can a player be on **multiple teams** simultaneously? | Roster data model | | | |
| 11.3 | Can a team have **multiple coaches**? At what tier (matrix: assign coaches ○ at Pro)? | Team structure | | | |
| 11.4 | Who can remove players — coach, team manager, both? Different rules per tier? | Access matrix | | | |
| 11.5 | How is **team age range** captured — min/max, grade level, division — and who can edit it? | Marketplace filtering (Flow 4) | Captured as team profile data (min/max, grade level, division). Team managers create and manage these fields for their teams. | | 2026-07-06 |

---

## Flow 12 — Coach Content Creation & Distribution

| # | Question | Why it matters | Answer | Owner | Date |
| --- | --- | --- | --- | --- | --- |
| 12.1 | What is the difference between a **session**, a **package**, and a **playbook/strategy** in the data model? | Undocumented packaging process | **Session** = scheduled calendar plan only (date, time, recipients); it **references** reusable content, it is not a library object. **Package** = reusable non-calendar bundle for distribution/marketplace. **Playbooks/strategies live in a parallel reusable content library**, not the curriculum hierarchy (OQ-14.4 unchanged): Strategy (Play) = leaf; Playbook = container of strategies/plays. Lessons, Sessions, and Packages **reference** library objects (drills, videos, strategies, playbooks, assessments) so the same item is reusable without duplication. | product | 2026-07-23 |
| 12.2 | Is **strategy** the same as **playbook**, or is playbook a container of strategies + drills? | Terminology | **Not the same.** Strategy (or Play) = leaf content item; **Playbook = container of multiple strategies/plays** in the reusable content library (OQ-12.1). | product | 2026-07-23 |
| 12.3 | Packaging workflow — create atomic items first then bundle, or build package in one flow? | UX and DEP-04 | | | |
| 12.4 | Max video length/size for coach uploads? Transcoding required (Mux)? | Video pipeline | | | |
| 12.5 | Can coaches **edit/delete** content after distribution, and what happens for players who already started it? | Content lifecycle | | | |
| 12.6 | Can coaches distribute to **non-roster** players (e.g. individual clients without a team)? | Independent coach path | **No — roster only.** Path A distribution targets roster players only (full team or individual roster member). Individual / 1-on-1 clients must be added to a team first — including a dedicated team where that player is the sole member — then distributed via that roster. No assign outside roster. | product | 2026-07-22 |
| 12.7 | Are **images/diagrams** (play diagrams) required for strategies at MVP? | Content types in Sanity | | | |

---

## Flow 13 — Player Progress & Coach Feedback Loop

| # | Question | Why it matters | Answer | Owner | Date |
| --- | --- | --- | --- | --- | --- |
| 13.1 | What metrics appear on the **coach performance dashboard** at Advanced vs Pro? | ◎/○/✓ tier differences | | | |
| 13.2 | Can coaches assign **corrective drills** automatically from the dashboard, or only via chat/manual share? | Flow 13 “via content” path | | | |
| 13.3 | Does **AI monitoring** of this loop affect recommendations in real time, or batch/weekly? | Flow 6 integration | | | |
| 13.4 | Should coaches receive **alerts** when players fall behind on objectives or assignments? | Notifications | | | |

---

## Flow 14 — Drip Content Unlock Experience

| # | Question | Why it matters | Answer | Owner | Date |
| --- | --- | --- | --- | --- | --- |
| 14.1 | Who configures drip schedules — **admin globally**, **coach per package** (Pro), or both? | Matrix: coach ○ at Pro, admin always | **Coach per package (Pro).** Package `dripSchedule` in Sanity; admin global rules deferred (STORY-12.x). | product | 2026-07-23 |
| 14.2 | Default drip cadence options — weekly, biweekly, custom per module? | Flow 14 italic rule | **Weekly / biweekly / custom** via positive `intervalDays` (7, 14, or any custom day count). Not per-module offsets in MVP. | product | 2026-07-23 |
| 14.3 | Does **higher subscription tier** unlock drip **faster** for the same package? Confirm rules. | Tier-dependent drip speed | **No.** Same package cadence for all paid tiers (STORY-10.2). | product | 2026-07-23 |
| 14.4 | Package structure — **program → modules → lessons → items**? How many levels? | Content model + dripping | **Yes — four levels as in content-model.md.** `TrainingProgram` (marketplace listing) → `Module` (drip unlock unit, e.g. lessons 1–4) → `Lesson` → `ContentItem` (Drill \| Video \| Strategy). Drip schedule and `drip_progress` operate at the **module** level; lesson/item completion rolls up under modules (STORY-10.3). | product | 2026-07-23 |
| 14.5 | If a user upgrades mid-drip, do previously locked modules unlock immediately? | Flow 17 interaction | **No.** Upgrade does not change remaining unlock dates (STORY-10.2). | product | 2026-07-23 |

---

## Flow 15 — First-Time Coach Onboarding

| # | Question | Why it matters | Answer | Owner | Date |
| --- | --- | --- | --- | --- | --- |
| 15.1 | Which steps are **skippable** vs mandatory (profile, marketplace browse, first session)? | Guided onboarding | | | |
| 15.2 | Should onboarding **force trial activation**, or allow starting on Basic free? | Flow 2 | | | |
| 15.3 | Is **team creation** offered but skippable, as documented? | Flow 15 italic rule | | | |

---

## Flow 16 — First-Time Player Onboarding

| # | Question | Why it matters | Answer | Owner | Date |
| --- | --- | --- | --- | --- | --- |
| 16.1 | Must new players **join a team** during onboarding, or is independent path the default? | Flow 16 | | | |
| 16.2 | Is **first drill completion** a required onboarding step, or optional demo? | Onboarding completion analytics | | | |
| 16.3 | Should players be prompted to **browse marketplace** before or after trial/subscription choice? | Onboarding order | | | |

---

## Flow 17 — Subscription Upgrade & Downgrade

| # | Question | Why it matters | Answer | Owner | Date |
| --- | --- | --- | --- | --- | --- |
| 17.1 | Confirm **upgrade = immediate** with proration and **downgrade = end of billing cycle**? | Flow 17 italic rule | | | |
| 17.2 | On downgrade, is **objective/AI history preserved but hidden** until re-upgrade? | Data retention | | | |
| 17.3 | What happens to **coach-distributed content** and **purchased packages** on tier downgrade? | Content access rules | **Retain.** Purchased marketplace packages and coach-distributed content stay accessible after downgrade. Subscription-gated features lock; content ownership / prior assignments do not revoke. Aligns with OQ-9.3. | product | 2026-07-13 |
| 17.4 | Refund policy — any self-serve refunds, or support-only? | Stripe + admin override | | | |

---

## Flow 18 — Player-to-Player Knowledge Sharing

| # | Question | Why it matters | Answer | Owner | Date |
| --- | --- | --- | --- | --- | --- |
| 18.1 | What can players share — stats, achievements, tips only, or also videos/drills? | Flow 18 vs chat media | | | |
| 18.2 | Is sharing **team-scoped only**, or can players DM shared content? | Privacy/safety | | | |
| 18.3 | Should coaches see **all** peer shares, or aggregated engagement only (○ at Advanced, ✓ at Pro)? | Coach visibility | | | |
| 18.4 | Content moderation for peer shares — required at MVP? | Youth safety | | | |

---

## Part 3 — Access Control Matrix (cross-flow)

| # | Question | Why it matters | Answer | Owner | Date |
| --- | --- | --- | --- | --- | --- |
| AC.1 | The matrix references **~223 rules** in benchmarks; MVP ships **basic gating only** (DEP-06). Which rules are **must-have for launch**? | Scope control (+40–80 h post-MVP) | | | |
| AC.2 | Several cells use **◎ read-only** and **○ partial** — need a definitive list of what partial means per feature. | Implementation ambiguity | **○ legend confirmed** (OQ-6.5 / OQ-2.3): ○ means “available at a higher tier,” not partial access at the current tier. Per-feature **◎ read-only** list and remaining matrix cells still need a definitive MVP list (AC.1). | product | 2026-07-23 |
| AC.3 | **Trial** column mirrors Pro in many rows — confirm trial = Pro for all features, or exceptions? | Consistent gating | | | |
| AC.4 | Can a **Basic coach** purchase and use content without Advanced coaching features? | Independent coach path | | | |
| AC.5 | English only at launch, or multi-language required? | SOW assumption | | | |

---

## Dependencies & platform (support multiple flows)

| # | Question | Related flows | Why it matters | Answer | Owner | Date |
| --- | --- | --- | --- | --- | --- | --- |
| D.1 | Video hosting: **Mux**, **Supabase Storage**, or other? | 4, 12, 14 | DEP-04 | | | |
| D.2 | CMS: confirm **Sanity** for catalog content; coach uploads go to Sanity, storage, or both? | 4, 7, 12 | Architecture | | | |
| D.3 | Push notifications: **FCM/APNs** only, or also email/SMS for critical events? | 3, 5, 8, 14 | DEP-07 | | | |
| D.4 | Target launch markets — **US only**, Philippines, EU (GDPR)? | All | Legal + payments | | | |
| D.5 | App Store age rating and COPPA/youth sports compliance requirements? | 1, 5, 18 | Compliance | | | |
| D.6 | Brand/design — custom UI or component library as-is? | All | Hours assumption | | | |
| D.7 | Who provides **seed content** for marketplace at launch (drills, packages)? | 4, 7 | Go-live blocker | | | |

---

## Recommended workshop agenda

### Session 1 (~60–90 min) — P0 scope lock

1. Flow 2 — Basic progress, Pro “full MVP”, Advanced boundaries  
2. Flow 3 — Session runtime vs calendar-only; scheduling mechanics  
3. Flows 4, 7, 12 — Marketplace supply model; coach → marketplace path  
4. Flow 6 — Objectives definition; AI at Advanced vs Pro  
5. Flow 2 / DEP-03 — Stripe vs IAP  

### Session 2 (~60 min) — Feature detail

1. Flow 12 + 14 — Content packaging and drip model  
2. Flow 5 — Chat scope and SDK choice  
3. Flow 11 — Team/roster rules  
4. Flows 13, 18 — Feedback loop and peer sharing  

### Session 3 (~45 min) — Platform & compliance

1. Dependencies D.1–D.7  
2. Part 3 access matrix (AC.1–AC.5)  

---

## Decision log

Record finalized decisions here after each session.

| Date | Flow / Ref | Decision | Decided by |
| --- | --- | --- | --- |
| | | | |
| | | | |
| | | | |

---

*Document version: 1.0*  
*Created: June 2026*
