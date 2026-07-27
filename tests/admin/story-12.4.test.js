// STORY-12.4 — Monitor: analytics, chat moderation, AI config, health, CSV export.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_AI_RECOMMENDATION_CONFIG,
  LLM_CANDIDATE_POOL,
  LLM_TOP_K,
  RAG_TOP_K_DEFAULT,
  RAG_TOP_K_MAX,
  RAG_TOP_K_MIN,
  buildOnboardingFunnelStages,
  buildRevenueCsv,
  buildUsageCsv,
  escapeCsvCell,
  healthStatusFor,
  moderatedMessageBody,
  normalizeModerationReason,
  parseAiRecommendationConfig,
  parseHealthSummary,
  parsePlatformAnalytics,
  toCsv,
} from '@coach360/domain';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');

function read(relPath) {
  return readFileSync(path.join(REPO_ROOT, relPath), 'utf8');
}

const MIGRATION_PATH = 'supabase/migrations/20260727180000_admin_monitor_analytics.sql';
const MONITOR_PORT_PATH = 'packages/api/src/ports/monitor-repository.ts';
const MESSAGING_PORT_PATH = 'packages/api/src/ports/messaging-repository.ts';
const SUPA_MONITOR_PATH = 'packages/api/src/adapters/supabase/supabase-monitor-repository.ts';
const REST_MONITOR_PATH = 'packages/api/src/adapters/rest/rest-monitor-repository.ts';
const SUPA_MESSAGING_PATH =
  'packages/api/src/adapters/supabase/supabase-messaging-repository.ts';
const REST_MESSAGING_PATH = 'packages/api/src/adapters/rest/rest-messaging-repository.ts';
const DI_PATH = 'packages/api/src/di/create-repositories.ts';
const QUERIES_PATH = 'apps/admin/src/entities/monitor/api/monitor-queries.ts';
const MONITOR_PAGE_PATH = 'apps/admin/src/pages/monitor/MonitorPage.tsx';
const CHAT_SECTION_PATH = 'apps/admin/src/pages/monitor/ChatModerationSection.tsx';
const AI_SECTION_PATH = 'apps/admin/src/pages/monitor/AiConfigSection.tsx';
const HEALTH_SECTION_PATH = 'apps/admin/src/pages/monitor/HealthSection.tsx';
const RECOMMEND_INDEX_PATH = 'supabase/functions/recommend-packages/index.ts';
const RECOMMEND_HANDLER_PATH = 'supabase/functions/recommend-packages/handler.ts';
const SANITY_WEBHOOK_PATH = 'supabase/functions/sanity-webhook/index.ts';
const STRIPE_WEBHOOK_PATH = 'supabase/functions/stripe-webhook/index.ts';

describe('STORY_12_4 AC1 — dashboard shows DAU, revenue, content completion, onboarding funnel', () => {
  it('test_STORY_12_4_AC1_dashboard_shows_dau_revenue_completion_and_funnel', () => {
    const stages = buildOnboardingFunnelStages({
      signedUp: 100,
      profileCompleted: 80,
      onboardingCompleted: 50,
      firstDrill: 20,
    });
    expect(stages).toHaveLength(4);
    expect(stages[0].count).toBe(100);
    expect(stages[0].conversionRate).toBe(1);
    expect(stages[1].count).toBe(80);
    expect(stages[1].conversionRate).toBe(0.8);
    expect(stages[2].count).toBe(50);
    expect(stages[3].count).toBe(20);
    // Stages never widen when raw counts are inverted.
    const clamped = buildOnboardingFunnelStages({
      signedUp: 10,
      profileCompleted: 50,
      onboardingCompleted: 40,
      firstDrill: 100,
    });
    expect(clamped.map((s) => s.count)).toEqual([10, 10, 10, 10]);

    const parsed = parsePlatformAnalytics({
      dau_today: 42,
      dau_series: [{ date: '2026-07-26', dau: 40 }],
      paid_revenue_cents: 9900,
      paid_invoice_count: 3,
      currency: 'usd',
      content_completion: {
        session_completions: 12,
        drip_completions: 4,
        first_drill_completions: 7,
      },
      onboarding_funnel: {
        signed_up: 100,
        profile_completed: 80,
        onboarding_completed: 50,
        first_drill: 20,
      },
    });
    expect(parsed.dauToday).toBe(42);
    expect(parsed.paidRevenueCents).toBe(9900);
    expect(parsed.contentCompletion.sessionCompletions).toBe(12);
    expect(parsed.onboardingFunnel[0].label).toBe('Signed up');

    const sql = read(MIGRATION_PATH);
    expect(sql).toMatch(/admin_platform_analytics/);
    expect(sql).toMatch(/admin_required/);
    expect(sql).toMatch(/chat_messages/);
    expect(sql).toMatch(/session_content_completions/);
    expect(sql).toMatch(/drip_progress/);
    expect(sql).toMatch(/billing_invoices/);
    expect(sql).toMatch(/onboarding_funnel/);
    expect(sql).toMatch(/dau_today/);

    const port = read(MONITOR_PORT_PATH);
    expect(port).toMatch(/getPlatformAnalytics\(days\?: number\): Promise<PlatformAnalytics>/);

    const supa = read(SUPA_MONITOR_PATH);
    expect(supa).toMatch(/admin_platform_analytics/);

    const rest = read(REST_MONITOR_PATH);
    expect(rest).toMatch(/NotImplementedAdapterError\('rest', 'getPlatformAnalytics'\)/);

    const di = read(DI_PATH);
    expect(di).toMatch(/monitor:/);

    const queries = read(QUERIES_PATH);
    expect(queries).toMatch(/usePlatformAnalyticsQuery/);
    expect(queries).toMatch(/repos\.monitor\.getPlatformAnalytics/);

    const page = read(MONITOR_PAGE_PATH);
    expect(page).toMatch(/DAU/);
    expect(page).toMatch(/Revenue/);
    expect(page).toMatch(/Content completion/);
    expect(page).toMatch(/Onboarding funnel/);
    expect(page).toMatch(/usePlatformAnalyticsQuery/);
  });
});

