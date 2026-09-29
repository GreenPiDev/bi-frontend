import { useQueryClient } from '@tanstack/react-query';
import { useRealtimeEvent } from '../../lib/realtime';
import {
  CALENDAR_EVENTS_QUERY_KEY,
  PENDING_CALENDAR_INVITES_QUERY_KEY,
  SENT_CALENDAR_INVITES_QUERY_KEY,
} from './use-calendar-events';

/** Paylasilan (birden fazla katilimcili) bir etkinlik olusturulunca/guncellenince/
 * silinince backend `calendar-events.event.changed` yayinlar - ozel hatirlaticilar hicbir
 * zaman bu event'i tetiklemez (bkz. calendar-events.service.ts). Payload'un icerigiyle
 * ilgilenmeden ajanda sorgularini invalidate ediyoruz, gorunurluk filtresi zaten backend'de
 * uygulaniyor (bkz. use-messages-realtime-sync.ts ayni desen).
 *
 * Ad-hoc (2026-09-29): katilimci daveti kabul/red akisinda ayni event, respond() sonrasi
 * da yayinlanir - bu yuzden davet eden tarafin "bekleyen davetler"/"gonderdigim davetler"
 * panelleri de burada invalidate edilir, sayfa yenilemeden anlik guncellenir. */
export function useCalendarEventsRealtimeSync(): void {
  const queryClient = useQueryClient();

  useRealtimeEvent('calendar-events.event.changed', () => {
    void queryClient.invalidateQueries({ queryKey: CALENDAR_EVENTS_QUERY_KEY });
    void queryClient.invalidateQueries({ queryKey: PENDING_CALENDAR_INVITES_QUERY_KEY });
    void queryClient.invalidateQueries({ queryKey: SENT_CALENDAR_INVITES_QUERY_KEY });
  });
}
