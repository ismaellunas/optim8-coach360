import type { MarketplaceCatalogPackage } from '@coach360/domain';
import type { MarketplaceCatalogRepository } from '../../ports/marketplace-catalog-repository.js';

/** Offline / rest-mode fallback catalog (mirrors seed titles). */
const FALLBACK: MarketplaceCatalogPackage[] = [
  {
    id: 'seed.coach360.elite-shooting.package',
    title: 'Elite Shooting System',
    description: 'Progressive shooting program for form, catch-and-shoot, and free throws.',
    skills: ['shooting', 'form', 'free-throw'],
    tag: 'shooting',
    ageMin: 12,
    ageMax: 18,
    objectives: ['Improve shooting percentage', 'Build consistent free-throw routine'],
    moduleCount: 1,
    dripLabel: '1 week',
    priceCents: 2900,
    priceLabel: '$29',
    rating: 4.8,
  },
  {
    id: 'seed.coach360.lockdown-defense.package',
    title: 'Lockdown Defense',
    description: 'On-ball and help-side defensive habits for youth and high-school teams.',
    skills: ['defense', 'footwork', 'help-side'],
    tag: 'defense',
    ageMin: 13,
    ageMax: 17,
    objectives: ['Improve on-ball pressure', 'Reduce blow-by drives'],
    moduleCount: 1,
    dripLabel: '1 week',
    priceCents: 2500,
    priceLabel: '$25',
    rating: 4.6,
  },
  {
    id: 'seed.coach360.court-vision.package',
    title: 'Court Vision Mastery',
    description: 'Decision-making and conditioning drills that train heads-up playmaking.',
    skills: ['conditioning', 'vision', 'passing'],
    tag: 'conditioning',
    ageMin: 14,
    ageMax: 18,
    objectives: ['Improve decision speed', 'Reduce turnovers under pressure'],
    moduleCount: 1,
    dripLabel: '1 week',
    priceCents: 2700,
    priceLabel: '$27',
    rating: 4.7,
  },
];

export class RestMarketplaceCatalogRepository implements MarketplaceCatalogRepository {
  async listPublished(): Promise<MarketplaceCatalogPackage[]> {
    return FALLBACK.map((pkg) => ({ ...pkg, skills: [...pkg.skills] }));
  }
}
