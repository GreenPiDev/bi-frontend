import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useMeQuery } from '../features/auth/use-auth';
import { useMyTenantModulesQuery } from '../features/crm/use-tenant-modules';
import { tr } from '../i18n/tr';
import { AppShell } from './app-shell';

export function CrmModuleRoute({ children }: { children: ReactNode }) {
  const meQuery = useMeQuery();
  const modulesQuery = useMyTenantModulesQuery();

  if (meQuery.isPending || modulesQuery.isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-app-muted">
        {tr.common.loading}
      </div>
    );
  }

  if (!meQuery.data) {
    return <Navigate to="/login" replace />;
  }

  const crmEnabled = modulesQuery.data?.some((module) => module.key === 'crm' && module.enabled);

  if (!crmEnabled) {
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
