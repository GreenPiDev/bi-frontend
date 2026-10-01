import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  decreaseStockItem,
  increaseStockItem,
  listLowStockItems,
  listStockHistory,
  listStockItems,
  transferStock,
  type StockStatusFilter,
  type TransferStockInput,
} from '../../lib/api';
import { PRODUCTS_QUERY_KEY } from './use-products';

export const STOCK_ITEMS_QUERY_KEY = ['stock-items'];
export const LOW_STOCK_ITEMS_QUERY_KEY = ['stock-items', 'low-stock'];
export const STOCK_HISTORY_QUERY_KEY = ['stock-items', 'history'];

export function useStockItemsQuery(
  params: {
    page?: number;
    pageSize?: number;
    q?: string;
    productListId?: string;
    brand?: string;
    category?: string;
    stockStatus?: StockStatusFilter;
    sort?: string;
  } = {},
) {
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

export function useStockHistoryQuery(
  params: { productId?: string; warehouseId?: string; userId?: string } = {},
) {
  return useQuery({
    queryKey: [...STOCK_HISTORY_QUERY_KEY, params],
    queryFn: () => listStockHistory(params),
  });
}

export function useIncreaseStockMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      productId,
      warehouseId,
      quantity,
      unitCost,
      note,
    }: {
      productId: string;
      warehouseId: string;
      quantity: number;
      unitCost: number;
      note?: string;
    }) => increaseStockItem(productId, warehouseId, quantity, unitCost, note),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: STOCK_ITEMS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: LOW_STOCK_ITEMS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: STOCK_HISTORY_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: PRODUCTS_QUERY_KEY });
    },
  });
}

export function useDecreaseStockMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      productId,
      warehouseId,
      quantity,
      note,
    }: {
      productId: string;
      warehouseId: string;
      quantity: number;
      note?: string;
    }) => decreaseStockItem(productId, warehouseId, quantity, note),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: STOCK_ITEMS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: LOW_STOCK_ITEMS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: STOCK_HISTORY_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: PRODUCTS_QUERY_KEY });
    },
  });
}

export function useTransferStockMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, ...input }: { productId: string } & TransferStockInput) =>
      transferStock(productId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: STOCK_ITEMS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: LOW_STOCK_ITEMS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: STOCK_HISTORY_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: PRODUCTS_QUERY_KEY });
    },
  });
}
