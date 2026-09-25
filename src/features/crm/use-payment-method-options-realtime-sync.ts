import { useQueryClient } from '@tanstack/react-query';
import { useRealtimeEvent } from '../../lib/realtime';

const PAYMENT_METHOD_OPTIONS_QUERY_KEY = ['payment-method-options'];

export function usePaymentMethodOptionsRealtimeSync(): void {
  const queryClient = useQueryClient();

  useRealtimeEvent('paymentMethodOptions.updated', () => {
    void queryClient.invalidateQueries({ queryKey: PAYMENT_METHOD_OPTIONS_QUERY_KEY });
  });
}
