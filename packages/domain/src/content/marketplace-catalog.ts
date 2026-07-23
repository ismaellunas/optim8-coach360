/** Shared marketplace catalog shape (Sanity CDN → mobile store). */
export type MarketplaceCatalogPackage = {
  id: string;
  title: string;
  description: string | null;
  skills: string[];
  tag: string;
  ageMin: number | null;
  ageMax: number | null;
  objectives: string[];
  moduleCount: number;
  dripLabel: string;
  priceCents: number | null;
  /** ISO 4217 code (lowercase) matching the Stripe Price this package charges. */
  currency: string;
  priceLabel: string;
  rating: number | null;
};

export const PUBLISHED_PACKAGES_GROQ = `*[_type == "trainingPackage" && published == true]|order(title asc){
  _id,
  title,
  description,
  skills,
  ageRange,
  objectives,
  dripSchedule,
  stripePriceId,
  priceCents,
  currency,
  rating,
  "moduleCount": count(modules)
}`;

/** Default ISO 4217 code used when a package omits currency (back-compat with pre-currency seeds). */
export const DEFAULT_PACKAGE_CURRENCY = 'usd';

export function normalizePackageCurrency(currency: string | null | undefined): string {
  if (typeof currency !== 'string') return DEFAULT_PACKAGE_CURRENCY;
  const trimmed = currency.trim().toLowerCase();
  if (!/^[a-z]{3}$/.test(trimmed)) return DEFAULT_PACKAGE_CURRENCY;
  return trimmed;
}

export function primarySkillTag(skills: string[] | null | undefined): string {
  const first = skills?.find((s) => typeof s === 'string' && s.trim());
  return (first || 'training').toLowerCase();
}

export function dripLabelFromSchedule(
  dripSchedule: { intervalDays?: number | null; notes?: string | null } | null | undefined,
): string {
  const days = dripSchedule?.intervalDays;
  if (typeof days === 'number' && days > 0) {
    if (days % 7 === 0) {
      const weeks = days / 7;
      return weeks === 1 ? '1 week' : `${weeks} weeks`;
    }
    return days === 1 ? '1 day' : `${days} days`;
  }
  return dripSchedule?.notes?.trim() || 'Scheduled drip';
}

/**
 * Format catalog price from minor units in the given ISO 4217 currency; fall back
 * when only a Stripe price id exists. Uses a fixed `en-US` locale so tests and
 * server rendering stay deterministic across environments.
 */
export function formatPackagePriceLabel(
  priceCents: number | null | undefined,
  stripePriceId?: string | null,
  currency?: string | null,
): string {
  if (typeof priceCents === 'number' && priceCents >= 0) {
    if (priceCents === 0) return 'FREE';
    const iso = normalizePackageCurrency(currency);
    const amount = priceCents / 100;
    const digits = priceCents % 100 === 0 ? 0 : 2;
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: iso.toUpperCase(),
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      }).format(amount);
    } catch {
      return `${iso.toUpperCase()} ${amount.toFixed(digits)}`;
    }
  }
  return priceLabelFromStripeId(stripePriceId);
}

export function priceLabelFromStripeId(stripePriceId: string | null | undefined): string {
  if (!stripePriceId?.trim()) return 'See details';
  return 'Priced';
}

export function normalizePackageRating(rating: number | null | undefined): number | null {
  if (typeof rating !== 'number' || Number.isNaN(rating)) return null;
  if (rating < 0 || rating > 5) return null;
  return Math.round(rating * 10) / 10;
}

export type SanityPackageDoc = {
  _id?: string;
  title?: string;
  description?: string | null;
  skills?: string[] | null;
  ageRange?: { min?: number | null; max?: number | null } | null;
  objectives?: string[] | null;
  dripSchedule?: { intervalDays?: number | null; notes?: string | null } | null;
  stripePriceId?: string | null;
  priceCents?: number | null;
  currency?: string | null;
  rating?: number | null;
  moduleCount?: number | null;
};

export function mapSanityPackageToCatalog(doc: SanityPackageDoc): MarketplaceCatalogPackage | null {
  const id = doc._id?.trim();
  if (!id) return null;
  const skills = Array.isArray(doc.skills)
    ? doc.skills.filter((s): s is string => typeof s === 'string')
    : [];
  const priceCents = typeof doc.priceCents === 'number' ? doc.priceCents : null;
  const currency = normalizePackageCurrency(doc.currency);
  return {
    id,
    title: (doc.title || '').trim() || 'Untitled package',
    description: doc.description?.trim() || null,
    skills,
    tag: primarySkillTag(skills),
    ageMin: typeof doc.ageRange?.min === 'number' ? doc.ageRange.min : null,
    ageMax: typeof doc.ageRange?.max === 'number' ? doc.ageRange.max : null,
    objectives: Array.isArray(doc.objectives)
      ? doc.objectives.filter((o): o is string => typeof o === 'string')
      : [],
    moduleCount: typeof doc.moduleCount === 'number' ? doc.moduleCount : 0,
    dripLabel: dripLabelFromSchedule(doc.dripSchedule),
    priceCents,
    currency,
    priceLabel: formatPackagePriceLabel(priceCents, doc.stripePriceId, currency),
    rating: normalizePackageRating(doc.rating),
  };
}
