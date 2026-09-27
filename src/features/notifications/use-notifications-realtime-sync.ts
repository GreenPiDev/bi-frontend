import { useQueryClient } from '@tanstack/react-query';
import { useRealtimeEvent } from '../../lib/realtime';
import { NOTIFICATIONS_QUERY_KEY, UNREAD_NOTIFICATIONS_QUERY_KEY } from './use-notifications';

/** Backend `notifications.notification.created` yayinlar (tum tenant'a, messages ile
 * ayni desen) - payload'un icerigiyle ilgilenmeden sorgulari invalidate ediyoruz, gercek
 * izolasyon zaten backend'de recipientUserId filtresiyle saglaniyor (bkz.
 * use-messages-realtime-sync.ts ayni desen). */
export function useNotificationsRealtimeSync(): void {
  const queryClient = useQueryClient();

  useRealtimeEvent('notifications.notification.created', () => {
    void queryClient.invalidateQueries({ queryKey: UNREAD_NOTIFICATIONS_QUERY_KEY });
    void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
  });
}
