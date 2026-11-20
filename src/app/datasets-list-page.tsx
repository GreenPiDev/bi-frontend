import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { ConfirmModal } from '../components/ui/confirm-modal';
import { IconActionButton } from '../components/ui/icon-action-button';
import { Table, type TableColumn } from '../components/ui/table';
import { useToast } from '../components/ui/toast-context';
import { useDatasetsQuery, useDeleteDatasetMutation } from '../features/datasets/use-datasets';
import { ApiError, type DatasetSummary } from '../lib/api';
import { tr } from '../i18n/tr';

const dateFormatter = new Intl.DateTimeFormat('tr-TR');
const numberFormatter = new Intl.NumberFormat('tr-TR');

/** /datasets?tab=datasets sekmesinin icerigi - sayfa basligi/AppShell
 * DatasetsManagementPage'te. */
export function DatasetsListContent() {
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
            tooltip={tr.datasets.deleteTooltip}
            onClick={() => setDeletingDataset(dataset)}
            className="disabled:hover:bg-transparent disabled:hover:text-app-muted"
          />
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button type="button" onClick={() => navigate('/datasets/upload')}>
          {tr.datasets.uploadButton}
        </Button>
      </div>

      <Table
        columns={columns}
        data={datasetsQuery.data ?? []}
        keyField={(dataset) => dataset.id}
        onRowClick={(dataset) => navigate(`/datasets/${dataset.id}`)}
        getRowHref={(dataset) => `/datasets/${dataset.id}`}
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
    </>
  );
}
