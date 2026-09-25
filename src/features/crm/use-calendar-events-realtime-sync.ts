import { useQueryClient } from '@tanstack/react-query';
import { useRealtimeEvent } from '../../lib/realtime';
import { CALENDAR_EVENTS_QUERY_KEY } from './use-calendar-events';

/** Paylasilan (birden fazla katilimcili) bir etkinlik olusturulunca/guncellenince/
 * silinince backend `calendar-events.event.changed` yayinlar - ozel hatirlaticilar hicbir
 * zaman bu event'i tetiklemez (bkz. calendar-events.service.ts). Payload'un icerigiyle
 * ilgilenmeden ajanda sorgularini invalidate ediyoruz, gorunurluk filtresi zaten backend'de
 * uygulaniyor (bkz. use-messages-realtime-sync.ts ayni desen). */
export function useCalendarEventsRealtimeSync(): void {
  const queryClient = useQueryClient();

  useRealtimeEvent('calendar-events.event.changed', () => {
    void queryClient.invalidateQueries({ queryKey: CALENDAR_EVENTS_QUERY_KEY });
  });
}
