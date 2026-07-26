import type {
  AiRecommendationConfig,
  HealthSummary,
  PlatformAnalytics,
} from '@coach360/domain';

export type MonitorRepository = {
  getPlatformAnalytics(days?: number): Promise<PlatformAnalytics>;
  getAiRecommendationConfig(): Promise<AiRecommendationConfig>;
  setAiRecommendationConfig(
    config: AiRecommendationConfig,
  ): Promise<AiRecommendationConfig>;
  getHealthSummary(hours?: number): Promise<HealthSummary>;
};
