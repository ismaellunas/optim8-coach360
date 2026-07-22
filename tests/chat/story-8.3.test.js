// STORY-8.3 — Player-to-player knowledge sharing

import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  MVP_CHAT_MESSAGE_TYPES,
  achievementFromProgress,
  buildInsightAttachment,
  canSharePeerContentToChannel,
  canSharePeerKnowledge,
  canViewPeerEngagement,
  formatInsightShareMessage,
  isPeerShareMessageType,
  previewBodyForMessage,
  summarizePeerEngagement,
} from '@coach360/domain';
import { REPO_ROOT } from '../helpers/supabase-test-env.js';

const PEER_SQL_PATH = path.join(
  REPO_ROOT,
  'supabase',
  'migrations',
  '20260722140000_peer_knowledge_sharing.sql',
);
const PEER_SHARE_DOMAIN_PATH = path.join(
  REPO_ROOT,
  'packages',
  'domain',
  'src',
  'chat',
  'peer-share.ts',
);
const MESSAGE_DOMAIN_PATH = path.join(
  REPO_ROOT,
  'packages',
  'domain',
  'src',
  'chat',
  'message.ts',
);
const PAYWALL_PATH = path.join(
  REPO_ROOT,
  'packages',
  'domain',
  'src',
  'subscription',
  'paywall.ts',
);
const MESSAGING_PORT_PATH = path.join(
  REPO_ROOT,
  'packages',
  'api',
  'src',
  'ports',
  'messaging-repository.ts',
);
const MESSAGING_REPO_PATH = path.join(
  REPO_ROOT,
  'packages',
  'api',
  'src',
  'adapters',
  'supabase',
  'supabase-messaging-repository.ts',
);
const REST_MESSAGING_PATH = path.join(
  REPO_ROOT,
  'packages',
  'api',
  'src',
  'adapters',
  'rest',
  'rest-messaging-repository.ts',
);
const PROGRESS_PATH = path.join(
  REPO_ROOT,
  'apps',
  'mobile',
  'src',
  'features',
  'progress',
  'ui',
  'ProgressScreen.jsx',
);
const PEER_SHEET_PATH = path.join(
  REPO_ROOT,
  'apps',
  'mobile',
  'src',
  'features',
  'chat',
  'ui',
  'PeerShareSheet.jsx',
);
const BUBBLE_PATH = path.join(
  REPO_ROOT,
  'apps',
  'mobile',
  'src',
  'features',
  'chat',
  'ui',
  'ChatMessageBubble.jsx',
);
const COACH_PROGRESS_PATH = path.join(
  REPO_ROOT,
  'apps',
  'mobile',
  'src',
  'features',
  'progress',
  'ui',
  'CoachProgressReviewScreen.jsx',
);

describe('STORY_8_3 AC1 — Advanced+ share achievements to team chat', () => {
  it('test_STORY_8_3_AC1_advanced_plus_share_achievements_team_chat: gate + team achievement post', () => {
    expect(canSharePeerKnowledge('player', 'basic')).toBe(false);
    expect(canSharePeerKnowledge('player', 'advanced')).toBe(true);
    expect(canSharePeerKnowledge('player', 'pro')).toBe(true);
    expect(canSharePeerKnowledge('player', 'trial')).toBe(true);

    expect(MVP_CHAT_MESSAGE_TYPES).toContain('achievement');
    expect(isPeerShareMessageType('achievement')).toBe(true);

    const achievement = achievementFromProgress({
      drillsCompleted: 3,
      itemsCompleted: 3,
      totalReps: 30,
      totalDurationMinutes: 15,
    });
    expect(achievement.shareType).toBe('achievement');
    expect(achievement.title).toMatch(/3 drill/);
    expect(previewBodyForMessage('achievement', '', achievement)).toBe(achievement.title);

    expect(existsSync(PEER_SQL_PATH)).toBe(true);
    const sql = readFileSync(PEER_SQL_PATH, 'utf8');
    expect(sql).toMatch(/achievement/);
    expect(sql).toMatch(/shareType/);

    const progress = readFileSync(PROGRESS_PATH, 'utf8');
    expect(progress).toMatch(/progress-share-achievement/);
    expect(progress).toMatch(/peerShare/);
    expect(progress).toMatch(/PeerShareSheet/);

    const sheet = readFileSync(PEER_SHEET_PATH, 'utf8');
    expect(sheet).toMatch(/messageType: 'achievement'/);
    expect(sheet).toMatch(/canSharePeerContentToChannel/);

    const repo = readFileSync(MESSAGING_REPO_PATH, 'utf8');
    expect(repo).toMatch(/messageType === 'achievement'/);
    expect(repo).toMatch(/peer_share_team_channel_only/);
  });
});

