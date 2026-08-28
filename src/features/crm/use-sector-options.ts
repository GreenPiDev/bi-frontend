import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createSectorOption, deleteSectorOption, listSectorOptions } from '../../lib/api';

const SECTOR_OPTIONS_QUERY_KEY = ['sector-options'];

export function useSectorOptionsQuery() {
  return useQuery({
    queryKey: SECTOR_OPTIONS_QUERY_KEY,
    queryFn: () => listSectorOptions(),
  });
}

export function useCreateSectorOptionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (label: string) => createSectorOption(label),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: SECTOR_OPTIONS_QUERY_KEY }),
  });
}

export function useDeleteSectorOptionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteSectorOption(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: SECTOR_OPTIONS_QUERY_KEY }),
  });
}
