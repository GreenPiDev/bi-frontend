import { useNavigate } from 'react-router-dom';
import { AppShell } from './app-shell';
import { Button } from '../components/ui/button';
import { PageHelp } from '../components/ui/page-help';
import { Table, type TableColumn } from '../components/ui/table';
import { useDatasetsQuery } from '../features/datasets/use-datasets';
import type { DatasetSummary } from '../lib/api';
import { tr } from '../i18n/tr';

const dateFormatter = new Intl.DateTimeFormat('tr-TR');
const numberFormatter = new Intl.NumberFormat('tr-TR');

export function DatasetsListPage() {
  const navigate = useNavigate();
  const datasetsQuery = useDatasetsQuery();

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
    </AppShell>
  );
}
