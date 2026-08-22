const SERIES_VAR_NAMES = [
  '--chart-series-1',
  '--chart-series-2',
  '--chart-series-3',
  '--chart-series-4',
  '--chart-series-5',
  '--chart-series-6',
  '--chart-series-7',
  '--chart-series-8',
];

function readCssVar(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

export interface ChartTheme {
  seriesColors: string[];
  grid: string;
  axis: string;
  muted: string;
}

export function getChartTheme(): ChartTheme {
  return {
    seriesColors: SERIES_VAR_NAMES.map((name, index) =>
      readCssVar(name, ['#2a78d6', '#008300', '#e87ba4', '#eda100'][index] ?? '#898781'),
    ),
    grid: readCssVar('--chart-grid', '#e1e0d9'),
    axis: readCssVar('--chart-axis', '#c3c2b7'),
    muted: readCssVar('--chart-muted', '#898781'),
  };
}
