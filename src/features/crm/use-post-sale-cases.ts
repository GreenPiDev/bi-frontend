import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getPostSaleCase,
  listPostSaleCases,
  markPostSaleFeedback,
  sendPostSaleSurvey,
  type PostSaleCaseStatus,
} from '../../lib/api';

export const POST_SALE_CASES_QUERY_KEY = ['post-sale-cases'];

export function usePostSaleCasesQuery(
  params: {
    page?: number;
    pageSize?: number;
    accountId?: string;
    status?: PostSaleCaseStatus;
  } = {},
) {
  return useQuery({
    queryKey: [...POST_SALE_CASES_QUERY_KEY, params],
    queryFn: () => listPostSaleCases(params),
  });
}

/** "Durum" buton filtresindeki her secenegin (Tumu + her PostSaleCaseStatus) yanina
 * yazilacak kayit sayisini getirir - `/post-sale-cases` ucu durum bazli kirilim
 * dondurmuyor, bu yuzden her secenek icin ayri, pageSize=1 ile ucuz bir istek atilir
 * (sadece meta.total kullanilir). */
export function usePostSaleCaseStatusCounts(statuses: readonly PostSaleCaseStatus[]) {
  const results = useQueries({
    queries: [
      {
        queryKey: [...POST_SALE_CASES_QUERY_KEY, 'count', 'all'],
        queryFn: () => listPostSaleCases({ pageSize: 1 }),
      },
      ...statuses.map((status) => ({
        queryKey: [...POST_SALE_CASES_QUERY_KEY, 'count', status],
        queryFn: () => listPostSaleCases({ pageSize: 1, status }),
      })),
    ],
  });

  const [allResult, ...statusResults] = results;
  const counts: Partial<Record<PostSaleCaseStatus, number>> = {};
  statuses.forEach((status, index) => {
    const total = statusResults[index]?.data?.meta.total;
    if (total !== undefined) counts[status] = total;
  });

  return { all: allResult?.data?.meta.total, counts };
}

export function usePostSaleCaseQuery(id: string) {
  return useQuery({
    queryKey: ['post-sale-cases', id],
    queryFn: () => getPostSaleCase(id),
    enabled: Boolean(id),
  });
}

export function useSendPostSaleSurveyMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { contactId?: string } = {}) => sendPostSaleSurvey(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: POST_SALE_CASES_QUERY_KEY,
      });
      void queryClient.invalidateQueries({ queryKey: ['post-sale-cases', id] });
    },
  });
}

export function useMarkPostSaleFeedbackMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { responseNote?: string } = {}) => markPostSaleFeedback(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: POST_SALE_CASES_QUERY_KEY,
      });
      void queryClient.invalidateQueries({ queryKey: ['post-sale-cases', id] });
    },
  });
}