describe('STORY_12_4 AC2 — admin monitors and moderates chat channels', () => {
  it('test_STORY_12_4_AC2_admin_monitors_and_moderates_chat_channels', () => {
    expect(normalizeModerationReason('  spam  ')).toBe('spam');
    expect(normalizeModerationReason('')).toBe(null);
    expect(normalizeModerationReason('   ')).toBe(null);
    expect(normalizeModerationReason('x'.repeat(600))?.length).toBe(500);
    expect(moderatedMessageBody('hello', null)).toBe('hello');
    expect(moderatedMessageBody('hello', '2026-07-27T00:00:00Z')).toBe(
      '[Message removed by moderator]',
    );

    const sql = read(MIGRATION_PATH);
    expect(sql).toMatch(/hidden_at/);
    expect(sql).toMatch(/admin_list_chat_channels/);
    expect(sql).toMatch(/admin_list_chat_messages/);
    expect(sql).toMatch(/admin_set_chat_message_hidden/);
    expect(sql).toMatch(/admin_required/);

    const port = read(MESSAGING_PORT_PATH);
    expect(port).toMatch(/adminListChannels\(\): Promise<AdminChatChannel\[\]>/);
    expect(port).toMatch(/adminListChannelMessages\(channelId: string\): Promise<AdminChatMessage\[\]>/);
    expect(port).toMatch(/adminSetMessageHidden/);

    const supa = read(SUPA_MESSAGING_PATH);
    expect(supa).toMatch(/admin_list_chat_channels/);
    expect(supa).toMatch(/admin_list_chat_messages/);
    expect(supa).toMatch(/admin_set_chat_message_hidden/);
    expect(supa).toMatch(/\.is\('hidden_at', null\)/);

    const rest = read(REST_MESSAGING_PATH);
    expect(rest).toMatch(/NotImplementedAdapterError\('rest', 'adminListChannels'\)/);
    expect(rest).toMatch(/NotImplementedAdapterError\('rest', 'adminListChannelMessages'\)/);
    expect(rest).toMatch(/NotImplementedAdapterError\('rest', 'adminSetMessageHidden'\)/);

    const queries = read(QUERIES_PATH);
    expect(queries).toMatch(/useAdminChatChannelsQuery/);
    expect(queries).toMatch(/useAdminSetMessageHiddenMutation/);
    expect(queries).toMatch(/repos\.messaging\.adminListChannels/);
    expect(queries).toMatch(/repos\.messaging\.adminSetMessageHidden/);

    const section = read(CHAT_SECTION_PATH);
    expect(section).toMatch(/Chat moderation/);
    expect(section).toMatch(/Hide/);
    expect(section).toMatch(/Restore/);
    expect(section).toMatch(/useAdminChatChannelsQuery/);
  });
});

