import type { QueryResult } from '../../../lib/api';
import { ChartWithExport } from './chart-with-export';
import { getChartTheme } from './chart-theme';
import { buildHorizontalBarOption } from './query-result-to-echarts-option';

export function HorizontalBarChartWidget({
  result,
  dimensionCount,
  title,
  onPointClick,
}: {
  result: QueryResult;
  dimensionCount: number;
  title: string;
  onPointClick?: (dataIndex: number) => void;
}) {
  return (
    <ChartWithExport
      option={buildHorizontalBarOption(result, dimensionCount, getChartTheme())}
      fileName={title}
      onEvents={onPointClick ? { click: (params) => onPointClick(params.dataIndex) } : undefined}
    />
  );
}
