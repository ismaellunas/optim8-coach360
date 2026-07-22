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

export type SessionNotificationEvent =
  | 'session_created'
  | 'session_updated'
  | 'session_cancelled'
  | 'session_reminder';

export type SessionNotificationPayload = {
  sessionId: string;
  coachId: string;
  teamId: string | null;
  playerId: string | null;
  triggeredBy: string;
  event: SessionNotificationEvent;
};

export type SessionReminderPayload = {
  sessionId: string;
  coachId: string;
  teamId: string | null;
  playerId: string | null;
  scheduledAt: string;
  reminderHoursBefore: number;
  event: 'session_reminder';
};

export type ContentAssignedNotificationPayload = {
  assignmentId: string;
  libraryItemId: string;
  coachId: string;
  teamId: string | null;
  playerId: string | null;
  triggeredBy: string;
  event: 'content_assigned';
};

export type NotificationRepository = {
  enqueueRosterChange(payload: RosterNotificationPayload): void;
  enqueueSessionChange(payload: SessionNotificationPayload): void;
  enqueueSessionReminder(payload: SessionReminderPayload): void;
  enqueueTrialExpiryWarning(payload: TrialExpiryWarningPayload): void;
  enqueueContentAssigned(payload: ContentAssignedNotificationPayload): void;
};
