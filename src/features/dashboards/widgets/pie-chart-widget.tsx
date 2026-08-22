import ReactECharts from 'echarts-for-react';
import type { QueryResult } from '../../../lib/api';
import { getChartTheme } from './chart-theme';
import { buildPieOption } from './query-result-to-echarts-option';

export function PieChartWidget({
  result,
  dimensionCount,
}: {
  result: QueryResult;
  dimensionCount: number;
}) {
  return (
    <ReactECharts
      option={buildPieOption(result, dimensionCount, getChartTheme())}
      style={{ height: '100%', width: '100%' }}
      notMerge
    />
  );
}
