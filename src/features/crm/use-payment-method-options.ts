import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createPaymentMethodOption,
  deletePaymentMethodOption,
  listPaymentMethodOptions,
  updatePaymentMethodOption,
} from '../../lib/api';

const PAYMENT_METHOD_OPTIONS_QUERY_KEY = ['payment-method-options'];

export function usePaymentMethodOptionsQuery() {
  return useQuery({
    queryKey: PAYMENT_METHOD_OPTIONS_QUERY_KEY,
    queryFn: () => listPaymentMethodOptions(),
  });
}

export function useCreatePaymentMethodOptionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (label: string) => createPaymentMethodOption(label),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: PAYMENT_METHOD_OPTIONS_QUERY_KEY }),
  });
}

export function useUpdatePaymentMethodOptionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, label }: { id: string; label: string }) =>
      updatePaymentMethodOption(id, label),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: PAYMENT_METHOD_OPTIONS_QUERY_KEY }),
  });
}

export function useDeletePaymentMethodOptionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deletePaymentMethodOption(id),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: PAYMENT_METHOD_OPTIONS_QUERY_KEY }),
  });
}
