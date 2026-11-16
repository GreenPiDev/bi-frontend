import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addPlatformSupportTicketMessage,
  addSupportTicketMessage,
  createSupportTicket,
  getPlatformSupportTickets,
  getSupportTickets,
  updatePlatformSupportTicketStatus,
  type CreateSupportTicketInput,
  type SupportTicketStatus,
} from '../../lib/api';
import { useRealtimeEvent } from '../../lib/realtime';

export const SUPPORT_TICKETS_QUERY_KEY = ['support-tickets'];
const PLATFORM_SUPPORT_TICKETS_QUERY_KEY = ['platform-admin', 'support-tickets'];

export function useSupportTicketsQuery() {
  return useQuery({ queryKey: SUPPORT_TICKETS_QUERY_KEY, queryFn: getSupportTickets });
}

export function useCreateSupportTicketMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSupportTicketInput) => createSupportTicket(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SUPPORT_TICKETS_QUERY_KEY });
    },
  });
}

/** Super admin bir talebi guncelleyince (durum/cevap) tenant'in listesi anlik yenilenir. */
export function useSupportTicketsRealtimeSync(): void {
  const queryClient = useQueryClient();
  useRealtimeEvent('support.ticket.updated', () => {
    void queryClient.invalidateQueries({ queryKey: SUPPORT_TICKETS_QUERY_KEY });
  });
}

export function usePlatformSupportTicketsQuery(status?: SupportTicketStatus) {
  return useQuery({
    queryKey: [...PLATFORM_SUPPORT_TICKETS_QUERY_KEY, status ?? 'all'],
    queryFn: () => getPlatformSupportTickets(status),
  });
}

/** Bir tenant yeni talep acinca (veya baska bir super admin oturumu guncelleyince)
 * super admin listesi anlik yenilenir - backend 'platform-admins' room'una yollar. */
export function usePlatformSupportTicketsRealtimeSync(): void {
  const queryClient = useQueryClient();
  useRealtimeEvent('support.ticket.created', () => {
    void queryClient.invalidateQueries({ queryKey: PLATFORM_SUPPORT_TICKETS_QUERY_KEY });
  });
}

export function useAddSupportTicketMessageMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) => addSupportTicketMessage(id, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SUPPORT_TICKETS_QUERY_KEY });
    },
  });
}

export function useUpdatePlatformSupportTicketStatusMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: SupportTicketStatus }) =>
      updatePlatformSupportTicketStatus(id, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PLATFORM_SUPPORT_TICKETS_QUERY_KEY });
    },
  });
}

export function useAddPlatformSupportTicketMessageMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) =>
      addPlatformSupportTicketMessage(id, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PLATFORM_SUPPORT_TICKETS_QUERY_KEY });
    },
  });
}
