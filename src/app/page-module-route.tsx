import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useMeQuery } from '../features/auth/use-auth';
import { usePageAccessQuery } from '../features/crm/use-page-access';
import { tr } from '../i18n/tr';
import { AppShell } from './app-shell';

/**
 * Route seviyesinde sayfa-modul erisim kontrolu - platform-admin panelindeki
 * "Sayfa-Modul Eslemesi" ekraninda (bkz. platform-admin-page-modules.tsx) bir
 * sayfanin modul atamasi degistirilince bu kontrol de otomatik guncellenir,
 * ayrica kod degisikligi gerekmez (bkz. features/crm/use-page-access.ts).
 */
export function PageModuleRoute({ pageKey, children }: { pageKey: string; children: ReactNode }) {
  const meQuery = useMeQuery();
  const pageAccessQuery = usePageAccessQuery();

  if (meQuery.isPending || pageAccessQuery.isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-app-muted">
        {tr.common.loading}
      </div>
    );
  }

  if (!meQuery.data) {
    return <Navigate to="/login" replace />;
  }

  const entry = pageAccessQuery.data?.find((row) => row.pageKey === pageKey);
  const accessible = entry?.accessible ?? true;

  if (!accessible) {
    return (
      <AppShell>
        <div className="rounded-xl border border-dashed border-app-border bg-app-surface p-8 text-center">
          <h1 className="text-lg font-bold text-app-text">{tr.crm.moduleDisabledTitle}</h1>
          <p className="mt-2 text-sm text-app-muted">{tr.crm.moduleDisabledBody}</p>
        </div>
      </AppShell>
    );
  }

  return <>{children}</>;
}
