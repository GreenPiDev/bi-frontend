import { useMutation, useQuery } from '@tanstack/react-query';
import { clsx } from 'clsx';
import {
  Check,
  ChevronRight,
  FileDown,
  Mail,
  Pencil,
  RotateCcw,
  Send,
  ShoppingCart,
  Trash2,
  X,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AppShell } from './app-shell';
import { ApproveQuoteModal } from './approve-quote-modal';
import { NewMessageModal } from './new-message-modal';
import { BackLink } from '../components/ui/back-link';
import { Badge } from '../components/ui/badge';
import { CircleIconButton } from '../components/ui/circle-icon-button';
import { ConfirmModal } from '../components/ui/confirm-modal';
import { PageHelp } from '../components/ui/page-help';
import { Table, type TableColumn } from '../components/ui/table';
import { useToast } from '../components/ui/toast-context';
import { useMeQuery } from '../features/auth/use-auth';
import { hasPermission } from '../features/auth/permissions';
import {
  useApproveQuoteMutation,
  useDeleteQuoteMutation,
  useQuoteQuery,
  useRejectQuoteMutation,
  useUpdateQuoteMutation,
} from '../features/crm/use-quotes';
import { useDrawingsQuery } from '../features/crm/use-drawings';
import { useTenantProfileQuery } from '../features/crm/use-tenant-logo';
import {
  ApiError,
  exportQuotePdf,
  getQuotePrintData,
  type Drawing,
  type Quote,
  type QuoteItem,
  type QuotePrintCompanyData,
  type QuotePrintSenderData,
  type QuoteStatus,
} from '../lib/api';
import { loadBlobIntoTabHandle, openBlobInNewTabHandle } from '../lib/download';
import { formatIbanInput } from '../lib/iban-validation';
import {
  computeLineTotal,
  convertTotalsToQuoteCurrency,
  formatCurrencyAmount,
  getQuoteCurrencyTotals,
  groupQuoteItemTotals,
} from '../lib/quote-totals';
import { tr } from '../i18n/tr';

const STATUS_BADGE_VARIANT: Record<
  QuoteStatus,
  'success' | 'warning' | 'danger' | 'neutral' | 'orange'
> = {
  UNSPECIFIED: 'neutral',
  DRAFT: 'neutral',
  PENDING_APPROVAL: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
  REVIZE: 'orange',
};

const dateFormatter = new Intl.DateTimeFormat('tr-TR');

function lineTotal(item: QuoteItem): number {
  return computeLineTotal({
    quantity: Number(item.quantity),
    unitPrice: Number(item.unitPrice),
    discountPct: Number(item.discountPct),
    vatPct: Number(item.vatPct),
  }).lineTotal;
}

