import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createInteraction,
  deleteInteraction,
  exportInteractions,
  getInteraction,
  listInteractionCreators,
  listInteractions,
  updateInteraction,
  type CreateInteractionInput,
  type ExportFormat,
  type InteractionStatus,
  type InteractionType,
  type UpdateInteractionInput,
} from '../../lib/api';

export const INTERACTIONS_QUERY_KEY = ['interactions'];

export function useInteractionsQuery(
  params: {
    page?: number;
    pageSize?: number;
    q?: string;
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

/** /raporlar "Görüşmeler" tab'indaki KPI kartlari - toplam + durum bazli (bkz.
 * useInteractionTypeCounts'taki ayni desen) + bu hafta/bu ay eklenen (haftanin/ayin
 * ilk gunu `from` filtresine verilir). Hafta Pazartesi baslar (bkz. calendar-page.tsx
 * ayni (getDay()+6)%7 deseni). */
export function useInteractionReportCounts() {
  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - ((startOfWeek.getDay() + 6) % 7));
  startOfWeek.setHours(0, 0, 0, 0);

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const results = useQueries({
    queries: [
      {
        queryKey: [...INTERACTIONS_QUERY_KEY, 'count', 'all'],
        queryFn: () => listInteractions({ pageSize: 1 }),
      },
      {
        queryKey: [...INTERACTIONS_QUERY_KEY, 'count', 'OPEN'],
        queryFn: () => listInteractions({ pageSize: 1, status: 'OPEN' }),
      },
      {
        queryKey: [...INTERACTIONS_QUERY_KEY, 'count', 'CLOSED'],
        queryFn: () => listInteractions({ pageSize: 1, status: 'CLOSED' }),
      },
      {
        queryKey: [...INTERACTIONS_QUERY_KEY, 'count', 'thisWeek'],
        queryFn: () => listInteractions({ pageSize: 1, from: startOfWeek.toISOString() }),
      },
      {
        queryKey: [...INTERACTIONS_QUERY_KEY, 'count', 'thisMonth'],
        queryFn: () => listInteractions({ pageSize: 1, from: startOfMonth.toISOString() }),
      },
    ],
  });

  const [all, open, closed, thisWeek, thisMonth] = results;
  return {
    total: all?.data?.meta.total,
    open: open?.data?.meta.total,
    closed: closed?.data?.meta.total,
    thisWeek: thisWeek?.data?.meta.total,
    thisMonth: thisMonth?.data?.meta.total,
  };
}

export function useInteractionCreatorsQuery() {
  return useQuery({
    queryKey: ['interactions', 'creators'],
    queryFn: () => listInteractionCreators(),
  });
}

export function useExportInteractionsMutation() {
  return useMutation({
    mutationFn: (format: ExportFormat) => exportInteractions(format),
  });
}

export function useInteractionQuery(id: string) {
  return useQuery({
    queryKey: ['interactions', id],
    queryFn: () => getInteraction(id),
    enabled: Boolean(id),
  });
}

/** Bir gorusmenin detay sayfasinda "Bagli Gorusmeler" karti olarak gosterilen ek kayitlar -
 * parentInteractionId verilen /interactions istegi ana listede gizli olan bu kayitlari
 * getirir (bkz. InteractionsService.list varsayilan filtresi). */
export function useLinkedInteractionsQuery(parentInteractionId: string) {
  return useQuery({
    queryKey: [...INTERACTIONS_QUERY_KEY, 'linked', parentInteractionId],
    queryFn: () => listInteractions({ parentInteractionId, pageSize: 100 }),
    enabled: Boolean(parentInteractionId),
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
