import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createPurchaseOrderFromQuote,
  deletePurchaseOrder,
  getPurchaseOrder,
  listPurchaseOrders,
  updatePurchaseOrder,
  type PurchaseOrderStatus,
  type UpdatePurchaseOrderInput,
} from '../../lib/api';

export const PURCHASE_ORDERS_QUERY_KEY = ['purchase-orders'];

export function usePurchaseOrdersQuery(
  params: {
    page?: number;
    pageSize?: number;
    quoteId?: string;
    projectId?: string;
    status?: PurchaseOrderStatus;
  } = {},
) {
  return useQuery({
    queryKey: [...PURCHASE_ORDERS_QUERY_KEY, params],
    queryFn: () => listPurchaseOrders(params),
  });
}

/** "Durum" buton filtresindeki her secenegin (Tumu + her PurchaseOrderStatus) yanina
 * yazilacak kayit sayisini getirir - `/purchase-orders` ucu durum bazli kirilim
 * dondurmuyor, bu yuzden her secenek icin ayri, pageSize=1 ile ucuz bir istek atilir
 * (sadece meta.total kullanilir). */
export function usePurchaseOrderStatusCounts(statuses: readonly PurchaseOrderStatus[]) {
  const results = useQueries({
    queries: [
      {
        queryKey: [...PURCHASE_ORDERS_QUERY_KEY, 'count', 'all'],
        queryFn: () => listPurchaseOrders({ pageSize: 1 }),
      },
      ...statuses.map((status) => ({
        queryKey: [...PURCHASE_ORDERS_QUERY_KEY, 'count', status],
        queryFn: () => listPurchaseOrders({ pageSize: 1, status }),
      })),
    ],
  });

  const [allResult, ...statusResults] = results;
  const counts: Partial<Record<PurchaseOrderStatus, number>> = {};
  statuses.forEach((status, index) => {
    const total = statusResults[index]?.data?.meta.total;
    if (total !== undefined) counts[status] = total;
  });

  return { all: allResult?.data?.meta.total, counts };
}

export function usePurchaseOrderQuery(id: string) {
  return useQuery({
    queryKey: ['purchase-orders', id],
    queryFn: () => getPurchaseOrder(id),
    enabled: Boolean(id),
  });
}

export function useCreatePurchaseOrderFromQuoteMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (quoteId: string) => createPurchaseOrderFromQuote(quoteId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PURCHASE_ORDERS_QUERY_KEY });
    },
  });
}

export function useUpdatePurchaseOrderMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdatePurchaseOrderInput) => updatePurchaseOrder(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PURCHASE_ORDERS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ['purchase-orders', id] });
    },
  });
}

export function useDeletePurchaseOrderMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deletePurchaseOrder(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PURCHASE_ORDERS_QUERY_KEY });
    },
  });
}
