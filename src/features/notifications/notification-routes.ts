import type { Notification } from '../../lib/api';

/** Bildirimin relatedEntityType'ina gore tiklaninca gidilecek sayfa - yeni bir
 * NotificationType/relatedEntityType eklendikce buraya bir esleme daha eklenir.
 * Eslesme yoksa null doner, cagiran taraf satiri tiklanamaz olarak render eder. */
export function resolveNotificationRoute(notification: Notification): string | null {
  if (notification.type === 'CALENDAR_EVENT_INVITE') {
    return '/ajanda?tab=pendingInvites';
  }
  switch (notification.relatedEntityType) {
    case 'CalendarEvent':
      return '/ajanda';
    case 'Message':
      return notification.relatedEntityId
        ? `/mesajlar/${notification.relatedEntityId}`
        : '/mesajlar';
    case 'Contact':
      return notification.relatedEntityId
        ? `/kisiler/duzenle/${notification.relatedEntityId}`
        : '/kisiler';
    case 'Quote':
      return notification.relatedEntityId
        ? `/teklifler/${notification.relatedEntityId}`
        : '/teklifler';
    default:
      return null;
  }
}
