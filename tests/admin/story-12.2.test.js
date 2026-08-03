// STORY-12.2 — Subscription and trial administration.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  TRIAL_DURATION_DAYS,
  TRIAL_DURATION_SETTING_KEY,
  TIER_CATALOG_OVERRIDES_SETTING_KEY,
  STRIPE_PRODUCT_CATALOG,
  mergeTierCatalogOverrides,
  normalizeTrialDurationDays,
  formatRevenueCents,
} from '@coach360/domain';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');

function read(relPath) {
  return readFileSync(path.join(REPO_ROOT, relPath), 'utf8');
}

const MIGRATION_PATH = 'supabase/migrations/20260726120000_admin_subscription_administration.sql';
const PORT_PATH = 'packages/api/src/ports/subscription-repository.ts';
const BILLING_PORT_PATH = 'packages/api/src/ports/billing-repository.ts';
const SUPABASE_SUB_PATH = 'packages/api/src/adapters/supabase/supabase-subscription-repository.ts';
const REST_SUB_PATH = 'packages/api/src/adapters/rest/rest-subscription-repository.ts';
const SUPABASE_BILLING_PATH = 'packages/api/src/adapters/supabase/supabase-billing-repository.ts';
const REST_BILLING_PATH = 'packages/api/src/adapters/rest/rest-billing-repository.ts';
const QUERIES_PATH = 'apps/admin/src/entities/subscription/api/subscription-queries.ts';
const SUBS_PAGE_PATH = 'apps/admin/src/pages/subscriptions/SubscriptionsPage.tsx';
const USERS_PAGE_PATH = 'apps/admin/src/pages/users/UsersPage.tsx';

describe('STORY_12_2 AC1 — admin configures subscription tier parameters and trial duration', () => {
  it('test_STORY_12_2_AC1_admin_configures_tier_params_and_trial_duration', () => {
    expect(TRIAL_DURATION_DAYS).toBe(14);
    expect(TRIAL_DURATION_SETTING_KEY).toBe('trial_duration_days');
    expect(TIER_CATALOG_OVERRIDES_SETTING_KEY).toBe('tier_catalog_overrides');
    expect(normalizeTrialDurationDays(0)).toBe(14);
    expect(normalizeTrialDurationDays(21)).toBe(21);

    const merged = mergeTierCatalogOverrides([
      { tier: 'basic', label: 'Starter', displayPrice: '$7/mo', features: ['Profile'] },
    ]);
    expect(merged.find((item) => item.tier === 'basic')?.label).toBe('Starter');
    expect(merged.find((item) => item.tier === 'pro')?.label).toBe(
      STRIPE_PRODUCT_CATALOG.find((item) => item.tier === 'pro')?.label,
    );

    const sql = read(MIGRATION_PATH);
    expect(sql).toMatch(/trial_duration_days/);
    expect(sql).toMatch(/get_trial_duration_days/);
    expect(sql).toMatch(/set_trial_duration_days/);
    expect(sql).toMatch(/tier_catalog_overrides/);
    expect(sql).toMatch(/get_tier_catalog_overrides/);
    expect(sql).toMatch(/set_tier_catalog_overrides/);
    expect(sql).toMatch(/get_trial_duration_days\(\)/);

    const port = read(PORT_PATH);
    expect(port).toMatch(/getTrialDurationDays/);
    expect(port).toMatch(/setTrialDurationDays/);
    expect(port).toMatch(/getTierCatalogOverrides/);
    expect(port).toMatch(/setTierCatalogOverrides/);

    const supabaseRepo = read(SUPABASE_SUB_PATH);
    expect(supabaseRepo).toMatch(/get_trial_duration_days/);
    expect(supabaseRepo).toMatch(/set_trial_duration_days/);
    expect(supabaseRepo).toMatch(/get_tier_catalog_overrides/);
    expect(supabaseRepo).toMatch(/set_tier_catalog_overrides/);

    const restRepo = read(REST_SUB_PATH);
    expect(restRepo).toMatch(/getTrialDurationDays/);
    expect(restRepo).toMatch(/setTierCatalogOverrides/);

    const queries = read(QUERIES_PATH);
    expect(queries).toMatch(/useTrialDurationDaysQuery/);
    expect(queries).toMatch(/useSetTrialDurationDaysMutation/);
    expect(queries).toMatch(/useTierCatalogOverridesQuery/);
    expect(queries).toMatch(/useSetTierCatalogOverridesMutation/);

    const page = read(SUBS_PAGE_PATH);
    expect(page).toMatch(/Trial duration/);
    expect(page).toMatch(/Trial duration days/);
    expect(page).toMatch(/Tier parameters/);
    expect(page).toMatch(/useSetTrialDurationDaysMutation/);
    expect(page).toMatch(/useSetTierCatalogOverridesMutation/);
  });
});

