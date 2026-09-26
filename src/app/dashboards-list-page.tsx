import { Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from './app-shell';
import { Button } from '../components/ui/button';
import { ConfirmModal } from '../components/ui/confirm-modal';
import { FormError } from '../components/ui/form-error';
import { PageHelp } from '../components/ui/page-help';
import { Table, type TableColumn } from '../components/ui/table';
import { TextField } from '../components/ui/text-field';
import { useToast } from '../components/ui/toast-context';
import { IconActionButton } from '../components/ui/icon-action-button';
import { useMeQuery } from '../features/auth/use-auth';
import { hasPermission } from '../features/auth/permissions';
import {
  useCreateDashboardMutation,
  useDashboardsQuery,
  useDeleteDashboardMutation,
} from '../features/dashboards/use-dashboards';
import { ApiError, type DashboardSummary } from '../lib/api';
import { tr } from '../i18n/tr';

const dateFormatter = new Intl.DateTimeFormat('tr-TR');

export function DashboardsListPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const dashboardsQuery = useDashboardsQuery();
  const createMutation = useCreateDashboardMutation();
  const deleteMutation = useDeleteDashboardMutation();
  const meQuery = useMeQuery();
  const canDelete = hasPermission(meQuery.data?.permissions, 'dashboards', 'DELETE');
  const [deletingDashboard, setDeletingDashboard] = useState<DashboardSummary | undefined>(
    undefined,
  );

  function handleConfirmDelete() {
    if (!deletingDashboard) return;
    deleteMutation.mutate(deletingDashboard.id, {
      onSuccess: () => {
        toast.success(tr.dashboards.list.deleteSuccess);
        setDeletingDashboard(undefined);
      },
      onError: (error) => {
        toast.error(error instanceof ApiError ? error.message : tr.dashboards.list.deleteError);
        setDeletingDashboard(undefined);
      },
    });
  }

  const columns: TableColumn<DashboardSummary>[] = [
    {
      key: 'name',
      header: tr.dashboards.list.nameColumn,
      render: (dashboard) => <span className="font-semibold text-app-text">{dashboard.name}</span>,
    },
    {
      key: 'createdAt',
      header: tr.dashboards.list.createdAtColumn,
      className: 'text-app-muted',
      render: (dashboard) => dateFormatter.format(new Date(dashboard.createdAt)),
    },
    ...(canDelete
      ? [
          {
            key: 'actions',
            header: tr.dashboards.list.actionsColumn,
            className: 'w-px',
            required: true,
            render: (dashboard: DashboardSummary) => (
              <div className="flex items-center gap-1">
                <IconActionButton
                  icon={Trash2}
                  tooltip={tr.dashboards.list.deleteButton}
                  variant="danger"
                  onClick={() => setDeletingDashboard(dashboard)}
                />
              </div>
            ),
          } satisfies TableColumn<DashboardSummary>,
        ]
      : []),
  ];

  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');

  const apiErrorMessage =
    createMutation.error instanceof ApiError ? createMutation.error.message : undefined;

  function handleCreate(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    createMutation.mutate(
      { name: name.trim() },
      {
        onSuccess: (dashboard) => {
          setIsCreating(false);
          setName('');
          navigate(`/dashboards/edit/${dashboard.id}`);
        },
      },
    );
  }

  return (
    <AppShell>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-app-text">{tr.dashboards.list.title}</h1>
            <PageHelp text={tr.help.dashboards} />
          </div>
          <p className="mt-1 text-sm text-app-muted">{tr.dashboards.list.subtitle}</p>
        </div>
        {!isCreating && (
          <Button type="button" onClick={() => setIsCreating(true)}>
            {tr.dashboards.list.createButton}
          </Button>
        )}
      </div>

      {isCreating && (
        <form
          onSubmit={handleCreate}
          className="mt-6 flex items-end gap-3 border-t border-app-border p-6"
        >
          <div className="flex-1">
            <TextField
              name="name"
              label={tr.dashboards.list.nameLabel}
              placeholder={tr.dashboards.list.namePlaceholder}
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoFocus
            />
          </div>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? tr.dashboards.list.creating : tr.dashboards.list.create}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setIsCreating(false);
              setName('');
            }}
          >
            {tr.dashboards.list.cancel}
          </Button>
        </form>
      )}
      <FormError message={apiErrorMessage && tr.dashboards.list.createError} />

      <Table
        columns={columns}
        data={dashboardsQuery.data ?? []}
        keyField={(dashboard) => dashboard.id}
        onRowClick={(dashboard) => navigate(`/dashboards/${dashboard.id}`)}
        isLoading={dashboardsQuery.isPending}
        loadingMessage={tr.dashboards.list.loading}
        emptyMessage={tr.dashboards.list.empty}
      />

      {deletingDashboard && (
        <ConfirmModal
          title={tr.dashboards.list.deleteConfirmTitle}
          message={tr.dashboards.list.deleteConfirm}
          confirmLabel={tr.dashboards.list.deleteButton}
          isPending={deleteMutation.isPending}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeletingDashboard(undefined)}
        />
      )}
    </AppShell>
  );
}
