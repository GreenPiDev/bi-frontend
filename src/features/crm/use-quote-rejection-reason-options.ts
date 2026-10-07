import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createQuoteRejectionReasonOption,
  deleteQuoteRejectionReasonOption,
  listQuoteRejectionReasonOptions,
  updateQuoteRejectionReasonOption,
} from '../../lib/api';

const QUOTE_REJECTION_REASON_OPTIONS_QUERY_KEY = ['quote-rejection-reason-options'];

export function useQuoteRejectionReasonOptionsQuery() {
  return useQuery({
    queryKey: QUOTE_REJECTION_REASON_OPTIONS_QUERY_KEY,
    queryFn: () => listQuoteRejectionReasonOptions(),
  });
}

export function useCreateQuoteRejectionReasonOptionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (label: string) => createQuoteRejectionReasonOption(label),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: QUOTE_REJECTION_REASON_OPTIONS_QUERY_KEY }),
  });
}

export function useUpdateQuoteRejectionReasonOptionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, label }: { id: string; label: string }) =>
      updateQuoteRejectionReasonOption(id, label),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: QUOTE_REJECTION_REASON_OPTIONS_QUERY_KEY }),
  });
}

export function useDeleteQuoteRejectionReasonOptionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteQuoteRejectionReasonOption(id),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: QUOTE_REJECTION_REASON_OPTIONS_QUERY_KEY }),
  });
}
