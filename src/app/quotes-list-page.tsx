import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from './app-shell';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Pagination, Table, type TableColumn } from '../components/ui/table';
import { Select } from '../components/ui/select';
import { useQuotesQuery } from '../features/crm/use-quotes';
import type { Quote, QuoteStatus } from '../lib/api';
import { tr } from '../i18n/tr';

const STATUS_OPTIONS: { value: QuoteStatus; label: string }[] = (
  ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED'] as const
).map((status) => ({ value: status, label: tr.crm.quotes.statusOptions[status] }));

const STATUS_BADGE_VARIANT: Record<QuoteStatus, 'success' | 'warning' | 'danger' | 'neutral'> = {
  DRAFT: 'neutral',
  PENDING_APPROVAL: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
};

function quoteTotal(quote: Quote): number {
  return quote.items.reduce((sum, item) => {
    const lineSubtotal = Number(item.quantity) * Number(item.unitPrice);
    const discounted = lineSubtotal * (1 - Number(item.discountPct) / 100);
    return sum + discounted * (1 + Number(item.vatPct) / 100);
  }, 0);
}

const columns: TableColumn<Quote>[] = [
  {
    key: 'quoteNumber',
    header: tr.crm.quotes.numberColumn,
    render: (q) => <span className="font-semibold text-app-text">{q.quoteNumber}</span>,
  },
  {
    key: 'account',
    header: tr.crm.quotes.accountColumn,
    render: (q) => q.account.name,
  },
  {
    key: 'status',
    header: tr.crm.quotes.statusColumn,
    render: (q) => (
      <Badge variant={STATUS_BADGE_VARIANT[q.status]}>
        {tr.crm.quotes.statusOptions[q.status]}
      </Badge>
    ),
  },
  {
    key: 'total',
    header: tr.crm.quotes.totalColumn,
    className: 'text-app-muted',
    render: (q) =>
      new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(quoteTotal(q)),
  },
];

export function QuotesListPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<QuoteStatus | ''>('');
  const quotesQuery = useQuotesQuery({ page, status: status || undefined });

  return (
    <AppShell>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-app-text">{tr.crm.quotes.title}</h1>
          <p className="mt-1 text-sm text-app-muted">{tr.crm.quotes.subtitle}</p>
        </div>
        <Button type="button" onClick={() => navigate('/teklifler/yeni')}>
          {tr.crm.quotes.newButton}
        </Button>
      </div>

      <div className="mt-6 max-w-xs">
        <Select
          label={tr.crm.quotes.statusFilterLabel}
          value={status}
          onChange={(event) => {
            setPage(1);
            setStatus(event.target.value as QuoteStatus | '');
          }}
          placeholder={tr.crm.quotes.allStatuses}
          options={STATUS_OPTIONS}
        />
      </div>

      <Table
        columns={columns}
        data={quotesQuery.data?.data ?? []}
        keyField={(quote) => quote.id}
        onRowClick={(quote) => navigate(`/teklifler/${quote.id}`)}
        isLoading={quotesQuery.isPending}
        loadingMessage={tr.crm.quotes.loading}
        emptyMessage={tr.crm.quotes.empty}
      />

      {quotesQuery.data && quotesQuery.data.data.length > 0 && (
        <Pagination
          page={quotesQuery.data.meta.page}
          totalPages={quotesQuery.data.meta.totalPages}
          onPrevious={() => setPage((p) => p - 1)}
          onNext={() => setPage((p) => p + 1)}
        />
      )}
    </AppShell>
  );
}
