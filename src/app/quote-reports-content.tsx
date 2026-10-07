import { useNavigate } from 'react-router-dom';
import { ChartCard } from '../components/ui/chart-card';
import { useQuoteStatusCounts } from '../features/crm/use-quotes';
import { ChartWithExport } from '../features/dashboards/widgets/chart-with-export';
import { getChartTheme } from '../features/dashboards/widgets/chart-theme';
import { buildPieOptionFromPoints } from '../features/dashboards/widgets/query-result-to-echarts-option';
import { tr } from '../i18n/tr';
import type { QuoteStatus } from '../lib/api';
import { QUOTE_STATUS_OPTIONS } from '../lib/quote-totals';

const numberFormatter = new Intl.NumberFormat('tr-TR');

function KpiCard({
  label,
  value,
  onClick,
}: {
  label: string;
  value: number | undefined;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex cursor-pointer flex-col items-center gap-1 border border-app-border bg-app-surface p-4 text-center transition-colors hover:border-app-brand hover:bg-app-bg-muted"
    >
      <span className="text-2xl font-bold text-app-text">
        {value === undefined ? '—' : numberFormatter.format(value)}
      </span>
      <span className="text-sm font-medium text-app-muted">{label}</span>
    </button>
  );
}

export function QuoteReportsContent() {
  const navigate = useNavigate();
  const statusCounts = useQuoteStatusCounts(QUOTE_STATUS_OPTIONS.map((option) => option.value));
  const theme = getChartTheme();

  function goToQuotes(status?: QuoteStatus) {
    const params = new URLSearchParams({ tab: 'quotes' });
    if (status) params.set('status', status);
    navigate(`/teklifler?${params.toString()}`);
  }

  const statusDistributionPoints = QUOTE_STATUS_OPTIONS.map((option) => ({
    status: option.value,
    name: option.label,
    value: statusCounts.counts[option.value] ?? 0,
  })).filter((point) => point.value > 0);
  const hasQuotes = statusDistributionPoints.length > 0;
  const statusDistributionOption = buildPieOptionFromPoints(
    theme,
    statusDistributionPoints,
    (value) => numberFormatter.format(value),
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
        <KpiCard
          label={tr.crm.quoteReports.totalLabel}
          value={statusCounts.all}
          onClick={() => goToQuotes()}
        />
        {QUOTE_STATUS_OPTIONS.map((option) => (
          <KpiCard
            key={option.value}
            label={option.label}
            value={statusCounts.counts[option.value]}
            onClick={() => goToQuotes(option.value)}
          />
        ))}
      </div>

      <ChartCard title={tr.crm.quoteReports.statusDistributionTitle}>
        {hasQuotes ? (
          <ChartWithExport
            option={statusDistributionOption}
            fileName={tr.crm.quoteReports.statusDistributionTitle}
            onEvents={{
              click: (params) => goToQuotes(statusDistributionPoints[params.dataIndex]?.status),
            }}
          />
        ) : (
          <p className="text-sm text-app-muted">{tr.crm.quotes.costTab.empty}</p>
        )}
      </ChartCard>
    </div>
  );
}