describe('STORY_8_3 AC2 — insight/tips formatted team channel message', () => {
  it('test_STORY_8_3_AC2_share_insight_tips_formatted_team_channel: formatter + insight card', () => {
    expect(MVP_CHAT_MESSAGE_TYPES).toContain('insight');
    const formatted = formatInsightShareMessage('Form tip', 'Keep elbow in on freethrows');
    expect(formatted).toBe('Form tip: Keep elbow in on freethrows');
    expect(formatInsightShareMessage('', 'x')).toBe('');

    const attachment = buildInsightAttachment({
      title: 'Form tip',
      tip: 'Keep elbow in on freethrows',
    });
    expect(attachment.shareType).toBe('insight');
    expect(previewBodyForMessage('insight', '', attachment)).toBe('Form tip');

    const sql = readFileSync(PEER_SQL_PATH, 'utf8');
    expect(sql).toMatch(/insight/);
    expect(sql).toMatch(/attachment \? 'tip'/);

    const sheet = readFileSync(PEER_SHEET_PATH, 'utf8');
    expect(sheet).toMatch(/messageType: 'insight'/);
    expect(sheet).toMatch(/formatInsightShareMessage/);
    expect(sheet).toMatch(/peer-share-insight-form/);

    const bubble = readFileSync(BUBBLE_PATH, 'utf8');
    expect(bubble).toMatch(/data-testid="chat-insight-card"/);
    expect(bubble).toMatch(/data-testid="chat-achievement-card"/);

    const progress = readFileSync(PROGRESS_PATH, 'utf8');
    expect(progress).toMatch(/progress-share-insight/);
  });
});

describe('STORY_8_3 AC3 — coach peer engagement metrics at Pro', () => {
  it('test_STORY_8_3_AC3_coach_peer_engagement_metrics_pro: Pro gate + summary UI', () => {
    expect(canViewPeerEngagement('coach', 'advanced')).toBe(false);
    expect(canViewPeerEngagement('coach', 'pro')).toBe(true);
    expect(canViewPeerEngagement('coach', 'trial')).toBe(true);
    expect(canViewPeerEngagement('player', 'pro')).toBe(false);

    const summary = summarizePeerEngagement([
      {
        senderId: 'p1',
        messageType: 'achievement',
        body: 'Completed 2 drills',
        createdAt: '2026-07-21T10:00:00Z',
        attachment: {
          shareType: 'achievement',
          title: 'Completed 2 drills',
          metricLabel: 'Drills completed',
          metricValue: '2',
        },
      },
      {
        senderId: 'p2',
        messageType: 'insight',
        body: 'Tip: box out',
        createdAt: '2026-07-22T10:00:00Z',
        attachment: { shareType: 'insight', title: 'Rebounding', tip: 'box out' },
      },
      {
        senderId: 'p1',
        messageType: 'text',
        body: 'hello',
        createdAt: '2026-07-22T11:00:00Z',
      },
    ]);
    expect(summary.totalShares).toBe(2);
    expect(summary.achievementShares).toBe(1);
    expect(summary.insightShares).toBe(1);
    expect(summary.uniqueSharers).toBe(2);
    expect(summary.recentTitles[0]).toBe('Rebounding');

    const paywall = readFileSync(PAYWALL_PATH, 'utf8');
    expect(paywall).toMatch(/peerEngagement:\s*\{\s*coach:\s*'pro'/);

    const coachUi = readFileSync(COACH_PROGRESS_PATH, 'utf8');
    expect(coachUi).toMatch(/canViewPeerEngagement/);
    expect(coachUi).toMatch(/data-testid="coach-peer-engagement"/);
    expect(coachUi).toMatch(/listTeamPeerShares/);
    expect(coachUi).toMatch(/coach-peer-engagement-locked/);

    const port = readFileSync(MESSAGING_PORT_PATH, 'utf8');
    expect(port).toMatch(/listTeamPeerShares/);
    expect(readFileSync(REST_MESSAGING_PATH, 'utf8')).toMatch(/listTeamPeerShares/);
  });
});

describe('STORY_8_3 AC4 — sharing scope team-only (OQ-18.2)', () => {
  it('test_STORY_8_3_AC4_sharing_scope_team_only_oq_18_2: team allowed; dm/p2p blocked', () => {
    expect(canSharePeerContentToChannel('team')).toBe(true);
    expect(canSharePeerContentToChannel('dm')).toBe(false);
    expect(canSharePeerContentToChannel('p2p')).toBe(false);

    const domain = readFileSync(PEER_SHARE_DOMAIN_PATH, 'utf8');
    expect(domain).toMatch(/OQ-18\.2/);
    expect(domain).toMatch(/team-scoped only|team only/i);

    const repo = readFileSync(MESSAGING_REPO_PATH, 'utf8');
    expect(repo).toMatch(/canSharePeerContentToChannel/);
    expect(repo).toMatch(/peer_share_team_channel_only/);

    const sheet = readFileSync(PEER_SHEET_PATH, 'utf8');
    expect(sheet).toMatch(/canSharePeerContentToChannel/);
    expect(sheet).toMatch(/peer-share-team-select/);

    expect(existsSync(MESSAGE_DOMAIN_PATH)).toBe(true);
  });
});
