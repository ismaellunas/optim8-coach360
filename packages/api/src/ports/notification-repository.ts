export type RosterNotificationEvent = 'roster_member_removed' | 'coach_assigned_to_team';

export type RosterNotificationPayload = {
  teamId: string;
  profileId: string;
  triggeredBy: string;
  event: RosterNotificationEvent;
};

export type NotificationRepository = {
  enqueueRosterChange(payload: RosterNotificationPayload): void;
};
