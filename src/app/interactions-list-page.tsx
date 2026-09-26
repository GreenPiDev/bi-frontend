import { ListFilter, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from './app-shell';
import { Button } from '../components/ui/button';
import { ColumnVisibilityPicker } from '../components/ui/column-visibility-picker';
import { ConfirmModal } from '../components/ui/confirm-modal';
import { DateField } from '../components/ui/date-field';
import { Drawer } from '../components/ui/drawer';
import { FilterButtonGroup } from '../components/ui/filter-button-group';
import { PageHelp } from '../components/ui/page-help';
import { Select } from '../components/ui/select';
import { Pagination, Table, type TableColumn } from '../components/ui/table';
import { useToast } from '../components/ui/toast-context';
import { IconActionButton } from '../components/ui/icon-action-button';
import { CircleIconButton } from '../components/ui/circle-icon-button';
import { AccountAutocomplete } from '../features/crm/account-autocomplete';
import { ContactAutocomplete } from '../features/crm/contact-autocomplete';
import { useColumnVisibility } from '../features/auth/use-column-visibility';
import { useMeQuery } from '../features/auth/use-auth';
import { InteractionStatusSelect } from '../features/crm/interaction-status-select';
import {
  useDeleteInteractionMutation,
  useInteractionCreatorsQuery,
  useInteractionsQuery,
  useInteractionTypeCounts,
} from '../features/crm/use-interactions';
import { ApiError, type Interaction, type InteractionType } from '../lib/api';
import { tr } from '../i18n/tr';

const TYPE_OPTIONS: { value: InteractionType; label: string }[] = (
  ['CALL', 'VISIT', 'MEETING', 'EMAIL', 'OTHER'] as const
).map((type) => ({ value: type, label: tr.crm.interactions.typeOptions[type] }));

export function InteractionsListPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [deletingInteraction, setDeletingInteraction] = useState<Interaction | undefined>(
    undefined,
  );
  const [drawerOpen, setDrawerOpen] = useState(false);
  // AccountAutocomplete/ContactAutocomplete yazilan metni kendi ic state'inde tutar
  // (bkz. o bilesenlerdeki yorum) - disaridan sadece accountId/contactId'yi sifirlamak
  // gorunen metni temizlemez, bu yuzden Sifirla'da bu key degistirilip bilesenler
  // yeniden monte edilir.
  const [filterResetKey, setFilterResetKey] = useState(0);
  const [accountId, setAccountId] = useState('');
  const [contactId, setContactId] = useState('');
  const [createdById, setCreatedById] = useState('');
  const [type, setType] = useState<InteractionType | ''>('');
  const [sinceInput, setSinceInput] = useState('');
  const [rangeFromInput, setRangeFromInput] = useState('');
  const [rangeToInput, setRangeToInput] = useState('');
  // Iki tarih filtresi ayni occurredAt alanini hedefler, birbirini sifirlar: aralik
  // girildiyse tek-tarih ("itibaren") gormezden gelinir - bkz. opportunities-list-page.tsx.
  const hasRange = Boolean(rangeFromInput) || Boolean(rangeToInput);
  const from = hasRange ? rangeFromInput || undefined : sinceInput || undefined;
  const to = hasRange ? rangeToInput || undefined : undefined;
  const hasActiveFilter =
    Boolean(accountId) ||
    Boolean(contactId) ||
    Boolean(createdById) ||
    Boolean(from) ||
    Boolean(to);
  const meQuery = useMeQuery();
  const pageSize = meQuery.data?.defaultPageSize ?? 25;
  const interactionsQuery = useInteractionsQuery({
    page,
    pageSize,
    accountId: accountId || undefined,
    contactId: contactId || undefined,
    createdById: createdById || undefined,
    type: type || undefined,
    from,
    to,
  });
  const creatorsQuery = useInteractionCreatorsQuery();
  const typeCounts = useInteractionTypeCounts(TYPE_OPTIONS.map((option) => option.value));
  const typeFilterCounts: Partial<Record<InteractionType | '', number>> = {
    '': typeCounts.all,
    ...typeCounts.counts,
  };
  const deleteMutation = useDeleteInteractionMutation();

  function resetFilters() {
    setPage(1);
    setAccountId('');
    setContactId('');
    setCreatedById('');
    setType('');
    setSinceInput('');
    setRangeFromInput('');
    setRangeToInput('');
    setFilterResetKey((k) => k + 1);
  }

  function handleConfirmDelete() {
    if (!deletingInteraction) return;
    deleteMutation.mutate(deletingInteraction.id, {
      onSuccess: () => {
        toast.success(tr.crm.interactions.deleteSuccess);
        setDeletingInteraction(undefined);
      },
      onError: (error) => {
        toast.error(error instanceof ApiError ? error.message : tr.crm.interactions.deleteError);
      },
    });
  }

  const ALL_COLUMNS: TableColumn<Interaction>[] = [
    {
      key: 'occurredAt',
      header: tr.crm.interactions.dateColumn,
      className: 'text-app-muted',
      required: true,
      render: (i) => new Date(i.occurredAt).toLocaleDateString('tr-TR'),
    },
    {
      key: 'account',
      header: tr.crm.interactions.accountColumn,
      required: true,
      render: (i) => (
        <span className="font-semibold text-app-text">{i.account ? i.account.name : '—'}</span>
      ),
    },
    {
      key: 'contact',
      header: tr.crm.interactions.contactColumn,
      className: 'text-app-muted',
      render: (i) => (i.contact ? `${i.contact.firstName} ${i.contact.lastName}` : '—'),
    },
    {
      key: 'type',
      header: tr.crm.interactions.typeColumn,
      render: (i) => tr.crm.interactions.typeOptions[i.type],
    },
    {
      key: 'status',
      header: tr.crm.interactions.statusColumn,
      render: (i) => <InteractionStatusSelect interaction={i} />,
    },
    {
      key: 'createdByName',
      header: tr.crm.interactions.createdByColumn,
      className: 'text-app-muted',
      render: (i) => i.createdByName ?? '—',
    },
    {
      key: 'actions',
      header: tr.crm.interactions.actionsColumn,
      className: 'w-px',
      required: true,
      render: (i) =>
        i.createdById === meQuery.data?.id ? (
          <div className="flex items-center gap-1">
            <IconActionButton
              icon={Pencil}
              tooltip={tr.crm.interactions.editTooltip}
              onClick={() => navigate(`/gorusmeler/duzenle/${i.id}`)}
            />
            <IconActionButton
              icon={Trash2}
              tooltip={tr.crm.interactions.deleteTooltip}
              variant="danger"
              onClick={() => setDeletingInteraction(i)}
            />
          </div>
        ) : null,
    },
  ];

  const { isColumnVisible, optionalColumns, visibleOptionalKeys, setVisibleOptionalKeys } =
    useColumnVisibility(
      'interactions',
      ALL_COLUMNS.map((c) => ({ key: c.key, label: c.header, required: c.required })),
    );
  const columns = ALL_COLUMNS.filter((c) => isColumnVisible(c.key));

  return (
    <AppShell>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-app-text">{tr.crm.interactions.title}</h1>
            <PageHelp text={tr.help.interactions} />
          </div>
          <p className="mt-1 text-sm text-app-muted">{tr.crm.interactions.subtitle}</p>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <CircleIconButton
            icon={ListFilter}
            tooltip={
              hasActiveFilter
                ? tr.crm.interactions.filterActiveTooltip
                : tr.crm.interactions.filterButton
            }
            onClick={() => setDrawerOpen(true)}
          >
            {hasActiveFilter && (
              <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 ring-2 ring-app-surface" />
            )}
          </CircleIconButton>
          <CircleIconButton
            icon={Plus}
            tooltip={tr.crm.interactions.newButton}
            variant="success"
            strokeWidth={3}
            onClick={() => navigate('/gorusmeler/yeni')}
          />
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <FilterButtonGroup
          label={tr.crm.interactions.typeFilterLabel}
          value={type}
          onChange={(next) => {
            setPage(1);
            setType(next);
          }}
          allLabel={tr.crm.interactions.allTypes}
          options={TYPE_OPTIONS}
          counts={typeFilterCounts}
        />
        <ColumnVisibilityPicker
          columns={optionalColumns}
          value={visibleOptionalKeys}
          onChange={setVisibleOptionalKeys}
        />
      </div>

      <Table
        columns={columns}
        data={interactionsQuery.data?.data ?? []}
        keyField={(interaction) => interaction.id}
        onRowClick={(interaction) => navigate(`/gorusmeler/${interaction.id}`)}
        isLoading={interactionsQuery.isPending}
        loadingMessage={tr.crm.interactions.loading}
        emptyMessage={tr.crm.interactions.empty}
      />

      {interactionsQuery.data && interactionsQuery.data.data.length > 0 && (
        <Pagination
          page={interactionsQuery.data.meta.page}
          totalPages={interactionsQuery.data.meta.totalPages}
          onPrevious={() => setPage((p) => p - 1)}
          onNext={() => setPage((p) => p + 1)}
        />
      )}

      {drawerOpen && (
        <Drawer title={tr.crm.interactions.filterDrawer.title} onClose={() => setDrawerOpen(false)}>
          <div className="flex flex-col gap-4">
            <AccountAutocomplete
              key={`account-${filterResetKey}`}
              label={tr.crm.interactions.filterDrawer.accountLabel}
              placeholder={tr.crm.interactions.filterDrawer.accountPlaceholder}
              value={accountId || undefined}
              onChange={(nextAccountId) => {
                setPage(1);
                setAccountId(nextAccountId ?? '');
              }}
              clearable
            />
            <ContactAutocomplete
              key={`contact-${filterResetKey}`}
              label={tr.crm.interactions.filterDrawer.contactLabel}
              placeholder={tr.crm.interactions.filterDrawer.contactPlaceholder}
              value={contactId || undefined}
              onChange={(nextContactId) => {
                setPage(1);
                setContactId(nextContactId ?? '');
              }}
              clearable
            />
            <Select
              label={tr.crm.interactions.filterDrawer.createdByLabel}
              placeholder={tr.crm.interactions.filterDrawer.createdByPlaceholder}
              value={createdById}
              onChange={(event) => {
                setPage(1);
                setCreatedById(event.target.value);
              }}
              options={(creatorsQuery.data ?? []).map((creator) => ({
                value: creator.id,
                label: creator.name,
              }))}
              clearable
              onClear={() => {
                setPage(1);
                setCreatedById('');
              }}
            />
            <DateField
              label={tr.crm.interactions.filterDrawer.sinceLabel}
              value={sinceInput}
              onChange={(value) => {
                setPage(1);
                setRangeFromInput('');
                setRangeToInput('');
                setSinceInput(value);
              }}
              clearable
              onClear={() => {
                setPage(1);
                setSinceInput('');
              }}
            />
            <DateField
              label={tr.crm.interactions.filterDrawer.rangeFromLabel}
              value={rangeFromInput}
              onChange={(value) => {
                setPage(1);
                setSinceInput('');
                setRangeFromInput(value);
              }}
              clearable
              onClear={() => {
                setPage(1);
                setRangeFromInput('');
              }}
            />
            <DateField
              label={tr.crm.interactions.filterDrawer.rangeToLabel}
              value={rangeToInput}
              onChange={(value) => {
                setPage(1);
                setSinceInput('');
                setRangeToInput(value);
              }}
              clearable
              onClear={() => {
                setPage(1);
                setRangeToInput('');
              }}
            />
            <Button type="button" variant="secondary" onClick={resetFilters}>
              {tr.crm.interactions.filterDrawer.reset}
            </Button>
          </div>
        </Drawer>
      )}

      {deletingInteraction && (
        <ConfirmModal
          title={tr.crm.interactions.deleteConfirmTitle}
          message={tr.crm.interactions.deleteConfirm}
          confirmLabel={tr.crm.interactions.deleteTooltip}
          isPending={deleteMutation.isPending}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeletingInteraction(undefined)}
        />
      )}
    </AppShell>
  );
}
