import { useNavigate } from 'react-router-dom';
import { useQuoteStatusCounts } from '../features/crm/use-quotes';
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
      className="flex cursor-pointer flex-col gap-1 border border-app-border bg-app-surface p-6 text-left transition-colors hover:border-app-brand hover:bg-app-bg-muted"
    >
      <span className="text-3xl font-bold text-app-text">
        {value === undefined ? '—' : numberFormatter.format(value)}
      </span>
      <span className="text-sm font-medium text-app-muted">{label}</span>
    </button>
  );
}

export function QuoteReportsContent() {
  const navigate = useNavigate();
  const statusCounts = useQuoteStatusCounts(QUOTE_STATUS_OPTIONS.map((option) => option.value));

  function goToQuotes(status?: QuoteStatus) {
    const params = new URLSearchParams({ tab: 'quotes' });
    if (status) params.set('status', status);
    navigate(`/teklifler?${params.toString()}`);
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
  );
}
