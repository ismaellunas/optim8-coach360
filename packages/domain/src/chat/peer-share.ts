import type { ChatChannelType } from './channel.js';
import type { AppRole } from '../user/schema.js';
import type { SubscriptionTier } from '../subscription/schema.js';
import type { PaywallRole } from '../subscription/paywall.js';
import { resolveLaunchFeatureAccess } from '../rbac/launch-matrix.js';
import type { PlayerProgressSummary } from '../session/progress.js';
import { z } from 'zod';

/**
 * STORY-8.3 / Flow 18 — player-to-player knowledge sharing.
 *
 * Interim stakeholder defaults (unanswered OQs):
 * - OQ-18.1: achievements + tips only (not videos/drills via this flow)
 * - OQ-18.2: team-scoped only (no DM/p2p peer shares)
 * - OQ-18.3: coaches see aggregated engagement metrics at Pro (○ at Advanced)
 */

export const PEER_SHARE_MESSAGE_TYPES = ['achievement', 'insight'] as const;

export type PeerShareMessageType = (typeof PEER_SHARE_MESSAGE_TYPES)[number];

export const chatAchievementAttachmentSchema = z.object({
  shareType: z.literal('achievement'),
  title: z.string().trim().min(1),
  metricLabel: z.string().trim().min(1).optional(),
  metricValue: z.string().trim().min(1).optional(),
});

export type ChatAchievementAttachment = z.infer<typeof chatAchievementAttachmentSchema>;

export const chatInsightAttachmentSchema = z.object({
  shareType: z.literal('insight'),
  title: z.string().trim().min(1),
  tip: z.string().trim().min(1),
});

export type ChatInsightAttachment = z.infer<typeof chatInsightAttachmentSchema>;

export type ChatPeerShareAttachment = ChatAchievementAttachment | ChatInsightAttachment;

type GatedRole = AppRole | PaywallRole;

/** AC-1 — player Advanced+ (peerShare gate). */
export function canSharePeerKnowledge(role: GatedRole, tier: SubscriptionTier): boolean {
  return resolveLaunchFeatureAccess({ role, tier, feature: 'peerShare' }).allowed;
}

/**
 * AC-4 / OQ-18.2 interim — peer knowledge shares post to team channels only.
 * DM and p2p remain for normal chat (STORY-8.1/8.2), not Flow 18 shares.
 */
export function canSharePeerContentToChannel(channelType: ChatChannelType): boolean {
  return channelType === 'team';
}

/** AC-3 / OQ-18.3 interim — aggregated peer engagement at Pro for coaches. */
export function canViewPeerEngagement(role: GatedRole, tier: SubscriptionTier): boolean {
  return resolveLaunchFeatureAccess({ role, tier, feature: 'peerEngagement' }).allowed;
}

export function isPeerShareMessageType(value: string): value is PeerShareMessageType {
  return (PEER_SHARE_MESSAGE_TYPES as readonly string[]).includes(value);
}

export function buildAchievementAttachment(input: {
  title: string;
  metricLabel?: string;
  metricValue?: string;
}): ChatAchievementAttachment {
  const payload: {
    shareType: 'achievement';
    title: string;
    metricLabel?: string;
    metricValue?: string;
  } = {
    shareType: 'achievement',
    title: input.title,
  };
  if (input.metricLabel !== undefined) {
    payload.metricLabel = input.metricLabel;
  }
  if (input.metricValue !== undefined) {
    payload.metricValue = input.metricValue;
  }
  return chatAchievementAttachmentSchema.parse(payload);
}

export function buildInsightAttachment(input: {
  title: string;
  tip: string;
}): ChatInsightAttachment {
  return chatInsightAttachmentSchema.parse({
    shareType: 'insight',
    title: input.title,
    tip: input.tip,
  });
}

/** Derive a shareable achievement from progress milestones (no separate badges table). */
export function achievementFromProgress(
  summary: PlayerProgressSummary,
): ChatAchievementAttachment {
  const drills = summary.drillsCompleted;
  const title =
    drills > 0
      ? `Completed ${drills} drill${drills === 1 ? '' : 's'}`
      : 'Logged training progress';
  return buildAchievementAttachment({
    title,
    metricLabel: 'Drills completed',
    metricValue: String(drills),
  });
}

/** AC-2 — format insight/tip body preview for team channel. */
export function formatInsightShareMessage(title: string, tip: string): string {
  const cleanTitle = title.trim();
  const cleanTip = tip.trim();
  if (!cleanTitle || !cleanTip) {
    return '';
  }
  return `${cleanTitle}: ${cleanTip}`;
}

export function isAchievementAttachment(
  attachment: unknown,
): attachment is ChatAchievementAttachment {
  return Boolean(
    attachment
    && typeof attachment === 'object'
    && (attachment as { shareType?: string }).shareType === 'achievement'
    && typeof (attachment as { title?: unknown }).title === 'string',
  );
}

export function isInsightAttachment(attachment: unknown): attachment is ChatInsightAttachment {
  return Boolean(
    attachment
    && typeof attachment === 'object'
    && (attachment as { shareType?: string }).shareType === 'insight'
    && typeof (attachment as { title?: unknown }).title === 'string'
    && typeof (attachment as { tip?: unknown }).tip === 'string',
  );
}

export type PeerShareEngagementInput = {
  senderId: string;
  messageType: string;
  body: string;
  createdAt: string;
  attachment?: ChatPeerShareAttachment | null;
};

export type PeerEngagementSummary = {
  totalShares: number;
  achievementShares: number;
  insightShares: number;
  uniqueSharers: number;
  recentTitles: string[];
};

/** Aggregate peer-share activity for coach Pro metrics (OQ-18.3). */
export function summarizePeerEngagement(
  shares: readonly PeerShareEngagementInput[],
): PeerEngagementSummary {
  const peerOnly = shares.filter((row) => isPeerShareMessageType(row.messageType));
  const sharers = new Set(peerOnly.map((row) => row.senderId));
  const recentTitles = [...peerOnly]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5)
    .map((row) => {
      if (isAchievementAttachment(row.attachment) || isInsightAttachment(row.attachment)) {
        return row.attachment.title;
      }
      return row.body;
    })
    .filter(Boolean);

  return {
    totalShares: peerOnly.length,
    achievementShares: peerOnly.filter((row) => row.messageType === 'achievement').length,
    insightShares: peerOnly.filter((row) => row.messageType === 'insight').length,
    uniqueSharers: sharers.size,
    recentTitles,
  };
}
