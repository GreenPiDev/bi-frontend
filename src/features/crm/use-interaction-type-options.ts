import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createInteractionTypeOption,
  deleteInteractionTypeOption,
  listInteractionTypeOptions,
  updateInteractionTypeOption,
} from '../../lib/api';

const INTERACTION_TYPE_OPTIONS_QUERY_KEY = ['interaction-type-options'];

export function useInteractionTypeOptionsQuery() {
  return useQuery({
    queryKey: INTERACTION_TYPE_OPTIONS_QUERY_KEY,
    queryFn: () => listInteractionTypeOptions(),
  });
}

export function useCreateInteractionTypeOptionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (label: string) => createInteractionTypeOption(label),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: INTERACTION_TYPE_OPTIONS_QUERY_KEY }),
  });
}

export function useUpdateInteractionTypeOptionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, label }: { id: string; label: string }) =>
      updateInteractionTypeOption(id, label),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: INTERACTION_TYPE_OPTIONS_QUERY_KEY }),
  });
}

export function useDeleteInteractionTypeOptionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteInteractionTypeOption(id),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: INTERACTION_TYPE_OPTIONS_QUERY_KEY }),
  });
}
