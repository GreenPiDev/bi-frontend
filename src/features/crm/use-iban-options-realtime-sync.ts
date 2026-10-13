import { useQueryClient } from '@tanstack/react-query';
import { useRealtimeEvent } from '../../lib/realtime';
import { IBAN_OPTION_GROUPS_QUERY_KEY } from './use-iban-option-groups';

const IBAN_OPTIONS_QUERY_KEY = ['iban-options'];

export function useIbanOptionsRealtimeSync(): void {
  const queryClient = useQueryClient();

  useRealtimeEvent('ibanOptions.updated', () => {
    void queryClient.invalidateQueries({ queryKey: IBAN_OPTIONS_QUERY_KEY });
  });
  // Grup adi/varligi IbanOption.group uzerinden dropdown'a yansir (bkz.
  // iban-select.tsx) - grup degisince hesap listesi de tazelenmeli.
  useRealtimeEvent('ibanOptionGroups.updated', () => {
    void queryClient.invalidateQueries({ queryKey: IBAN_OPTION_GROUPS_QUERY_KEY });
    void queryClient.invalidateQueries({ queryKey: IBAN_OPTIONS_QUERY_KEY });
  });
}
