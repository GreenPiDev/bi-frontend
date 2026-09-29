import { useQueryClient } from '@tanstack/react-query';
import { useRealtimeEvent } from '../../lib/realtime';

/** Backend, bir kullanici kendi ajanda paylasim izinlerini degistirince (PUT
 * /calendar-shares/my-grants) tum tenant'a `calendar-shares.grants.updated` yayinlar -
 * payload'un icerigiyle ilgilenmeden invalidate ediyoruz, notifications/messages ile
 * ayni desen (bkz. use-notifications-realtime-sync.ts). Boylece kendisine yeni izin
 * verilen kullanicinin /ajanda dropdown'i sayfa yenilemeden guncellenir. */
export function useCalendarSharesRealtimeSync(): void {
  const queryClient = useQueryClient();

  useRealtimeEvent('calendar-shares.grants.updated', () => {
    void queryClient.invalidateQueries({ queryKey: ['calendar-shares'] });
  });
}
