import { useQuery } from '@tanstack/react-query';
import { queryRows, type FilterSpec } from '../../../lib/api';
import { ApiError } from '../../../lib/api';
import { tr } from '../../../i18n/tr';
import { TableWidget } from './table-widget';

interface DrillDownModalProps {
  datasetId: string;
  filters: FilterSpec[];
  onClose: () => void;
}

export function DrillDownModal({ datasetId, filters, onClose }: DrillDownModalProps) {
  const rowsQuery = useQuery({
    queryKey: ['query-rows', datasetId, filters],
    queryFn: () =>
      queryRows({ datasetId, measures: [], dimensions: [], filters, orderBy: [], limit: 500 }),
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-3xl flex-col rounded-xl bg-app-surface p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-app-text">{tr.dashboards.drillDown.title}</h2>
            <p className="text-sm text-app-muted">{tr.dashboards.drillDown.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-semibold text-app-muted hover:text-app-text"
          >
            {tr.dashboards.drillDown.close}
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          {rowsQuery.isPending && (
            <p className="text-sm text-app-muted">{tr.dashboards.drillDown.loading}</p>
          )}
          {rowsQuery.error && (
            <p className="text-sm text-app-danger">
              {rowsQuery.error instanceof ApiError
                ? rowsQuery.error.message
                : tr.dashboards.drillDown.error}
            </p>
          )}
          {rowsQuery.data && rowsQuery.data.rowCount === 0 && (
            <p className="text-sm text-app-muted">{tr.dashboards.drillDown.empty}</p>
          )}
          {rowsQuery.data && rowsQuery.data.rowCount > 0 && <TableWidget result={rowsQuery.data} />}
        </div>
      </div>
    </div>
  );
}
