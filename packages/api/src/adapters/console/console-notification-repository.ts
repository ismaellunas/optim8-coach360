import type { NotificationRepository, RosterNotificationPayload } from '../../ports/notification-repository.js';

export class ConsoleNotificationRepository implements NotificationRepository {
  enqueueRosterChange(payload: RosterNotificationPayload): void {
    if (typeof console !== 'undefined' && typeof console.debug === 'function') {
      console.debug('[notifications]', payload.event, payload);
    }
  }
}
