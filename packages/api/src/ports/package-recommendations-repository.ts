import type { PackageRecommendation, RecommendationContext } from '@coach360/domain';

export type ListPackageRecommendationsInput = {
  objectives?: string[];
  age?: RecommendationContext['age'];
  /** Client hint only — server overrides from subscription. */
  tier?: RecommendationContext['tier'];
  purchaseHistory?: string[];
  progress?: RecommendationContext['progress'];
};

export type ListPackageRecommendationsResult = {
  recommendations: PackageRecommendation[];
  context: {
    objectives: string[];
    age: RecommendationContext['age'] | null;
    tier: RecommendationContext['tier'];
    purchaseHistory: string[];
  };
};

export type PackageRecommendationsRepository = {
  listRecommendations(
    input?: ListPackageRecommendationsInput,
  ): Promise<ListPackageRecommendationsResult>;
};
