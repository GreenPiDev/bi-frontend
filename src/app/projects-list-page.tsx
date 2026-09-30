import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from './app-shell';
import { CircleIconButton } from '../components/ui/circle-icon-button';
import { ColumnVisibilityPicker } from '../components/ui/column-visibility-picker';
import { IconActionButton } from '../components/ui/icon-action-button';
import { PageHelp } from '../components/ui/page-help';
import { Pagination, Table, type TableColumn } from '../components/ui/table';
import { useToast } from '../components/ui/toast-context';
import { useColumnVisibility } from '../features/auth/use-column-visibility';
import { useMeQuery } from '../features/auth/use-auth';
import { useDeleteProjectMutation, useProjectsQuery } from '../features/crm/use-projects';
import { ApiError, type Project } from '../lib/api';
import { tr } from '../i18n/tr';

function formatCurrency(value: string | null): string {
  if (!value) return '—';
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(
    Number(value),
  );
}

export function ProjectsListPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const meQuery = useMeQuery();
  const pageSize = meQuery.data?.defaultPageSize ?? 25;
  const projectsQuery = useProjectsQuery({ page, pageSize });
  const deleteMutation = useDeleteProjectMutation();

  function handleDelete(project: Project) {
    if (!window.confirm(tr.crm.projects.deleteConfirm)) {
      return;
    }
    deleteMutation.mutate(project.id, {
      onError: (error) => {
        toast.error(error instanceof ApiError ? error.message : tr.crm.projects.deleteError);
      },
    });
  }

  const ALL_COLUMNS: TableColumn<Project>[] = [
    {
      key: 'projectNumber',
      header: tr.crm.projects.numberColumn,
      className: 'font-semibold text-app-text',
      required: true,
      render: (p) => p.projectNumber,
    },
    {
      key: 'name',
      header: tr.crm.projects.nameColumn,
      required: true,
      render: (p) => p.name,
    },
    {
      key: 'estimatedBudget',
      header: tr.crm.projects.estimatedBudgetColumn,
      className: 'text-app-muted',
      render: (p) => formatCurrency(p.estimatedBudget),
    },
    {
      key: 'actualCost',
      header: tr.crm.projects.actualCostColumn,
      className: 'text-app-muted',
      render: (p) => formatCurrency(p.actualCost),
    },
    {
      key: 'actions',
      header: tr.crm.projects.actionsColumn,
      className: 'w-px',
      required: true,
      render: (p) => (
        <div className="flex items-center gap-1">
          <IconActionButton
            icon={Pencil}
            tooltip={tr.crm.projects.detail.editButton}
            onClick={() => navigate(`/projeler/${p.id}/duzenle`)}
          />
          <IconActionButton
            icon={Trash2}
            tooltip={tr.crm.projects.detail.deleteButton}
            variant="danger"
            onClick={() => handleDelete(p)}
          />
        </div>
      ),
    },
  ];

  const { isColumnVisible, optionalColumns, visibleOptionalKeys, setVisibleOptionalKeys } =
    useColumnVisibility(
      'projects',
      ALL_COLUMNS.map((c) => ({ key: c.key, label: c.header, required: c.required })),
    );
  const columns = ALL_COLUMNS.filter((c) => isColumnVisible(c.key));

  return (
    <AppShell>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-app-text">{tr.crm.projects.title}</h1>
            <PageHelp text={tr.help.projects} />
          </div>
          <p className="mt-1 text-sm text-app-muted">{tr.crm.projects.subtitle}</p>
        </div>
        <CircleIconButton
          icon={Plus}
          tooltip={tr.crm.projects.newButton}
          variant="success"
          strokeWidth={3}
          onClick={() => navigate('/projeler/yeni')}
          className="mt-1"
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
        data={projectsQuery.data?.data ?? []}
        keyField={(project) => project.id}
        onRowClick={(project) => navigate(`/projeler/${project.id}`)}
        getRowHref={(project) => `/projeler/${project.id}`}
        isLoading={projectsQuery.isPending}
        loadingMessage={tr.crm.projects.loading}
        emptyMessage={tr.crm.projects.empty}
      />

      {projectsQuery.data && projectsQuery.data.data.length > 0 && (
        <Pagination
          page={projectsQuery.data.meta.page}
          totalPages={projectsQuery.data.meta.totalPages}
          total={projectsQuery.data.meta.total}
          onPrevious={() => setPage((p) => p - 1)}
          onNext={() => setPage((p) => p + 1)}
        />
      )}
    </AppShell>
  );
}
