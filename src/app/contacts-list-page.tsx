import { clsx } from 'clsx';
import { Copy, Download, ListFilter, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from './app-shell';
import { Button } from '../components/ui/button';
import { ColumnVisibilityPicker } from '../components/ui/column-visibility-picker';
import { ConfirmModal } from '../components/ui/confirm-modal';
import { Drawer } from '../components/ui/drawer';
import { ExportMenuButton } from '../components/ui/export-menu-button';
import { InlineSelect } from '../components/ui/inline-select';
import { PageHelp } from '../components/ui/page-help';
import { Select } from '../components/ui/select';
import { SortPicker, type SortPickerOption } from '../components/ui/sort-picker';
import { Pagination, Table, type TableColumn, type TableSort } from '../components/ui/table';
import { useToast } from '../components/ui/toast-context';
import { CircleIconButton } from '../components/ui/circle-icon-button';
import { IconActionButton } from '../components/ui/icon-action-button';
import { AccountAutocomplete } from '../features/crm/account-autocomplete';
import { useColumnVisibility } from '../features/auth/use-column-visibility';
import { useMeQuery } from '../features/auth/use-auth';
import {
  useContactsQuery,
  useDeleteContactMutation,
  useUpdateContactMutation,
} from '../features/crm/use-contacts';
import { useExportEntityMutation } from '../features/crm/use-imports';
import { useUsersQuery } from '../features/roles/use-users';
import { ApiError, type Contact, type ContactStatus } from '../lib/api';
import { openExportPreviewTab, resolveExportResult } from '../lib/download';
import { useDebouncedValue } from '../lib/use-debounced-value';
import { tr } from '../i18n/tr';

const CONTACT_STATUS_TEXT_CLASS: Record<ContactStatus, string> = {
  ACTIVE: 'text-app-success',
  INACTIVE: 'text-app-muted',
};

function ContactStatusSelect({ contact }: { contact: Contact }) {
  const toast = useToast();
  const updateMutation = useUpdateContactMutation(contact.id);

  return (
    <InlineSelect
      value={contact.status}
      options={[
        { value: 'ACTIVE', label: tr.crm.contacts.statusActive },
        { value: 'INACTIVE', label: tr.crm.contacts.statusInactive },
      ]}
      disabled={updateMutation.isPending}
      selectClassName={clsx(
        'font-semibold disabled:opacity-80',
        CONTACT_STATUS_TEXT_CLASS[contact.status],
      )}
      onChange={(value) => {
        const status = value as Contact['status'];
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
    />
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
  // AccountAutocomplete yazilan metni kendi ic state'inde tutar (bkz. o bilesendeki
  // yorum) - disaridan sadece accountId'yi sifirlamak gorunen metni temizlemez, bu
  // yuzden Sifirla'da bu key degistirilip bilesen yeniden monte edilir.
  const [filterResetKey, setFilterResetKey] = useState(0);
  const [accountId, setAccountId] = useState('');
  const [status, setStatus] = useState<ContactStatus | ''>('');
  const [createdById, setCreatedById] = useState('');
  const [sort, setSort] = useState<TableSort | null>(null);
  const meQuery = useMeQuery();
  const usersQuery = useUsersQuery();
  const pageSize = meQuery.data?.defaultPageSize ?? 25;
  const contactsQuery = useContactsQuery({
    page,
    pageSize,
    q: q || undefined,
    accountId: accountId || undefined,
    status: status || undefined,
    createdById: createdById || undefined,
    sort: sort ? `${sort.key}:${sort.direction}` : undefined,
  });
  const exportMutation = useExportEntityMutation('contacts');
  const deleteMutation = useDeleteContactMutation();
  const hasActiveFilter = Boolean(accountId) || Boolean(status) || Boolean(createdById);

  function resetFilters() {
    setPage(1);
    setAccountId('');
    setStatus('');
    setCreatedById('');
    setFilterResetKey((k) => k + 1);
  }

  async function handleCopyEmail(email: string) {
    await navigator.clipboard.writeText(email);
    toast.success(tr.crm.contacts.emailCopiedToast);
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
      sortKey: 'firstName',
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
      key: 'department',
      header: tr.crm.contacts.departmentColumn,
      className: 'text-app-muted',
      render: (c) => c.department ?? '—',
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
      render: (c) => {
        const email = c.email;
        if (!email) return '—';
        return (
          <div className="flex items-center gap-1">
            <span>{email}</span>
            <IconActionButton
              icon={Copy}
              tooltip={tr.crm.contacts.copyEmailButton}
              iconSize={14}
              onClick={() => void handleCopyEmail(email)}
            />
          </div>
        );
      },
    },
    {
      key: 'status',
      header: tr.crm.contacts.statusColumn,
      render: (c) => <ContactStatusSelect contact={c} />,
    },
    {
      key: 'createdByName',
      header: tr.crm.contacts.createdByColumn,
      className: 'text-app-muted',
      render: (c) => c.createdByName ?? '—',
    },
    {
      key: 'actions',
      header: tr.crm.contacts.actionsColumn,
      className: 'w-px',
      required: true,
      render: (c) => (
        <div className="flex items-center gap-1">
          <IconActionButton
            icon={Pencil}
            tooltip={tr.crm.contacts.editTooltip}
            onClick={() => navigate(`/kisiler/duzenle/${c.id}`)}
          />
          <IconActionButton
            icon={Trash2}
            tooltip={tr.crm.contacts.deleteTooltip}
            variant="danger"
            onClick={() => setDeletingContact(c)}
          />
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

  const SORT_OPTIONS: SortPickerOption[] = [
    { key: 'firstName', direction: 'asc', label: tr.crm.contacts.sortOptions.nameAsc },
    { key: 'firstName', direction: 'desc', label: tr.crm.contacts.sortOptions.nameDesc },
    { key: 'account', direction: 'asc', label: tr.crm.contacts.sortOptions.accountAsc },
    { key: 'account', direction: 'desc', label: tr.crm.contacts.sortOptions.accountDesc },
  ];

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
        <div className="flex items-center gap-2 pt-1">
          <CircleIconButton
            icon={ListFilter}
            tooltip={tr.crm.contacts.filterButton}
            onClick={() => setDrawerOpen(true)}
          >
            {hasActiveFilter && (
              <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 ring-2 ring-app-surface" />
            )}
          </CircleIconButton>
          <ExportMenuButton
            tooltip={tr.crm.contacts.exportButton}
            disabled={exportMutation.isPending}
            onSelect={(format) => {
              const tabHandle = openExportPreviewTab(format);
              exportMutation.mutate(format, {
                onSuccess: (blob) =>
                  resolveExportResult(format, tabHandle, blob, `kisiler.${format}`),
                onError: () => tabHandle?.close(),
              });
            }}
          />
          <CircleIconButton
            icon={Download}
            tooltip={tr.crm.contacts.importButton}
            onClick={() => navigate('/kisiler/ice-aktar')}
          />
          <CircleIconButton
            icon={Plus}
            tooltip={tr.crm.contacts.newButton}
            variant="success"
            strokeWidth={3}
            onClick={() => navigate('/kisiler/yeni')}
          />
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
          className="w-full rounded-lg border border-app-border bg-app-surface py-2.5 pr-3 pl-9 text-sm text-app-text outline-none focus:border-app-primary"
        />
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <SortPicker
          options={SORT_OPTIONS}
          value={sort}
          onChange={(next) => {
            setSort(next);
            setPage(1);
          }}
        />
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
        getRowHref={(contact) => `/kisiler/${contact.id}`}
        isLoading={contactsQuery.isPending}
        loadingMessage={tr.crm.contacts.loading}
        emptyMessage={tr.crm.contacts.empty}
        sort={sort}
        onSortChange={(next) => {
          setSort(next);
          setPage(1);
        }}
      />

      {contactsQuery.data && contactsQuery.data.data.length > 0 && (
        <Pagination
          page={contactsQuery.data.meta.page}
          totalPages={contactsQuery.data.meta.totalPages}
          total={contactsQuery.data.meta.total}
          onPageChange={setPage}
          onPrevious={() => setPage((p) => p - 1)}
          onNext={() => setPage((p) => p + 1)}
        />
      )}

      {drawerOpen && (
        <Drawer title={tr.crm.contacts.filterDrawer.title} onClose={() => setDrawerOpen(false)}>
          <div className="flex flex-col gap-4">
            <AccountAutocomplete
              key={`account-${filterResetKey}`}
              label={tr.crm.contacts.filterDrawer.accountLabel}
              placeholder={tr.crm.contacts.filterDrawer.accountPlaceholder}
              value={accountId || undefined}
              onChange={(nextAccountId) => {
                setPage(1);
                setAccountId(nextAccountId ?? '');
              }}
              clearable
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
              clearable
              onClear={() => {
                setPage(1);
                setStatus('');
              }}
            />
            <Select
              label={tr.crm.contacts.filterDrawer.createdByLabel}
              placeholder={tr.crm.contacts.filterDrawer.createdByPlaceholder}
              value={createdById}
              onChange={(event) => {
                setPage(1);
                setCreatedById(event.target.value);
              }}
              options={(usersQuery.data ?? []).map((u) => ({ value: u.id, label: u.name }))}
              clearable
              onClear={() => {
                setPage(1);
                setCreatedById('');
              }}
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
