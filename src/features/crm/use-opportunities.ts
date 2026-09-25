import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createOpportunity,
  deleteOpportunity,
  getOpportunity,
  listOpportunities,
  updateOpportunity,
  type CreateOpportunityInput,
  type OpportunityInput,
  type OpportunityStage,
} from '../../lib/api';

export const OPPORTUNITIES_QUERY_KEY = ['opportunities'];

export function useOpportunitiesQuery(
  params: {
    page?: number;
    pageSize?: number;
    accountId?: string;
    stage?: OpportunityStage;
    minEstimatedValue?: number;
    from?: string;
    to?: string;
  } = {},
) {
  return useQuery({
    queryKey: [...OPPORTUNITIES_QUERY_KEY, params],
    queryFn: () => listOpportunities(params),
  });
}

/** "Asama" buton filtresindeki her secenegin (Tumu + her OpportunityStage) yanina yazilacak
 * kayit sayisini getirir - `/opportunities` ucu asama bazli kirilim dondurmuyor, bu yuzden
 * her secenek icin ayri, pageSize=1 ile ucuz bir istek atilir (sadece meta.total kullanilir). */
export function useOpportunityStageCounts(stages: readonly OpportunityStage[]) {
  const results = useQueries({
    queries: [
      {
        queryKey: [...OPPORTUNITIES_QUERY_KEY, 'count', 'all'],
        queryFn: () => listOpportunities({ pageSize: 1 }),
      },
      ...stages.map((stage) => ({
        queryKey: [...OPPORTUNITIES_QUERY_KEY, 'count', stage],
        queryFn: () => listOpportunities({ pageSize: 1, stage }),
      })),
    ],
  });

  const [allResult, ...stageResults] = results;
  const counts: Partial<Record<OpportunityStage, number>> = {};
  stages.forEach((stage, index) => {
    const total = stageResults[index]?.data?.meta.total;
    if (total !== undefined) counts[stage] = total;
  });

  return { all: allResult?.data?.meta.total, counts };
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
    mutationFn: (input: CreateOpportunityInput) => createOpportunity(input),
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
