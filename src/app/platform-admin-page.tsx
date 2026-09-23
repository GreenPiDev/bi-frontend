import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { PageHelp } from '../components/ui/page-help';
import { Table, type TableColumn } from '../components/ui/table';
import { usePlatformTenantsQuery } from '../features/platform-admin/use-platform-admin';
import type { TenantSummary } from '../lib/api';
import { tr } from '../i18n/tr';
import { AppShell } from './app-shell';
import { PlatformAdminTenantActions } from './platform-admin-tenant-actions';
import { PlatformAdminTenantModules } from './platform-admin-tenant-modules';

const dateFormatter = new Intl.DateTimeFormat('tr-TR');

export function PlatformAdminPage() {
  const tenantsQuery = usePlatformTenantsQuery();

  const columns: TableColumn<TenantSummary>[] = [
    {
      key: 'name',
      header: tr.platformAdmin.tenantColumn,
      render: (tenant) => <span className="font-semibold text-app-text">{tenant.name}</span>,
    },
    {
      key: 'adminEmail',
      header: tr.platformAdmin.adminEmailColumn,
      className: 'text-app-muted',
      render: (tenant) => tenant.adminEmail ?? '—',
    },
    {
      key: 'plan',
      header: tr.platformAdmin.planColumn,
      className: 'text-app-muted',
      render: (tenant) => tenant.plan,
    },
    {
      key: 'createdAt',
      header: tr.platformAdmin.createdAtColumn,
      className: 'text-app-muted',
      render: (tenant) => dateFormatter.format(new Date(tenant.createdAt)),
    },
    {
      key: 'modules',
      header: tr.platformAdmin.modulesColumn,
      render: (tenant) => <PlatformAdminTenantModules tenantId={tenant.id} />,
    },
    {
      key: 'actions',
      header: tr.platformAdmin.actionsColumn,
      render: (tenant) => (
        <PlatformAdminTenantActions tenantId={tenant.id} adminEmail={tenant.adminEmail} />
      ),
    },
  ];

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

      <Table
        columns={columns}
        data={tenantsQuery.data ?? []}
        keyField={(tenant) => tenant.id}
        isLoading={tenantsQuery.isPending}
        loadingMessage={tr.platformAdmin.loading}
        emptyMessage={tr.platformAdmin.empty}
      />
    </AppShell>
  );
}
