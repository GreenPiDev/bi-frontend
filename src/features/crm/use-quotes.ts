import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
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
  params: { page?: number; pageSize?: number; accountId?: string; status?: QuoteStatus } = {},
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: [...QUOTES_QUERY_KEY, params],
    queryFn: () => listQuotes(params),
    enabled: options.enabled ?? true,
  });
}

/** "Durum" buton filtresindeki her secenegin (Tumu + her QuoteStatus) yanina yazilacak
 * kayit sayisini getirir - `/quotes` ucu durum bazli kirilim dondurmuyor, bu yuzden her
 * secenek icin ayri, pageSize=1 ile ucuz bir istek atilir (sadece meta.total kullanilir). */
export function useQuoteStatusCounts(statuses: readonly QuoteStatus[]) {
  const results = useQueries({
    queries: [
      {
        queryKey: [...QUOTES_QUERY_KEY, 'count', 'all'],
        queryFn: () => listQuotes({ pageSize: 1 }),
      },
      ...statuses.map((status) => ({
        queryKey: [...QUOTES_QUERY_KEY, 'count', status],
        queryFn: () => listQuotes({ pageSize: 1, status }),
      })),
    ],
  });

  const [allResult, ...statusResults] = results;
  const counts: Partial<Record<QuoteStatus, number>> = {};
  statuses.forEach((status, index) => {
    const total = statusResults[index]?.data?.meta.total;
    if (total !== undefined) counts[status] = total;
  });

  return { all: allResult?.data?.meta.total, counts };
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
