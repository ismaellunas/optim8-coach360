import type { LaunchAccessLevel } from '../rbac/launch-matrix.js';
import type { SessionContentCompletion } from './completion.js';
import type { SessionContentKind, SessionContentRef, SessionContentSource } from './content-refs.js';
import {
  sessionContentKindSchema,
  sessionContentSourceSchema,
} from './content-refs.js';
import type { SessionInput } from './schema.js';

export type CoachProgressFeatures = {
  canViewDashboard: boolean;
  canFilterByPlayer: boolean;
  canFilterByDate: boolean;
  canSendFeedback: boolean;
  canAssignDrills: boolean;
  canViewAiInsights: boolean;
};

export type CoachCompletionFilters = {
  playerId?: string;
  from?: string;
  to?: string;
};

/** Coach viewProgress: Basic ◎ limited, Advanced+ ✓ full dashboard (Flow 13 / OQ-13.1 MVP). */
export function coachProgressFeaturesForAccess(
  accessLevel: LaunchAccessLevel,
): CoachProgressFeatures {
  if (accessLevel === 'full') {
    return {
      canViewDashboard: true,
      canFilterByPlayer: true,
      canFilterByDate: true,
      canSendFeedback: true,
      canAssignDrills: true,
      canViewAiInsights: false,
    };
  }
  if (accessLevel === 'readonly') {
    return {
      canViewDashboard: true,
      canFilterByPlayer: false,
      canFilterByDate: false,
      canSendFeedback: false,
      canAssignDrills: false,
      canViewAiInsights: false,
    };
  }
  return {
    canViewDashboard: false,
    canFilterByPlayer: false,
    canFilterByDate: false,
    canSendFeedback: false,
    canAssignDrills: false,
    canViewAiInsights: false,
  };
}

export function filterCoachCompletions(
  completions: readonly SessionContentCompletion[],
  filters: CoachCompletionFilters,
): SessionContentCompletion[] {
  return completions.filter(function (entry) {
    if (filters.playerId && entry.playerId !== filters.playerId) {
      return false;
    }
    if (filters.from && entry.completedAt < filters.from) {
      return false;
    }
    if (filters.to) {
      const end = filters.to.includes('T') ? filters.to : `${filters.to}T23:59:59.999Z`;
      if (entry.completedAt > end) {
        return false;
      }
    }
    return true;
  });
}

export function parseSessionContentKey(
  contentKey: string,
): Pick<SessionContentRef, 'kind' | 'source' | 'id'> | null {
  const parts = contentKey.split(':');
  if (parts.length !== 3) {
    return null;
  }
  const kindResult = sessionContentKindSchema.safeParse(parts[0]);
  const sourceResult = sessionContentSourceSchema.safeParse(parts[1]);
  const id = parts[2]?.trim();
  if (!kindResult.success || !sourceResult.success || !id) {
    return null;
  }
  return {
    kind: kindResult.data as SessionContentKind,
    source: sourceResult.data as SessionContentSource,
    id,
  };
}

export function formatCompletionLabel(contentKey: string): string {
  const parsed = parseSessionContentKey(contentKey);
  if (!parsed) {
    return contentKey;
  }
  const kindLabel = parsed.kind.charAt(0).toUpperCase() + parsed.kind.slice(1);
  return `${kindLabel} · ${parsed.id.slice(0, 8)}`;
}

export function buildCorrectiveSessionInput(
  playerId: string,
  contentKey: string,
  title?: string,
): SessionInput | null {
  const parsed = parseSessionContentKey(contentKey);
  if (!parsed) {
    return null;
  }
  const scheduled = new Date();
  scheduled.setDate(scheduled.getDate() + 1);
  scheduled.setHours(16, 0, 0, 0);

  return {
    title: title ?? 'Corrective drill',
    notes: 'Assigned from coach progress review (STORY-7.3).',
    scheduledAt: scheduled.toISOString(),
    durationMinutes: 30,
    sessionType: 'individual',
    playerId,
    teamId: null,
    contentRefs: [
      {
        kind: parsed.kind,
        source: parsed.source,
        id: parsed.id,
        title: title ?? 'Corrective drill',
        sortOrder: 0,
      },
    ],
  };
}
