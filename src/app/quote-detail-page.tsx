import { useMutation } from '@tanstack/react-query';
import { clsx } from 'clsx';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AppShell } from './app-shell';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { PageHelp } from '../components/ui/page-help';
import { useToast } from '../components/ui/toast-context';
import { useMeQuery } from '../features/auth/use-auth';
import { hasPermission } from '../features/auth/permissions';
import {
  useApproveQuoteMutation,
  useDeleteQuoteMutation,
  useQuoteQuery,
  useRejectQuoteMutation,
} from '../features/crm/use-quotes';
import { ApiError, exportQuotePdf, type Quote, type QuoteItem, type QuoteStatus } from '../lib/api';
import { downloadBlob } from '../lib/download';
import { tr } from '../i18n/tr';

const STATUS_BADGE_VARIANT: Record<QuoteStatus, 'success' | 'warning' | 'danger' | 'neutral'> = {
  DRAFT: 'neutral',
  PENDING_APPROVAL: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
};

const currency = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' });

function lineTotal(item: QuoteItem): number {
  const subtotal = Number(item.quantity) * Number(item.unitPrice);
  const discounted = subtotal * (1 - Number(item.discountPct) / 100);
  return discounted * (1 + Number(item.vatPct) / 100);
}

function computeTotals(quote: Quote) {
  const subtotal = quote.items.reduce(
    (sum, item) =>
      sum + Number(item.quantity) * Number(item.unitPrice) * (1 - Number(item.discountPct) / 100),
    0,
  );
  const grandTotal = quote.items.reduce((sum, item) => sum + lineTotal(item), 0);
  return { subtotal, vatTotal: grandTotal - subtotal, grandTotal };
}

