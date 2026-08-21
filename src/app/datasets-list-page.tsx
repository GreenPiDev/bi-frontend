import { useNavigate } from 'react-router-dom';
import { AppShell } from './app-shell';
import { Button } from '../components/ui/button';
import { useDatasetsQuery } from '../features/datasets/use-datasets';
import { tr } from '../i18n/tr';

const dateFormatter = new Intl.DateTimeFormat('tr-TR');
const numberFormatter = new Intl.NumberFormat('tr-TR');

export function DatasetsListPage() {
  const navigate = useNavigate();
  const datasetsQuery = useDatasetsQuery();

  return (
    <AppShell>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-app-text">{tr.datasets.title}</h1>
          <p className="mt-1 text-sm text-app-muted">{tr.datasets.subtitle}</p>
        </div>
        <Button type="button" onClick={() => navigate('/datasets/upload')}>
          {tr.datasets.uploadButton}
        </Button>
      </div>

      {datasetsQuery.isPending && (
        <p className="mt-6 text-sm text-app-muted">{tr.datasets.loading}</p>
      )}

      {datasetsQuery.data?.length === 0 && (
        <div className="mt-6 rounded-xl border border-dashed border-app-border bg-app-surface p-8 text-center text-sm text-app-muted">
          {tr.datasets.empty}
        </div>
      )}

      {datasetsQuery.data && datasetsQuery.data.length > 0 && (
        <div className="mt-6 overflow-hidden rounded-xl border border-app-border bg-app-surface">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-app-border text-xs uppercase text-app-muted">
              <tr>
                <th className="px-4 py-3">{tr.datasets.nameColumn}</th>
                <th className="px-4 py-3">{tr.datasets.rowCountColumn}</th>
                <th className="px-4 py-3">{tr.datasets.lastIngestedColumn}</th>
              </tr>
            </thead>
            <tbody>
              {datasetsQuery.data.map((dataset) => (
                <tr
                  key={dataset.id}
                  onClick={() => navigate(`/datasets/${dataset.id}`)}
                  className="cursor-pointer border-b border-app-border last:border-0 hover:bg-app-bg"
                >
                  <td className="px-4 py-3 font-semibold text-app-text">{dataset.name}</td>
                  <td className="px-4 py-3 text-app-muted">
                    {numberFormatter.format(dataset.rowCount)}
                  </td>
                  <td className="px-4 py-3 text-app-muted">
                    {dataset.lastIngestedAt
                      ? dateFormatter.format(new Date(dataset.lastIngestedAt))
                      : tr.datasets.neverIngested}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
