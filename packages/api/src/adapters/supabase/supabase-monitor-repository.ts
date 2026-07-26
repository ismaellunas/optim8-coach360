import type { SupabaseClient } from '@supabase/supabase-js';
import {
  normalizeAiRecommendationConfigInput,
  parseAiRecommendationConfig,
  parseHealthSummary,
  parsePlatformAnalytics,
  type AiRecommendationConfig,
  type HealthSummary,
  type PlatformAnalytics,
} from '@coach360/domain';
import type { MonitorRepository } from '../../ports/monitor-repository.js';

export class SupabaseMonitorRepository implements MonitorRepository {
  constructor(private readonly client: SupabaseClient) {}

  async getPlatformAnalytics(days = 14): Promise<PlatformAnalytics> {
    const { data, error } = await this.client.rpc('admin_platform_analytics', {
      p_days: days,
    });
    if (error) {
      throw new Error(error.message);
    }
    return parsePlatformAnalytics(data);
  }

  async getAiRecommendationConfig(): Promise<AiRecommendationConfig> {
    const { data, error } = await this.client.rpc('get_ai_recommendation_config');
    if (error) {
      throw new Error(error.message);
    }
    return parseAiRecommendationConfig(data);
  }

  async setAiRecommendationConfig(
    config: AiRecommendationConfig,
  ): Promise<AiRecommendationConfig> {
    const { data, error } = await this.client.rpc('set_ai_recommendation_config', {
      p_config: normalizeAiRecommendationConfigInput(config),
    });
    if (error) {
      throw new Error(error.message);
    }
    return parseAiRecommendationConfig(data);
  }

  async getHealthSummary(hours = 24): Promise<HealthSummary> {
    const { data, error } = await this.client.rpc('admin_health_summary', {
      p_hours: hours,
    });
    if (error) {
      throw new Error(error.message);
    }
    return parseHealthSummary(data);
  }
}
