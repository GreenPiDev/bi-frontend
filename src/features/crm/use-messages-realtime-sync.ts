import { useQueryClient } from '@tanstack/react-query';
import { useMeQuery } from '../auth/use-auth';
import { useRealtimeEvent } from '../../lib/realtime';
import { playNotificationSound } from '../../lib/notification-sound';
import { MESSAGES_QUERY_KEY } from './use-messages';

interface MessageCreatedPayload {
  senderId?: string;
  recipientUserIds?: string[];
}

/** Yeni bir mesaj olusunca (gonderen veya alicilardan biri ayni tenant'ta baglantili
 * olan herkes) backend `messages.message.created` yayinlar - mesaj sorgularini
 * invalidate ediyoruz, React Query geri kalanini kendisi halleder (bkz.
 * use-module-access-realtime-sync.ts ayni desen). Olay tenant'taki herkese gittigi icin
 * ses yalnizca mevcut kullanici ALICI listesindeyse ve gonderen kendisi degilse calinir. */
export function useMessagesRealtimeSync(): void {
  const queryClient = useQueryClient();
  const currentUserId = useMeQuery().data?.id;

  useRealtimeEvent<MessageCreatedPayload>('messages.message.created', (payload) => {
    void queryClient.invalidateQueries({ queryKey: MESSAGES_QUERY_KEY });
    if (
      currentUserId &&
      payload?.senderId !== currentUserId &&
      payload?.recipientUserIds?.includes(currentUserId)
    ) {
      playNotificationSound();
    }
  });
}
