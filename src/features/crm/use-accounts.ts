import {
  useInfiniteQuery,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  createAccount,
  deleteAccount,
  exportAccounts,
  getAccount,
  listAccounts,
  updateAccount,
  type AccountInput,
} from '../../lib/api';

export const ACCOUNTS_QUERY_KEY = ['accounts'];

export function useExportAccountsMutation() {
  return useMutation({
    mutationFn: (params: {
      q?: string;
      from?: string;
      notContactedDays?: number;
      createdById?: string;
      columns: string[];
    }) => exportAccounts(params),
  });
}

/** /raporlar "Firmalar" tab'indaki KPI kartlari - `/accounts` ucu kirilim dondurmuyor,
 * bu yuzden her kart icin ayri, pageSize=1 ile ucuz bir istek atilir (sadece meta.total
 * kullanilir). "Bu ay eklenen" icin ayin ilk gunu `from` filtresine verilir. */
export function useAccountReportCounts() {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const results = useQueries({
    queries: [
      {
        queryKey: [...ACCOUNTS_QUERY_KEY, 'count', 'all'],
        queryFn: () => listAccounts({ pageSize: 1 }),
      },
      {
        queryKey: [...ACCOUNTS_QUERY_KEY, 'count', 'thisMonth'],
        queryFn: () => listAccounts({ pageSize: 1, from: startOfMonth.toISOString() }),
      },
      {
        queryKey: [...ACCOUNTS_QUERY_KEY, 'count', 'notContacted30'],
        queryFn: () => listAccounts({ pageSize: 1, notContactedDays: 30 }),
      },
      {
        queryKey: [...ACCOUNTS_QUERY_KEY, 'count', 'notContacted60'],
        queryFn: () => listAccounts({ pageSize: 1, notContactedDays: 60 }),
      },
    ],
  });

  const [all, thisMonth, notContacted30, notContacted60] = results;
  return {
    total: all?.data?.meta.total,
    thisMonth: thisMonth?.data?.meta.total,
    notContacted30: notContacted30?.data?.meta.total,
    notContacted60: notContacted60?.data?.meta.total,
  };
}

export function useAccountsQuery(
  params: {
    page?: number;
    pageSize?: number;
    q?: string;
    sort?: string;
    from?: string;
    notContactedDays?: number;
    createdById?: string;
  } = {},
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: [...ACCOUNTS_QUERY_KEY, params],
    queryFn: () => listAccounts(params),
    enabled: options.enabled ?? true,
  });
}

/** `AccountAutocomplete`'in `loadAllWhenEmpty` modu icin: arama metni yokken firma
 * listesini sayfa sayfa (infinite scroll) tarar - tek seferde `pageSize` siniri
 * (bkz. core/dto/list-query.dto.ts, max 100) asilmaz, bunun yerine kullanici menude
 * asagi kaydirinca `fetchNextPage` ile bir sonraki sayfa cekilir. */
export function useAccountsBrowseQuery(enabled: boolean, pageSize: number) {
  return useInfiniteQuery({
    queryKey: [...ACCOUNTS_QUERY_KEY, 'browse-all', pageSize],
    queryFn: ({ pageParam }) => listAccounts({ page: pageParam, pageSize }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.meta.page < lastPage.meta.totalPages ? lastPage.meta.page + 1 : undefined,
    enabled,
  });
}

export function useAccountQuery(id: string) {
  return useQuery({
    queryKey: ['accounts', id],
    queryFn: () => getAccount(id),
    enabled: Boolean(id),
  });
}

export function useCreateAccountMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AccountInput) => createAccount(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ACCOUNTS_QUERY_KEY });
    },
  });
}

export function useUpdateAccountMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<AccountInput>) => updateAccount(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ACCOUNTS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ['accounts', id] });
    },
  });
}

export function useDeleteAccountMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAccount(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ACCOUNTS_QUERY_KEY });
    },
  });
}
