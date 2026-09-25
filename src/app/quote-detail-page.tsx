import { useMutation } from '@tanstack/react-query';
import { clsx } from 'clsx';
import { ChevronRight, FileDown } from 'lucide-react';
import type { ReactNode } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AppShell } from './app-shell';
import { BackLink } from '../components/ui/back-link';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { PageHelp } from '../components/ui/page-help';
import { Table, type TableColumn } from '../components/ui/table';
import { Tooltip } from '../components/ui/tooltip';
import { useToast } from '../components/ui/toast-context';
import { useMeQuery } from '../features/auth/use-auth';
import { hasPermission } from '../features/auth/permissions';
import {
  useApproveQuoteMutation,
  useQuoteQuery,
  useRejectQuoteMutation,
} from '../features/crm/use-quotes';
import { useTenantProfileQuery } from '../features/crm/use-tenant-logo';
import { ApiError, exportQuotePdf, type Quote, type QuoteItem, type QuoteStatus } from '../lib/api';
import { downloadBlob } from '../lib/download';
import { formatIbanInput } from '../lib/iban-validation';
import { tr } from '../i18n/tr';

const STATUS_BADGE_VARIANT: Record<QuoteStatus, 'success' | 'warning' | 'danger' | 'neutral'> = {
  DRAFT: 'neutral',
  PENDING_APPROVAL: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
};

const currency = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' });
const dateFormatter = new Intl.DateTimeFormat('tr-TR');

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

function MetaCell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-semibold tracking-wide text-app-muted uppercase">{label}</p>
      <div className="mt-1.5 text-sm font-medium text-app-text">{children}</div>
    </div>
  );
}

function SectionHeader({ children }: { children: ReactNode }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span className="shrink-0 text-[11px] font-bold tracking-wide text-app-muted uppercase">
        {children}
      </span>
      <span className="h-px flex-1 bg-app-border" />
    </div>
  );
}

function InfoLinkRow({
  label,
  value,
  suffix,
  onClick,
}: {
  label: string;
  value: string;
  suffix?: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-start justify-between gap-2 rounded-lg text-left transition-transform duration-150 hover:translate-x-1"
    >
      <span className="min-w-0">
        <span className="block text-[11px] font-semibold tracking-wide text-app-muted uppercase">
          {label}
        </span>
        <span className="mt-1 block truncate text-lg font-semibold text-app-text group-hover:text-app-brand">
          {value}
          {suffix && <span className="ml-1 text-sm font-normal text-app-muted">({suffix})</span>}
        </span>
      </span>
      <ChevronRight
        size={16}
        className="mt-1 shrink-0 text-app-muted transition-colors group-hover:text-app-brand"
      />
    </button>
  );
}

