import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
    accountId?: string;
    status?: PostSaleCaseStatus;
  } = {},
) {
  return useQuery({
    queryKey: [...POST_SALE_CASES_QUERY_KEY, params],
    queryFn: () => listPostSaleCases(params),
  });
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
