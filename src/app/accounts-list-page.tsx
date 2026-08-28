import { AlertTriangle, Search } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from './app-shell';
import { Button } from '../components/ui/button';
import { Pagination, Table, type TableColumn } from '../components/ui/table';
import { Tooltip } from '../components/ui/tooltip';
import { useAccountsQuery } from '../features/crm/use-accounts';
import { useExportEntityMutation } from '../features/crm/use-imports';
import { downloadBlob } from '../lib/download';
import type { Account } from '../lib/api';
import { tr } from '../i18n/tr';

const CRITICAL_FIELD_LABELS: Record<string, string> = tr.crm.accounts.criticalFieldLabels;

const columns: TableColumn<Account>[] = [
  {
    key: 'name',
    header: tr.crm.accounts.nameColumn,
    render: (a) => (
      <span className="flex items-center gap-1.5 font-semibold text-app-text">
        {a.name}
        {a.missingCriticalFields.length > 0 && (
          <Tooltip
            content={tr.crm.accounts.missingFieldsWarning(
              a.missingCriticalFields
                .map((field) => CRITICAL_FIELD_LABELS[field] ?? field)
                .join(', '),
            )}
          >
            <AlertTriangle size={14} className="shrink-0 text-amber-500" />
          </Tooltip>
        )}
      </span>
    ),
  },
  {
    key: 'city',
    header: tr.crm.accounts.cityColumn,
    className: 'text-app-muted',
    render: (a) => a.city ?? '—',
  },
  {
    key: 'phone',
    header: tr.crm.accounts.phoneColumn,
    className: 'text-app-muted',
    render: (a) => a.phone ?? '—',
  },
  {
    key: 'email',
    header: tr.crm.accounts.emailColumn,
    className: 'text-app-muted',
    render: (a) => a.email ?? '—',
  },
];

export function AccountsListPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [qInput, setQInput] = useState('');
  const accountsQuery = useAccountsQuery({ page, q: q || undefined });
  const exportMutation = useExportEntityMutation('accounts');

  function handleSearchSubmit(event: FormEvent) {
    event.preventDefault();
    setPage(1);
    setQ(qInput.trim());
  }

  return (
    <AppShell>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-app-text">{tr.crm.accounts.title}</h1>
          <p className="mt-1 text-sm text-app-muted">{tr.crm.accounts.subtitle}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            type="button"
            disabled={exportMutation.isPending}
            onClick={() =>
              exportMutation.mutate(undefined, {
                onSuccess: (blob) => downloadBlob(blob, 'firmalar.xlsx'),
              })
            }
          >
            {tr.crm.accounts.exportButton}
          </Button>
          <Button variant="secondary" type="button" onClick={() => navigate('/firmalar/ice-aktar')}>
            {tr.crm.accounts.importButton}
          </Button>
          <Button type="button" onClick={() => navigate('/firmalar/yeni')}>
            {tr.crm.accounts.newButton}
          </Button>
        </div>
      </div>

      <form onSubmit={handleSearchSubmit} className="mt-6 flex max-w-md items-center gap-2">
        <div className="relative flex-1">
          <Search
            size={16}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-app-muted"
          />
          <input
            type="search"
            value={qInput}
            onChange={(event) => setQInput(event.target.value)}
            placeholder={tr.crm.accounts.searchPlaceholder}
            className="w-full rounded-lg border border-app-border bg-app-surface py-2.5 pr-3 pl-9 text-sm text-app-text outline-none focus:ring-2 focus:ring-app-primary"
          />
        </div>
        <Button type="submit" variant="secondary">
          {tr.crm.accounts.title}
        </Button>
      </form>

      <Table
        columns={columns}
        data={accountsQuery.data?.data ?? []}
        keyField={(account) => account.id}
        onRowClick={(account) => navigate(`/firmalar/${account.id}`)}
        isLoading={accountsQuery.isPending}
        loadingMessage={tr.crm.accounts.loading}
        emptyMessage={tr.crm.accounts.empty}
      />

      {accountsQuery.data && accountsQuery.data.data.length > 0 && (
        <Pagination
          page={accountsQuery.data.meta.page}
          totalPages={accountsQuery.data.meta.totalPages}
          onPrevious={() => setPage((p) => p - 1)}
          onNext={() => setPage((p) => p + 1)}
        />
      )}
    </AppShell>
  );
}
