export type RosterNotificationEvent = 'roster_member_removed' | 'coach_assigned_to_team';

export type RosterNotificationPayload = {
  teamId: string;
  profileId: string;
  triggeredBy: string;
  event: RosterNotificationEvent;
};

export type TrialExpiryWarningPayload = {
  profileId: string;
  trialEndsAt: string;
  daysRemaining: number;
  event: 'trial_expiry_warning';
};

export type SessionNotificationEvent = 'session_updated' | 'session_cancelled';

export type SessionNotificationPayload = {
  sessionId: string;
  coachId: string;
  teamId: string | null;
  playerId: string | null;
  triggeredBy: string;
  event: SessionNotificationEvent;
};

export type NotificationRepository = {
  enqueueRosterChange(payload: RosterNotificationPayload): void;
  enqueueSessionChange(payload: SessionNotificationPayload): void;
  enqueueTrialExpiryWarning(payload: TrialExpiryWarningPayload): void;
};
