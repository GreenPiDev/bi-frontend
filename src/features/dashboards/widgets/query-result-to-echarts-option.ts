import type { EChartsOption, TooltipComponentFormatterCallbackParams } from 'echarts';
import type { QueryResult } from '../../../lib/api';
import type { ChartTheme } from './chart-theme';

const numberFormatter = new Intl.NumberFormat('tr-TR');

function formatCategory(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (value instanceof Date) return value.toLocaleDateString('tr-TR');
  return String(value);
}

export function toCategoriesAndSeries(result: QueryResult, dimensionCount: number) {
  const measureColumns = result.columns.slice(dimensionCount);
  const categories = result.rows.map((row) => {
    const dimValues = row.slice(0, dimensionCount).map(formatCategory);
    return dimValues.length > 0 ? dimValues.join(' / ') : formatCategory(row[0]);
  });
  const series = measureColumns.map((column, measureIndex) => ({
    name: column.label,
    data: result.rows.map((row) => Number(row[dimensionCount + measureIndex] ?? 0)),
  }));
  return { categories, series };
}

const baseGridLine = (theme: ChartTheme) => ({
  lineStyle: { color: theme.axis },
});

export function buildLineOption(
  result: QueryResult,
  dimensionCount: number,
  theme: ChartTheme,
): EChartsOption {
  const { categories, series } = toCategoriesAndSeries(result, dimensionCount);
  return {
    color: theme.seriesColors,
    tooltip: { trigger: 'axis' },
    legend: series.length > 1 ? { textStyle: { color: theme.muted } } : undefined,
    grid: { left: 48, right: 16, top: series.length > 1 ? 32 : 16, bottom: 32 },
    xAxis: {
      type: 'category',
      data: categories,
      axisLine: baseGridLine(theme),
      axisLabel: { color: theme.muted },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: theme.grid } },
      axisLabel: { color: theme.muted, formatter: (v: number) => numberFormatter.format(v) },
    },
    series: series.map((s) => ({
      name: s.name,
      type: 'line',
      data: s.data,
      lineStyle: { width: 2 },
      symbolSize: 8,
    })),
  };
}

export function buildBarOption(
  result: QueryResult,
  dimensionCount: number,
  theme: ChartTheme,
): EChartsOption {
  const { categories, series } = toCategoriesAndSeries(result, dimensionCount);
  return {
    color: theme.seriesColors,
    tooltip: { trigger: 'axis' },
    legend: series.length > 1 ? { textStyle: { color: theme.muted } } : undefined,
    grid: { left: 48, right: 16, top: series.length > 1 ? 32 : 16, bottom: 32 },
    xAxis: {
      type: 'category',
      data: categories,
      axisLine: baseGridLine(theme),
      axisLabel: { color: theme.muted },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: theme.grid } },
      axisLabel: { color: theme.muted, formatter: (v: number) => numberFormatter.format(v) },
    },
    series: series.map((s) => ({
      name: s.name,
      type: 'bar',
      data: s.data,
      itemStyle: { borderRadius: [4, 4, 0, 0] },
    })),
  };
}

export function buildHorizontalBarOption(
  result: QueryResult,
  dimensionCount: number,
  theme: ChartTheme,
): EChartsOption {
  const { categories, series } = toCategoriesAndSeries(result, dimensionCount);
  return {
    color: theme.seriesColors,
    tooltip: { trigger: 'axis' },
    legend: series.length > 1 ? { textStyle: { color: theme.muted } } : undefined,
    grid: { left: 96, right: 24, top: series.length > 1 ? 32 : 16, bottom: 24 },
    yAxis: {
      type: 'category',
      data: categories,
      axisLine: baseGridLine(theme),
      axisLabel: { color: theme.muted },
    },
    xAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: theme.grid } },
      axisLabel: { color: theme.muted, formatter: (v: number) => numberFormatter.format(v) },
    },
    series: series.map((s) => ({
      name: s.name,
      type: 'bar',
      data: s.data,
      itemStyle: { borderRadius: [0, 4, 4, 0] },
    })),
  };
}

/** Pasta grafik gosterimi icin ortak catal - hem QueryResult tabanli dashboard
 * widget'i (buildPieOption) hem de ad-hoc {name,value} noktalariyla calisan ekranlar
 * (orn. teklif maliyet grafikleri) bunu kullanir. `tooltipValueFormatter` verilirse
 * (orn. para birimi formatlamak icin) varsayilan ham sayi yerine kullanilir. */
export function buildPieOptionFromPoints(
  theme: ChartTheme,
  data: { name: string; value: number }[],
  tooltipValueFormatter?: (value: number) => string,
): EChartsOption {
  return {
    color: theme.seriesColors,
    tooltip: {
      trigger: 'item',
      formatter: tooltipValueFormatter
        ? (params: TooltipComponentFormatterCallbackParams) => {
            const point = Array.isArray(params) ? params[0] : params;
            return `${point.marker ?? ''}${point.name}: ${tooltipValueFormatter(Number(point.value ?? 0))} (${point.percent}%)`;
          }
        : undefined,
    },
    legend: {
      orient: 'vertical',
      right: '22%',
      top: 'middle',
      textStyle: { color: theme.muted },
      formatter: (name: string) => {
        const point = data.find((item) => item.name === name);
        if (!point) return name;
        const formattedValue = tooltipValueFormatter
          ? tooltipValueFormatter(point.value)
          : numberFormatter.format(point.value);
        return `${name}: ${formattedValue}`;
      },
    },
    series: [
      {
        type: 'pie',
        center: ['28%', '50%'],
        radius: ['45%', '70%'],
        itemStyle: { borderColor: theme.grid, borderWidth: 2, borderRadius: 4 },
        label: { color: theme.muted, formatter: '{b}: {d}%' },
        data,
      },
    ],
  };
}

export function buildPieOption(
  result: QueryResult,
  dimensionCount: number,
  theme: ChartTheme,
): EChartsOption {
  const { categories, series } = toCategoriesAndSeries(result, dimensionCount);
  const values = series[0]?.data ?? [];
  return buildPieOptionFromPoints(
    theme,
    categories.map((name, index) => ({ name, value: values[index] ?? 0 })),
  );
}
