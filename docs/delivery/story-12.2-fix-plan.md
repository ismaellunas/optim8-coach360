# STORY-12.2 fix plan — Subscription and trial administration

> **Status today:** DONE (tracker) — reopened, contradicted by BUG-QA3-12
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

1. **Stop the silent skip.** In `supabase/functions/stripe-webhook/index.ts`, when `resolveInvoiceProfileId` returns `null` for an `invoice_upsert`, call `recordWebhookFailure(supabase, 'missing_profile_id', { stage: 'invoice_upsert', stripeInvoiceId: result.invoice.stripe_invoice_id, stripeCustomerId: result.stripeCustomerId })` before returning — so it surfaces on the Monitor health panel (`HealthSection`) instead of vanishing.
2. **Reduce the chance of the skip happening at all.** Add a fallback resolution step to `resolveInvoiceProfileId`: if `stripeCustomerId` is present but no `subscriptions` row matches yet, look up the Stripe customer's email (requires a Stripe API call from the Edge Function, which it doesn't currently make) and match against `profiles`/`auth.users` email — or, simpler, re-process by re-queuing/retrying the invoice event after a short delay instead of accepting it as permanently skipped. Needs a product/eng call on which approach (see Open Questions).
3. **Backfill.** Once the fix ships, write a one-off script to list Stripe invoices with `status=paid` from the Stripe API directly and reconcile against `billing_invoices`, inserting any that were silently dropped historically, so revenue figures aren't permanently missing pre-fix invoices.
4. **Make failures visible on the Subscriptions page too**, independent of the webhook fix: add `revenueQuery.isError` handling to the "Billing & revenue" card (mirror `MonitorPage`'s `analyticsQuery.isError` pattern), since today an RPC-level failure (e.g. a future regression) would also render as a silent `$0` with no error shown.

## Verification plan

- Existing tests to re-run: `npx vitest run tests/admin/story-12.2.test.js` — **will not catch this.** `test_STORY_12_2_AC3_billing_revenue_summary_on_subscriptions` only regex-matches source/migration strings; it never exercises the webhook handler's profile-resolution branches.
- New test cases needed: a `handleStripeWebhookEvent`/`resolveInvoiceProfileId` unit test asserting that an `invoice.paid` event with no metadata and no matching `subscriptions` row (a) does not silently succeed, and (b) records a health event. Plus an integration test seeding a `subscriptions` row with `stripe_customer_id` and asserting a same-customer `invoice.paid` event successfully upserts `billing_invoices`.
- Manual re-test: trigger a Stripe test-mode checkout end-to-end against a profile with no pre-existing `subscriptions` row, inspect whether `billing_invoices` gets a row and whether `system_health_events` logs anything if it doesn't.

## Open questions — need confirmation before implementing

- **Q1:** For the fallback resolution (fix-plan step 2) — should we call the Stripe API from the Edge Function to look up the customer's email and match against `profiles`, or should checkout-session creation be changed to always stamp `invoice.metadata.profile_id` at source (e.g. via `subscription_data.metadata` on the Checkout Session) so this ambiguity can't occur in the first place? The latter is more robust but needs to be confirmed against how `create-package-checkout-session`/the subscription checkout function currently builds the session.
- **Q2:** Is a historical backfill (fix-plan step 3) actually wanted, or is it acceptable to only fix this going forward? Backfilling requires a one-off script with Stripe API credentials run outside the normal app — confirm who's authorized to run that against production.
- **Q3:** Should a missing-profile-id invoice skip be treated as `api_error` or `webhook_failure` in `system_health_events`? Current schema only allows those two `kind` values (`20260727180000_admin_monitor_analytics.sql:35`) — `webhook_failure` fits better than `api_error`, but confirming before I commit to one in the fix.
