import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listLowStockItems, listStockItems, upsertStockItem } from '../../lib/api';

export const STOCK_ITEMS_QUERY_KEY = ['stock-items'];
export const LOW_STOCK_ITEMS_QUERY_KEY = ['stock-items', 'low-stock'];

export function useStockItemsQuery(params: { page?: number; q?: string } = {}) {
  return useQuery({
    queryKey: [...STOCK_ITEMS_QUERY_KEY, params],
    queryFn: () => listStockItems(params),
  });
}

export function useLowStockItemsQuery() {
  return useQuery({
    queryKey: LOW_STOCK_ITEMS_QUERY_KEY,
    queryFn: () => listLowStockItems(),
  });
}

export function useUpsertStockItemMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, quantity }: { productId: string; quantity: number }) =>
      upsertStockItem(productId, quantity),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: STOCK_ITEMS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: LOW_STOCK_ITEMS_QUERY_KEY });
    },
  });
}
