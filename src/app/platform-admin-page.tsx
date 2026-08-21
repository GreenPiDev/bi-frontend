import { usePlatformTenantsQuery } from '../features/platform-admin/use-platform-admin';
import { tr } from '../i18n/tr';
import { PlatformAdminTenantModules } from './platform-admin-tenant-modules';

const dateFormatter = new Intl.DateTimeFormat('tr-TR');

export function PlatformAdminPage() {
  const tenantsQuery = usePlatformTenantsQuery();

  return (
    <div className="min-h-screen bg-app-bg p-6 md:p-10">
      <h1 className="text-xl font-bold text-app-text">{tr.platformAdmin.title}</h1>
      <p className="mt-1 text-sm text-app-muted">{tr.platformAdmin.subtitle}</p>

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
                <th className="px-4 py-3">{tr.platformAdmin.planColumn}</th>
                <th className="px-4 py-3">{tr.platformAdmin.createdAtColumn}</th>
                <th className="px-4 py-3">{tr.platformAdmin.modulesColumn}</th>
              </tr>
            </thead>
            <tbody>
              {tenantsQuery.data.map((tenant) => (
                <tr key={tenant.id} className="border-b border-app-border last:border-0">
                  <td className="px-4 py-3 font-semibold text-app-text">{tenant.name}</td>
                  <td className="px-4 py-3 text-app-muted">{tenant.plan}</td>
                  <td className="px-4 py-3 text-app-muted">
                    {dateFormatter.format(new Date(tenant.createdAt))}
                  </td>
                  <td className="px-4 py-3">
                    <PlatformAdminTenantModules tenantId={tenant.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
