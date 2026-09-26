import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createBrandOption,
  deleteBrandOption,
  listBrandOptions,
  updateBrandOption,
} from '../../lib/api';

const BRAND_OPTIONS_QUERY_KEY = ['brand-options'];

export function useBrandOptionsQuery() {
  return useQuery({
    queryKey: BRAND_OPTIONS_QUERY_KEY,
    queryFn: () => listBrandOptions(),
  });
}

export function useCreateBrandOptionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (label: string) => createBrandOption(label),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: BRAND_OPTIONS_QUERY_KEY }),
  });
}

export function useUpdateBrandOptionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, label }: { id: string; label: string }) => updateBrandOption(id, label),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: BRAND_OPTIONS_QUERY_KEY }),
  });
}

export function useDeleteBrandOptionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteBrandOption(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: BRAND_OPTIONS_QUERY_KEY }),
  });
}
