import type { Notification } from '../../lib/api';

/** Bildirimin relatedEntityType'ina gore tiklaninca gidilecek sayfa - yeni bir
 * NotificationType/relatedEntityType eklendikce buraya bir esleme daha eklenir.
 * Eslesme yoksa null doner, cagiran taraf satiri tiklanamaz olarak render eder. */
export function resolveNotificationRoute(notification: Notification): string | null {
  if (notification.type === 'SUPPORT_TICKET_REPLIED') {
    return notification.relatedEntityId
      ? `/teknik-destek?talep=${notification.relatedEntityId}`
      : '/teknik-destek';
  }
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
    case 'PostSaleCase':
      return notification.relatedEntityId
        ? `/satis-sonrasi/${notification.relatedEntityId}`
        : '/satis-sonrasi';
    case 'SupportTicket':
      // SUPPORT_TICKET_CREATED / SUPPORT_TICKET_USER_MESSAGE: super admin tarafi.
      return notification.relatedEntityId
        ? `/platform-admin/destek-talepleri?talep=${notification.relatedEntityId}`
        : '/platform-admin/destek-talepleri';
    case 'KanbanBoard':
      return notification.relatedEntityId ? `/kanban/${notification.relatedEntityId}` : '/kanban';
    default:
      return null;
  }
}
