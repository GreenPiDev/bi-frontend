import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createInteraction,
  deleteInteraction,
  getInteraction,
  listInteractions,
  updateInteraction,
  type CreateInteractionInput,
  type InteractionStatus,
  type UpdateInteractionInput,
} from '../../lib/api';

export const INTERACTIONS_QUERY_KEY = ['interactions'];

export function useInteractionsQuery(
  params: { page?: number; accountId?: string; status?: InteractionStatus } = {},
) {
  return useQuery({
    queryKey: [...INTERACTIONS_QUERY_KEY, params],
    queryFn: () => listInteractions(params),
  });
}

export function useInteractionQuery(id: string) {
  return useQuery({
    queryKey: ['interactions', id],
    queryFn: () => getInteraction(id),
    enabled: Boolean(id),
  });
}

export function useCreateInteractionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateInteractionInput) => createInteraction(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: INTERACTIONS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ['accounts'] });
      void queryClient.invalidateQueries({ queryKey: ['contacts'] });
      void queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
    },
  });
}

export function useUpdateInteractionMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateInteractionInput) => updateInteraction(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: INTERACTIONS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ['interactions', id] });
    },
  });
}

export function useDeleteInteractionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteInteraction(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: INTERACTIONS_QUERY_KEY });
    },
  });
}
