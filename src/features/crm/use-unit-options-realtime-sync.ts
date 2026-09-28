import { useQueryClient } from '@tanstack/react-query';
import { useRealtimeEvent } from '../../lib/realtime';

const UNIT_OPTIONS_QUERY_KEY = ['unit-options'];

export function useUnitOptionsRealtimeSync(): void {
  const queryClient = useQueryClient();

  useRealtimeEvent('unitOptions.updated', () => {
    void queryClient.invalidateQueries({ queryKey: UNIT_OPTIONS_QUERY_KEY });
  });
}
