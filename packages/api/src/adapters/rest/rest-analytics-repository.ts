import { NotImplementedAdapterError } from '../../client/types.js';
import type { AnalyticsRepository } from '../../ports/analytics-repository.js';

export class RestAnalyticsRepository implements AnalyticsRepository {
  track(name: string, properties?: Record<string, unknown>): void {
    void name;
    void properties;
    throw new NotImplementedAdapterError('rest', 'trackAnalytics');
  }
}
