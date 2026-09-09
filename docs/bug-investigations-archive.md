# Coach360 — Archived QA bug investigations

Resolved write-ups. Open bugs: [`bug-investigations.md`](./bug-investigations.md). Tracker JSON: `bugs_archive` in `docs/index.html`.

---

## QA2-07 — Store catalogue empty in the native app (RESOLVED 2026-09-09)

**Reason (confirmed).** The Store fetches published packages **from the WebView** via `SanityMarketplaceCatalogRepository` (`*.apicdn.sanity.io` / `*.api.sanity.io`). Sanity CORS listed Studio/Vercel hosts (`http://localhost:5174`, admin Vercel) only. Capacitor Android origin is `https://localhost`; iOS is `capacitor://localhost`. The Vercel/browser mobile app therefore loaded the catalogue while the Fold7 APK did not. Sanity itself was not down.

**Resolution.** Allowlist Capacitor origins in Sanity → Project → API → CORS (credentials on if `VITE_SANITY_READ_TOKEN` is set). Confirmed working in the mobile app on 2026-09-09. Native Stripe success/cancel still uses `window.location.origin` (`https://localhost` on Android) — separate follow-up if checkout does not return to the app.

---

# August 2026 sheet (all RESOLVED)

**Date:** 2026-08-03 (statuses updated 2026-08-11)  
**Sources:** FAIL outcomes from `docs/Coach 360 - Testing.xlsx`, tester notes from `docs/Coach 360 - Testing.docx`, test definitions in `docs/mobile-app-test-pack.md`. Root causes determined by code investigation of the monorepo.

Each entry states the **reason** (root cause, marked *confirmed from code* or *hypothesis needing staging verification*) and the **resolution**. All bugs below are **RESOLVED** (shipped in `f181dcb` and related deploys).

## Summary

| Test ID | Bug | Root cause (short) | Status |
|---|---|---|---|
| E3-T1 | Team logo missing on edit | Storage policy + form did not include logo URL on update | Resolved (`403c3e0`) |
| E4-T4 | Unable to upgrade to Pro | Stripe webhook never updates `subscriptions` in staging | Resolved (`f181dcb`) |
| E4-T6 | Stripe upgrade to Advanced failed | Same systemic webhook gap | Resolved (`f181dcb`) |
| E4-T7 | Billing history missing | Cascade of E4-T6 + invoice `profile_id` metadata never set | Resolved (`f181dcb`) |
| E4-T8 | Second upgrade not immediate | No `stripe_subscription_id` from E4-T6 → wrong code path | Resolved (`f181dcb`) |
| E4-T9 | Registered Pro, shows Basic | Signup paid choice intentionally defers to Basic without checkout | Resolved (`f181dcb`) |
| E5-T6 | Chat unlock after upgrade failed | Downstream of Epic 4 upgrade failures | Resolved (`f181dcb`) |
| E5-T7 | AI Insights did not open | Unlocked AI card has no navigation target (no screen wired) | Resolved (`f181dcb`) |
| E5-T8 | Objectives cannot open | Account tier never reached Pro (Epic 4 cascade) / preview cards not clickable | Resolved (`f181dcb`) |
| E8-T8 | Cannot post achievement to team chat | Peer-share CHECK-constraint migration skipped on staging (version collision) | Resolved |
| E10-T9 | Admin approve/reject failed (empty queue) | Webhook idempotency key skipped status-only syncs | Resolved (`f181dcb`) |
| E12-T6 | Trial warning days do not persist | Save RPC fails silently (dual Supabase client session desync) | Resolved (`f181dcb`) |
| E12-T14 | Publish does not leave review queue | Review action failure (`SANITY_API_TOKEN`) + stale `package_metadata` lists | Resolved (`f181dcb`) |
| E12-T15 | Unpublish does not leave Published list | Same: optimistic metadata write is single point of failure; webhook cannot heal | Resolved (`f181dcb`) |

---

## E3-T1 — Team logo missing when editing a team (RESOLVED)

**Reason.** The EDIT TEAM screen did not show the previously uploaded logo: the team update path omitted the logo URL and the Supabase storage policy blocked proper access to team logo objects.

