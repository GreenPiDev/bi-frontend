import { useQueryClient } from '@tanstack/react-query';
import { useRealtimeEvent } from '../../lib/realtime';

const QUOTE_REJECTION_REASON_OPTIONS_QUERY_KEY = ['quote-rejection-reason-options'];

export function useQuoteRejectionReasonOptionsRealtimeSync(): void {
  const queryClient = useQueryClient();

  useRealtimeEvent('quoteRejectionReasonOptions.updated', () => {
    void queryClient.invalidateQueries({ queryKey: QUOTE_REJECTION_REASON_OPTIONS_QUERY_KEY });
  });
}
