import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createCalendarEvent,
  deleteCalendarEvent,
  getCalendarEvent,
  listAssignableCalendarUsers,
  listCalendarEvents,
  updateCalendarEvent,
  type CalendarEventInput,
} from '../../lib/api';

export const CALENDAR_EVENTS_QUERY_KEY = ['calendar-events'];

export function useAssignableCalendarUsersQuery() {
  return useQuery({
    queryKey: ['calendar-events', 'assignable-users'],
    queryFn: () => listAssignableCalendarUsers(),
  });
}

export function useCalendarEventsQuery(
  params: { from?: string; to?: string; order?: 'asc' | 'desc' } = {},
) {
  return useQuery({
    queryKey: [...CALENDAR_EVENTS_QUERY_KEY, params],
    queryFn: () => listCalendarEvents(params),
  });
}

export function useCalendarEventQuery(id: string) {
  return useQuery({
    queryKey: ['calendar-events', id],
    queryFn: () => getCalendarEvent(id),
    enabled: Boolean(id),
  });
}

export function useCreateCalendarEventMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CalendarEventInput) => createCalendarEvent(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CALENDAR_EVENTS_QUERY_KEY });
    },
  });
}

export function useUpdateCalendarEventMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<CalendarEventInput>) => updateCalendarEvent(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CALENDAR_EVENTS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ['calendar-events', id] });
    },
  });
}

export function useDeleteCalendarEventMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCalendarEvent(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CALENDAR_EVENTS_QUERY_KEY });
    },
  });
}