**Resolution (shipped).** Commit `403c3e0` (2026-07-21, `feat(team): implement team logo upload functionality and fix storage policy`): logo upload with preview in `apps/mobile/src/features/team/ui/TeamProfileForm.jsx`, logo URL included in updates in `packages/api/src/adapters/supabase/supabase-team-repository.ts`, storage policy fixed in migration `20260721150000_fix_team_logo_storage_policy.sql`, integration tests in `tests/team/story-3.1-logo-upload.test.js`. Status: **RESOLVED**.

---

## Epic 4 — Subscription / Stripe upgrade cluster (RESOLVED)

### Shared architecture

The app only trusts `public.subscriptions.tier`. That row is updated by the `stripe-webhook` edge function via the `sync_subscription_from_stripe` RPC on `customer.subscription.*` events — **not** on checkout completion (`checkout.session.completed` is handled for marketplace purchases only; subscription checkouts return `ignored_checkout_kind`). Key paths:

- Paywall: `apps/mobile/src/features/subscription/ui/PaywallModal.jsx`; Manage Subscription: `SubscriptionScreen.jsx`
- Orchestration: `apps/mobile/src/App.jsx` → `handlePaywallUpgrade`, `handleChangeSubscriptionTier`
- Edge functions: `create-checkout-session`, `change-subscription-tier`, `stripe-webhook`
- Tier store: `public.subscriptions`; invoices: `public.billing_invoices` (RPC `sync_billing_invoice_from_stripe`)
- Env (edge functions): `STRIPE_SECRET_KEY`, `STRIPE_PRICE_BASIC|ADVANCED|PRO`. Note: `STRIPE_WEBHOOK_SECRET` is documented but signature verification is **not implemented**; `.env.example` documents no Stripe keys — an easy staging miss.

**Systemic root cause (addressed).** In staging, Stripe webhook events (`customer.subscription.*`, `invoice.*`) never reach or never succeed in `stripe-webhook`, so `subscriptions` stays `tier='basic'` with null Stripe IDs after every successful payment. This single gap explained E4-T4, T6, T7, T8 and the downstream E5 failures. Fixes shipped in `f181dcb` (invoice/subscription sync hardening + paid signup checkout + related gates).

### E4-T4 — Not able to upgrade to Pro (paywall doors) (RESOLVED)

**Reason.** Payment may succeed, but the tier never lands in `subscriptions` because the webhook sync never runs (see systemic cause). The user keeps seeing Basic and locked features.

**Resolution (shipped).** Webhook/subscription sync hardened in `f181dcb`. Status: **RESOLVED**.

### E4-T6 — Stripe upgrade to Advanced failed (RESOLVED)

**Reason.** Confirmed from code: after checkout the app returns to `?checkout=success` and `SubscriptionGate` polls `subscriptions` up to 5×/1.5 s — nothing else writes the tier. With the webhook not delivering, the plan can never change, no matter how long the tester waits. Also confirmed: tier resolution falls back to `'basic'` when subscription metadata/price tier is missing.

**Resolution (shipped).** Same webhook sync fix in `f181dcb`. Status: **RESOLVED**.

### E4-T7 — Billing history missing (RESOLVED)

**Reason.** Two layers: (1) cascade of E4-T6 — no invoice ever synced; (2) **confirmed independent code gap** — `create-checkout-session` never sets `metadata.profile_id` on invoices, and the webhook's `resolveProfileIdFromInvoice` skips invoices without it (`missing_profile_id`), so even with a healthy webhook the invoice would not be attributed.

**Resolution (shipped).** Invoice profile resolution via subscription/customer lookup in `stripe-webhook` (`f181dcb`). Status: **RESOLVED**.

### E4-T8 — Upgrading again (Advanced → Pro) not immediate (RESOLVED)

**Reason.** The immediate prorated path (`change-subscription-tier` + `persist.applyUpgrade`, which writes `subscriptions.tier` directly) only runs when the account has a `stripe_subscription_id`. Because E4-T6 never persisted one, the app fell back to opening a fresh Stripe Checkout — which again depended on the broken webhook.

**Resolution (shipped).** Unblocked by E4-T6 webhook/sync fix in `f181dcb`. Status: **RESOLVED**.

### E4-T9 — Registered with Pro but Manage Subscription shows Basic (RESOLVED)

