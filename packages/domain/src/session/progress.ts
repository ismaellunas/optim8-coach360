import type { LaunchAccessLevel } from '../rbac/launch-matrix.js';
import type { SubscriptionTier } from '../subscription/schema.js';
import type { SessionContentCompletion } from './completion.js';

/** OQ-2.1 / OQ-8.1 MVP resolution: mark done + optional reps/time; no video proof. */
export const BASIC_TIER_PROGRESS_SCOPE = {
  canLogDrills: true,
  canViewCompletionCount: true,
  canViewSessionPercent: true,
  canViewFullDashboard: false,
  canViewTrends: false,
} as const;

export type PlayerProgressSummary = {
  drillsCompleted: number;
  itemsCompleted: number;
  totalReps: number;
  totalDurationMinutes: number;
};

export function computeCompletionPercent(completed: number, total: number): number {
  if (total <= 0) {
    return 0;
  }
  return Math.min(100, Math.round((completed / total) * 100));
}

export function summarizePlayerProgress(
  completions: readonly SessionContentCompletion[],
): PlayerProgressSummary {
  let drillsCompleted = 0;
  let totalReps = 0;
  let totalDurationSeconds = 0;

  for (const entry of completions) {
    if (entry.contentKey.startsWith('drill:')) {
      drillsCompleted += 1;
    }
    if (typeof entry.reps === 'number' && entry.reps >= 0) {
      totalReps += entry.reps;
    }
    if (typeof entry.durationSeconds === 'number' && entry.durationSeconds >= 0) {
      totalDurationSeconds += entry.durationSeconds;
    }
  }

  return {
    drillsCompleted,
    itemsCompleted: completions.length,
    totalReps,
    totalDurationMinutes: Math.round(totalDurationSeconds / 60),
  };
}

export type PlayerProgressFeatures = {
  canLogDrills: boolean;
  canViewCompletionCount: boolean;
  canViewSessionPercent: boolean;
  canViewFullDashboard: boolean;
  canViewTrends: boolean;
};

/**
 * Maps viewProgress access level to player-facing progress scope (OQ-2.1).
 * Basic ◎ → limited stats; Pro ✓ → full dashboard; Advanced ○ → none (paywall).
 */
export function playerProgressFeaturesForAccess(
  accessLevel: LaunchAccessLevel,
): PlayerProgressFeatures {
  if (accessLevel === 'full') {
    return {
      canLogDrills: true,
      canViewCompletionCount: true,
      canViewSessionPercent: true,
      canViewFullDashboard: true,
      canViewTrends: true,
    };
  }
  if (accessLevel === 'readonly') {
    return { ...BASIC_TIER_PROGRESS_SCOPE };
  }
  return {
    canLogDrills: false,
    canViewCompletionCount: false,
    canViewSessionPercent: false,
    canViewFullDashboard: false,
    canViewTrends: false,
  };
}

/** Trial maps to Pro floor elsewhere; expose tier label for UI copy. */
export function progressScopeLabel(tier: SubscriptionTier, accessLevel: LaunchAccessLevel): string {
  if (accessLevel === 'full') {
    return tier === 'trial' ? 'trial (full preview)' : 'full dashboard';
  }
  if (accessLevel === 'readonly') {
    return 'basic — completion count and session %';
  }
  return 'upgrade required';
}
