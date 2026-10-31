import { useState } from 'react';
import { Badge } from '../components/ui/badge';
import { FormError } from '../components/ui/form-error';
import { PageHelp } from '../components/ui/page-help';
import { Table, type TableColumn } from '../components/ui/table';
import { usePlatformDemoUsersQuery } from '../features/platform-admin/use-platform-admin';
import { tr } from '../i18n/tr';
import type { DemoUserSummary } from '../lib/api';
import { AppShell } from './app-shell';

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
function buildColumns(now: number): TableColumn<DemoUserSummary>[] {
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
  ];
}

/** Sadece super admin (PlatformAdminRoute + backend PlatformAdminGuard): tanitim
 * sayfasindan acilan demo hesaplari ve iletisim bilgileri (bkz. modules/demo-accounts). */
export function PlatformAdminDemoUsersPage() {
  const demoUsersQuery = usePlatformDemoUsersQuery();
  const [now] = useState(() => Date.now());
  return (
    <AppShell>
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-bold text-app-text">{copy.title}</h1>
        <PageHelp text={tr.help.platformAdminDemoUsers} />
      </div>
      <p className="mt-1 mb-4 text-sm text-app-muted">{copy.subtitle}</p>
      {demoUsersQuery.isError && <FormError message={copy.error} />}
      <Table
        columns={buildColumns(now)}
        data={demoUsersQuery.data ?? []}
        keyField={(user) => user.id}
        isLoading={demoUsersQuery.isPending}
        loadingMessage={copy.loading}
        emptyMessage={copy.empty}
        scrollX
      />
    </AppShell>
  );
}