describe('STORY_12_4 AC3 — admin configures AI recommendation parameters', () => {
  it('test_STORY_12_4_AC3_admin_configures_ai_recommendation_parameters', () => {
    expect(parseAiRecommendationConfig(null)).toEqual(DEFAULT_AI_RECOMMENDATION_CONFIG);
    expect(parseAiRecommendationConfig('nonsense')).toEqual(DEFAULT_AI_RECOMMENDATION_CONFIG);

    const parsed = parseAiRecommendationConfig({
      llm_top_k: 2,
      candidate_pool: 10,
      rag_top_k: 9,
      llm_rerank_enabled: false,
    });
    expect(parsed.llmTopK).toBe(2);
    expect(parsed.candidatePool).toBe(10);
    expect(parsed.ragTopK).toBe(9);
    expect(parsed.llmRerankEnabled).toBe(false);

    // ragTopK clamped to [MIN, MAX]
    expect(parseAiRecommendationConfig({ rag_top_k: 1 }).ragTopK).toBe(RAG_TOP_K_MIN);
    expect(parseAiRecommendationConfig({ rag_top_k: 99 }).ragTopK).toBe(RAG_TOP_K_MAX);
    // candidatePool raised to at least llmTopK
    expect(parseAiRecommendationConfig({ llm_top_k: 5, candidate_pool: 2 }).candidatePool).toBe(5);

    expect(DEFAULT_AI_RECOMMENDATION_CONFIG.llmTopK).toBe(LLM_TOP_K);
    expect(DEFAULT_AI_RECOMMENDATION_CONFIG.candidatePool).toBe(LLM_CANDIDATE_POOL);
    expect(DEFAULT_AI_RECOMMENDATION_CONFIG.ragTopK).toBe(RAG_TOP_K_DEFAULT);

    const sql = read(MIGRATION_PATH);
    expect(sql).toMatch(/ai_recommendation_config/);
    expect(sql).toMatch(/get_ai_recommendation_config/);
    expect(sql).toMatch(/set_ai_recommendation_config/);
    expect(sql).toMatch(/admin_required/);

    const port = read(MONITOR_PORT_PATH);
    expect(port).toMatch(/getAiRecommendationConfig\(\): Promise<AiRecommendationConfig>/);
    expect(port).toMatch(/setAiRecommendationConfig\(/);
    expect(port).toMatch(/config: AiRecommendationConfig/);

    const supa = read(SUPA_MONITOR_PATH);
    expect(supa).toMatch(/get_ai_recommendation_config/);
    expect(supa).toMatch(/set_ai_recommendation_config/);

    const rest = read(REST_MONITOR_PATH);
    expect(rest).toMatch(/NotImplementedAdapterError\('rest', 'getAiRecommendationConfig'\)/);
    expect(rest).toMatch(/NotImplementedAdapterError\('rest', 'setAiRecommendationConfig'\)/);

    const queries = read(QUERIES_PATH);
    expect(queries).toMatch(/useAiRecommendationConfigQuery/);
    expect(queries).toMatch(/useSetAiRecommendationConfigMutation/);
    expect(queries).toMatch(/repos\.monitor\.setAiRecommendationConfig/);

    const section = read(AI_SECTION_PATH);
    expect(section).toMatch(/AI recommendation parameters/);
    expect(section).toMatch(/Save AI config/);
    expect(section).toMatch(/useSetAiRecommendationConfigMutation/);

    const recommendIndex = read(RECOMMEND_INDEX_PATH);
    expect(recommendIndex).toMatch(/get_ai_recommendation_config/);
    expect(recommendIndex).toMatch(/parseAiRecommendationConfig/);
    expect(recommendIndex).toMatch(/aiConfig\.ragTopK/);
    expect(recommendIndex).toMatch(/aiConfig\.llmRerankEnabled/);

    const recommendHandler = read(RECOMMEND_HANDLER_PATH);
    expect(recommendHandler).toMatch(/parseAiRecommendationConfig/);
    expect(recommendHandler).toMatch(/DEFAULT_AI_RECOMMENDATION_CONFIG/);
  });
});

describe('STORY_12_4 AC4 — export reports to CSV for revenue and usage', () => {
  it('test_STORY_12_4_AC4_export_revenue_and_usage_reports_to_csv', () => {
    expect(escapeCsvCell('plain')).toBe('plain');
    expect(escapeCsvCell('a,b')).toBe('"a,b"');
    expect(escapeCsvCell('say "hi"')).toBe('"say ""hi"""');
    expect(escapeCsvCell('line\nbreak')).toBe('"line\nbreak"');

    const csv = toCsv(
      [
        { key: 'a', header: 'A' },
        { key: 'b', header: 'B' },
      ],
      [{ a: '1', b: 'two,parts' }],
    );
    expect(csv).toBe('A,B\r\n1,"two,parts"');

    const analytics = parsePlatformAnalytics({
      dau_today: 5,
      dau_series: [
        { date: '2026-07-25', dau: 4 },
        { date: '2026-07-26', dau: 5 },
      ],
      paid_revenue_cents: 1500,
      paid_invoice_count: 2,
      currency: 'usd',
      content_completion: {
        session_completions: 9,
        drip_completions: 1,
        first_drill_completions: 3,
      },
      onboarding_funnel: {
        signed_up: 10,
        profile_completed: 8,
        onboarding_completed: 5,
        first_drill: 3,
      },
    });

    const revenue = buildRevenueCsv(analytics);
    expect(revenue).toMatch(/paid_revenue_cents/);
    expect(revenue).toMatch(/1500/);
    expect(revenue).toMatch(/paid_invoice_count/);

    const usage = buildUsageCsv(analytics);
    expect(usage).toMatch(/date,dau,session_completions/);
    expect(usage).toMatch(/2026-07-25,4,/);
    expect(usage).toMatch(/2026-07-26,5,/);

    const page = read(MONITOR_PAGE_PATH);
    expect(page).toMatch(/Export revenue CSV/);
    expect(page).toMatch(/Export usage CSV/);
    expect(page).toMatch(/buildRevenueCsv/);
    expect(page).toMatch(/buildUsageCsv/);
    expect(page).toMatch(/downloadCsv/);
  });
});

describe('STORY_12_4 AC5 — app health indicators surfaced', () => {
  it('test_STORY_12_4_AC5_app_health_indicators_surfaced', () => {
    expect(
      healthStatusFor({ apiErrorCount: 0, webhookFailureCount: 0, ragJobFailureCount: 0 }),
    ).toBe('healthy');
    expect(
      healthStatusFor({ apiErrorCount: 2, webhookFailureCount: 1, ragJobFailureCount: 0 }),
    ).toBe('degraded');
    expect(
      healthStatusFor({ apiErrorCount: 0, webhookFailureCount: 5, ragJobFailureCount: 0 }),
    ).toBe('critical');
    expect(
      healthStatusFor({ apiErrorCount: 20, webhookFailureCount: 0, ragJobFailureCount: 0 }),
    ).toBe('critical');

    const summary = parseHealthSummary({
      window_hours: 24,
      api_error_count: 1,
      webhook_failure_count: 2,
      rag_job_failure_count: 0,
      recent_events: [
        {
          id: 'e1',
          kind: 'webhook_failure',
          source: 'stripe-webhook',
          message: 'boom',
          created_at: '2026-07-27T00:00:00Z',
        },
      ],
    });
    expect(summary.status).toBe('degraded');
    expect(summary.webhookFailureCount).toBe(2);
    expect(summary.recentEvents[0].source).toBe('stripe-webhook');

    const sql = read(MIGRATION_PATH);
    expect(sql).toMatch(/system_health_events/);
    expect(sql).toMatch(/record_system_health_event/);
    expect(sql).toMatch(/admin_health_summary/);
    expect(sql).toMatch(/api_error/);
    expect(sql).toMatch(/webhook_failure/);
    expect(sql).toMatch(/rag_embedding_jobs/);
    expect(sql).toMatch(/admin_required/);

    const port = read(MONITOR_PORT_PATH);
    expect(port).toMatch(/getHealthSummary\(hours\?: number\): Promise<HealthSummary>/);

    const supa = read(SUPA_MONITOR_PATH);
    expect(supa).toMatch(/admin_health_summary/);

    const rest = read(REST_MONITOR_PATH);
    expect(rest).toMatch(/NotImplementedAdapterError\('rest', 'getHealthSummary'\)/);

    const queries = read(QUERIES_PATH);
    expect(queries).toMatch(/useHealthSummaryQuery/);
    expect(queries).toMatch(/repos\.monitor\.getHealthSummary/);

    const section = read(HEALTH_SECTION_PATH);
    expect(section).toMatch(/App health/);
    expect(section).toMatch(/API errors/);
    expect(section).toMatch(/Webhook failures/);
    expect(section).toMatch(/useHealthSummaryQuery/);

    const sanityWebhook = read(SANITY_WEBHOOK_PATH);
    expect(sanityWebhook).toMatch(/record_system_health_event/);
    expect(sanityWebhook).toMatch(/webhook_failure/);

    const stripeWebhook = read(STRIPE_WEBHOOK_PATH);
    expect(stripeWebhook).toMatch(/record_system_health_event/);
    expect(stripeWebhook).toMatch(/webhook_failure/);
  });
});

describe('STORY_12_4 structure — no direct Supabase access from UI', () => {
  it('test_STORY_12_4_structure_monitor_sections_have_no_direct_supabase', () => {
    expect(read(MONITOR_PAGE_PATH)).not.toMatch(/@supabase\/supabase-js/);
    expect(read(CHAT_SECTION_PATH)).not.toMatch(/@supabase\/supabase-js/);
    expect(read(AI_SECTION_PATH)).not.toMatch(/@supabase\/supabase-js/);
    expect(read(HEALTH_SECTION_PATH)).not.toMatch(/@supabase\/supabase-js/);
  });
});
