import { useQueryClient } from '@tanstack/react-query';
import { useRealtimeEvent } from '../../lib/realtime';

const PAGE_ACCESS_QUERY_KEYS = [['tenants', 'me', 'page-modules'], ['page-registry']];

/** Superadminin /platform-admin panelindeki iki islemi de bu tenant'in (veya tum
 * tenant'larin) sayfa erisimini degistirebilir:
 * - Bir tenant'in modulunu ac/kapat yapmak (`PlatformAdminService.setTenantModule`) ->
 *   backend `tenant.modules.updated` event'ini o tenant'in odasina yayinlar.
 * - Sayfa<->modul eslemesini degistirmek (`PlatformAdminService.setPageModule`, bkz.
 *   /platform-admin/sayfa-modulleri) TUM tenant'lari etkiler -> backend
 *   `page-modules.updated` event'ini herkese yayinlar.
 * Her iki durumda da payload'un icerigiyle ilgilenmeden, sayfa erisimine bagli
 * sorgulari invalidate ediyoruz - React Query geri kalanini (refetch + rerender)
 * kendisi hallediyor. */
export function useModuleAccessRealtimeSync(): void {
  const queryClient = useQueryClient();

  function invalidatePageAccessQueries() {
    for (const queryKey of PAGE_ACCESS_QUERY_KEYS) {
      void queryClient.invalidateQueries({ queryKey });
    }
  }

  useRealtimeEvent('tenant.modules.updated', () => {
    void queryClient.invalidateQueries({ queryKey: ['tenants', 'me', 'modules'] });
    invalidatePageAccessQueries();
  });

  useRealtimeEvent('page-modules.updated', () => {
    invalidatePageAccessQueries();
  });
}
