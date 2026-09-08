import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createMessage,
  getMessage,
  listAssignableMessageUsers,
  listMessages,
  markMessageRead,
  type CreateMessageInput,
  type MessageRelatedEntity,
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
) {
  return useQuery({
    queryKey: [...MESSAGES_QUERY_KEY, params],
    queryFn: () => listMessages(params),
  });
}

export function useMessageQuery(id: string) {
  return useQuery({
    queryKey: ['messages', id],
    queryFn: () => getMessage(id),
    enabled: Boolean(id),
  });
}

export function useCreateMessageMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateMessageInput) => createMessage(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: MESSAGES_QUERY_KEY });
    },
  });
}

export function useMarkMessageReadMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => markMessageRead(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: MESSAGES_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ['messages', id] });
    },
  });
}

export function useAssignableMessageUsersQuery() {
  return useQuery({
    queryKey: ['messages', 'assignable-users'],
    queryFn: () => listAssignableMessageUsers(),
  });
}
