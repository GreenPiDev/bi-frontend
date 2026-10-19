import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createSalesOrder,
  getSalesOrder,
  listSalesOrders,
  setSalesOrderItemCancelled,
  setSalesOrderItemDeliveredQuantity,
  updateSalesOrderStatus,
  type CreateSalesOrderInput,
  type SalesOrderStatus,
  type UpdateSalesOrderInput,
} from '../../lib/api';

export const SALES_ORDERS_QUERY_KEY = ['sales-orders'];

export function useSalesOrdersQuery(
  params: {
    page?: number;
    pageSize?: number;
    accountId?: string;
    status?: SalesOrderStatus;
    createdById?: string;
    q?: string;
    from?: string;
    to?: string;
  } = {},
) {
  return useQuery({
    queryKey: [...SALES_ORDERS_QUERY_KEY, params],
    queryFn: () => listSalesOrders(params),
  });
}

/** "Durum" buton filtresindeki her secenegin yanina yazilacak kayit sayisini
 * getirir - usePurchaseOrderStatusCounts ile ayni desen (backend durum bazli
 * kirilim dondurmuyor, her secenek icin ayri pageSize=1 istek atilir). */
export function useSalesOrderStatusCounts(
  statuses: readonly SalesOrderStatus[],
  params: { createdById?: string; accountId?: string } = {},
) {
  const results = useQueries({
    queries: [
      {
        queryKey: [...SALES_ORDERS_QUERY_KEY, 'count', 'all', params],
        queryFn: () => listSalesOrders({ pageSize: 1, ...params }),
      },
      ...statuses.map((status) => ({
        queryKey: [...SALES_ORDERS_QUERY_KEY, 'count', status, params],
        queryFn: () => listSalesOrders({ pageSize: 1, status, ...params }),
      })),
    ],
  });

  const [allResult, ...statusResults] = results;
  const counts: Partial<Record<SalesOrderStatus, number>> = {};
  statuses.forEach((status, index) => {
    const total = statusResults[index]?.data?.meta.total;
    if (total !== undefined) counts[status] = total;
  });

  return { all: allResult?.data?.meta.total, counts };
}

export function useCreateSalesOrderMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSalesOrderInput) => createSalesOrder(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SALES_ORDERS_QUERY_KEY });
    },
  });
}

export function useSalesOrderQuery(id: string) {
  return useQuery({
    queryKey: ['sales-orders', id],
    queryFn: () => getSalesOrder(id),
    enabled: Boolean(id),
  });
}

export function useUpdateSalesOrderStatusMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateSalesOrderInput) => updateSalesOrderStatus(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SALES_ORDERS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ['sales-orders', id] });
    },
  });
}

export function useSetSalesOrderItemDeliveredQuantityMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, deliveredQuantity }: { itemId: string; deliveredQuantity: number }) =>
      setSalesOrderItemDeliveredQuantity(id, itemId, deliveredQuantity),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SALES_ORDERS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ['sales-orders', id] });
    },
  });
}

export function useSetSalesOrderItemCancelledMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, isCancelled }: { itemId: string; isCancelled: boolean }) =>
      setSalesOrderItemCancelled(id, itemId, isCancelled),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SALES_ORDERS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ['sales-orders', id] });
    },
  });
}
