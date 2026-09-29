import { clsx } from 'clsx';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from './app-shell';
import { Button } from '../components/ui/button';
import { CircleIconButton } from '../components/ui/circle-icon-button';
import { ColumnVisibilityPicker } from '../components/ui/column-visibility-picker';
import { ConfirmModal } from '../components/ui/confirm-modal';
import { InlineSelect } from '../components/ui/inline-select';
import { Pagination, Table, type TableColumn } from '../components/ui/table';
import { FilterButtonGroup } from '../components/ui/filter-button-group';
import { PageHelp } from '../components/ui/page-help';
import { useToast } from '../components/ui/toast-context';
import { IconActionButton } from '../components/ui/icon-action-button';
import { hasPermission } from '../features/auth/permissions';
import { useColumnVisibility } from '../features/auth/use-column-visibility';
import { useMeQuery } from '../features/auth/use-auth';
import {
  useDeleteQuoteMutation,
  useQuoteStatusCounts,
  useQuotesQuery,
  useUpdateQuoteMutation,
} from '../features/crm/use-quotes';
import { useCreatePurchaseOrderFromQuoteMutation } from '../features/crm/use-purchase-orders';
import { ApiError, type Quote, type QuoteStatus } from '../lib/api';
import { formatCurrencyAmount, groupQuoteItemTotals } from '../lib/quote-totals';
import { tr } from '../i18n/tr';

const STATUS_OPTIONS: { value: QuoteStatus; label: string }[] = (
  ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'REVIZE'] as const
).map((status) => ({ value: status, label: tr.crm.quotes.statusOptions[status] }));

const STATUS_TEXT_CLASS: Record<QuoteStatus, string> = {
  DRAFT: 'text-app-muted',
  PENDING_APPROVAL: 'text-amber-600 dark:text-amber-400',
  APPROVED: 'text-app-success',
  REJECTED: 'text-app-danger',
  REVIZE: 'text-orange-600 dark:text-orange-400',
};

const CONFIRM_REQUIRED_STATUSES: readonly QuoteStatus[] = ['APPROVED', 'REJECTED'];

/** Onaylanmis/reddedilmis teklifler kilitlidir (bkz. quotes.service.ts QUOTE_NOT_EDITABLE),
 * bu yuzden dropdown o durumlarda salt-okunur duz metin olarak (oksuz) gosterilir. Hedef
 * durum APPROVED/REJECTED ise mutation'i dogrudan calistirmak yerine ust bilesene onay
 * modali acmasi icin haber verir (bkz. QuotesListPage.pendingStatusChange). */
function QuoteStatusSelect({
  quote,
  onRequestConfirm,
}: {
  quote: Quote;
  onRequestConfirm: (quote: Quote, status: QuoteStatus) => void;
}) {
  const toast = useToast();
  const updateMutation = useUpdateQuoteMutation(quote.id);
  const isLocked = quote.status === 'APPROVED' || quote.status === 'REJECTED';

  if (isLocked) {
    return (
      <span className={clsx('text-sm font-semibold', STATUS_TEXT_CLASS[quote.status])}>
        {tr.crm.quotes.statusOptions[quote.status]}
      </span>
    );
  }

  return (
    <InlineSelect
      value={quote.status}
      options={STATUS_OPTIONS}
      disabled={updateMutation.isPending}
      selectClassName={clsx('font-semibold disabled:opacity-80', STATUS_TEXT_CLASS[quote.status])}
      onChange={(value) => {
        const status = value as QuoteStatus;
        if (CONFIRM_REQUIRED_STATUSES.includes(status)) {
          onRequestConfirm(quote, status);
          return;
        }
        updateMutation.mutate(
          { status },
          {
            onSuccess: () => toast.success(tr.crm.quotes.statusUpdateSuccess),
            onError: (error) => {
              toast.error(
                error instanceof ApiError ? error.message : tr.crm.quotes.statusUpdateError,
              );
            },
          },
        );
      }}
    />
  );
}

function quoteTotalsByCurrency(quote: Quote) {
  return groupQuoteItemTotals(
    quote.items.map((item) => ({
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      discountPct: Number(item.discountPct),
      vatPct: Number(item.vatPct),
      currency: item.currency,
    })),
  );
}

