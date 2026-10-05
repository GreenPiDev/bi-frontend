import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  approveQuote,
  createQuote,
  deleteQuote,
  getQuote,
  getQuoteFxRates,
  getQuoteRevisionSummary,
  listQuotes,
  rejectQuote,
  updateQuote,
  type CreateQuoteInput,
  type QuoteStatus,
  type UpdateQuoteInput,
} from '../../lib/api';

export const QUOTES_QUERY_KEY = ['quotes'];

export function useQuotesQuery(
  params: {
    page?: number;
    pageSize?: number;
    accountId?: string;
    status?: QuoteStatus;
    createdById?: string;
    q?: string;
    from?: string;
    to?: string;
  } = {},
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
    mutationFn: (warehouseId: string) => approveQuote(id, warehouseId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUOTES_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ['quotes', id] });
    },
  });
}

/** Teklif para birimi secimi icin guncel kur - otomatik on-doldurma, kullanici elle
 * duzenleyebilir (bkz. Quote.exchangeRates). targets bossa hic istek atilmaz. */
export function useFxRatesQuery(base: string, targets: string[]) {
  const sortedTargets = [...new Set(targets)].sort();
  return useQuery({
    queryKey: ['quotes', 'fx-rates', base, sortedTargets],
    queryFn: () => getQuoteFxRates(base, sortedTargets),
    enabled: sortedTargets.length > 0,
    staleTime: 60 * 60 * 1000,
    retry: false,
  });
}

/** /teklifler/yeni'deki firma bazli uyari icin ("Bu firma daha once N kere revize
 * istedi") - accountId secilmediyse istek atilmaz. */
export function useQuoteRevisionSummaryQuery(accountId: string | undefined) {
  return useQuery({
    queryKey: [...QUOTES_QUERY_KEY, 'revision-summary', accountId],
    queryFn: () => getQuoteRevisionSummary(accountId as string),
    enabled: Boolean(accountId),
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
