import type {
  NotificationRepository,
  RosterNotificationPayload,
  SessionNotificationPayload,
  SessionReminderPayload,
  TrialExpiryWarningPayload,
} from '../../ports/notification-repository.js';

export class ConsoleNotificationRepository implements NotificationRepository {
  enqueueRosterChange(payload: RosterNotificationPayload): void {
    if (typeof console !== 'undefined' && typeof console.debug === 'function') {
      console.debug('[notifications]', payload.event, payload);
    }
  }

  enqueueSessionChange(payload: SessionNotificationPayload): void {
    if (typeof console !== 'undefined' && typeof console.debug === 'function') {
      console.debug('[notifications]', payload.event, payload);
    }
  }

  enqueueSessionReminder(payload: SessionReminderPayload): void {
    if (typeof console !== 'undefined' && typeof console.debug === 'function') {
      console.debug('[notifications]', payload.event, payload);
    }
  }

  enqueueTrialExpiryWarning(payload: TrialExpiryWarningPayload): void {
    if (typeof console !== 'undefined' && typeof console.debug === 'function') {
      console.debug('[notifications]', payload.event, payload);
    }
  }
}
