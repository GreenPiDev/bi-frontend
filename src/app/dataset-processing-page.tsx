import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppShell } from './app-shell';
import { Button } from '../components/ui/button';
import { useDatasourceStatusQuery } from '../features/datasets/use-datasets';
import { tr } from '../i18n/tr';

export function DatasetProcessingPage() {
  const { dataSourceId = '' } = useParams();
  const navigate = useNavigate();
  const statusQuery = useDatasourceStatusQuery(dataSourceId);
  const status = statusQuery.data?.status;
  const datasetId = statusQuery.data?.datasetId;

  useEffect(() => {
    if (status === 'READY' && datasetId) {
      navigate(`/datasets/${datasetId}`, { replace: true });
    }
  }, [status, datasetId, navigate]);

  return (
    <AppShell>
      <div className="mx-auto mt-16 max-w-xl rounded-xl border border-app-border bg-app-surface p-8 text-center">
        {status === 'FAILED' ? (
          <>
            <h1 className="text-lg font-bold text-app-danger">
              {tr.datasets.processing.failedTitle}
            </h1>
            {statusQuery.data?.errorMessage && (
              <p className="mt-2 text-sm text-app-muted">{statusQuery.data.errorMessage}</p>
            )}
            <div className="mt-6 flex justify-center gap-3">
              <Button type="button" variant="secondary" onClick={() => navigate('/datasets')}>
                {tr.datasets.processing.backToList}
              </Button>
              <Button type="button" onClick={() => navigate('/datasets/upload')}>
                {tr.datasets.processing.retry}
              </Button>
            </div>
          </>
        ) : (
          <>
            <div
              className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-app-border border-t-app-brand"
              role="status"
              aria-label={tr.datasets.processing.title}
            />
            <h1 className="mt-4 text-lg font-bold text-app-text">{tr.datasets.processing.title}</h1>
            <p className="mt-1 text-sm text-app-muted">
              {status === 'PROCESSING'
                ? tr.datasets.processing.subtitleProcessing
                : tr.datasets.processing.subtitlePending}
            </p>
          </>
        )}
      </div>
    </AppShell>
  );
}
