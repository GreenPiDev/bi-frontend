import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createPriceList,
  deletePriceList,
  getPriceList,
  listPriceLists,
  updatePriceList,
  type PriceListInput,
} from '../../lib/api';

export const PRICE_LISTS_QUERY_KEY = ['price-lists'];

export function usePriceListsQuery(params: { page?: number; q?: string } = {}) {
  return useQuery({
    queryKey: [...PRICE_LISTS_QUERY_KEY, params],
    queryFn: () => listPriceLists(params),
  });
}

export function usePriceListQuery(id: string) {
  return useQuery({
    queryKey: ['price-lists', id],
    queryFn: () => getPriceList(id),
    enabled: Boolean(id),
  });
}

export function useCreatePriceListMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: PriceListInput) => createPriceList(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PRICE_LISTS_QUERY_KEY });
    },
  });
}

export function useUpdatePriceListMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<PriceListInput>) => updatePriceList(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PRICE_LISTS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ['price-lists', id] });
    },
  });
}

export function useDeletePriceListMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deletePriceList(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PRICE_LISTS_QUERY_KEY });
    },
  });
}
