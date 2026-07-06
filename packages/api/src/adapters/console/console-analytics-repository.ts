import type { AnalyticsRepository } from '../../ports/analytics-repository.js';

export class ConsoleAnalyticsRepository implements AnalyticsRepository {
  track(name: string, properties?: Record<string, unknown>): void {
    if (typeof console !== 'undefined' && typeof console.debug === 'function') {
      console.debug('[analytics]', name, properties ?? {});
    }
  }
}
