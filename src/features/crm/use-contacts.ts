import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createContact,
  deleteContact,
  getContact,
  listContacts,
  updateContact,
  type ContactInput,
  type ContactStatus,
} from '../../lib/api';

export const CONTACTS_QUERY_KEY = ['contacts'];

/** /raporlar "Kişiler" tab'indaki KPI kartlari - `/contacts` ucu durum bazli kirilim
 * dondurmuyor, her kart icin ayri, pageSize=1 ile ucuz bir istek atilir (bkz.
 * useQuoteStatusCounts'taki ayni desen, use-quotes.ts). */
export function useContactStatusCounts() {
  const results = useQueries({
    queries: [
      {
        queryKey: [...CONTACTS_QUERY_KEY, 'count', 'all'],
        queryFn: () => listContacts({ pageSize: 1 }),
      },
      {
        queryKey: [...CONTACTS_QUERY_KEY, 'count', 'ACTIVE'],
        queryFn: () => listContacts({ pageSize: 1, status: 'ACTIVE' }),
      },
      {
        queryKey: [...CONTACTS_QUERY_KEY, 'count', 'INACTIVE'],
        queryFn: () => listContacts({ pageSize: 1, status: 'INACTIVE' }),
      },
    ],
  });

  const [all, active, inactive] = results;
  return {
    total: all?.data?.meta.total,
    active: active?.data?.meta.total,
    inactive: inactive?.data?.meta.total,
  };
}

export function useContactsQuery(
  params: {
    page?: number;
    pageSize?: number;
    q?: string;
    accountId?: string;
    status?: ContactStatus;
    sort?: string;
    createdById?: string;
  } = {},
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: [...CONTACTS_QUERY_KEY, params],
    queryFn: () => listContacts(params),
    enabled: options.enabled ?? true,
  });
}

export function useContactQuery(id: string) {
  return useQuery({
    queryKey: ['contacts', id],
    queryFn: () => getContact(id),
    enabled: Boolean(id),
  });
}

export function useCreateContactMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ContactInput) => createContact(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CONTACTS_QUERY_KEY });
    },
  });
}

export function useUpdateContactMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<ContactInput>) => updateContact(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CONTACTS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ['contacts', id] });
    },
  });
}

export function useDeleteContactMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteContact(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CONTACTS_QUERY_KEY });
    },
  });
}