export function QuoteDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const isPrintMode = searchParams.get('print') === '1';
  const quoteQuery = useQuoteQuery(id);
  const meQuery = useMeQuery();
  const tenantProfileQuery = useTenantProfileQuery();
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
      <AppShell print={isPrintMode} printLogoUrl={tenantProfileQuery.data?.logoUrl}>
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

  const itemColumns: TableColumn<QuoteItem>[] = [
    {
      key: 'product',
      header: tr.crm.products.nameColumn,
      render: (item) => item.product.name,
    },
    {
      key: 'quantity',
      header: tr.crm.quotes.detail.quantityColumn,
      className: 'text-app-muted',
      render: (item) => item.quantity,
    },
    {
      key: 'unitPrice',
      header: tr.crm.quotes.detail.unitPriceColumn,
      className: 'text-app-muted',
      render: (item) => currency.format(Number(item.unitPrice)),
    },
    {
      key: 'discountPct',
      header: tr.crm.quotes.detail.discountColumn,
      className: 'text-app-muted',
      render: (item) => `%${item.discountPct}`,
    },
    {
      key: 'vatPct',
      header: tr.crm.quotes.detail.vatColumn,
      className: 'text-app-muted',
      render: (item) => `%${item.vatPct}`,
    },
    {
      key: 'lineTotal',
      header: tr.crm.quotes.detail.lineTotalColumn,
      className: 'text-right',
      render: (item) => currency.format(lineTotal(item)),
    },
  ];

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
    <AppShell print={isPrintMode} printLogoUrl={tenantProfileQuery.data?.logoUrl}>
      {!isPrintMode && <BackLink to={'/teklifler'} label={tr.crm.quotes.detail.back} />}

      <div
        className={clsx('flex flex-wrap items-start justify-between gap-4', !isPrintMode && 'mt-3')}
      >
        <div className="min-w-0">
          {!isPrintMode && (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-app-muted uppercase">
              {tr.crm.quotes.detail.documentEyebrow}
            </span>
          )}
          <div className="mt-1.5 flex flex-wrap items-center gap-2.5">
            <h1 className="text-4xl leading-tight font-bold text-app-text">{quote.quoteNumber}</h1>
            {!isPrintMode && <PageHelp text={tr.help.quoteDetail} />}
            {!isPrintMode && (
              <Badge variant={STATUS_BADGE_VARIANT[quote.status]}>
                {tr.crm.quotes.statusOptions[quote.status]}
              </Badge>
            )}
          </div>
          {quote.title && (
            <p className="mt-1.5 text-sm font-semibold text-app-text">{quote.title}</p>
          )}
          <p className="mt-1 text-sm text-app-muted">
            {quote.account.name}
            {quote.contact && ` · ${quote.contact.firstName} ${quote.contact.lastName}`}
          </p>
        </div>
        {!isPrintMode && (
          <div className="flex items-center gap-2 pt-1">
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
              <Tooltip content={tr.crm.quotes.detail.exportPdfButton}>
                <button
                  type="button"
                  onClick={() => exportPdfMutation.mutate()}
                  disabled={exportPdfMutation.isPending}
                  aria-label={tr.crm.quotes.detail.exportPdfButton}
                  className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1a2440] text-white transition-colors hover:bg-[#141c33] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <FileDown size={18} />
                </button>
              </Tooltip>
            )}
          </div>
        )}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 border-y border-app-border py-4 sm:grid-cols-4 sm:divide-x sm:divide-app-border">
        <MetaCell label={tr.crm.quotes.detail.quoteDateLabel}>
          {dateFormatter.format(new Date(quote.quoteDate))}
        </MetaCell>
        <MetaCell label={tr.crm.quotes.detail.leadTimeLabel}>
          {quote.leadTime ?? tr.crm.quotes.detail.leadTimeEmpty}
        </MetaCell>
        <MetaCell label={tr.crm.quotes.detail.paymentMethodLabel}>
          {quote.paymentMethod ?? tr.crm.quotes.detail.paymentMethodEmpty}
        </MetaCell>
        <MetaCell label={tr.crm.quotes.detail.grandTotalLabel}>
          {currency.format(totals.grandTotal)}
        </MetaCell>
      </div>

      {!isPrintMode && quote.status === 'PENDING_APPROVAL' && (
        <p className="mt-4 rounded-lg bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
          {tr.crm.quotes.detail.pendingApprovalNotice}
        </p>
      )}

      <div className="mt-8">
        <SectionHeader>{tr.crm.quotes.detail.itemsTitle}</SectionHeader>
        <Table
          columns={itemColumns}
          data={quote.items}
          keyField={(item) => item.id}
          emptyMessage={tr.crm.quotes.form.summaryEmpty}
        />

        <div className="mt-4 flex flex-col items-end gap-1.5 text-sm">
          <div className="flex w-64 justify-between">
            <span className="text-app-muted">{tr.crm.quotes.detail.subtotalLabel}</span>
            <span className="text-app-text">{currency.format(totals.subtotal)}</span>
          </div>
          <div className="flex w-64 justify-between">
            <span className="text-app-muted">{tr.crm.quotes.detail.vatTotalLabel}</span>
            <span className="text-app-text">{currency.format(totals.vatTotal)}</span>
          </div>
          <div className="flex w-64 justify-between border-t border-app-border pt-1.5 text-base font-bold">
            <span className="text-app-text">{tr.crm.quotes.detail.grandTotalLabel}</span>
            <span className="text-app-text">{currency.format(totals.grandTotal)}</span>
          </div>
        </div>
      </div>

      {(quote.salesTerms || quote.deliveryTerms) && (
        <div className="print-page-break mt-8 flex flex-col gap-4 border-t border-app-border pt-6">
          {quote.salesTerms && (
            <div className="rounded-xl bg-white p-5 shadow-sm">
              <SectionHeader>{tr.crm.quotes.detail.salesTermsTitle}</SectionHeader>
              <p className="text-sm leading-relaxed whitespace-pre-wrap text-black">
                {quote.salesTerms}
              </p>
            </div>
          )}
          {quote.deliveryTerms && (
            <div className="rounded-xl bg-white p-5 shadow-sm">
              <SectionHeader>{tr.crm.quotes.detail.deliveryTermsTitle}</SectionHeader>
              <p className="text-sm leading-relaxed whitespace-pre-wrap text-black">
                {quote.deliveryTerms}
              </p>
            </div>
          )}
        </div>
      )}

      {quote.ibanNumber && (
        <div className="print-page-break mt-8 border-t border-app-border pt-6">
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <SectionHeader>{tr.crm.quotes.detail.bankDetailsTitle}</SectionHeader>
            <div
              className={clsx(
                'gap-4',
                isPrintMode ? 'flex flex-col' : 'grid grid-cols-2 sm:grid-cols-4',
              )}
            >
              <MetaCell label={tr.crm.quotes.detail.bankNameLabel}>{quote.ibanBankName}</MetaCell>
              <MetaCell label={tr.crm.quotes.detail.accountHolderNameLabel}>
                {quote.ibanAccountHolderName}
              </MetaCell>
              {quote.ibanAccountNumber && (
                <MetaCell label={tr.crm.quotes.detail.accountNumberLabel}>
                  {quote.ibanAccountNumber}
                </MetaCell>
              )}
              <MetaCell label={tr.crm.quotes.detail.ibanLabel}>
                <span className="break-all">{formatIbanInput(quote.ibanNumber)}</span>
              </MetaCell>
            </div>
          </div>
        </div>
      )}

      {!isPrintMode && quote.opportunity && (
        <div className="mt-8 border-t border-app-border pt-6">
          <SectionHeader>{tr.crm.quotes.detail.opportunityTitle}</SectionHeader>
          <InfoLinkRow
            label={tr.crm.opportunities.stageColumn}
            value={quote.opportunity.name}
            suffix={tr.crm.opportunities.stageOptions[quote.opportunity.stage]}
            onClick={() => navigate(`/firsatlar/${quote.opportunity?.id}`)}
          />
        </div>
      )}
    </AppShell>
  );
}
