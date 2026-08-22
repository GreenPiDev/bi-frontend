import type { Widget } from '../../../lib/api';
import { ApiError } from '../../../lib/api';
import { useWidgetQuery } from '../use-widget-query';
import { tr } from '../../../i18n/tr';
import { BarChartWidget } from './bar-chart-widget';
import { HorizontalBarChartWidget } from './horizontal-bar-chart-widget';
import { KpiCard } from './kpi-card';
import { LineChartWidget } from './line-chart-widget';
import { PieChartWidget } from './pie-chart-widget';
import { TableWidget } from './table-widget';

export function WidgetRenderer({ widget }: { widget: Widget }) {
  const queryResult = useWidgetQuery(widget.querySpec);
  const dimensionCount = widget.querySpec.dimensions.length;

  if (queryResult.isPending) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-app-muted">
        {tr.dashboards.widget.loading}
      </div>
    );
  }

  if (queryResult.error) {
    const message =
      queryResult.error instanceof ApiError
        ? queryResult.error.message
        : tr.dashboards.widget.error;
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-app-danger">
        <span>{message}</span>
        <button
          type="button"
          onClick={() => void queryResult.refetch()}
          className="font-semibold underline"
        >
          {tr.dashboards.widget.retry}
        </button>
      </div>
    );
  }

  const result = queryResult.data;
  if (!result || result.rowCount === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-app-muted">
        {tr.dashboards.widget.empty}
      </div>
    );
  }

  switch (widget.type) {
    case 'kpi':
      return <KpiCard result={result} format={widget.vizOptions.format as string | undefined} />;
    case 'line':
      return <LineChartWidget result={result} dimensionCount={dimensionCount} />;
    case 'bar':
      return <BarChartWidget result={result} dimensionCount={dimensionCount} />;
    case 'bar_horizontal':
      return <HorizontalBarChartWidget result={result} dimensionCount={dimensionCount} />;
    case 'pie':
      return <PieChartWidget result={result} dimensionCount={dimensionCount} />;
    case 'table':
      return <TableWidget result={result} />;
    default:
      return null;
  }
}
