/**
 * STORY-12.4 — platform analytics payload for the admin Monitor pillar.
 */

export type DailyActiveUsersPoint = {
  date: string;
  dau: number;
};

export type OnboardingFunnelStage = {
  id: string;
  label: string;
  count: number;
  conversionRate: number;
};

export type ContentCompletionSummary = {
  sessionCompletions: number;
  dripCompletions: number;
  firstDrillCompletions: number;
};

export type PlatformAnalytics = {
  dauToday: number;
  dauSeries: DailyActiveUsersPoint[];
  paidRevenueCents: number;
  paidInvoiceCount: number;
  currency: string;
  contentCompletion: ContentCompletionSummary;
  onboardingFunnel: OnboardingFunnelStage[];
};

const FUNNEL_STAGE_DEFS = [
  { id: 'signed_up', label: 'Signed up', key: 'signed_up' },
  { id: 'profile_completed', label: 'Profile completed', key: 'profile_completed' },
  { id: 'onboarding_completed', label: 'Onboarding completed', key: 'onboarding_completed' },
  { id: 'first_drill', label: 'First drill completed', key: 'first_drill' },
] as const;

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return fallback;
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

/**
 * Build funnel stages with conversion rates relative to the prior stage
 * (first stage is always 100%). Counts are clamped so stages never widen.
 */
export function buildOnboardingFunnelStages(counts: {
  signedUp: number;
  profileCompleted: number;
  onboardingCompleted: number;
  firstDrill: number;
}): OnboardingFunnelStage[] {
  const raw = [
    Math.max(0, Math.trunc(counts.signedUp)),
    Math.max(0, Math.trunc(counts.profileCompleted)),
    Math.max(0, Math.trunc(counts.onboardingCompleted)),
    Math.max(0, Math.trunc(counts.firstDrill)),
  ];

  const clamped: number[] = [];
  for (let i = 0; i < raw.length; i += 1) {
    const current = raw[i] ?? 0;
    const prev = i === 0 ? current : (clamped[i - 1] ?? 0);
    clamped.push(Math.min(current, prev));
  }

  return FUNNEL_STAGE_DEFS.map((def, index) => {
    const count = clamped[index] ?? 0;
    const prev = index === 0 ? count : (clamped[index - 1] ?? 0);
    const conversionRate =
      index === 0 ? 1 : prev === 0 ? 0 : Math.round((count / prev) * 1000) / 1000;
    return {
      id: def.id,
      label: def.label,
      count,
      conversionRate,
    };
  });
}

/** Parse snake_case RPC payload into typed PlatformAnalytics with safe defaults. */
export function parsePlatformAnalytics(raw: unknown): PlatformAnalytics {
  const row = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;

  const seriesRaw = Array.isArray(row.dau_series) ? row.dau_series : [];
  const dauSeries: DailyActiveUsersPoint[] = seriesRaw
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    .map((item) => ({
      date: asString(item.date),
      dau: asNumber(item.dau),
    }))
    .filter((item) => item.date.length > 0);

  const completionRaw =
    row.content_completion && typeof row.content_completion === 'object'
      ? (row.content_completion as Record<string, unknown>)
      : {};

  const funnelRaw =
    row.onboarding_funnel && typeof row.onboarding_funnel === 'object'
      ? (row.onboarding_funnel as Record<string, unknown>)
      : {};

  return {
    dauToday: asNumber(row.dau_today),
    dauSeries,
    paidRevenueCents: asNumber(row.paid_revenue_cents),
    paidInvoiceCount: asNumber(row.paid_invoice_count),
    currency: asString(row.currency, 'usd') || 'usd',
    contentCompletion: {
      sessionCompletions: asNumber(completionRaw.session_completions),
      dripCompletions: asNumber(completionRaw.drip_completions),
      firstDrillCompletions: asNumber(completionRaw.first_drill_completions),
    },
    onboardingFunnel: buildOnboardingFunnelStages({
      signedUp: asNumber(funnelRaw.signed_up),
      profileCompleted: asNumber(funnelRaw.profile_completed),
      onboardingCompleted: asNumber(funnelRaw.onboarding_completed),
      firstDrill: asNumber(funnelRaw.first_drill),
    }),
  };
}
