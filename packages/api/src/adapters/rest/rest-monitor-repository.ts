import type { AiRecommendationConfig, HealthSummary, PlatformAnalytics } from '@coach360/domain';
import { NotImplementedAdapterError } from '../../client/types.js';
import type { MonitorRepository } from '../../ports/monitor-repository.js';

export class RestMonitorRepository implements MonitorRepository {
  async getPlatformAnalytics(days?: number): Promise<PlatformAnalytics> {
    void days;
    throw new NotImplementedAdapterError('rest', 'getPlatformAnalytics');
  }

  async getAiRecommendationConfig(): Promise<AiRecommendationConfig> {
    throw new NotImplementedAdapterError('rest', 'getAiRecommendationConfig');
  }

  async setAiRecommendationConfig(
    config: AiRecommendationConfig,
  ): Promise<AiRecommendationConfig> {
    void config;
    throw new NotImplementedAdapterError('rest', 'setAiRecommendationConfig');
  }

  async getHealthSummary(hours?: number): Promise<HealthSummary> {
    void hours;
    throw new NotImplementedAdapterError('rest', 'getHealthSummary');
  }
}
