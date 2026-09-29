import type { CalendarEvent } from './api';

export type CalendarEventVisibility = 'private' | 'assigned' | 'shared';

/** Etkinligin, oturum acmis kullaniciya gore gorunurluk turu:
 * - private: sadece kendisinin olusturdugu, baska katilimcisi olmayan (sadece kendine ozel)
 * - assigned: baskasinin olusturup kendisini katilimci olarak ekledigi (kendisine atanan)
 * - shared: birden fazla katilimcili, kendi olusturdugu paylasimli etkinlik */
export function getCalendarEventVisibility(
  event: CalendarEvent,
  currentUserId: string | undefined,
): CalendarEventVisibility {
  if (!currentUserId) return 'shared';
  if (event.createdById === currentUserId) {
    const onlySelf =
      event.attendees.length <= 1 &&
      event.attendees.every((attendee) => attendee.userId === currentUserId);
    return onlySelf ? 'private' : 'shared';
  }
  return event.attendees.some((attendee) => attendee.userId === currentUserId)
    ? 'assigned'
    : 'shared';
}
