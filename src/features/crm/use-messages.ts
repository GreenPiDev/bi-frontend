import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMeQuery } from '../auth/use-auth';
import {
  createMessage,
  getConversation,
  listAssignableMessageUsers,
  listMessages,
  markConversationRead,
  type ConversationDetail,
  type ConversationSummary,
  type CreateMessageInput,
  type Message,
  type MessageRelatedEntity,
  type PagedResult,
} from '../../lib/api';

export const MESSAGES_QUERY_KEY = ['messages'];

export function useMessagesQuery(
  params: {
    page?: number;
    q?: string;
    box?: 'inbox' | 'sent';
    relatedEntity?: MessageRelatedEntity;
    relatedEntityId?: string;
  } = {},
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: [...MESSAGES_QUERY_KEY, params],
    queryFn: () => listMessages(params),
    enabled: options.enabled ?? true,
  });
}

/** Tum konusmalar icin filtresiz, kumulatif okunmamis mesaj sayisi - hem sidebar'daki
 * "Mesajlar" ogesinde hem de sag-alt widget'in basliginda ayni sayaci gostermek icin
 * paylasilir (ayni query key sayesinde ikisi de ayni cache girdisini kullanir, ekstra
 * istek gitmez). `enabled=false` durumunda (ornegin messages modulune erisimi olmayan
 * kullanicida) hicbir istek atilmaz. */
export function useUnreadConversationsTotal(enabled = true): number {
  const query = useMessagesQuery({ page: 1 }, { enabled });
  return (query.data?.data ?? []).reduce(
    (total, conversation) => total + conversation.unreadCount,
    0,
  );
}

export function useConversationQuery(conversationId: string) {
  return useQuery({
    queryKey: ['messages', 'conversation', conversationId],
    queryFn: () => getConversation(conversationId),
    enabled: Boolean(conversationId),
  });
}

export function useCreateMessageMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateMessageInput) => createMessage(input),
    onSuccess: (created) => {
      void queryClient.invalidateQueries({ queryKey: MESSAGES_QUERY_KEY });
      void queryClient.invalidateQueries({
        queryKey: ['messages', 'conversation', created.conversationId],
      });
    },
  });
}

export function useMarkConversationReadMutation(conversationId: string) {
  const queryClient = useQueryClient();
  const meQuery = useMeQuery();
  const currentUserId = meQuery.data?.id;

  return useMutation({
    mutationFn: () => markConversationRead(conversationId),
    // Sadece invalidateQueries'e guvenmek yerine (bazi durumlarda cagiran bilesenin
    // dogrudan gozlemlemedigi bir cache girdisini gecikmeli/hic guncellemiyordu),
    // ilgili konusmanin okunmamis durumunu her cache girdisinde senkron olarak yaziyoruz.
    onSuccess: () => {
      const now = new Date().toISOString();
      const markMessageRead = (message: Message): Message => ({
        ...message,
        recipients: message.recipients.map((recipient) =>
          recipient.userId === currentUserId && !recipient.readAt
            ? { ...recipient, readAt: now }
            : recipient,
        ),
      });

      queryClient.setQueryData<ConversationDetail>(
        ['messages', 'conversation', conversationId],
        (old) => old && { ...old, messages: old.messages.map(markMessageRead) },
      );

      // setQueriesData bu prefix altindaki TUM cache girdilerini (liste, konusma detayi,
      // atanabilir-kullanicilar) esler; sadece PagedResult<ConversationSummary> seklinde
      // olanlari (liste sorgulari) guncelle, digerlerini oldugu gibi birak.
      queryClient.setQueriesData<PagedResult<ConversationSummary>>(
        { queryKey: MESSAGES_QUERY_KEY },
        (old) => {
          if (!old || !Array.isArray(old.data)) return old;
          return {
            ...old,
            data: old.data.map((conversation) =>
              conversation.conversationId === conversationId
                ? {
                    ...conversation,
                    unreadCount: 0,
                    lastMessage: markMessageRead(conversation.lastMessage),
                  }
                : conversation,
            ),
          };
        },
      );

      void queryClient.invalidateQueries({ queryKey: MESSAGES_QUERY_KEY });
      void queryClient.invalidateQueries({
        queryKey: ['messages', 'conversation', conversationId],
      });
    },
  });
}

export function useAssignableMessageUsersQuery() {
  return useQuery({
    queryKey: ['messages', 'assignable-users'],
    queryFn: () => listAssignableMessageUsers(),
  });
}
