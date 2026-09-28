import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listLowStockItems,
  listStockHistory,
  listStockItems,
  upsertStockItem,
} from '../../lib/api';

export const STOCK_ITEMS_QUERY_KEY = ['stock-items'];
export const LOW_STOCK_ITEMS_QUERY_KEY = ['stock-items', 'low-stock'];
export const STOCK_HISTORY_QUERY_KEY = ['stock-items', 'history'];

export function useStockItemsQuery(params: { page?: number; pageSize?: number; q?: string } = {}) {
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

export function useStockHistoryQuery(params: { productId?: string; userId?: string } = {}) {
  return useQuery({
    queryKey: [...STOCK_HISTORY_QUERY_KEY, params],
    queryFn: () => listStockHistory(params),
  });
}

export function useUpsertStockItemMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      productId,
      quantity,
      note,
    }: {
      productId: string;
      quantity: number;
      note?: string;
    }) => upsertStockItem(productId, quantity, note),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: STOCK_ITEMS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: LOW_STOCK_ITEMS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: STOCK_HISTORY_QUERY_KEY });
    },
  });
}
