import { Copy, Search } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { ConfirmModal } from '../components/ui/confirm-modal';
import { IconActionButton } from '../components/ui/icon-action-button';
import { PageHelp } from '../components/ui/page-help';
import { Table, type TableColumn } from '../components/ui/table';
import { useToast } from '../components/ui/toast-context';
import {
  useFlushAllTenantCachesMutation,
  usePlatformTenantsQuery,
} from '../features/platform-admin/use-platform-admin';
import { ApiError, type TenantSummary } from '../lib/api';
import { tr } from '../i18n/tr';
import { copyToClipboard } from '../lib/copy-to-clipboard';
import { useDebouncedValue } from '../lib/use-debounced-value';
import { AppShell } from './app-shell';
import { PlatformAdminTenantActions } from './platform-admin-tenant-actions';
import { PlatformAdminTenantModules } from './platform-admin-tenant-modules';

const dateFormatter = new Intl.DateTimeFormat('tr-TR');

export function PlatformAdminPage() {
  const [qInput, setQInput] = useState('');
  const q = useDebouncedValue(qInput.trim());
  const tenantsQuery = usePlatformTenantsQuery(q || undefined);
  const toast = useToast();
  const flushCachesMutation = useFlushAllTenantCachesMutation();
  const [confirmingFlush, setConfirmingFlush] = useState(false);

  function handleFlushAllCaches() {
    flushCachesMutation.mutate(undefined, {
      onSuccess: () => {
        toast.success(tr.platformAdmin.flushAllCachesSuccessToast);
        setConfirmingFlush(false);
      },
      onError: (error) => {
        toast.error(
          error instanceof ApiError ? error.message : tr.platformAdmin.flushAllCachesError,
        );
      },
    });
  }

  async function handleCopyEmail(email: string) {
    if (await copyToClipboard(email)) toast.success(tr.platformAdmin.emailCopiedToast);
    else toast.error(tr.common.copyFailed);
  }

  async function handleCopyTenantId(id: string) {
    if (await copyToClipboard(id)) toast.success(tr.platformAdmin.tenantIdCopiedToast);
    else toast.error(tr.common.copyFailed);
  }

  const columns: TableColumn<TenantSummary>[] = [
    {
      key: 'name',
      header: tr.platformAdmin.tenantColumn,
      render: (tenant) => <span className="font-semibold text-app-text">{tenant.name}</span>,
    },
    {
      key: 'id',
      header: tr.platformAdmin.tenantIdColumn,
      className: 'font-mono text-app-muted',
      render: (tenant) => (
        <div className="flex items-center gap-1">
          {/* Short prefix keeps the table narrow; full id is in the title + copy action. */}
          <span title={tenant.id}>{tenant.id.slice(0, 8)}…</span>
          <IconActionButton
            icon={Copy}
            tooltip={tr.platformAdmin.copyTenantIdButton}
            iconSize={14}
            onClick={() => void handleCopyTenantId(tenant.id)}
          />
        </div>
      ),
    },
    {
      key: 'adminEmail',
      header: tr.platformAdmin.adminEmailColumn,
      className: 'text-app-muted',
      render: (tenant) => {
        const email = tenant.adminEmail;
        if (!email) return '—';
        return (
          <div className="flex items-center gap-1">
            <span>{email}</span>
            <IconActionButton
              icon={Copy}
              tooltip={tr.platformAdmin.copyEmailButton}
              iconSize={14}
              onClick={() => void handleCopyEmail(email)}
            />
          </div>
        );
      },
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
      key: 'subdomain',
      header: tr.platformAdmin.subdomainColumn,
      className: 'font-mono text-app-muted',
      render: (tenant) => `${tenant.slug}.pilens.com.tr`,
    },
    {
      key: 'actions',
      header: tr.platformAdmin.actionsColumn,
      render: (tenant) => (
        <PlatformAdminTenantActions
          tenantId={tenant.id}
          adminEmail={tenant.adminEmail}
          slug={tenant.slug}
        />
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
        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={() => setConfirmingFlush(true)}>
            {tr.platformAdmin.flushAllCachesButton}
          </Button>
          <Link to="/new-customer">
            <Button type="button">{tr.platformAdmin.addTenantButton}</Button>
          </Link>
        </div>
      </div>

      <div className="relative mt-6 w-full">
        <Search
          size={16}
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-app-muted"
        />
        <input
          type="search"
          value={qInput}
          onChange={(event) => setQInput(event.target.value)}
          placeholder={tr.platformAdmin.searchPlaceholder}
          className="w-full rounded-lg border border-app-border bg-app-surface py-2.5 pr-3 pl-9 text-sm text-app-text outline-none focus:border-app-primary"
        />
      </div>

      <Table
        columns={columns}
        data={tenantsQuery.data ?? []}
        keyField={(tenant) => tenant.id}
        isLoading={tenantsQuery.isPending}
        loadingMessage={tr.platformAdmin.loading}
        emptyMessage={tr.platformAdmin.empty}
      />

      {confirmingFlush && (
        <ConfirmModal
          title={tr.platformAdmin.flushAllCachesConfirm.title}
          message={tr.platformAdmin.flushAllCachesConfirm.message}
          confirmLabel={tr.platformAdmin.flushAllCachesConfirm.confirmButton}
          isPending={flushCachesMutation.isPending}
          onConfirm={handleFlushAllCaches}
          onCancel={() => setConfirmingFlush(false)}
        />
      )}
    </AppShell>
  );
}
