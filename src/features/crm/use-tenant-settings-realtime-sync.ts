import { useQueryClient } from '@tanstack/react-query';
import { useRealtimeEvent } from '../../lib/realtime';
import { TENANT_SETTINGS_QUERY_KEY } from './use-tenant-settings';

/** /settings?tab=crm'de bir ayar (ör. teklif metinleri, KDV orani) kaydedilince,
 * ayni anda baska bir sekmede acik olan /teklifler/yeni gibi ekranlar sayfa
 * yenilenmeden guncel degeri alsin diye (bkz. useWarehousesRealtimeSync ile ayni desen). */
export function useTenantSettingsRealtimeSync(): void {
  const queryClient = useQueryClient();

  useRealtimeEvent('tenantSettings.updated', () => {
    void queryClient.invalidateQueries({ queryKey: TENANT_SETTINGS_QUERY_KEY });
  });
}
