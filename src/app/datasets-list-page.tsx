import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from './app-shell';
import { Button } from '../components/ui/button';
import { ConfirmModal } from '../components/ui/confirm-modal';
import { IconActionButton } from '../components/ui/icon-action-button';
import { PageHelp } from '../components/ui/page-help';
import { Table, type TableColumn } from '../components/ui/table';
import { useToast } from '../components/ui/toast-context';
import { useDatasetsQuery, useDeleteDatasetMutation } from '../features/datasets/use-datasets';
import { ApiError, type DatasetSummary } from '../lib/api';
import { tr } from '../i18n/tr';

const dateFormatter = new Intl.DateTimeFormat('tr-TR');
const numberFormatter = new Intl.NumberFormat('tr-TR');

export function DatasetsListPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const datasetsQuery = useDatasetsQuery();
  const deleteMutation = useDeleteDatasetMutation();
  const [deletingDataset, setDeletingDataset] = useState<DatasetSummary | undefined>(undefined);

  function handleConfirmDelete() {
    if (!deletingDataset) return;
    deleteMutation.mutate(deletingDataset.id, {
      onSuccess: () => {
        toast.success(tr.datasets.deleteSuccess);
        setDeletingDataset(undefined);
      },
      onError: (error) => {
        toast.error(error instanceof ApiError ? error.message : tr.datasets.deleteError);
        setDeletingDataset(undefined);
      },
    });
  }

  const columns: TableColumn<DatasetSummary>[] = [
    {
      key: 'name',
      header: tr.datasets.nameColumn,
      render: (dataset) => <span className="font-semibold text-app-text">{dataset.name}</span>,
    },
    {
      key: 'rowCount',
      header: tr.datasets.rowCountColumn,
      className: 'text-app-muted',
      render: (dataset) => numberFormatter.format(dataset.rowCount),
    },
    {
      key: 'lastIngestedAt',
      header: tr.datasets.lastIngestedColumn,
      className: 'text-app-muted',
      render: (dataset) =>
        dataset.lastIngestedAt
          ? dateFormatter.format(new Date(dataset.lastIngestedAt))
          : tr.datasets.neverIngested,
    },
    {
      key: 'actions',
      header: tr.datasets.actionsColumn,
      className: 'w-px',
      required: true,
      render: (dataset) => (
        <div className="flex items-center gap-1">
          <IconActionButton
            icon={Trash2}
            variant="danger"
            tooltip={
              dataset.sourceKind === 'CRM_TABLE'
                ? tr.datasets.deleteReadonlyTooltip
                : tr.datasets.deleteTooltip
            }
            disabled={dataset.sourceKind === 'CRM_TABLE'}
            onClick={() => setDeletingDataset(dataset)}
            className="disabled:hover:bg-transparent disabled:hover:text-app-muted"
          />
        </div>
      ),
    },
  ];

  return (
    <AppShell>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-app-text">{tr.datasets.title}</h1>
            <PageHelp text={tr.help.datasets} />
          </div>
          <p className="mt-1 text-sm text-app-muted">{tr.datasets.subtitle}</p>
        </div>
        <Button type="button" onClick={() => navigate('/datasets/upload')}>
          {tr.datasets.uploadButton}
        </Button>
      </div>

      <Table
        columns={columns}
        data={datasetsQuery.data ?? []}
        keyField={(dataset) => dataset.id}
        onRowClick={(dataset) => navigate(`/datasets/${dataset.id}`)}
        isLoading={datasetsQuery.isPending}
        loadingMessage={tr.datasets.loading}
        emptyMessage={tr.datasets.empty}
      />

      {deletingDataset && (
        <ConfirmModal
          title={tr.datasets.deleteConfirmTitle}
          message={tr.datasets.deleteConfirm}
          confirmLabel={tr.datasets.deleteTooltip}
          isPending={deleteMutation.isPending}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeletingDataset(undefined)}
        />
      )}
    </AppShell>
  );
}
