import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createContact,
  deleteContact,
  getContact,
  listContacts,
  updateContact,
  type ContactInput,
} from '../../lib/api';

export const CONTACTS_QUERY_KEY = ['contacts'];

export function useContactsQuery(params: { page?: number; q?: string } = {}) {
  return useQuery({
    queryKey: [...CONTACTS_QUERY_KEY, params],
    queryFn: () => listContacts(params),
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
