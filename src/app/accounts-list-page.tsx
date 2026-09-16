import { AlertTriangle, Pencil, Search, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from './app-shell';
import { Button } from '../components/ui/button';
import { ColumnVisibilityPicker } from '../components/ui/column-visibility-picker';
import { ConfirmModal } from '../components/ui/confirm-modal';
import { Drawer } from '../components/ui/drawer';
import { PageHelp } from '../components/ui/page-help';
import { Pagination, Table, type TableColumn } from '../components/ui/table';
import { TextField } from '../components/ui/text-field';
import { Tooltip } from '../components/ui/tooltip';
import { useToast } from '../components/ui/toast-context';
import { useColumnVisibility } from '../features/auth/use-column-visibility';
import { useMeQuery } from '../features/auth/use-auth';
import { useAccountsQuery, useDeleteAccountMutation } from '../features/crm/use-accounts';
import { useExportEntityMutation } from '../features/crm/use-imports';
import { ApiError, type Account } from '../lib/api';
import { downloadBlob } from '../lib/download';
import { useDebouncedValue } from '../lib/use-debounced-value';
import { tr } from '../i18n/tr';

const CRITICAL_FIELD_LABELS: Record<string, string> = tr.crm.accounts.criticalFieldLabels;

function daysAgoIsoDate(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

export function AccountsListPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [qInput, setQInput] = useState('');
  const q = useDebouncedValue(qInput.trim());
  const [from, setFrom] = useState('');
  const [lastNDaysInput, setLastNDaysInput] = useState('');
  const [notContactedDaysInput, setNotContactedDaysInput] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState<Account | undefined>(undefined);
  const meQuery = useMeQuery();
  const pageSize = meQuery.data?.defaultPageSize ?? 25;
  const notContactedDays = notContactedDaysInput ? Number(notContactedDaysInput) : undefined;
  const accountsQuery = useAccountsQuery({
    page,
    pageSize,
    q: q || undefined,
    from: from || undefined,
    notContactedDays,
  });
  const exportMutation = useExportEntityMutation('accounts');
  const deleteMutation = useDeleteAccountMutation();
  const hasActiveFilter = Boolean(from) || Boolean(notContactedDays);

  function handleConfirmDelete() {
    if (!deletingAccount) return;
    deleteMutation.mutate(deletingAccount.id, {
      onSuccess: () => {
        toast.success(tr.crm.accounts.deleteSuccess);
        setDeletingAccount(undefined);
      },
      onError: (error) => {
        toast.error(error instanceof ApiError ? error.message : tr.crm.accounts.deleteError);
      },
    });
  }

  const ALL_COLUMNS: TableColumn<Account>[] = [
    {
      key: 'name',
      header: tr.crm.accounts.nameColumn,
      required: true,
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
    {
      key: 'sector',
      header: tr.crm.accounts.sectorColumn,
      className: 'text-app-muted',
      render: (a) => a.sector ?? '—',
    },
    {
      key: 'accountTypes',
      header: tr.crm.accounts.accountTypesColumn,
      className: 'text-app-muted',
      render: (a) =>
        a.accountTypes.length > 0
          ? a.accountTypes.map((type) => tr.crm.accounts.accountTypeOptions[type]).join(', ')
          : '—',
    },
    {
      key: 'actions',
      header: tr.crm.accounts.actionsColumn,
      className: 'w-px',
      required: true,
      render: (a) => (
        <div className="flex items-center gap-1">
          <Tooltip content={tr.crm.accounts.editTooltip}>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                navigate(`/firmalar/duzenle/${a.id}`);
              }}
              className="rounded-lg p-2 text-app-muted hover:bg-app-bg hover:text-app-text"
            >
              <Pencil size={16} />
            </button>
          </Tooltip>
          <Tooltip content={tr.crm.accounts.deleteTooltip}>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setDeletingAccount(a);
              }}
              className="rounded-lg p-2 text-app-muted hover:bg-app-bg hover:text-red-600"
            >
              <Trash2 size={16} />
            </button>
          </Tooltip>
        </div>
      ),
    },
  ];

  const { isColumnVisible, optionalColumns, visibleOptionalKeys, setVisibleOptionalKeys } =
    useColumnVisibility(
      'accounts',
      ALL_COLUMNS.map((c) => ({ key: c.key, label: c.header, required: c.required })),
    );
  const columns = ALL_COLUMNS.filter((c) => isColumnVisible(c.key));

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
    setNotContactedDaysInput('');
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

      <div className="mt-4 flex justify-end">
        <ColumnVisibilityPicker
          columns={optionalColumns}
          value={visibleOptionalKeys}
          onChange={setVisibleOptionalKeys}
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
              type="text"
              inputMode="numeric"
              label={tr.crm.accounts.filterDrawer.lastNDaysLabel}
              placeholder={tr.crm.accounts.filterDrawer.lastNDaysPlaceholder}
              value={lastNDaysInput}
              onChange={(event) => applyLastNDays(event.target.value.replace(/[^0-9]/g, ''))}
            />
            <TextField
              type="text"
              inputMode="numeric"
              label={tr.crm.accounts.filterDrawer.notContactedDaysLabel}
              placeholder={tr.crm.accounts.filterDrawer.notContactedDaysPlaceholder}
              value={notContactedDaysInput}
              onChange={(event) => {
                setPage(1);
                setNotContactedDaysInput(event.target.value.replace(/[^0-9]/g, ''));
              }}
            />
            <Button type="button" variant="secondary" onClick={resetFilters}>
              {tr.crm.accounts.filterDrawer.reset}
            </Button>
          </div>
        </Drawer>
      )}

      {deletingAccount && (
        <ConfirmModal
          title={tr.crm.accounts.deleteConfirmTitle}
          message={tr.crm.accounts.deleteConfirm}
          confirmLabel={tr.crm.accounts.deleteTooltip}
          isPending={deleteMutation.isPending}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeletingAccount(undefined)}
        />
      )}
    </AppShell>
  );
}