**Reason. Confirmed from code — works as (questionably) designed.** Choosing Pro/Advanced during signup goes through `SubscriptionGate.handleChoosePaidTier` → `deferToBasic` → RPC `defer_user_to_basic`, which inserts `tier='basic', status='active'` and merely redirects to Manage Subscription. No checkout is started; payment is a separate step the tester never completed (and could not complete, given E4-T6). Manage Subscription therefore correctly reports Basic.

**Resolution (shipped).** Paid signup choice now starts Stripe Checkout / upgrade flow (`f181dcb`). Status: **RESOLVED**.

---

## Epic 5 — Feature-unlock cluster (RESOLVED)

Trial access is independent of Stripe and confirmed correct in code: `activate_user_trial` sets `tier='trial', status='trialing'`, and both the client gate (`resolveLaunchFeatureAccess`, `paidFloor('trial') === 'pro'`) and SQL (`effective_tier()`, `has_feature_access()`) map active trial → Pro. Admin feature-flag overrides fall back safely to static defaults when the fetch fails.

### E5-T6 — Chat stayed locked after Advanced upgrade (RESOLVED)

**Reason.** Strong hypothesis: **downstream of Epic 4.** Accounts never actually reached Advanced (upgrades failed), so `ChatScreen`'s `canAccess(user, 'chat')` (Advanced+) correctly kept the lock screen. The gating code itself is covered by `tests/rbac/story-5.2.test.js` and looks correct.

**Resolution (shipped).** Unblocked by Epic 4 webhook/sync fixes in `f181dcb`. Status: **RESOLVED**.

### E5-T7 — AI Insights did not open on Pro/trial (RESOLVED)

**Reason. Confirmed independent UI defect.** In `apps/mobile/src/App.jsx` (HomeScreen), when `canAccess(user, 'ai')` is true the AI Insights card renders as a **static, non-clickable card** — no `onClick`, no navigation target; no `AiInsightsScreen` exists and nothing calls `go("ai")`. Only the *locked* path is wired (opens the paywall). So on trial/Pro, tapping does nothing — exactly "it did not open AI Insights". Not a Mistral/env issue (`MISTRAL_API_KEY` is only used by recommendations/RAG), and `COACH_AI_PERFORMANCE_INSIGHTS_ENABLED` is `false`, stubbing the Progress AI panel too.

**Resolution (shipped).** AI Insights navigation wired in `f181dcb`. Status: **RESOLVED**.

### E5-T8 — Objectives cannot open on Pro/trial (RESOLVED)

**Reason.** Gating and navigation are correct in code (Manage → `go("objectives")` → `ObjectivesScreen`; trial→Pro unit-tested in `tests/objectives/story-11.1.test.js`). Most plausible: the account was never actually Pro/trial (Epic 4 cascade, incl. the E4-T9 defer-to-basic behavior), so the paywall appeared. Secondary contributor: the unlocked home **preview cards** are not clickable — only the **Manage** button navigates — an easy mis-tap that presents as "cannot open".

**Resolution (shipped).** Unblocked by Epic 4 fixes in `f181dcb`. Status: **RESOLVED**.

---

## E8-T8 — Cannot post achievement to team chat (RESOLVED)

**Reason.** High confidence: **staging database still rejects `message_type='achievement'`.** The post is a direct Supabase client insert into `public.chat_messages` (`SupabaseMessagingRepository.sendChannelMessage`; no edge function). STORY-8.2 defined `message_type in ('text','content_link','video')`; STORY-8.3's migration `20260722140000_peer_knowledge_sharing.sql` (adds `'achievement','insight'`) **collided** with another migration of the same version number (`profiles_team_creator_select`, renamed in commit `32040f7`), so a repair migration `20260723230100_fix_peer_share_chat_constraints.sql` was created — committed the **same evening as the failed test**. If staging never got the repair, the CHECK constraint rejects the insert and the sheet shows `chat_message_send_failed`. Ruled out: tier gating (active trial grants `peerShare`; the tester reached the share sheet, which is behind the same gate) and missing team channel (`ensureTeamChannelsForUser` auto-creates channels; the picker showed a team).

**Resolution (shipped).** Peer-share constraint repair applied; status: **RESOLVED**.

---

## Admin content cluster (E10-T9, E12-T14, E12-T15) (RESOLVED)

### Shared pipeline

