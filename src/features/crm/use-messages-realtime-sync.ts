import { useQueryClient } from '@tanstack/react-query';
import { useRealtimeEvent } from '../../lib/realtime';
import { MESSAGES_QUERY_KEY } from './use-messages';

/** Yeni bir mesaj olusunca (gonderen veya alicilardan biri ayni tenant'ta baglantili
 * olan herkes) backend `messages.message.created` yayinlar - payload'un icerigiyle
 * ilgilenmeden mesaj sorgularini invalidate ediyoruz, React Query geri kalanini kendisi
 * halleder (bkz. use-module-access-realtime-sync.ts ayni desen). */
export function useMessagesRealtimeSync(): void {
  const queryClient = useQueryClient();

  useRealtimeEvent('messages.message.created', () => {
    void queryClient.invalidateQueries({ queryKey: MESSAGES_QUERY_KEY });
  });
}
