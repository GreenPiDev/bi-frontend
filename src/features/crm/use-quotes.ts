import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  approveQuote,
  createQuote,
  deleteQuote,
  getQuote,
  listQuotes,
  rejectQuote,
  updateQuote,
  type CreateQuoteInput,
  type QuoteStatus,
  type UpdateQuoteInput,
} from '../../lib/api';

export const QUOTES_QUERY_KEY = ['quotes'];

export function useQuotesQuery(
  params: { page?: number; accountId?: string; status?: QuoteStatus } = {},
) {
  return useQuery({
    queryKey: [...QUOTES_QUERY_KEY, params],
    queryFn: () => listQuotes(params),
  });
}

export function useQuoteQuery(id: string) {
  return useQuery({
    queryKey: ['quotes', id],
    queryFn: () => getQuote(id),
    enabled: Boolean(id),
  });
}

export function useCreateQuoteMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateQuoteInput) => createQuote(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUOTES_QUERY_KEY });
    },
  });
}

export function useUpdateQuoteMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateQuoteInput) => updateQuote(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUOTES_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ['quotes', id] });
    },
  });
}

export function useDeleteQuoteMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteQuote(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUOTES_QUERY_KEY });
    },
  });
}

export function useApproveQuoteMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => approveQuote(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUOTES_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ['quotes', id] });
    },
  });
}

export function useRejectQuoteMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => rejectQuote(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUOTES_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ['quotes', id] });
    },
  });
}
