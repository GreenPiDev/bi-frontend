import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createChatConversation,
  deleteChatConversation,
  getChatConversation,
  listChatConversations,
  sendChatMessage,
} from '../../lib/api';

const CONVERSATIONS_QUERY_KEY = ['chatbot', 'conversations'];
const conversationQueryKey = (id: string) => ['chatbot', 'conversations', id];

export function useChatConversationsQuery(enabled: boolean) {
  return useQuery({
    queryKey: CONVERSATIONS_QUERY_KEY,
    queryFn: () => listChatConversations(),
    enabled,
  });
}

export function useChatConversationQuery(id: string | undefined) {
  return useQuery({
    queryKey: id ? conversationQueryKey(id) : ['chatbot', 'conversations', 'none'],
    queryFn: () => getChatConversation(id!),
    enabled: !!id,
  });
}

export function useCreateChatConversationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => createChatConversation(),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: CONVERSATIONS_QUERY_KEY }),
  });
}

export function useDeleteChatConversationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteChatConversation(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: CONVERSATIONS_QUERY_KEY }),
  });
}

export function useSendChatMessageMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: sendChatMessage,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: CONVERSATIONS_QUERY_KEY }),
  });
}
