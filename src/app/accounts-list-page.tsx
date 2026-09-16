import { AlertTriangle, Search } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from './app-shell';
import { Button } from '../components/ui/button';
import { Drawer } from '../components/ui/drawer';
import { PageHelp } from '../components/ui/page-help';
import { Pagination, Table, type TableColumn } from '../components/ui/table';
import { TextField } from '../components/ui/text-field';
import { Tooltip } from '../components/ui/tooltip';
import { useMeQuery } from '../features/auth/use-auth';
import { useAccountsQuery } from '../features/crm/use-accounts';
import { useExportEntityMutation } from '../features/crm/use-imports';
import { downloadBlob } from '../lib/download';
import { useDebouncedValue } from '../lib/use-debounced-value';
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

function daysAgoIsoDate(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

export function AccountsListPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [qInput, setQInput] = useState('');
  const q = useDebouncedValue(qInput.trim());
  const [from, setFrom] = useState('');
  const [lastNDaysInput, setLastNDaysInput] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const meQuery = useMeQuery();
  const pageSize = meQuery.data?.defaultPageSize ?? 25;
  const accountsQuery = useAccountsQuery({
    page,
    pageSize,
    q: q || undefined,
    from: from || undefined,
  });
  const exportMutation = useExportEntityMutation('accounts');
  const hasActiveFilter = Boolean(from);

  function applyLastNDays(value: string) {
    setLastNDaysInput(value);
    const days = Number(value);
    setPage(1);
    if (value && Number.isFinite(days) && days > 0) {
      setFrom(daysAgoIsoDate(days));
    } else {
      setFrom('');
    }
  }

  function resetFilters() {
    setPage(1);
    setFrom('');
    setLastNDaysInput('');
  }

  return (
    <AppShell>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-app-text">{tr.crm.accounts.title}</h1>
            <PageHelp text={tr.help.accounts} />
          </div>
          <p className="mt-1 text-sm text-app-muted">{tr.crm.accounts.subtitle}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" type="button" onClick={() => setDrawerOpen(true)}>
            {tr.crm.accounts.filterButton}
            {hasActiveFilter && (
              <span className="ml-1.5 inline-flex h-2 w-2 rounded-full bg-app-primary" />
            )}
          </Button>
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

      <div className="relative mt-6 w-full">
        <Search
          size={16}
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-app-muted"
        />
        <input
          type="search"
          value={qInput}
          onChange={(event) => {
            setPage(1);
            setQInput(event.target.value);
          }}
          placeholder={tr.crm.accounts.searchPlaceholder}
          className="w-full rounded-lg border border-app-border bg-app-surface py-2.5 pr-3 pl-9 text-sm text-app-text outline-none focus:ring-2 focus:ring-app-primary"
        />
      </div>

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

      {drawerOpen && (
        <Drawer title={tr.crm.accounts.filterDrawer.title} onClose={() => setDrawerOpen(false)}>
          <div className="flex flex-col gap-4">
            <TextField
              type="date"
              label={tr.crm.accounts.filterDrawer.fromLabel}
              value={from}
              onChange={(event) => {
                setPage(1);
                setLastNDaysInput('');
                setFrom(event.target.value);
              }}
            />
            <TextField
              type="number"
              min={1}
              label={tr.crm.accounts.filterDrawer.lastNDaysLabel}
              placeholder={tr.crm.accounts.filterDrawer.lastNDaysPlaceholder}
              value={lastNDaysInput}
              onChange={(event) => applyLastNDays(event.target.value)}
            />
            <Button type="button" variant="secondary" onClick={resetFilters}>
              {tr.crm.accounts.filterDrawer.reset}
            </Button>
          </div>
        </Drawer>
      )}
    </AppShell>
  );
}
