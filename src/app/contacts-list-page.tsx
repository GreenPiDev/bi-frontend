import { Pencil, Search, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from './app-shell';
import { Button } from '../components/ui/button';
import { ColumnVisibilityPicker } from '../components/ui/column-visibility-picker';
import { ConfirmModal } from '../components/ui/confirm-modal';
import { Drawer } from '../components/ui/drawer';
import { PageHelp } from '../components/ui/page-help';
import { Select } from '../components/ui/select';
import { Pagination, Table, type TableColumn } from '../components/ui/table';
import { Tooltip } from '../components/ui/tooltip';
import { useToast } from '../components/ui/toast-context';
import { useAccountsQuery } from '../features/crm/use-accounts';
import { useColumnVisibility } from '../features/auth/use-column-visibility';
import { useMeQuery } from '../features/auth/use-auth';
import {
  useContactsQuery,
  useDeleteContactMutation,
  useUpdateContactMutation,
} from '../features/crm/use-contacts';
import { useExportEntityMutation } from '../features/crm/use-imports';
import { ApiError, type Contact, type ContactStatus } from '../lib/api';
import { downloadBlob } from '../lib/download';
import { useDebouncedValue } from '../lib/use-debounced-value';
import { tr } from '../i18n/tr';

function ContactStatusSelect({ contact }: { contact: Contact }) {
  const toast = useToast();
  const updateMutation = useUpdateContactMutation(contact.id);

  return (
    <select
      value={contact.status}
      onClick={(event) => event.stopPropagation()}
      onChange={(event) => {
        const status = event.target.value as Contact['status'];
        updateMutation.mutate(
          { status },
          {
            onSuccess: () => toast.success(tr.crm.contacts.statusUpdateSuccess),
            onError: (error) => {
              toast.error(
                error instanceof ApiError ? error.message : tr.crm.contacts.statusUpdateError,
              );
            },
          },
        );
      }}
      disabled={updateMutation.isPending}
      className="cursor-pointer rounded-md border-none bg-transparent p-0 text-sm text-app-text outline-none focus:ring-2 focus:ring-app-primary disabled:opacity-50"
    >
      <option value="ACTIVE">{tr.crm.contacts.statusActive}</option>
      <option value="INACTIVE">{tr.crm.contacts.statusInactive}</option>
    </select>
  );
}

export function ContactsListPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [qInput, setQInput] = useState('');
  const q = useDebouncedValue(qInput.trim());
  const [deletingContact, setDeletingContact] = useState<Contact | undefined>(undefined);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [accountId, setAccountId] = useState('');
  const [status, setStatus] = useState<ContactStatus | ''>('');
  const meQuery = useMeQuery();
  const pageSize = meQuery.data?.defaultPageSize ?? 25;
  const contactsQuery = useContactsQuery({
    page,
    pageSize,
    q: q || undefined,
    accountId: accountId || undefined,
    status: status || undefined,
  });
  const accountsQuery = useAccountsQuery({ pageSize: 1000 });
  const exportMutation = useExportEntityMutation('contacts');
  const deleteMutation = useDeleteContactMutation();
  const hasActiveFilter = Boolean(accountId) || Boolean(status);

  function resetFilters() {
    setPage(1);
    setAccountId('');
    setStatus('');
  }

  function handleConfirmDelete() {
    if (!deletingContact) return;
    deleteMutation.mutate(deletingContact.id, {
      onSuccess: () => {
        toast.success(tr.crm.contacts.deleteSuccess);
        setDeletingContact(undefined);
      },
      onError: (error) => {
        toast.error(error instanceof ApiError ? error.message : tr.crm.contacts.deleteError);
      },
    });
  }

  const ALL_COLUMNS: TableColumn<Contact>[] = [
    {
      key: 'name',
      header: tr.crm.contacts.nameColumn,
      required: true,
      render: (c) => (
        <span className="font-semibold text-app-text">
          {c.firstName} {c.lastName}
        </span>
      ),
    },
    {
      key: 'account',
      header: tr.crm.contacts.accountColumn,
      className: 'text-app-muted',
      render: (c) => c.account?.name ?? tr.crm.contacts.noAccount,
    },
    {
      key: 'phone',
      header: tr.crm.contacts.phoneColumn,
      className: 'text-app-muted',
      render: (c) => c.phone ?? '—',
    },
    {
      key: 'email',
      header: tr.crm.contacts.emailColumn,
      className: 'text-app-muted',
      render: (c) => c.email ?? '—',
    },
    {
      key: 'status',
      header: tr.crm.contacts.statusColumn,
      render: (c) => <ContactStatusSelect contact={c} />,
    },
    {
      key: 'actions',
      header: tr.crm.contacts.actionsColumn,
      className: 'w-px',
      required: true,
      render: (c) => (
        <div className="flex items-center gap-1">
          <Tooltip content={tr.crm.contacts.editTooltip}>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                navigate(`/kisiler/duzenle/${c.id}`);
              }}
              className="rounded-lg p-2 text-app-muted hover:bg-app-bg hover:text-app-text"
            >
              <Pencil size={16} />
            </button>
          </Tooltip>
          <Tooltip content={tr.crm.contacts.deleteTooltip}>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setDeletingContact(c);
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
      'contacts',
      ALL_COLUMNS.map((c) => ({ key: c.key, label: c.header, required: c.required })),
    );
  const columns = ALL_COLUMNS.filter((c) => isColumnVisible(c.key));

  return (
    <AppShell>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-app-text">{tr.crm.contacts.title}</h1>
            <PageHelp text={tr.help.contacts} />
          </div>
          <p className="mt-1 text-sm text-app-muted">{tr.crm.contacts.subtitle}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" type="button" onClick={() => setDrawerOpen(true)}>
            {tr.crm.contacts.filterButton}
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
                onSuccess: (blob) => downloadBlob(blob, 'kisiler.xlsx'),
              })
            }
          >
            {tr.crm.contacts.exportButton}
          </Button>
          <Button variant="secondary" type="button" onClick={() => navigate('/kisiler/ice-aktar')}>
            {tr.crm.contacts.importButton}
          </Button>
          <Button type="button" onClick={() => navigate('/kisiler/yeni')}>
            {tr.crm.contacts.newButton}
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
          placeholder={tr.crm.contacts.searchPlaceholder}
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
        data={contactsQuery.data?.data ?? []}
        keyField={(contact) => contact.id}
        onRowClick={(contact) => navigate(`/kisiler/${contact.id}`)}
        isLoading={contactsQuery.isPending}
        loadingMessage={tr.crm.contacts.loading}
        emptyMessage={tr.crm.contacts.empty}
      />

      {contactsQuery.data && contactsQuery.data.data.length > 0 && (
        <Pagination
          page={contactsQuery.data.meta.page}
          totalPages={contactsQuery.data.meta.totalPages}
          onPrevious={() => setPage((p) => p - 1)}
          onNext={() => setPage((p) => p + 1)}
        />
      )}

      {drawerOpen && (
        <Drawer title={tr.crm.contacts.filterDrawer.title} onClose={() => setDrawerOpen(false)}>
          <div className="flex flex-col gap-4">
            <Select
              label={tr.crm.contacts.filterDrawer.accountLabel}
              placeholder={tr.crm.contacts.filterDrawer.accountPlaceholder}
              value={accountId}
              onChange={(event) => {
                setPage(1);
                setAccountId(event.target.value);
              }}
              options={(accountsQuery.data?.data ?? []).map((account) => ({
                value: account.id,
                label: account.name,
              }))}
            />
            <Select
              label={tr.crm.contacts.filterDrawer.statusLabel}
              placeholder={tr.crm.contacts.filterDrawer.statusPlaceholder}
              value={status}
              onChange={(event) => {
                setPage(1);
                setStatus(event.target.value as ContactStatus | '');
              }}
              options={[
                { value: 'ACTIVE', label: tr.crm.contacts.statusActive },
                { value: 'INACTIVE', label: tr.crm.contacts.statusInactive },
              ]}
            />
            <Button type="button" variant="secondary" onClick={resetFilters}>
              {tr.crm.contacts.filterDrawer.reset}
            </Button>
          </div>
        </Drawer>
      )}

      {deletingContact && (
        <ConfirmModal
          title={tr.crm.contacts.deleteConfirmTitle}
          message={tr.crm.contacts.deleteConfirm}
          confirmLabel={tr.crm.contacts.deleteTooltip}
          isPending={deleteMutation.isPending}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeletingContact(undefined)}
        />
      )}
    </AppShell>
  );
}
