import { useQueryClient } from '@tanstack/react-query';
import { useRealtimeEvent } from '../../lib/realtime';

const IBAN_OPTIONS_QUERY_KEY = ['iban-options'];

export function useIbanOptionsRealtimeSync(): void {
  const queryClient = useQueryClient();

  useRealtimeEvent('ibanOptions.updated', () => {
    void queryClient.invalidateQueries({ queryKey: IBAN_OPTIONS_QUERY_KEY });
  });
}
