# STORY-12.4 fix plan — Monitor: analytics, chat moderation, AI config

> **Status today:** DONE (tracker) — reopened, contradicted by BUG-QA3-13
> **QA evidence:** docs/Coach_Feedback.docx (admin account section, MacBook M1 Pro / Chrome)
> **Related:** docs/index.html (tracker), docs/delivery/story-12.2-fix-plan.md (same "stats not linked" pattern, Subscriptions pillar)

## What QA reported

"Monitor: Stats not linked or updating"

## Acceptance criteria at risk

- **AC-1** "Dashboard shows DAU, revenue, content completion, onboarding funnel" — wired to a real RPC; likely shows real (possibly all-zero) data rather than being broken — see Root cause.
- **AC-5** "App health indicators surfaced (API errors, webhook failures)" — **confirmed partially broken**: API errors can never surface, by construction (see below).

## Root cause (confirmed in code, with one caveat)

`apps/admin/src/pages/monitor/MonitorPage.tsx:14` calls `usePlatformAnalyticsQuery(14)` → `repos.monitor.getPlatformAnalytics(days)` → RPC `admin_platform_analytics(p_days)` (`supabase/migrations/20260727180000_admin_monitor_analytics.sql:104-250`). `HealthSection.tsx:11` calls `useHealthSummaryQuery(24)` → RPC `admin_health_summary(p_hours)` (same file, lines 508-582).

**AC-5, API errors — confirmed broken, not a data gap.** `admin_health_summary` buckets events by `kind in ('api_error', 'webhook_failure')` (table check constraint, line 35). I grepped every call site of `record_system_health_event` across the repo: it is invoked **only** from `supabase/functions/stripe-webhook/index.ts:15` and `supabase/functions/sanity-webhook/index.ts:106,123,166` — and every one of those calls passes `kind: 'webhook_failure'`. **Nothing in the codebase ever records `kind: 'api_error'`.** The "API errors" counter on the Monitor page is not reading stale or empty data — it is structurally incapable of ever showing a nonzero number, because no code path writes that event kind. This is a real instrumentation gap, confirmed, independent of what environment QA was pointed at.

**Revenue card — confirmed, same root cause as STORY-12.2.** The user confirmed real paid invoices exist, ruling out empty-data. `admin_platform_analytics()` (`supabase/migrations/20260727180000_admin_monitor_analytics.sql:198-204`) runs the identical `select ... from public.billing_invoices where status = 'paid'` query used by the Subscriptions RPC. The cause is the same silent webhook skip documented in detail in `docs/delivery/story-12.2-fix-plan.md`: `supabase/functions/stripe-webhook/index.ts:166-178` drops `invoice.paid` events with HTTP 200 and no logged failure whenever `resolveInvoiceProfileId()` can't match the invoice to an existing `subscriptions` row (common on Checkout-created invoices per the handler's own comment at `handler.ts:401`). Fix for this card is the same fix as STORY-12.2 — do not duplicate it; land it once and both pillars pick it up.

**DAU — confirmed scoping gap, separate from the revenue bug.** `v_dau_today` (`20260727180000_admin_monitor_analytics.sql:131-146`) only counts activity where the relevant timestamp is `>= date_trunc('day', now())` — i.e. strictly the *current server-UTC calendar day*, not a rolling 24h window and not the `p_days` lookback (that `p_days` window only feeds the `dau_series` chart data, not the headline "DAU" card at `MonitorPage.tsx:26-32`). If the admin opened Monitor on a different UTC calendar day than when the Fold7/QA activity actually happened (very plausible — QA activity and admin review don't have to be the same session), the headline DAU card will correctly show `0` for *today* while real activity sits in yesterday's `dau_series` bucket, reading as "not updating" to someone who doesn't know the distinction. This isn't a data-wiring bug, but a mislabeled/surprising scope — the card says "DAU" with no date, implying "current", when a user reasonably expects something more like "recent activity."

**Content completion / onboarding funnel — not confirmed either way.** `v_session_completions`, `v_drip_completions`, `v_signed_up`, etc. are unfiltered lifetime `count(*)` queries against `session_content_completions`, `drip_progress`, and `profiles` — no date window, no status filter that could silently exclude real rows the way the invoice query does. If real sessions/drills/signups happened in this environment, these counts should be nonzero. I have no code-level reason to believe these are broken; confirming they were actually blank (vs. just not mentioned) is in Open Questions.

## Fix plan

1. **Revenue (do once, shared with STORY-12.2):** implement the webhook fix described in `docs/delivery/story-12.2-fix-plan.md`'s Fix plan steps 1–3. Do not implement a second time here.
2. **API errors (confirmed, independent of the above):** instrument actual API error paths to call `record_system_health_event({ kind: 'api_error', ... })`. Candidates: a catch-all error handler in the Edge Functions, or a middleware layer if one exists — needs a decision on which error classes count (see Open Questions) before writing code.
3. **DAU scoping:** either (a) change the headline card to a rolling 24h window matching how a user would read "DAU" intuitively, (b) keep "today" but add a visible date label ("DAU — Oct 20") so a zero reads as "nothing happened today" rather than "broken", or (c) do nothing if product considers strict-calendar-day DAU intentional. Needs a decision, not just an engineering default — see Open Questions.
4. **Content completion / funnel:** no fix planned pending confirmation these were actually part of the "not updating" complaint (see Open Questions) — don't want to build against a symptom that wasn't actually reported.

## Verification plan

- Existing tests to re-run: `npx vitest run tests/admin/story-12.4.test.js`.
- **This test suite has the same structural weakness as STORY-12.1/12.2** — `test_STORY_12_4_AC1_...` and `test_STORY_12_4_AC5_...` test pure domain functions (`buildOnboardingFunnelStages`, `parsePlatformAnalytics`, `parseHealthSummary`) with hand-built fixtures, and never call a live RPC or assert that `record_system_health_event` is actually invoked from a real API-error path. A regression test for the confirmed API-errors gap should assert that *some* real error-handling code path calls `record_system_health_event` with `kind: 'api_error'` — today nothing does, and no existing test catches that absence.
- New test: pick at least one Edge Function (or shared error handler) and add a test asserting an unexpected exception there results in an `api_error` health event. Plus a test for whichever DAU scoping option is chosen in step 3.
- Manual re-test: reload Monitor page in the real admin environment on the same day as generating fresh activity, confirm DAU reflects it; separately confirm revenue once the shared webhook fix ships.

## Open questions — need confirmation before implementing

- **Q1 (blocking for fix-plan step 3):** Is strict-calendar-day "DAU" intentional, or should it be a rolling window? If intentional, should the UI at least show the date it's scoped to, so a `0` doesn't read as broken?
- **Q2 (blocking for the API-errors fix):** What should count as an "API error" for this counter — any thrown exception in any Edge Function? Only 5xx responses? Only specific integrations (Stripe/Sanity/Mux)? The AC statement just says "API errors" with no definition, and picking the wrong scope either floods the counter with noise or misses the errors an admin actually cares about.
- **Q3:** Should "webhook failures" also count failures from Mux (video pipeline) or the AI recommendation Edge Function, or only Stripe/Sanity as currently instrumented? Not specified anywhere in `docs/product/`.
- **Q4:** Were the content-completion and onboarding-funnel cards specifically observed as blank/wrong, or is the feedback doc's "Stats not linked" referring only to DAU/revenue? If the former, these lifetime-count queries need a fresh look — I found no code-level reason for them to be wrong.
