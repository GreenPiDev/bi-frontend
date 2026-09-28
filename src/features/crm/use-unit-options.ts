import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createUnitOption,
  deleteUnitOption,
  listUnitOptions,
  updateUnitOption,
} from '../../lib/api';

const UNIT_OPTIONS_QUERY_KEY = ['unit-options'];

export function useUnitOptionsQuery() {
  return useQuery({
    queryKey: UNIT_OPTIONS_QUERY_KEY,
    queryFn: () => listUnitOptions(),
  });
}

export function useCreateUnitOptionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (label: string) => createUnitOption(label),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: UNIT_OPTIONS_QUERY_KEY }),
  });
}

export function useUpdateUnitOptionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, label }: { id: string; label: string }) => updateUnitOption(id, label),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: UNIT_OPTIONS_QUERY_KEY }),
  });
}

export function useDeleteUnitOptionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteUnitOption(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: UNIT_OPTIONS_QUERY_KEY }),
  });
}
