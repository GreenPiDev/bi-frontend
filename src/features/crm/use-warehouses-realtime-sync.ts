import { useQueryClient } from '@tanstack/react-query';
import { useRealtimeEvent } from '../../lib/realtime';
import { WAREHOUSES_QUERY_KEY } from './use-warehouses';

export function useWarehousesRealtimeSync(): void {
  const queryClient = useQueryClient();

  useRealtimeEvent('warehouses.updated', () => {
    void queryClient.invalidateQueries({ queryKey: WAREHOUSES_QUERY_KEY });
  });
}
