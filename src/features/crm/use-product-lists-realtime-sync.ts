import { useQueryClient } from '@tanstack/react-query';
import { useRealtimeEvent } from '../../lib/realtime';
import { PRODUCT_LISTS_QUERY_KEY } from './use-product-lists';

export function useProductListsRealtimeSync(): void {
  const queryClient = useQueryClient();

  useRealtimeEvent('productLists.updated', () => {
    void queryClient.invalidateQueries({ queryKey: PRODUCT_LISTS_QUERY_KEY });
  });
}
