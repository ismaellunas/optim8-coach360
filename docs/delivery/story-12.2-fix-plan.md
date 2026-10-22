# STORY-12.2 fix plan — Subscription and trial administration

> **Status today:** DONE (tracker) — the silent invoice-skip fix (steps 1) and Subscriptions-page error display (step 4) implemented and tested. Backfill (step 3) deferred — needs production Stripe access authorization, not decided here.
> **QA evidence:** docs/Coach_Feedback.docx (admin account section, MacBook M1 Pro / Chrome)
> **Related:** docs/index.html (tracker), docs/bug-investigations-archive.md (BUG-E12-T6, a different but structurally similar admin "looks fine, shows nothing" bug)

## What QA reported

"Subscriptions: Stats not linked"

## Acceptance criteria at risk

- **AC-3** "Billing and revenue summary visible on Subscriptions pillar" — the summary card renders and is wired to a real RPC; whether it's actually "visible" with real numbers for this tester's environment could not be confirmed from code alone (see Root cause).

## Root cause (confirmed in code)

`apps/admin/src/pages/subscriptions/SubscriptionsPage.tsx:150-174` renders a "Billing & revenue" card sourced from `useRevenueSummaryQuery()` → `repos.billing.getRevenueSummary()` → `SupabaseBillingRepository.getRevenueSummary()` (`packages/api/src/adapters/supabase/supabase-billing-repository.ts:113-119`), which calls RPC `get_billing_revenue_summary()` (`supabase/migrations/20260726120000_admin_subscription_administration.sql:282-312`). That RPC sums `billing_invoices` where `status = 'paid'`.

The user has confirmed the Stripe account/test environment has real paid invoices, which rules out "empty data" and the two-client auth-mismatch bug (already fixed — `packages/api/src/di/create-repositories.ts:170` shares one client for auth and data). That leaves one place `billing_invoices` can end up with no/few `'paid'` rows despite real Stripe payments: **the webhook sync that populates it can silently drop the invoice before it's ever written.**

Trace: `supabase/functions/stripe-webhook/index.ts:166-178`, handling `invoice.paid` / `invoice.finalized` (`handler.ts:395-416`):
1. `resolveInvoiceProfileId()` (`index.ts:31-66`) only resolves a `profile_id` from (a) the invoice's own Stripe metadata, or (b) a **pre-existing** `subscriptions` row matched by `stripe_subscription_id` or `stripe_customer_id`.
2. The code's own comment (`handler.ts:401`) acknowledges: *"Metadata may be absent on Checkout-created invoices"* — i.e. the common path.
3. If no `subscriptions` row yet has that `stripe_customer_id`/`stripe_subscription_id` linked at the moment `invoice.paid` arrives (e.g. the `customer.subscription.created/updated` webhook that populates those columns hasn't processed yet, arrives out of order, or never linked that customer for some other reason), `resolveInvoiceProfileId` returns `null`.
4. `index.ts:173-178`: when `profileId` is `null`, the function returns **`{ received: true, skipped: 'missing_profile_id' }` with HTTP 200** — no error, no call to `record_system_health_event`, no retry triggered (Stripe only retries on non-2xx). The invoice is silently discarded and never reaches `billing_invoices` at all.

This fully explains real, confirmed Stripe payments producing an empty or undercounted `billing_invoices` table with zero visible symptoms anywhere — not a UI linking bug, a silent webhook data-loss path. (Separately, `admin_platform_analytics()` in `supabase/migrations/20260727180000_admin_monitor_analytics.sql:198-204` runs the **identical** `billing_invoices where status = 'paid'` query for the Monitor "Revenue" card — so this one root cause also produces QA3-13's Monitor revenue symptom, not just Subscriptions.)

## Fix plan

1. **Stop the silent skip (resolved, implemented).** `supabase/functions/stripe-webhook/index.ts`'s `invoice_upsert` handler: when `resolveInvoiceProfileId` returns `null`, it now calls `recordWebhookFailure(supabase, 'missing_profile_id', { stage: 'invoice_upsert', stripeInvoiceId, stripeCustomerId })` and returns **500** (was: silent `{received:true, skipped:...}` with 200). Surfaces on the Monitor health panel instead of vanishing.
2. **Fallback resolution (resolved — neither originally-proposed option; use Stripe's own retry instead):** checked `create-checkout-session/handler.ts` — it already stamps `subscription_data.metadata.profile_id` at checkout time, but Stripe does **not** propagate subscription metadata onto the invoices that subscription later generates (confirmed by this codebase's own "metadata may be absent on Checkout-created invoices" comment) — so stamping *more* metadata at checkout wouldn't have fixed anything. The real cause is webhook delivery **ordering**: Stripe doesn't guarantee `customer.subscription.created/updated` arrives before `invoice.paid`. Returning 500 (item 1) makes Stripe retry the delivery for ~3 days, which gives the subscription-linking webhook a chance to land first — no new Stripe API call, no email-matching needed.
3. **Backfill — deferred, not built.** Needs a one-off script with Stripe API credentials run against **production** billing data — that's a real authorization decision (who's allowed to touch live financial records) that isn't an engineering call. The forward-looking fix (items 1–2) stops new data loss; backfilling historically-dropped invoices is a separate, optional follow-up for whoever owns production Stripe access.
4. **Subscriptions-page error visibility (resolved, implemented):** added `revenueQuery.isError` handling to the "Billing & revenue" card, mirroring `MonitorPage`'s `analyticsQuery.isError` pattern — a future RPC-level failure now shows an error message instead of rendering as a silent `$0`.

## Verification plan

- `npx vitest run tests/admin/story-12.2.test.js`: 6/6 passing (5 original + 1 new: `test_STORY_12_2_AC3_missing_profile_id_invoice_logs_and_retries`, asserting the silent-skip path is gone, the failure is logged, and the response is 500; plus the Subscriptions page `isError` handling).
- Full suite (`npx vitest run`): 248/258 non-skipped passing, same 7 pre-existing unrelated failures as before this change.
- `tsc --noEmit` on `apps/admin`: clean.
- Manual re-test (not done — no live Stripe test-mode environment in this session): trigger a Stripe test-mode checkout against a profile with no pre-existing `subscriptions` row, confirm the webhook now retries (visible as repeated `system_health_events` rows) rather than silently dropping the invoice once.

## Resolved decisions

- **Q1, invoice fallback resolution:** neither proposed option — rely on Stripe's built-in retry (return 500, let Stripe redeliver) instead of adding a new Stripe API dependency or checkout-metadata change that wouldn't have worked anyway (see Fix plan item 2 for why).
- **Q2, historical backfill:** deferred — needs production Stripe API authorization that isn't an engineering decision. Not built.
- **Q3, health event kind:** `webhook_failure`. Implemented.

## Open questions

None outstanding for items 1/2/4. Item 3 (backfill) remains deferred pending a human decision on authorization — see Resolved decisions.
