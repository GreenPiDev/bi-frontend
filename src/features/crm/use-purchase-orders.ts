import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createPurchaseOrderFromQuote,
  deletePurchaseOrder,
  getPurchaseOrder,
  listPurchaseOrders,
  updatePurchaseOrder,
  type UpdatePurchaseOrderInput,
} from '../../lib/api';

export const PURCHASE_ORDERS_QUERY_KEY = ['purchase-orders'];

export function usePurchaseOrdersQuery(
  params: { page?: number; quoteId?: string; projectId?: string } = {},
) {
  return useQuery({
    queryKey: [...PURCHASE_ORDERS_QUERY_KEY, params],
    queryFn: () => listPurchaseOrders(params),
  });
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
