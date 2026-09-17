import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMeQuery } from '../auth/use-auth';
import {
  createMessage,
  getConversation,
  listAssignableMessageUsers,
  listMessages,
  setConversationRead,
  setConversationStar,
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
    pageSize?: number;
    q?: string;
    box?: 'inbox' | 'sent';
    relatedEntity?: MessageRelatedEntity[];
    quoteIds?: string[];
    projectIds?: string[];
    interactionIds?: string[];
    recipientUserId?: string;
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

/** Satir-bagimsiz: `mutate({ conversationId })` varsayilan okundu isaretler,
 * `mutate({ conversationId, read: false })` tekrar okunmadi yapar - hem tek bir
 * konusmaya bagli sayfalarda (detay, sohbet paneli) hem de bircok konusmayi ayni anda
 * listeleyen `/mesajlar` tablosunda (her satir icin ayri hook cagirmadan) kullanilir. */
export function useSetConversationReadMutation() {
  const queryClient = useQueryClient();
  const meQuery = useMeQuery();
  const currentUserId = meQuery.data?.id;

  return useMutation({
    mutationFn: ({ conversationId, read = true }: { conversationId: string; read?: boolean }) =>
      setConversationRead(conversationId, read),
    // Sadece invalidateQueries'e guvenmek yerine (bazi durumlarda cagiran bilesenin
    // dogrudan gozlemlemedigi bir cache girdisini gecikmeli/hic guncellemiyordu),
    // ilgili konusmanin okunmamis durumunu her cache girdisinde senkron olarak yaziyoruz.
    onSuccess: (_result, { conversationId, read = true }) => {
      const now = new Date().toISOString();
      const applyReadState = (message: Message): Message => ({
        ...message,
        recipients: message.recipients.map((recipient) =>
          recipient.userId === currentUserId
            ? { ...recipient, readAt: read ? (recipient.readAt ?? now) : null }
            : recipient,
        ),
      });

      queryClient.setQueryData<ConversationDetail>(
        ['messages', 'conversation', conversationId],
        (old) => old && { ...old, messages: old.messages.map(applyReadState) },
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
                    // read=false icin kesin deger invalidateQueries'ten gelecek; bu arada
                    // makul bir yaklasik deger olarak konusmadaki tum mesaj sayisi kullanilir.
                    unreadCount: read ? 0 : conversation.messageCount,
                    lastMessage: applyReadState(conversation.lastMessage),
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

/** Satir-bagimsiz kisisel yildizlama toggle'i - `mutate({ conversationId, starred })`. */
export function useSetConversationStarMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ conversationId, starred }: { conversationId: string; starred: boolean }) =>
      setConversationStar(conversationId, starred),
    onSuccess: (_result, { conversationId, starred }) => {
      queryClient.setQueryData<ConversationDetail>(
        ['messages', 'conversation', conversationId],
        (old) => old && { ...old, starred },
      );
      queryClient.setQueriesData<PagedResult<ConversationSummary>>(
        { queryKey: MESSAGES_QUERY_KEY },
        (old) => {
          if (!old || !Array.isArray(old.data)) return old;
          return {
            ...old,
            data: old.data.map((conversation) =>
              conversation.conversationId === conversationId
                ? { ...conversation, starred }
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
