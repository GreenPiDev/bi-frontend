import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createSurvey,
  deleteSurvey,
  getSurvey,
  listActiveSurveys,
  listSurveys,
  updateSurvey,
  type SurveyInput,
} from '../../lib/api';

export const SURVEYS_QUERY_KEY = ['surveys'];

export function useSurveysQuery(params: { page?: number; pageSize?: number; q?: string } = {}) {
  return useQuery({
    queryKey: [...SURVEYS_QUERY_KEY, params],
    queryFn: () => listSurveys(params),
  });
}

/** Gonderim ekranindaki secici icin - sadece isActive=true anketler. */
export function useActiveSurveysQuery() {
  return useQuery({
    queryKey: [...SURVEYS_QUERY_KEY, 'active'],
    queryFn: () => listActiveSurveys(),
  });
}

export function useSurveyQuery(id: string) {
  return useQuery({
    queryKey: ['surveys', id],
    queryFn: () => getSurvey(id),
    enabled: Boolean(id),
  });
}

export function useCreateSurveyMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SurveyInput) => createSurvey(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SURVEYS_QUERY_KEY });
    },
  });
}

export function useUpdateSurveyMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<SurveyInput>) => updateSurvey(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SURVEYS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ['surveys', id] });
    },
  });
}

export function useDeleteSurveyMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteSurvey(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SURVEYS_QUERY_KEY });
    },
  });
}