describe('STORY_12_2 AC2 — admin sets trial expiration warning schedule', () => {
  it('test_STORY_12_2_AC2_admin_sets_trial_warning_schedule', () => {
    const port = read(PORT_PATH);
    expect(port).toMatch(/getTrialWarningDays/);
    expect(port).toMatch(/setTrialWarningDays/);

    const supabaseRepo = read(SUPABASE_SUB_PATH);
    expect(supabaseRepo).toMatch(/get_trial_warning_days/);
    expect(supabaseRepo).toMatch(/set_trial_warning_days/);

    const queries = read(QUERIES_PATH);
    expect(queries).toMatch(/useTrialWarningDaysQuery/);
    expect(queries).toMatch(/useSetTrialWarningDaysMutation/);
    // Persist path writes cache immediately so UI does not fall back to default 3 after save.
    expect(queries).toMatch(
      /onSuccess:\s*\(days\)\s*=>\s*\{[\s\S]*setQueryData\(trialWarningDaysQueryKey,\s*days\)/,
    );

    const page = read(SUBS_PAGE_PATH);
    expect(page).toMatch(/Trial expiry warning/);
    expect(page).toMatch(/Trial warning days before expiry/);
    expect(page).toMatch(/useSetTrialWarningDaysMutation/);
    expect(page).toMatch(/setDraftWarningDays\(''\)/);
    expect(page).toMatch(/warningSaveError/);

    // Auth + subscription RPCs must share one Supabase client (dual clients desync sessions).
    const di = read('packages/api/src/di/create-repositories.ts');
    const clientCreates = di.match(/createSupabaseClient\(/g) ?? [];
    expect(clientCreates).toHaveLength(1);
    expect(di).toMatch(/new SupabaseAuthRepository\(client\)/);
    expect(di).toMatch(/new SupabaseSubscriptionRepository\(client\)/);
  });
});

describe('STORY_12_2 AC3 — billing and revenue summary visible on Subscriptions pillar', () => {
  it('test_STORY_12_2_AC3_billing_revenue_summary_on_subscriptions', () => {
    expect(formatRevenueCents(34800, 'usd')).toMatch(/\$348/);
    expect(formatRevenueCents(0, 'usd')).toMatch(/\$0/);

    const sql = read(MIGRATION_PATH);
    expect(sql).toMatch(/get_billing_revenue_summary/);
    expect(sql).toMatch(/paid_revenue_cents/);
    expect(sql).toMatch(/admin_required/);

    const billingPort = read(BILLING_PORT_PATH);
    expect(billingPort).toMatch(/getRevenueSummary\(\): Promise<BillingRevenueSummary>/);

    const supabaseBilling = read(SUPABASE_BILLING_PATH);
    expect(supabaseBilling).toMatch(/get_billing_revenue_summary/);
    expect(supabaseBilling).toMatch(/async getRevenueSummary/);

    const restBilling = read(REST_BILLING_PATH);
    expect(restBilling).toMatch(/getRevenueSummary/);
    expect(restBilling).toMatch(/NotImplementedAdapterError\('rest', 'getRevenueSummary'\)/);

    const queries = read(QUERIES_PATH);
    expect(queries).toMatch(/useRevenueSummaryQuery/);
    expect(queries).toMatch(/repos\.billing\.getRevenueSummary/);

    const page = read(SUBS_PAGE_PATH);
    expect(page).toMatch(/Billing & revenue/);
    expect(page).toMatch(/useRevenueSummaryQuery/);
    expect(page).toMatch(/formatRevenueCents/);
    expect(page).toMatch(/paidInvoiceCount/);
  });
});

describe('STORY_12_2 AC4 — admin can override individual user subscription tier', () => {
  it('test_STORY_12_2_AC4_admin_overrides_user_subscription_tier', () => {
    const sql = read(MIGRATION_PATH);
    expect(sql).toMatch(/override_user_subscription_tier/);
    expect(sql).toMatch(/admin_required/);

    const port = read(PORT_PATH);
    expect(port).toMatch(
      /overrideUserTier\(profileId: string, tier: SubscriptionTier\): Promise<Subscription>/,
    );

    const supabaseRepo = read(SUPABASE_SUB_PATH);
    expect(supabaseRepo).toMatch(/override_user_subscription_tier/);
    expect(supabaseRepo).toMatch(/async overrideUserTier/);

    const restRepo = read(REST_SUB_PATH);
    expect(restRepo).toMatch(/overrideUserTier/);
    expect(restRepo).toMatch(/NotImplementedAdapterError\('rest', 'overrideUserTier'\)/);

    const queries = read(QUERIES_PATH);
    expect(queries).toMatch(/useOverrideUserTierMutation/);
    expect(queries).toMatch(/repos\.subscriptions\.overrideUserTier/);

    const usersPage = read(USERS_PAGE_PATH);
    expect(usersPage).toMatch(/Override subscription tier/);
    expect(usersPage).toMatch(/useOverrideUserTierMutation/);
    expect(usersPage).toMatch(/TIER_OPTIONS/);
    expect(usersPage).toMatch(/overrideTier\.mutate/);
  });
});

describe('STORY_12_2 structure — no direct Supabase access from UI', () => {
  it('test_STORY_12_2_structure_subscriptions_page_has_no_direct_supabase', () => {
    const page = read(SUBS_PAGE_PATH);
    expect(page).not.toMatch(/@supabase\/supabase-js/);
    const usersPage = read(USERS_PAGE_PATH);
    expect(usersPage).not.toMatch(/@supabase\/supabase-js/);
  });
});
