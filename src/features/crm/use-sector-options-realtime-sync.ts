import { useQueryClient } from '@tanstack/react-query';
import { useRealtimeEvent } from '../../lib/realtime';

const SECTOR_OPTIONS_QUERY_KEY = ['sector-options'];

export function useSectorOptionsRealtimeSync(): void {
  const queryClient = useQueryClient();

  useRealtimeEvent('sectorOptions.updated', () => {
    void queryClient.invalidateQueries({ queryKey: SECTOR_OPTIONS_QUERY_KEY });
  });
}
