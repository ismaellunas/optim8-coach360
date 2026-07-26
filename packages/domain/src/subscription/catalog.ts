import { z } from 'zod';
import type { SubscriptionTier } from './schema.js';

export const paidSubscriptionTierSchema = z.enum(['basic', 'advanced', 'pro']);
export type PaidSubscriptionTier = z.infer<typeof paidSubscriptionTierSchema>;

export type StripeProductCatalogEntry = {
  tier: PaidSubscriptionTier;
  productName: string;
  /** Display price matching Flow 2 / mock UI. */
  unitAmountCents: number;
  currency: 'usd';
  interval: 'month';
  /** Env var name holding the Stripe Price ID after Dashboard seeding. */
  priceIdEnvKey: string;
  /** Stripe Price metadata.tier value used by the webhook. */
  priceMetadataTier: PaidSubscriptionTier;
  label: string;
  displayPrice: string;
  accent: 'green' | 'blue' | 'orange';
  features: string[];
};

/**
 * Code-defined Stripe Billing catalog for Basic / Advanced / Pro monthly.
 * Live Dashboard products are seeded from this contract; price IDs come from env.
 */
export const STRIPE_PRODUCT_CATALOG: readonly StripeProductCatalogEntry[] = [
  {
    tier: 'basic',
    productName: 'Coach360 Basic',
    unitAmountCents: 900,
    currency: 'usd',
    interval: 'month',
    priceIdEnvKey: 'STRIPE_PRICE_BASIC',
    priceMetadataTier: 'basic',
    label: 'Basic',
    displayPrice: '$9/mo',
    accent: 'green',
    features: ['Profile setup', 'Purchase content', 'Track progress'],
  },
  {
    tier: 'advanced',
    productName: 'Coach360 Advanced',
    unitAmountCents: 2900,
    currency: 'usd',
    interval: 'month',
    priceIdEnvKey: 'STRIPE_PRICE_ADVANCED',
    priceMetadataTier: 'advanced',
    label: 'Advanced',
    displayPrice: '$29/mo',
    accent: 'blue',
    features: ['All Basic +', 'Coach and chat', 'Distribute content', 'Plan and schedule'],
  },
  {
    tier: 'pro',
    productName: 'Coach360 Pro',
    unitAmountCents: 4900,
    currency: 'usd',
    interval: 'month',
    priceIdEnvKey: 'STRIPE_PRICE_PRO',
    priceMetadataTier: 'pro',
    label: 'Pro',
    displayPrice: '$49/mo',
    accent: 'orange',
    features: ['All Advanced +', 'AI personalization', 'Set objectives', 'Full MVP access'],
  },
] as const;

export function getStripeCatalogEntry(tier: PaidSubscriptionTier): StripeProductCatalogEntry {
  const entry = STRIPE_PRODUCT_CATALOG.find((item) => item.tier === tier);
  if (!entry) {
    throw new Error(`unknown_stripe_tier:${tier}`);
  }
  return entry;
}

export function resolveTierFromStripePriceMetadata(
  priceMetadataTier: string | undefined | null,
): PaidSubscriptionTier | null {
  const parsed = paidSubscriptionTierSchema.safeParse(priceMetadataTier);
  return parsed.success ? parsed.data : null;
}

export function isPaidSubscriptionTier(tier: SubscriptionTier): tier is PaidSubscriptionTier {
  return paidSubscriptionTierSchema.safeParse(tier).success;
}

/** platform_settings key for admin display overrides (STORY-12.2 AC-1). */
export const TIER_CATALOG_OVERRIDES_SETTING_KEY = 'tier_catalog_overrides';

export const tierCatalogDisplayOverrideSchema = z.object({
  tier: paidSubscriptionTierSchema,
  label: z.string().min(1).optional(),
  displayPrice: z.string().min(1).optional(),
  features: z.array(z.string().min(1)).optional(),
});

export type TierCatalogDisplayOverride = z.infer<typeof tierCatalogDisplayOverrideSchema>;

/**
 * Merge admin display overrides over the code catalog.
 * Stripe unit amounts / price ID env keys stay code-owned.
 */
export function mergeTierCatalogOverrides(
  overrides: readonly TierCatalogDisplayOverride[] = [],
): StripeProductCatalogEntry[] {
  const byTier = new Map(overrides.map((item) => [item.tier, item]));
  return STRIPE_PRODUCT_CATALOG.map((entry) => {
    const override = byTier.get(entry.tier);
    if (!override) {
      return { ...entry, features: [...entry.features] };
    }
    return {
      ...entry,
      label: override.label ?? entry.label,
      displayPrice: override.displayPrice ?? entry.displayPrice,
      features: override.features ? [...override.features] : [...entry.features],
    };
  });
}

export function parseTierCatalogOverrides(raw: unknown): TierCatalogDisplayOverride[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const parsed: TierCatalogDisplayOverride[] = [];
  for (const item of raw) {
    const result = tierCatalogDisplayOverrideSchema.safeParse(item);
    if (result.success) {
      parsed.push(result.data);
    }
  }
  return parsed;
}
