import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createInteraction,
  deleteInteraction,
  getInteraction,
  listInteractionCreators,
  listInteractions,
  updateInteraction,
  type CreateInteractionInput,
  type InteractionStatus,
  type InteractionType,
  type UpdateInteractionInput,
} from '../../lib/api';

export const INTERACTIONS_QUERY_KEY = ['interactions'];

export function useInteractionsQuery(
  params: {
    page?: number;
    pageSize?: number;
    accountId?: string;
    contactId?: string;
    createdById?: string;
    type?: InteractionType;
    status?: InteractionStatus;
    from?: string;
    to?: string;
  } = {},
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: [...INTERACTIONS_QUERY_KEY, params],
    queryFn: () => listInteractions(params),
    enabled: options.enabled ?? true,
  });
}

/** "Tür" buton filtresindeki her secenegin (Tumu + her InteractionType) yanina yazilacak
 * kayit sayisini getirir - `/interactions` ucu tur bazli kirilim dondurmuyor, bu yuzden her
 * secenek icin ayri, pageSize=1 ile ucuz bir istek atilir (sadece meta.total kullanilir). */
export function useInteractionTypeCounts(types: readonly InteractionType[]) {
  const results = useQueries({
    queries: [
      {
        queryKey: [...INTERACTIONS_QUERY_KEY, 'count', 'all'],
        queryFn: () => listInteractions({ pageSize: 1 }),
      },
      ...types.map((type) => ({
        queryKey: [...INTERACTIONS_QUERY_KEY, 'count', type],
        queryFn: () => listInteractions({ pageSize: 1, type }),
      })),
    ],
  });

  const [allResult, ...typeResults] = results;
  const counts: Partial<Record<InteractionType, number>> = {};
  types.forEach((type, index) => {
    const total = typeResults[index]?.data?.meta.total;
    if (total !== undefined) counts[type] = total;
  });

  return { all: allResult?.data?.meta.total, counts };
}

export function useInteractionCreatorsQuery() {
  return useQuery({
    queryKey: ['interactions', 'creators'],
    queryFn: () => listInteractionCreators(),
  });
}

export function useInteractionQuery(id: string) {
  return useQuery({
    queryKey: ['interactions', id],
    queryFn: () => getInteraction(id),
    enabled: Boolean(id),
  });
}

export function useCreateInteractionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateInteractionInput) => createInteraction(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: INTERACTIONS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ['accounts'] });
      void queryClient.invalidateQueries({ queryKey: ['contacts'] });
      void queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
    },
  });
}

export function useUpdateInteractionMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateInteractionInput) => updateInteraction(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: INTERACTIONS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ['interactions', id] });
    },
  });
}

export function useDeleteInteractionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteInteraction(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: INTERACTIONS_QUERY_KEY });
    },
  });
}
