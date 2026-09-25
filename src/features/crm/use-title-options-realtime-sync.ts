import { useQueryClient } from '@tanstack/react-query';
import { useRealtimeEvent } from '../../lib/realtime';

const TITLE_OPTIONS_QUERY_KEY = ['title-options'];

export function useTitleOptionsRealtimeSync(): void {
  const queryClient = useQueryClient();

  useRealtimeEvent('titleOptions.updated', () => {
    void queryClient.invalidateQueries({ queryKey: TITLE_OPTIONS_QUERY_KEY });
  });
}