export function QuoteDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const isPrintMode = searchParams.get('print') === '1';
  const quoteQuery = useQuoteQuery(id);
  const meQuery = useMeQuery();
  const deleteMutation = useDeleteQuoteMutation();
  const approveMutation = useApproveQuoteMutation(id);
  const rejectMutation = useRejectQuoteMutation(id);
  const exportPdfMutation = useMutation({
    mutationFn: () => exportQuotePdf(id),
    onSuccess: (blob) => downloadBlob(blob, `${quoteQuery.data?.quoteNumber ?? 'teklif'}.pdf`),
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : tr.crm.quotes.detail.exportPdfError);
    },
  });

  if (quoteQuery.isPending) {
    return (
      <AppShell print={isPrintMode}>
        <p className="text-sm text-app-muted">{tr.common.loading}</p>
      </AppShell>
    );
  }

  if (!quoteQuery.data) {
    return null;
  }

  const quote = quoteQuery.data;
  const totals = computeTotals(quote);
  const canApprove = hasPermission(meQuery.data?.permissions, 'quotes', 'APPROVE');

  function handleDelete() {
    if (!window.confirm(tr.crm.quotes.deleteConfirm)) {
      return;
    }
    deleteMutation.mutate(id, { onSuccess: () => navigate('/teklifler') });
  }

  function handleApprove() {
    approveMutation.mutate(undefined, {
      onSuccess: () => toast.success(tr.crm.quotes.detail.approveSuccess),
      onError: (error) => {
        toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
      },
    });
  }

  function handleReject() {
    rejectMutation.mutate(undefined, {
      onSuccess: () => toast.success(tr.crm.quotes.detail.rejectSuccess),
      onError: (error) => {
        toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
      },
    });
  }

  return (
    <AppShell print={isPrintMode}>
      {!isPrintMode && (
        <button
          type="button"
          onClick={() => navigate('/teklifler')}
          className="text-sm font-semibold text-app-muted hover:text-app-text"
        >
          {'←'} {tr.crm.quotes.detail.back}
        </button>
      )}

      <div
        className={clsx('flex flex-wrap items-start justify-between gap-4', !isPrintMode && 'mt-6')}
      >
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-app-text">{quote.quoteNumber}</h1>
            <PageHelp text={tr.help.quoteDetail} />
            <Badge variant={STATUS_BADGE_VARIANT[quote.status]}>
              {tr.crm.quotes.statusOptions[quote.status]}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-app-muted">
            {quote.account.name}
            {quote.contact && ` · ${quote.contact.firstName} ${quote.contact.lastName}`}
          </p>
        </div>
        {!isPrintMode && (
          <div className="flex flex-wrap gap-2">
            {quote.status === 'PENDING_APPROVAL' && canApprove && (
              <>
                <Button type="button" onClick={handleApprove} disabled={approveMutation.isPending}>
                  {tr.crm.quotes.detail.approveButton}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleReject}
                  disabled={rejectMutation.isPending}
                >
                  {tr.crm.quotes.detail.rejectButton}
                </Button>
              </>
            )}
            {(quote.status === 'DRAFT' || quote.status === 'APPROVED') && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => exportPdfMutation.mutate()}
                disabled={exportPdfMutation.isPending}
              >
                {exportPdfMutation.isPending
                  ? tr.crm.quotes.detail.exportPdfBusy
                  : tr.crm.quotes.detail.exportPdfButton}
              </Button>
            )}
            <Button type="button" variant="danger" onClick={handleDelete}>
              {tr.crm.quotes.detail.deleteButton}
            </Button>
          </div>
        )}
      </div>

      {!isPrintMode && quote.status === 'PENDING_APPROVAL' && (
        <p className="mt-4 rounded-lg bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
          {tr.crm.quotes.detail.pendingApprovalNotice}
        </p>
      )}

      <div className="mt-6 overflow-x-auto rounded-xl border border-app-border bg-app-surface p-6">
        <h2 className="text-sm font-bold text-app-text">{tr.crm.quotes.detail.itemsTitle}</h2>
        <table className="mt-3 w-full text-left text-sm">
          <thead className="text-xs font-semibold uppercase text-app-muted">
            <tr>
              <th className="py-2 pr-3">{tr.crm.products.nameColumn}</th>
              <th className="py-2 pr-3">{tr.crm.quotes.detail.quantityColumn}</th>
              <th className="py-2 pr-3">{tr.crm.quotes.detail.unitPriceColumn}</th>
              <th className="py-2 pr-3">{tr.crm.quotes.detail.discountColumn}</th>
              <th className="py-2 pr-3">{tr.crm.quotes.detail.vatColumn}</th>
              <th className="py-2 pr-3 text-right">{tr.crm.quotes.detail.lineTotalColumn}</th>
            </tr>
          </thead>
          <tbody>
            {quote.items.map((item) => (
              <tr key={item.id} className="border-t border-app-border">
                <td className="py-2 pr-3 text-app-text">
                  {item.product.name}
                  {!isPrintMode && item.discountNote && (
                    <p className="text-xs text-app-muted">{item.discountNote}</p>
                  )}
                </td>
                <td className="py-2 pr-3 text-app-muted">{item.quantity}</td>
                <td className="py-2 pr-3 text-app-muted">
                  {currency.format(Number(item.unitPrice))}
                </td>
                <td className="py-2 pr-3 text-app-muted">%{item.discountPct}</td>
                <td className="py-2 pr-3 text-app-muted">%{item.vatPct}</td>
                <td className="py-2 pr-3 text-right text-app-text">
                  {currency.format(lineTotal(item))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 flex flex-col items-end gap-1 text-sm">
          <div className="flex w-56 justify-between">
            <span className="text-app-muted">{tr.crm.quotes.detail.subtotalLabel}</span>
            <span className="text-app-text">{currency.format(totals.subtotal)}</span>
          </div>
          <div className="flex w-56 justify-between">
            <span className="text-app-muted">{tr.crm.quotes.detail.vatTotalLabel}</span>
            <span className="text-app-text">{currency.format(totals.vatTotal)}</span>
          </div>
          <div className="flex w-56 justify-between font-bold">
            <span className="text-app-text">{tr.crm.quotes.detail.grandTotalLabel}</span>
            <span className="text-app-text">{currency.format(totals.grandTotal)}</span>
          </div>
        </div>
      </div>

      {!isPrintMode && quote.opportunity && (
        <div className="mt-6 rounded-xl border border-app-border bg-app-surface p-6">
          <h2 className="text-sm font-bold text-app-text">
            {tr.crm.quotes.detail.opportunityTitle}
          </h2>
          <button
            type="button"
            onClick={() => navigate(`/firsatlar/${quote.opportunity?.id}`)}
            className="mt-2 text-sm font-semibold text-app-brand hover:underline"
          >
            {quote.opportunity.name} ({tr.crm.opportunities.stageOptions[quote.opportunity.stage]})
          </button>
        </div>
      )}
    </AppShell>
  );
}
