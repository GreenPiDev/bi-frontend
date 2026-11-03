import { RotateCcw, UserX } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '../components/ui/badge';
import { ConfirmModal } from '../components/ui/confirm-modal';
import { IconActionButton } from '../components/ui/icon-action-button';
import { FormError } from '../components/ui/form-error';
import { PageHelp } from '../components/ui/page-help';
import { Table, type TableColumn } from '../components/ui/table';
import {
  useDeactivateDemoUserMutation,
  usePlatformDemoUsersQuery,
} from '../features/platform-admin/use-platform-admin';
import { tr } from '../i18n/tr';
import { useToast } from '../components/ui/toast-context';
import type { DemoUserSummary } from '../lib/api';
import { AppShell } from './app-shell';
import { ExtendDemoUserModal } from './extend-demo-user-modal';

const copy = tr.platformAdmin.demoUsers;

const dateTimeFormatter = new Intl.DateTimeFormat('tr-TR', {
  dateStyle: 'short',
  timeStyle: 'short',
});

function formatDateTime(value: string | null): string {
  return value ? dateTimeFormatter.format(new Date(value)) : '—';
}

function DemoStatusBadge({ user, now }: { user: DemoUserSummary; now: number }) {
  if (!user.isActive) return <Badge variant="neutral">{copy.status.inactive}</Badge>;
  if (!user.demoExpiresAt) return <Badge variant="info">{copy.status.notStarted}</Badge>;
  return Date.parse(user.demoExpiresAt) > now ? (
    <Badge variant="success">{copy.status.active}</Badge>
  ) : (
    <Badge variant="danger">{copy.status.expired}</Badge>
  );
}

/** `now` sayfa acilisinda bir kez alinir (render saf kalsin diye) - durum sutunu icin. */
function buildColumns(
  now: number,
  onExtend: (user: DemoUserSummary) => void,
  onDeactivate: (user: DemoUserSummary) => void,
): TableColumn<DemoUserSummary>[] {
  return [
    { key: 'name', header: copy.columns.name, render: (user) => user.name },
    { key: 'company', header: copy.columns.company, render: (user) => user.companyName ?? '—' },
    {
      key: 'email',
      header: copy.columns.email,
      render: (user) => (
        <a href={`mailto:${user.email}`} className="text-app-brand hover:underline">
          {user.email}
        </a>
      ),
    },
    {
      key: 'phone',
      header: copy.columns.phone,
      render: (user) =>
        user.phone ? (
          <a
            href={`tel:${user.phone.replace(/\s/g, '')}`}
            className="text-app-brand hover:underline"
          >
            {user.phone}
          </a>
        ) : (
          '—'
        ),
    },
    { key: 'tenant', header: copy.columns.tenant, render: (user) => user.tenantSlug },
    {
      key: 'createdAt',
      header: copy.columns.createdAt,
      render: (user) => formatDateTime(user.createdAt),
    },
    {
      key: 'lastLoginAt',
      header: copy.columns.lastLoginAt,
      render: (user) => formatDateTime(user.lastLoginAt),
    },
    {
      key: 'expiresAt',
      header: copy.columns.expiresAt,
      render: (user) => formatDateTime(user.demoExpiresAt),
    },
    {
      key: 'status',
      header: copy.columns.status,
      render: (user) => <DemoStatusBadge user={user} now={now} />,
    },
    {
      key: 'actions',
      header: copy.columns.actions,
      render: (user) => (
        <div className="flex items-center">
          <IconActionButton
            icon={RotateCcw}
            tooltip={copy.extend.button}
            onClick={() => onExtend(user)}
          />
          {user.isActive && (!user.demoExpiresAt || Date.parse(user.demoExpiresAt) > now) && (
            <IconActionButton
              icon={UserX}
              variant="danger"
              tooltip={copy.deactivate.button}
              onClick={() => onDeactivate(user)}
            />
          )}
        </div>
      ),
    },
  ];
}

/** Sadece super admin (PlatformAdminRoute + backend PlatformAdminGuard): tanitim
 * sayfasindan acilan demo hesaplari ve iletisim bilgileri (bkz. modules/demo-accounts). */
export function PlatformAdminDemoUsersPage() {
  const demoUsersQuery = usePlatformDemoUsersQuery();
  const [now] = useState(() => Date.now());
  const [extending, setExtending] = useState<DemoUserSummary | null>(null);
  const [deactivating, setDeactivating] = useState<DemoUserSummary | null>(null);
  const deactivateMutation = useDeactivateDemoUserMutation();
  const toast = useToast();

  function confirmDeactivate() {
    if (!deactivating) return;
    deactivateMutation.mutate(deactivating.id, {
      onSuccess: () => toast.success(copy.deactivate.success),
      onError: () => toast.error(copy.deactivate.error),
      onSettled: () => setDeactivating(null),
    });
  }
  return (
    <AppShell>
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-bold text-app-text">{copy.title}</h1>
        <PageHelp text={tr.help.platformAdminDemoUsers} />
      </div>
      <p className="mt-1 mb-4 text-sm text-app-muted">{copy.subtitle}</p>
      {demoUsersQuery.isError && <FormError message={copy.error} />}
      <Table
        columns={buildColumns(now, setExtending, setDeactivating)}
        data={demoUsersQuery.data ?? []}
        keyField={(user) => user.id}
        isLoading={demoUsersQuery.isPending}
        loadingMessage={copy.loading}
        emptyMessage={copy.empty}
        scrollX
      />
      {extending && <ExtendDemoUserModal user={extending} onClose={() => setExtending(null)} />}
      {deactivating && (
        <ConfirmModal
          title={copy.deactivate.title}
          message={copy.deactivate.message(deactivating.name)}
          confirmLabel={copy.deactivate.confirm}
          isPending={deactivateMutation.isPending}
          onConfirm={confirmDeactivate}
          onCancel={() => setDeactivating(null)}
        />
      )}
    </AppShell>
  );
}
