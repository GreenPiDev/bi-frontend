import { useQueryClient } from '@tanstack/react-query';
import { useRealtimeEvent } from '../../lib/realtime';

const BRAND_OPTIONS_QUERY_KEY = ['brand-options'];

export function useBrandOptionsRealtimeSync(): void {
  const queryClient = useQueryClient();

  useRealtimeEvent('brandOptions.updated', () => {
    void queryClient.invalidateQueries({ queryKey: BRAND_OPTIONS_QUERY_KEY });
  });
}
