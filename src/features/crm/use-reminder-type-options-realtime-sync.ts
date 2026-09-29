import { useQueryClient } from '@tanstack/react-query';
import { useRealtimeEvent } from '../../lib/realtime';

const REMINDER_TYPE_OPTIONS_QUERY_KEY = ['reminder-type-options'];

export function useReminderTypeOptionsRealtimeSync(): void {
  const queryClient = useQueryClient();

  useRealtimeEvent('reminderTypeOptions.updated', () => {
    void queryClient.invalidateQueries({ queryKey: REMINDER_TYPE_OPTIONS_QUERY_KEY });
  });
}
