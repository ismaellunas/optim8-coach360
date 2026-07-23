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
  rating,
  "moduleCount": count(modules)
}`;

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

/** Format catalog price from cents; fall back when only a Stripe price id exists. */
export function formatPackagePriceLabel(
  priceCents: number | null | undefined,
  stripePriceId?: string | null,
): string {
  if (typeof priceCents === 'number' && priceCents >= 0) {
    if (priceCents === 0) return 'FREE';
    return `$${(priceCents / 100).toFixed(priceCents % 100 === 0 ? 0 : 2)}`;
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
    priceLabel: formatPackagePriceLabel(priceCents, doc.stripePriceId),
    rating: normalizePackageRating(doc.rating),
  };
}
