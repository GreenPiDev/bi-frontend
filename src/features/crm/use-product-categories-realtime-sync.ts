import { useQueryClient } from '@tanstack/react-query';
import { useRealtimeEvent } from '../../lib/realtime';

const PRODUCT_CATEGORY_OPTIONS_QUERY_KEY = ['product-categories'];

export function useProductCategoryOptionsRealtimeSync(): void {
  const queryClient = useQueryClient();

  useRealtimeEvent('productCategoryOptions.updated', () => {
    void queryClient.invalidateQueries({ queryKey: PRODUCT_CATEGORY_OPTIONS_QUERY_KEY });
  });
}
