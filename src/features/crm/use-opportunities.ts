import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createOpportunity,
  deleteOpportunity,
  getOpportunity,
  listOpportunities,
  updateOpportunity,
  type OpportunityInput,
  type OpportunityStage,
} from '../../lib/api';

export const OPPORTUNITIES_QUERY_KEY = ['opportunities'];

export function useOpportunitiesQuery(
  params: { page?: number; accountId?: string; stage?: OpportunityStage } = {},
) {
  return useQuery({
    queryKey: [...OPPORTUNITIES_QUERY_KEY, params],
    queryFn: () => listOpportunities(params),
  });
}

export function useOpportunityQuery(id: string) {
  return useQuery({
    queryKey: ['opportunities', id],
    queryFn: () => getOpportunity(id),
    enabled: Boolean(id),
  });
}

export function useCreateOpportunityMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: OpportunityInput) => createOpportunity(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: OPPORTUNITIES_QUERY_KEY });
    },
  });
}

export function useUpdateOpportunityMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<OpportunityInput>) => updateOpportunity(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: OPPORTUNITIES_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ['opportunities', id] });
    },
  });
}

export function useDeleteOpportunityMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteOpportunity(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: OPPORTUNITIES_QUERY_KEY });
    },
  });
}