export function QuotesListPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const meQuery = useMeQuery();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<QuoteStatus | ''>('');
  const [deletingQuote, setDeletingQuote] = useState<Quote | undefined>(undefined);
  const [pendingStatusChange, setPendingStatusChange] = useState<
    { quote: Quote; status: QuoteStatus } | undefined
  >(undefined);
  const [pendingPurchaseOrderQuote, setPendingPurchaseOrderQuote] = useState<Quote | undefined>(
    undefined,
  );
  const pageSize = meQuery.data?.defaultPageSize ?? 25;
  const quotesQuery = useQuotesQuery({ page, pageSize, status: status || undefined });
  const statusCounts = useQuoteStatusCounts(STATUS_OPTIONS.map((option) => option.value));
  const filterCounts: Partial<Record<QuoteStatus | '', number>> = {
    '': statusCounts.all,
    ...statusCounts.counts,
  };
  const createPurchaseOrderMutation = useCreatePurchaseOrderFromQuoteMutation();
  const deleteMutation = useDeleteQuoteMutation();
  const confirmStatusMutation = useUpdateQuoteMutation(pendingStatusChange?.quote.id ?? '');
  const canCreatePurchaseOrder = hasPermission(
    meQuery.data?.permissions,
    'purchase-orders',
    'CREATE',
  );

  function handleConfirmCreatePurchaseOrder() {
    if (!pendingPurchaseOrderQuote) return;
    createPurchaseOrderMutation.mutate(pendingPurchaseOrderQuote.id, {
      onSuccess: (purchaseOrder) => {
        toast.success(tr.crm.quotes.createPurchaseOrderSuccess);
        setPendingPurchaseOrderQuote(undefined);
        navigate(`/siparisler/${purchaseOrder.id}`);
      },
      onError: (error) => {
        toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
      },
    });
  }

  function handleConfirmDelete() {
    if (!deletingQuote) return;
    deleteMutation.mutate(deletingQuote.id, {
      onSuccess: () => {
        toast.success(tr.crm.quotes.deleteSuccess);
        setDeletingQuote(undefined);
      },
      onError: (error) => {
        toast.error(error instanceof ApiError ? error.message : tr.crm.quotes.deleteError);
      },
    });
  }

  function handleConfirmStatusChange() {
    if (!pendingStatusChange) return;
    confirmStatusMutation.mutate(
      { status: pendingStatusChange.status },
      {
        onSuccess: () => {
          toast.success(tr.crm.quotes.statusUpdateSuccess);
          setPendingStatusChange(undefined);
        },
        onError: (error) => {
          toast.error(error instanceof ApiError ? error.message : tr.crm.quotes.statusUpdateError);
        },
      },
    );
  }

  const ALL_COLUMNS: TableColumn<Quote>[] = [
    {
      key: 'quoteNumber',
      header: tr.crm.quotes.numberColumn,
      required: true,
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
        <QuoteStatusSelect
          quote={q}
          onRequestConfirm={(quote, nextStatus) =>
            setPendingStatusChange({ quote, status: nextStatus })
          }
        />
      ),
    },
    {
      key: 'total',
      header: tr.crm.quotes.totalColumn,
      className: 'text-app-muted',
      render: (q) => (
        <div className="flex flex-col">
          {quoteTotalsByCurrency(q).map((t) => (
            <span key={t.currency}>{formatCurrencyAmount(t.grandTotal, t.currency)}</span>
          ))}
        </div>
      ),
    },
    {
      key: 'createdByName',
      header: tr.crm.quotes.createdByColumn,
      className: 'text-app-muted',
      render: (q) => q.createdByName ?? '—',
    },
    {
      key: 'actions',
      header: tr.crm.quotes.actionsColumn,
      className: 'w-px',
      required: true,
      render: (q) => {
        if (q.status === 'DRAFT' || q.status === 'PENDING_APPROVAL' || q.status === 'REVIZE') {
          return (
            <div className="flex items-center gap-1">
              <IconActionButton
                icon={Pencil}
                tooltip={tr.crm.quotes.editTooltip}
                onClick={() => navigate(`/teklifler/duzenle/${q.id}`)}
              />
              <IconActionButton
                icon={Trash2}
                tooltip={tr.crm.quotes.deleteTooltip}
                variant="danger"
                onClick={() => setDeletingQuote(q)}
              />
            </div>
          );
        }
        if (q.status === 'APPROVED' && canCreatePurchaseOrder) {
          return (
            <Button
              type="button"
              variant="secondary"
              className="whitespace-nowrap"
              disabled={
                createPurchaseOrderMutation.isPending && pendingPurchaseOrderQuote?.id === q.id
              }
              onClick={(event) => {
                event.stopPropagation();
                setPendingPurchaseOrderQuote(q);
              }}
            >
              {createPurchaseOrderMutation.isPending && pendingPurchaseOrderQuote?.id === q.id
                ? tr.crm.quotes.createPurchaseOrderBusy
                : tr.crm.quotes.createPurchaseOrderButton}
            </Button>
          );
        }
        return null;
      },
    },
  ];

  const { isColumnVisible, optionalColumns, visibleOptionalKeys, setVisibleOptionalKeys } =
    useColumnVisibility(
      'quotes',
      ALL_COLUMNS.map((c) => ({ key: c.key, label: c.header, required: c.required })),
    );
  const columns = ALL_COLUMNS.filter((c) => isColumnVisible(c.key));

  return (
    <AppShell>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-app-text">{tr.crm.quotes.title}</h1>
            <PageHelp text={tr.help.quotes} />
          </div>
          <p className="mt-1 text-sm text-app-muted">{tr.crm.quotes.subtitle}</p>
        </div>
        <CircleIconButton
          icon={Plus}
          tooltip={tr.crm.quotes.newButton}
          variant="success"
          strokeWidth={3}
          onClick={() => navigate('/teklifler/yeni')}
          className="mt-1"
        />
      </div>

      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <FilterButtonGroup
          label={tr.crm.quotes.statusFilterLabel}
          value={status}
          onChange={(next) => {
            setPage(1);
            setStatus(next);
          }}
          allLabel={tr.crm.quotes.allStatuses}
          options={STATUS_OPTIONS}
          counts={filterCounts}
        />
        <ColumnVisibilityPicker
          columns={optionalColumns}
          value={visibleOptionalKeys}
          onChange={setVisibleOptionalKeys}
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
          total={quotesQuery.data.meta.total}
          onPrevious={() => setPage((p) => p - 1)}
          onNext={() => setPage((p) => p + 1)}
        />
      )}

      {deletingQuote && (
        <ConfirmModal
          title={tr.crm.quotes.deleteConfirmTitle}
          message={tr.crm.quotes.deleteConfirm}
          confirmLabel={tr.crm.quotes.deleteTooltip}
          isPending={deleteMutation.isPending}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeletingQuote(undefined)}
        />
      )}

      {pendingStatusChange && (
        <ConfirmModal
          title={tr.crm.quotes.statusChangeConfirmTitle}
          message={tr.crm.quotes.statusChangeConfirm(
            tr.crm.quotes.statusOptions[pendingStatusChange.status],
          )}
          confirmLabel={tr.crm.quotes.statusChangeConfirmButton}
          isPending={confirmStatusMutation.isPending}
          onConfirm={handleConfirmStatusChange}
          onCancel={() => setPendingStatusChange(undefined)}
        />
      )}
      {pendingPurchaseOrderQuote && (
        <ConfirmModal
          title={tr.crm.quotes.createPurchaseOrderConfirmTitle}
          message={tr.crm.quotes.createPurchaseOrderConfirm(pendingPurchaseOrderQuote.quoteNumber)}
          confirmLabel={tr.crm.quotes.createPurchaseOrderConfirmButton}
          isPending={createPurchaseOrderMutation.isPending}
          onConfirm={handleConfirmCreatePurchaseOrder}
          onCancel={() => setPendingPurchaseOrderQuote(undefined)}
        />
      )}
    </AppShell>
  );
}