Sanity Studio (`trainingPackage.status` workflow field + boolean `published`) → Studio **Publish** fires `sanity-webhook` → upserts `package_metadata` (idempotency ledger `sanity_webhook_events`) → admin `ContentPage` lists the review queue and Published packages → actions call the `review-marketplace-package` edge function (approve / reject / publish / unpublish), which writes to Sanity (requires `SANITY_API_TOKEN`) and then optimistically mirrors into `package_metadata`.

**Note:** Fixes for this cluster shipped in `f181dcb`: richer webhook idempotency keys, review queue / published lists read live from Sanity, empty-state guidance, and regression tests in `tests/cms/story-9.5.test.js` / `tests/admin/story-12.3.test.js`.

### E10-T9 — Approve/reject a coach submission failed (queue empty) (RESOLVED)

**Reason. Confirmed from code.** The pre-fix webhook idempotency key was `sanity:{id}:{pub|unpub}:{title}`. A workflow change draft → pending_review keeps the same pub-bit and title, so the webhook classified the event as a **duplicate and skipped the upsert** — `package_metadata.workflow_status` never became `pending_review`, and the metadata-backed review queue stayed empty. Contributing ops issue (confirmed in docs/UI): Sanity webhooks fire on Studio **Publish**, not Save — a Save-only draft never syncs at all.

**Resolution (shipped).** Idempotency key includes workflow/pricing fields; live Sanity GROQ list for review queue (`f181dcb`). Status: **RESOLVED**.

### E12-T14 — Package cannot leave review queue / not under Published (RESOLVED)

**Reason.** Two mechanisms, both grounded in code:
1. **Action failure (strong hypothesis):** all `review-marketplace-package` actions hard-require `SANITY_API_TOKEN` (+ project id) and fail with `sanity_env_missing` otherwise — nothing moves, matching the tester's report. Needs staging confirmation.
2. **Stale lists (confirmed):** pre-fix, both lists read only `package_metadata`. Approve/reject keep the same pub-bit + title, so the old idempotency key meant the webhook could never re-sync them; the UI depended entirely on the edge function's optimistic metadata write (whose update errors were unchecked). Publish does flip `unpub→pub` (webhook would not skip), so for publish specifically the failure points are the action itself or the optimistic mirror.

**Resolution (shipped).** Live review/published lists + webhook key fixes in `f181dcb`. Status: **RESOLVED**.

### E12-T15 — Unpublish does not remove from Published list (RESOLVED)

**Reason.** Same mechanics as E12-T14. Unpublish sets Sanity `published=false` then optimistically updates metadata; the Published list is metadata `published=true`. Confirmed: under the old key, the unpublish webhook event often reused the original `…:unpub:…` key from the first sync and was **skipped as a duplicate**, so the webhook could not heal a failed mirror — the item stayed "published" in the UI. If the action itself failed (missing token), nothing changed at all.

**Resolution (shipped).** Same live-list + idempotency fixes in `f181dcb`. Status: **RESOLVED**.

---

## E12-T6 — Trial expiry warning days do not persist (RESOLVED)

**Reason.** The wiring is correct end-to-end (confirmed): `SubscriptionsPage` → `useSetTrialWarningDaysMutation` → `SupabaseSubscriptionRepository.setTrialWarningDays` → RPC `set_trial_warning_days` (SECURITY DEFINER, validated, proper `on conflict` upsert) → `platform_settings.key='trial_warning_days_before'`; the reader uses the same key. The classic key-mismatch/upsert/RLS causes are ruled out. Most plausible (strong hypothesis): **the save RPC fails silently**. `set_trial_warning_days` requires `auth.uid()` and `profiles.role='admin'`, but `createRepositories` (`packages/api/src/di/create-repositories.ts`) builds **two Supabase clients** — auth/sign-in on `adminClient`, subscription RPCs on `appClient` — which do not share session state, so the write can go out unauthenticated (`not_authenticated`/`admin_required`). The error renders far away at the bottom of the page, and both the SQL function and the query hook fall back to the default **3** — exactly "field shows the same after save". Confirmed amplifiers: the mutation never writes back via `setQueryData`, the draft isn't reset on success, and `tests/admin/story-12.2.test.js` only does source-string matching (no persistence round-trip).

**Resolution (shipped).** Single shared Supabase client for auth + data in `createRepositories` (`f181dcb`), plus UX/persistence hardening. Status: **RESOLVED**.
