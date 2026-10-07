import { ChartWithExport } from '../features/dashboards/widgets/chart-with-export';
import { getChartTheme } from '../features/dashboards/widgets/chart-theme';
import { buildPieOptionFromPoints } from '../features/dashboards/widgets/query-result-to-echarts-option';
import type { Quote } from '../lib/api';
import { computeQuoteCostBreakdown, formatCurrencyAmountPrecise } from '../lib/quote-totals';
import { tr } from '../i18n/tr';

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-app-border bg-app-surface p-5">
      <h2 className="mb-4 text-[11px] font-bold tracking-wide text-app-muted uppercase">{title}</h2>
      <div className="h-80">{children}</div>
    </div>
  );
}

export function QuoteChartsContent({ quote }: { quote: Quote }) {
  const breakdown = computeQuoteCostBreakdown(quote);
  const theme = getChartTheme();
  const currency = quote.quoteCurrency;
  const valueFormatter = (value: number) => formatCurrencyAmountPrecise(value, currency);

  const hasItems = breakdown.rows.length > 0;

  const grandTotalBreakdownOption = buildPieOptionFromPoints(
    theme,
    [
      { name: tr.crm.quotes.costTab.costColumn, value: breakdown.totalCost },
      { name: tr.crm.quotes.costTab.profitColumn, value: breakdown.netProfit },
      { name: tr.crm.quotes.costTab.totalVatLabel, value: breakdown.totalVat },
    ],
    valueFormatter,
  );

  const productProfitOption = buildPieOptionFromPoints(
    theme,
    breakdown.rows.map((row) => ({ name: row.productName, value: row.profit })),
    valueFormatter,
  );

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <ChartCard title={tr.crm.quotes.chartsTab.grandTotalBreakdownTitle}>
        {hasItems ? (
          <ChartWithExport
            option={grandTotalBreakdownOption}
            fileName={tr.crm.quotes.chartsTab.grandTotalBreakdownTitle}
          />
        ) : (
          <p className="text-sm text-app-muted">{tr.crm.quotes.costTab.empty}</p>
        )}
      </ChartCard>
      <ChartCard title={tr.crm.quotes.chartsTab.productProfitTitle}>
        {hasItems ? (
          <ChartWithExport
            option={productProfitOption}
            fileName={tr.crm.quotes.chartsTab.productProfitTitle}
          />
        ) : (
          <p className="text-sm text-app-muted">{tr.crm.quotes.costTab.empty}</p>
        )}
      </ChartCard>
    </div>
  );
}
