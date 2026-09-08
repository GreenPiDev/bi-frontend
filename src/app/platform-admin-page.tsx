import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { PageHelp } from '../components/ui/page-help';
import { usePlatformTenantsQuery } from '../features/platform-admin/use-platform-admin';
import { tr } from '../i18n/tr';
import { AppShell } from './app-shell';
import { PlatformAdminTenantActions } from './platform-admin-tenant-actions';
import { PlatformAdminTenantModules } from './platform-admin-tenant-modules';

const dateFormatter = new Intl.DateTimeFormat('tr-TR');

export function PlatformAdminPage() {
  const tenantsQuery = usePlatformTenantsQuery();

  return (
    <AppShell>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-app-text">{tr.platformAdmin.title}</h1>
            <PageHelp text={tr.help.platformAdmin} />
          </div>
          <p className="mt-1 text-sm text-app-muted">{tr.platformAdmin.subtitle}</p>
        </div>
        <Link to="/new-customer">
          <Button type="button">{tr.platformAdmin.addTenantButton}</Button>
        </Link>
      </div>

      {tenantsQuery.isPending && (
        <p className="mt-6 text-sm text-app-muted">{tr.platformAdmin.loading}</p>
      )}

      {tenantsQuery.data?.length === 0 && (
        <p className="mt-6 text-sm text-app-muted">{tr.platformAdmin.empty}</p>
      )}

      {tenantsQuery.data && tenantsQuery.data.length > 0 && (
        <div className="mt-6 overflow-hidden rounded-xl border border-app-border bg-app-surface">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-app-border text-xs uppercase text-app-muted">
              <tr>
                <th className="px-4 py-3">{tr.platformAdmin.tenantColumn}</th>
                <th className="px-4 py-3">{tr.platformAdmin.adminEmailColumn}</th>
                <th className="px-4 py-3">{tr.platformAdmin.planColumn}</th>
                <th className="px-4 py-3">{tr.platformAdmin.createdAtColumn}</th>
                <th className="px-4 py-3">{tr.platformAdmin.modulesColumn}</th>
                <th className="px-4 py-3">{tr.platformAdmin.actionsColumn}</th>
              </tr>
            </thead>
            <tbody>
              {tenantsQuery.data.map((tenant) => (
                <tr key={tenant.id} className="border-b border-app-border last:border-0">
                  <td className="px-4 py-3 font-semibold text-app-text">{tenant.name}</td>
                  <td className="px-4 py-3 text-app-muted">{tenant.adminEmail ?? '—'}</td>
                  <td className="px-4 py-3 text-app-muted">{tenant.plan}</td>
                  <td className="px-4 py-3 text-app-muted">
                    {dateFormatter.format(new Date(tenant.createdAt))}
                  </td>
                  <td className="px-4 py-3">
                    <PlatformAdminTenantModules tenantId={tenant.id} />
                  </td>
                  <td className="px-4 py-3">
                    <PlatformAdminTenantActions
                      tenantId={tenant.id}
                      adminEmail={tenant.adminEmail}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
