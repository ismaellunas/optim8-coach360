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

export type NotificationRepository = {
  enqueueRosterChange(payload: RosterNotificationPayload): void;
  enqueueTrialExpiryWarning(payload: TrialExpiryWarningPayload): void;
};
