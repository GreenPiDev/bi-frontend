import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listNotifications, listUnreadNotifications, setNotificationRead } from '../../lib/api';

/** Zil ikonundaki dropdown ve kirmizi rozet ayni sorguyu paylasir - okunmamis
 * bildirim sayisi listenin uzunlugudur, ayri bir "count" ucuna gerek yok. */
export const UNREAD_NOTIFICATIONS_QUERY_KEY = ['notifications', 'unread'];
export const NOTIFICATIONS_QUERY_KEY = ['notifications', 'all'];

export function useUnreadNotificationsQuery() {
  return useQuery({
    queryKey: UNREAD_NOTIFICATIONS_QUERY_KEY,
    queryFn: listUnreadNotifications,
  });
}

export function useNotificationsQuery(params: { page?: number; pageSize?: number } = {}) {
  return useQuery({
    queryKey: [...NOTIFICATIONS_QUERY_KEY, params],
    queryFn: () => listNotifications(params),
  });
}

export function useSetNotificationReadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, read = true }: { id: string; read?: boolean }) =>
      setNotificationRead(id, read),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: UNREAD_NOTIFICATIONS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
    },
  });
}