function computeTotals(quote: Quote) {
  return getQuoteCurrencyTotals(quote);
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

export function QuoteContentBody({
  quote,
  isPrintMode = false,
  onOpportunityClick,
  company,
  sender,
}: {
  quote: Quote;
  isPrintMode?: boolean;
  onOpportunityClick: (opportunityId: string) => void;
  /** Sadece yazdirma gorunumunde (isPrintMode) dolu gelir - bkz.
   * docs/VARSAYIMLAR.md "sirket bilgileri"/"gonderen" parite notu. */
  company?: QuotePrintCompanyData;
  sender?: QuotePrintSenderData | null;
}) {
  const totals = computeTotals(quote);
  const foreignCurrencyTotals = totals.filter((t) => t.currency !== quote.quoteCurrency);
  const conversion =
    foreignCurrencyTotals.length > 0
      ? convertTotalsToQuoteCurrency(totals, quote.quoteCurrency, quote.exchangeRates?.rates ?? {})
      : null;

  const itemColumns: TableColumn<QuoteItem>[] = [
    {
      key: 'product',
      header: tr.crm.products.nameColumn,
      className: 'break-words',
      render: (item) => item.product.name,
    },
    {
      key: 'quantity',
      header: tr.crm.quotes.detail.quantityColumn,
      className: 'w-20 whitespace-nowrap text-right text-app-muted',
      render: (item) => item.quantity,
    },
    {
      key: 'unitPrice',
      header: tr.crm.quotes.detail.unitPriceColumn,
      className: 'w-28 whitespace-nowrap text-right text-app-muted',
      render: (item) => formatCurrencyAmount(Number(item.unitPrice), item.currency),
    },
    {
      key: 'discountPct',
      header: tr.crm.quotes.detail.discountColumn,
      className: 'w-20 whitespace-nowrap text-right text-app-muted',
      render: (item) => `%${item.discountPct}`,
    },
    {
      key: 'vatPct',
      header: tr.crm.quotes.detail.vatColumn,
      className: 'w-16 whitespace-nowrap text-right text-app-muted',
      render: (item) => `%${item.vatPct}`,
    },
    {
      key: 'lineTotal',
      header: tr.crm.quotes.detail.lineTotalColumn,
      className: 'w-28 whitespace-nowrap text-right',
      render: (item) => formatCurrencyAmount(lineTotal(item), item.currency),
    },
  ];

  return (
    <>
      <div className="grid grid-cols-2 gap-4 border-y border-app-border py-4 sm:grid-cols-4 sm:divide-x sm:divide-app-border">
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
          {conversion && conversion.missingRateCurrencies.length === 0
            ? formatCurrencyAmount(conversion.grandTotal, quote.quoteCurrency)
            : totals.map((t) => formatCurrencyAmount(t.grandTotal, t.currency)).join(' + ')}
        </MetaCell>
      </div>

      {!isPrintMode && quote.revisionCount > 0 && quote.revisionSnapshot && (
        <div className="mt-8">
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <SectionHeader>{tr.crm.quotes.detail.revisionTitle}</SectionHeader>
            {quote.revisionNote && (
              <p className="text-sm whitespace-pre-wrap text-black">{quote.revisionNote}</p>
            )}
            <p className="mt-2 text-xs text-app-muted">
              {tr.crm.quotes.detail.revisionOldTotalLabel}{' '}
              {(() => {
                const snapshot = quote.revisionSnapshot!;
                const oldTotals = groupQuoteItemTotals(snapshot.items);
                const foreignOldTotals = oldTotals.filter(
                  (t) => t.currency !== snapshot.quoteCurrency,
                );
                if (foreignOldTotals.length === 0) {
                  return oldTotals
                    .map((t) => formatCurrencyAmount(t.grandTotal, t.currency))
                    .join(' + ');
                }
                const oldConversion = convertTotalsToQuoteCurrency(
                  oldTotals,
                  snapshot.quoteCurrency,
                  snapshot.exchangeRates?.rates ?? {},
                );
                if (oldConversion.missingRateCurrencies.length > 0) {
                  return oldTotals
                    .map((t) => formatCurrencyAmount(t.grandTotal, t.currency))
                    .join(' + ');
                }
                return formatCurrencyAmount(oldConversion.grandTotal, snapshot.quoteCurrency);
              })()}
            </p>
          </div>
        </div>
      )}

      <div className="mt-8">
        <SectionHeader>{tr.crm.quotes.detail.itemsTitle}</SectionHeader>
        <div className="[&_tbody_td]:text-xs">
          <Table
            columns={itemColumns}
            data={quote.items}
            keyField={(item) => item.id}
            emptyMessage={
              quote.itemsEntryMode === 'MANUAL_TOTAL'
                ? tr.crm.quotes.detail.manualTotalItemsEmpty
                : tr.crm.quotes.form.summaryEmpty
            }
            fixedLayout
          />
        </div>

        <div className="mt-4 flex flex-wrap justify-end gap-4 text-xs">
          {totals.map((t) => (
            <div key={t.currency} className="flex w-44 flex-col gap-1">
              {totals.length > 1 && (
                <span className="text-right text-[11px] font-semibold text-app-muted">
                  {t.currency}
                </span>
              )}
              <div className="flex justify-between">
                <span className="text-app-muted">{tr.crm.quotes.detail.subtotalLabel}</span>
                <span className="text-app-text">
                  {formatCurrencyAmount(t.subtotal, t.currency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-app-muted">{tr.crm.quotes.detail.vatTotalLabel}</span>
                <span className="text-app-text">
                  {formatCurrencyAmount(t.vatTotal, t.currency)}
                </span>
              </div>
              <div className="flex justify-between border-t border-app-border pt-1 text-sm font-bold">
                <span className="text-app-text">{tr.crm.quotes.detail.totalLabel}</span>
                <span className="text-app-text">
                  {formatCurrencyAmount(t.grandTotal, t.currency)}
                </span>
              </div>
            </div>
          ))}
        </div>

        {conversion && (
          <div className="mt-4 flex flex-col items-end gap-1">
            {conversion.missingRateCurrencies.length === 0 ? (
              <>
                <div className="flex w-44 justify-between border-t border-app-border pt-1 text-sm font-bold">
                  <span className="text-app-text">
                    {tr.crm.quotes.form.convertedGrandTotalLabel(quote.quoteCurrency)}
                  </span>
                  <span className="text-app-text">
                    {formatCurrencyAmount(conversion.grandTotal, quote.quoteCurrency)}
                  </span>
                </div>
                <p className="max-w-xs text-right text-[11px] text-app-muted">
                  {tr.crm.quotes.form.exchangeRateNote(
                    foreignCurrencyTotals.map(
                      (t) =>
                        `1 ${t.currency} = ${quote.exchangeRates?.rates[t.currency]} ${quote.quoteCurrency}`,
                    ),
                    quote.exchangeRates?.asOf,
                  )}
                </p>
              </>
            ) : (
              <p className="max-w-xs text-right text-[11px] text-app-danger">
                {tr.crm.quotes.form.missingExchangeRate(conversion.missingRateCurrencies)}
              </p>
            )}
          </div>
        )}
      </div>

      {quote.itemsEntryMode === 'MANUAL_TOTAL' && !isPrintMode && (
        <div className="mt-8 rounded-xl bg-white p-5 shadow-sm">
          <SectionHeader>{tr.crm.quotes.detail.attributesTitle}</SectionHeader>
          {quote.attributes && Object.keys(quote.attributes).length > 0 ? (
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(quote.attributes).map(([key, value]) => (
                <MetaCell key={key} label={key}>
                  {value}
                </MetaCell>
              ))}
            </dl>
          ) : (
            <p className="text-sm text-app-muted">{tr.crm.quotes.detail.attributesEmpty}</p>
          )}
        </div>
      )}

      {quote.ibanNumber && (
        <div className="print-page-break mt-8">
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

      {(quote.paymentTerms || quote.salesTerms || quote.deliveryTerms || quote.generalTerms) && (
        <div className="print-page-break mt-8 flex flex-col gap-4 border-t border-app-border pt-6">
          {quote.paymentTerms && (
            <div className="rounded-xl bg-white p-5 shadow-sm">
              <SectionHeader>{tr.crm.quotes.detail.paymentTermsTitle}</SectionHeader>
              <p className="text-sm leading-relaxed whitespace-pre-wrap text-black">
                {quote.paymentTerms}
              </p>
            </div>
          )}
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
          {quote.generalTerms && (
            <div className="rounded-xl bg-white p-5 shadow-sm">
              <SectionHeader>{tr.crm.quotes.detail.generalTermsTitle}</SectionHeader>
              <p className="text-sm leading-relaxed whitespace-pre-wrap text-black">
                {quote.generalTerms}
              </p>
            </div>
          )}
        </div>
      )}

      {!isPrintMode && quote.opportunity && (
        <div className="mt-8 border-t border-app-border pt-6">
          <SectionHeader>{tr.crm.quotes.detail.opportunityTitle}</SectionHeader>
          <InfoLinkRow
            label={tr.crm.opportunities.stageColumn}
            value={quote.opportunity.name}
            suffix={tr.crm.opportunities.stageOptions[quote.opportunity.stage]}
            onClick={() => onOpportunityClick(quote.opportunity!.id)}
          />
        </div>
      )}

      {isPrintMode && (company || sender) && (
        <div className="print-page-break mt-8 grid grid-cols-2 gap-8 border-t border-app-border pt-6 text-sm">
          {company && (
            <div>
              <SectionHeader>{tr.crm.quotes.detail.companyInfoTitle}</SectionHeader>
              <p className="font-semibold text-black">{company.name}</p>
              {company.address && <p className="text-app-muted">{company.address}</p>}
              {(company.phone || company.email) && (
                <p className="mt-1 text-app-muted">
                  {[company.phone, company.email].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>
          )}
          {sender && (
            <div>
              <SectionHeader>{tr.crm.quotes.detail.senderInfoTitle}</SectionHeader>
              <p className="font-semibold text-black">{sender.name}</p>
              {sender.title && <p className="text-app-muted">{sender.title}</p>}
              {(sender.phone || sender.email) && (
                <p className="mt-1 text-app-muted">
                  {[sender.phone, sender.email].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {isPrintMode && (
        <div className="mt-12 grid grid-cols-2 gap-8 text-sm">
          <div>
            <SectionHeader>{tr.crm.quotes.detail.representativeTitle}</SectionHeader>
            {sender && <p className="font-semibold text-black">{sender.name}</p>}
          </div>
          <div>
            <SectionHeader>{tr.crm.quotes.detail.approvalTitle}</SectionHeader>
            {quote.contact && (
              <p className="font-semibold text-black">
                {quote.contact.firstName} {quote.contact.lastName}
              </p>
            )}
            <p className="mt-3 text-app-muted">{tr.crm.quotes.detail.signatureLabel}:</p>
            <p className="mt-3 text-app-muted">{tr.crm.quotes.detail.approvalDateLabel}:</p>
          </div>
        </div>
      )}
    </>
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

const DRAWING_STATUS_BADGE_VARIANT: Record<Drawing['status'], 'success' | 'info'> = {
  DRAFT: 'info',
  FINALIZED: 'success',
};

/**
 * Faz D7: her Drawing zaten dogrudan bir Quote'a bagli (zorunlu `quoteId` FK) - bu
 * bolum yeni bir iliski KURMAZ, mevcut iliskiyi teklif ekraninda gorunur kilar
 * (bkz. docs/VARSAYIMLAR.md V55).
 */
function QuoteDrawingsSection({ quoteId }: { quoteId: string }) {
  const navigate = useNavigate();
  const drawingsQuery = useDrawingsQuery({ quoteId });
  const drawings = drawingsQuery.data ?? [];

  return (
    <div className="mt-8 border-t border-app-border pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-app-text">{tr.crm.drawings.quoteSection.title}</h2>
        <button
          type="button"
          className="text-sm text-app-brand underline"
          onClick={() => navigate(`/cizimler/pdf-ice-aktar?quoteId=${quoteId}`)}
        >
          {tr.crm.drawings.quoteSection.createFromPdf}
        </button>
      </div>

      {!drawingsQuery.isPending && drawings.length === 0 && (
        <p className="mt-2 text-sm text-app-muted">{tr.crm.drawings.quoteSection.empty}</p>
      )}

      {drawings.length > 0 && (
        <table className="mt-3 w-full text-sm">
          <thead className="text-left text-xs font-semibold text-app-muted">
            <tr>
              <th className="py-1">{tr.crm.drawings.quoteSection.nameColumn}</th>
              <th className="py-1">{tr.crm.drawings.quoteSection.panelGroupColumn}</th>
              <th className="py-1">{tr.crm.drawings.quoteSection.statusColumn}</th>
              <th className="py-1">{tr.crm.drawings.quoteSection.downloadColumn}</th>
            </tr>
          </thead>
          <tbody>
            {drawings.map((drawing) => (
              <tr
                key={drawing.id}
                className="cursor-pointer border-t border-app-border hover:bg-app-surface-muted"
                onClick={() => navigate(`/cizimler/${drawing.id}`)}
              >
                <td className="py-2 font-semibold text-app-text">{drawing.name}</td>
                <td className="py-2 text-app-muted">{drawing.panelGroupLabel ?? '—'}</td>
                <td className="py-2">
                  <Badge variant={DRAWING_STATUS_BADGE_VARIANT[drawing.status]}>
                    {drawing.status}
                  </Badge>
                </td>
                <td className="py-2">
                  {drawing.exportFileUrl ? (
                    <a
                      href={drawing.exportFileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-app-brand underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {tr.crm.drawings.quoteSection.downloadLink}
                    </a>
                  ) : (
                    tr.crm.drawings.quoteSection.notExportedYet
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export function QuoteDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const isPrintMode = searchParams.get('print') === '1';
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<'APPROVED' | 'REJECTED' | undefined>(
    undefined,
  );
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isReviseConfirmOpen, setIsReviseConfirmOpen] = useState(false);
  const quoteQuery = useQuoteQuery(id);
  const meQuery = useMeQuery();
  const tenantProfileQuery = useTenantProfileQuery();
  // Sirket adresi/telefonu/e-postasi + gonderen bilgisi (bkz. docs/VARSAYIMLAR.md
  // "sirket bilgileri"/"gonderen" parite notu) - sadece yazdirma gorunumunde
  // gerekli, normal sayfa gorunumunde bu ek sorgu atilmaz.
  const printDataQuery = useQuery({
    queryKey: ['quotes', id, 'print-data'],
    queryFn: () => getQuotePrintData(id),
    enabled: isPrintMode && Boolean(id),
  });
  const approveMutation = useApproveQuoteMutation(id);
  const rejectMutation = useRejectQuoteMutation(id);
  const sendForApprovalMutation = useUpdateQuoteMutation(id);
  const reviseMutation = useUpdateQuoteMutation(id);
  const deleteMutation = useDeleteQuoteMutation();
  const exportPdfMutation = useMutation({
    mutationFn: () => exportQuotePdf(id),
    onMutate: () => ({ tabHandle: openBlobInNewTabHandle() }),
    onSuccess: (blob, _vars, context) => loadBlobIntoTabHandle(context.tabHandle, blob),
    onError: (error, _vars, context) => {
      context?.tabHandle?.close();
      toast.error(error instanceof ApiError ? error.message : tr.crm.quotes.detail.exportPdfError);
    },
  });

  if (quoteQuery.isPending || (isPrintMode && printDataQuery.isPending)) {
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
  const canApprove = hasPermission(meQuery.data?.permissions, 'quotes', 'APPROVE');
  const canCreatePurchaseOrder = hasPermission(
    meQuery.data?.permissions,
    'purchase-orders',
    'CREATE',
  );

  function handleDelete() {
    deleteMutation.mutate(quote.id, {
      onSuccess: () => {
        toast.success(tr.crm.quotes.deleteSuccess);
        navigate('/teklifler');
      },
      onError: (error) => {
        toast.error(error instanceof ApiError ? error.message : tr.crm.quotes.deleteError);
        setIsDeleteConfirmOpen(false);
      },
    });
  }

  function handleSendForApproval() {
    sendForApprovalMutation.mutate(
      { status: 'PENDING_APPROVAL' },
      {
        onSuccess: () => toast.success(tr.crm.quotes.detail.sendForApprovalSuccess),
        onError: (error) => {
          toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
        },
      },
    );
  }

  function handleConfirmApprove(warehouseId: string) {
    approveMutation.mutate(warehouseId, {
      onSuccess: () => {
        toast.success(tr.crm.quotes.detail.approveSuccess);
        setPendingAction(undefined);
      },
      onError: (error) => {
        toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
      },
    });
  }

  function handleConfirmReject() {
    rejectMutation.mutate(undefined, {
      onSuccess: () => {
        toast.success(tr.crm.quotes.detail.rejectSuccess);
        setPendingAction(undefined);
      },
      onError: (error) => {
        toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
      },
    });
  }

  function handleConfirmRevise() {
    reviseMutation.mutate(
      { status: 'REVIZE' },
      {
        onSuccess: () => {
          toast.success(tr.crm.quotes.statusUpdateSuccess);
          setIsReviseConfirmOpen(false);
          navigate(`/teklifler/duzenle/${quote.id}`);
        },
        onError: (error) => {
          toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
        },
      },
    );
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
            <CircleIconButton
              icon={Mail}
              tooltip={tr.crm.quotes.detail.createMessageTooltip}
              onClick={() => setIsMessageModalOpen(true)}
            />
            {(quote.status === 'DRAFT' ||
              quote.status === 'PENDING_APPROVAL' ||
              quote.status === 'REVIZE' ||
              quote.status === 'UNSPECIFIED') && (
              <>
                <CircleIconButton
                  icon={Pencil}
                  tooltip={tr.crm.quotes.editTooltip}
                  onClick={() => navigate(`/teklifler/duzenle/${quote.id}`)}
                />
                <CircleIconButton
                  icon={Trash2}
                  tooltip={tr.crm.quotes.deleteTooltip}
                  variant="danger"
                  onClick={() => setIsDeleteConfirmOpen(true)}
                />
              </>
            )}
            {(quote.status === 'DRAFT' || quote.status === 'PENDING_APPROVAL') && (
              <CircleIconButton
                icon={RotateCcw}
                tooltip={tr.crm.quotes.detail.reviseButton}
                onClick={() => setIsReviseConfirmOpen(true)}
                disabled={reviseMutation.isPending}
              />
            )}
            {quote.status === 'APPROVED' && canCreatePurchaseOrder && (
              <CircleIconButton
                icon={ShoppingCart}
                tooltip={tr.crm.quotes.createPurchaseOrderButton}
                onClick={() => navigate(`/siparisler/yeni?quoteId=${quote.id}`)}
              />
            )}
            {(quote.status === 'DRAFT' ||
              quote.status === 'PENDING_APPROVAL' ||
              quote.status === 'APPROVED' ||
              quote.status === 'UNSPECIFIED') && (
              <CircleIconButton
                icon={FileDown}
                tooltip={tr.crm.quotes.detail.exportPdfButton}
                onClick={() => exportPdfMutation.mutate()}
                disabled={exportPdfMutation.isPending}
              />
            )}
            {quote.status === 'PENDING_APPROVAL' && canApprove && (
              <>
                <CircleIconButton
                  icon={Check}
                  variant="success"
                  tooltip={tr.crm.quotes.detail.approveButton}
                  onClick={() => setPendingAction('APPROVED')}
                  disabled={approveMutation.isPending}
                />
                <CircleIconButton
                  icon={X}
                  variant="danger"
                  tooltip={tr.crm.quotes.detail.rejectButton}
                  onClick={() => setPendingAction('REJECTED')}
                  disabled={rejectMutation.isPending}
                />
              </>
            )}
            {(quote.status === 'DRAFT' || quote.status === 'REVIZE') && (
              <CircleIconButton
                icon={Send}
                tooltip={tr.crm.quotes.detail.sendForApprovalButton}
                onClick={handleSendForApproval}
                disabled={sendForApprovalMutation.isPending}
              />
            )}
          </div>
        )}
      </div>

      <div className="mt-6">
        <QuoteContentBody
          quote={quote}
          isPrintMode={isPrintMode}
          onOpportunityClick={(opportunityId) => navigate(`/firsatlar/${opportunityId}`)}
          company={printDataQuery.data?.company}
          sender={printDataQuery.data?.sender}
        />
      </div>

      {!isPrintMode && <QuoteDrawingsSection quoteId={quote.id} />}

      {!isPrintMode && (quote.status === 'DRAFT' || quote.status === 'REVIZE') && (
        <div className="mt-8 flex justify-end gap-2 border-t border-app-border pt-6">
          <CircleIconButton
            icon={Send}
            tooltip={tr.crm.quotes.detail.sendForApprovalButton}
            onClick={handleSendForApproval}
            disabled={sendForApprovalMutation.isPending}
          />
        </div>
      )}

      {!isPrintMode && quote.status === 'PENDING_APPROVAL' && canApprove && (
        <div className="mt-8 flex justify-end gap-2 border-t border-app-border pt-6">
          <CircleIconButton
            icon={Check}
            variant="success"
            tooltip={tr.crm.quotes.detail.approveButton}
            onClick={() => setPendingAction('APPROVED')}
            disabled={approveMutation.isPending}
          />
          <CircleIconButton
            icon={X}
            variant="danger"
            tooltip={tr.crm.quotes.detail.rejectButton}
            onClick={() => setPendingAction('REJECTED')}
            disabled={rejectMutation.isPending}
          />
        </div>
      )}

      {pendingAction === 'APPROVED' && (
        <ApproveQuoteModal
          isPending={approveMutation.isPending}
          onConfirm={handleConfirmApprove}
          onCancel={() => setPendingAction(undefined)}
        />
      )}

      {pendingAction === 'REJECTED' && (
        <ConfirmModal
          title={tr.crm.quotes.statusChangeConfirmTitle}
          message={tr.crm.quotes.statusChangeConfirm(tr.crm.quotes.statusOptions.REJECTED)}
          confirmLabel={tr.crm.quotes.statusChangeConfirmButton}
          isPending={rejectMutation.isPending}
          onConfirm={handleConfirmReject}
          onCancel={() => setPendingAction(undefined)}
        />
      )}

      {isDeleteConfirmOpen && (
        <ConfirmModal
          title={tr.crm.quotes.deleteConfirmTitle}
          message={tr.crm.quotes.deleteConfirm}
          confirmLabel={tr.crm.quotes.deleteTooltip}
          isPending={deleteMutation.isPending}
          onConfirm={handleDelete}
          onCancel={() => setIsDeleteConfirmOpen(false)}
        />
      )}

      {isReviseConfirmOpen && (
        <ConfirmModal
          title={tr.crm.quotes.statusChangeConfirmTitle}
          message={tr.crm.quotes.reviseConfirmMessage}
          confirmLabel={tr.crm.quotes.statusChangeConfirmButton}
          isPending={reviseMutation.isPending}
          onConfirm={handleConfirmRevise}
          onCancel={() => setIsReviseConfirmOpen(false)}
        />
      )}

      {isMessageModalOpen && (
        <NewMessageModal
          onClose={() => setIsMessageModalOpen(false)}
          defaultToUserIds={quote.createdById ? [quote.createdById] : []}
          defaultRelatedEntity="QUOTE"
          defaultRelatedEntityId={id}
        />
      )}
    </AppShell>
  );
}
