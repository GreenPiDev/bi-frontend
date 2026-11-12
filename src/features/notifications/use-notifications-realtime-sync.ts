import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useMeQuery } from '../auth/use-auth';
import { useRealtimeEvent } from '../../lib/realtime';
import {
  installNotificationSoundUnlock,
  playNotificationSound,
} from '../../lib/notification-sound';
import { NOTIFICATIONS_QUERY_KEY, UNREAD_NOTIFICATIONS_QUERY_KEY } from './use-notifications';

/** Backend `notifications.notification.created` yayinlar (tum tenant'a, messages ile
 * ayni desen). Gercek izolasyon backend'de recipientUserId filtresiyle saglaniyor; olay
 * herkese gittigi icin bildirim SESI yalnizca payload'daki recipientUserId mevcut
 * kullaniciyla eslesince calinir (bkz. use-messages-realtime-sync.ts ayni desen). */
export function useNotificationsRealtimeSync(): void {
  const queryClient = useQueryClient();
  const meQuery = useMeQuery();
  const currentUserId = meQuery.data?.id;

  useEffect(() => installNotificationSoundUnlock(), []);

  useRealtimeEvent<{ recipientUserId?: string }>(
    'notifications.notification.created',
    (payload) => {
      void queryClient.invalidateQueries({ queryKey: UNREAD_NOTIFICATIONS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
      if (currentUserId && payload?.recipientUserId === currentUserId) {
        playNotificationSound();
      }
    },
  );
}
