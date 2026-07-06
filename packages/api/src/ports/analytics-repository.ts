export type AnalyticsRepository = {
  track(name: string, properties?: Record<string, unknown>): void;
};
