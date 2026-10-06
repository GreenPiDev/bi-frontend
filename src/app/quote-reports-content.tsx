import { useQuoteStatusCounts } from '../features/crm/use-quotes';
import { tr } from '../i18n/tr';
import { QUOTE_STATUS_OPTIONS } from '../lib/quote-totals';

const numberFormatter = new Intl.NumberFormat('tr-TR');

function KpiCard({ label, value }: { label: string; value: number | undefined }) {
  return (
    <div className="flex flex-col gap-1 border border-app-border bg-app-surface p-6">
      <span className="text-3xl font-bold text-app-text">
        {value === undefined ? '—' : numberFormatter.format(value)}
      </span>
      <span className="text-sm font-medium text-app-muted">{label}</span>
    </div>
  );
}

export function QuoteReportsContent() {
  const statusCounts = useQuoteStatusCounts(QUOTE_STATUS_OPTIONS.map((option) => option.value));

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard label={tr.crm.quoteReports.totalLabel} value={statusCounts.all} />
      {QUOTE_STATUS_OPTIONS.map((option) => (
        <KpiCard
          key={option.value}
          label={option.label}
          value={statusCounts.counts[option.value]}
        />
      ))}
    </div>
  );
}
