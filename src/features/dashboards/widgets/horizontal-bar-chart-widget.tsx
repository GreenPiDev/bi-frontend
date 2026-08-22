import ReactECharts from 'echarts-for-react';
import type { QueryResult } from '../../../lib/api';
import { getChartTheme } from './chart-theme';
import { buildHorizontalBarOption } from './query-result-to-echarts-option';

export function HorizontalBarChartWidget({
  result,
  dimensionCount,
}: {
  result: QueryResult;
  dimensionCount: number;
}) {
  return (
    <ReactECharts
      option={buildHorizontalBarOption(result, dimensionCount, getChartTheme())}
      style={{ height: '100%', width: '100%' }}
      notMerge
    />
  );
}
