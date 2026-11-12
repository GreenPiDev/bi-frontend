import { useEffect } from 'react';
import { setUnreadTitleCount } from '../../lib/document-title';
import { useUnreadNotificationsQuery } from './use-notifications';

/** Okunmamis bildirim sayisini sekme basligina yazar ("(3) PiLens"). Zil ikonuyla ayni
 * sorguyu paylasir (ayri istek atmaz); sayi 0 ise veya kullanici cikis yapinca rozet
 * kalkar. Basligin kendisi lib/document-title.ts'te birlestirilir, sayfaya ozel baslik
 * (usePageTitle) eklense bile bu hook onu ezmez. */
export function useUnreadTitleBadge(enabled: boolean): void {
  const count = useUnreadNotificationsQuery({ enabled }).data?.length ?? 0;

  useEffect(() => {
    setUnreadTitleCount(enabled ? count : 0);
    return () => setUnreadTitleCount(0);
  }, [enabled, count]);
}
