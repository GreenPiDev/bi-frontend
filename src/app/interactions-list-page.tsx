import { Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from './app-shell';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { ColumnVisibilityPicker } from '../components/ui/column-visibility-picker';
import { ConfirmModal } from '../components/ui/confirm-modal';
import { PageHelp } from '../components/ui/page-help';
import { Pagination, Table, type TableColumn } from '../components/ui/table';
import { Tooltip } from '../components/ui/tooltip';
import { useToast } from '../components/ui/toast-context';
import { useColumnVisibility } from '../features/auth/use-column-visibility';
import { useMeQuery } from '../features/auth/use-auth';
import {
  useDeleteInteractionMutation,
  useInteractionsQuery,
} from '../features/crm/use-interactions';
import { ApiError, type Interaction } from '../lib/api';
import { tr } from '../i18n/tr';

export function InteractionsListPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [deletingInteraction, setDeletingInteraction] = useState<Interaction | undefined>(
    undefined,
  );
  const meQuery = useMeQuery();
  const pageSize = meQuery.data?.defaultPageSize ?? 25;
  const interactionsQuery = useInteractionsQuery({ page, pageSize });
  const deleteMutation = useDeleteInteractionMutation();

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
      render: (i) => (
        <Badge variant={i.status === 'OPEN' ? 'success' : 'neutral'}>
          {tr.crm.interactions.statusOptions[i.status]}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: tr.crm.interactions.actionsColumn,
      className: 'w-px',
      required: true,
      render: (i) => (
        <div className="flex items-center gap-1">
          <Tooltip content={tr.crm.interactions.editTooltip}>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                navigate(`/gorusmeler/duzenle/${i.id}`);
              }}
              className="rounded-lg p-2 text-app-muted hover:bg-app-bg hover:text-app-text"
            >
              <Pencil size={16} />
            </button>
          </Tooltip>
          <Tooltip content={tr.crm.interactions.deleteTooltip}>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setDeletingInteraction(i);
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
        <Button type="button" onClick={() => navigate('/gorusmeler/yeni')}>
          {tr.crm.interactions.newButton}
        </Button>
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
