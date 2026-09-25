import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createTitleOption,
  deleteTitleOption,
  listTitleOptions,
  updateTitleOption,
} from '../../lib/api';

const TITLE_OPTIONS_QUERY_KEY = ['title-options'];

export function useTitleOptionsQuery() {
  return useQuery({
    queryKey: TITLE_OPTIONS_QUERY_KEY,
    queryFn: () => listTitleOptions(),
  });
}

export function useCreateTitleOptionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (label: string) => createTitleOption(label),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: TITLE_OPTIONS_QUERY_KEY }),
  });
}

export function useUpdateTitleOptionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, label }: { id: string; label: string }) => updateTitleOption(id, label),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: TITLE_OPTIONS_QUERY_KEY }),
  });
}

export function useDeleteTitleOptionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTitleOption(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: TITLE_OPTIONS_QUERY_KEY }),
  });
}
