import { useMutation } from '@tanstack/react-query';
import { clsx } from 'clsx';
import {
  Copy,
  Download,
  FileDown,
  ListFilter,
  Mail,
  Pencil,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AppShell } from './app-shell';
import { ApproveQuoteModal } from './approve-quote-modal';
import { RejectQuoteModal } from './reject-quote-modal';
import { NewMessageModal } from './new-message-modal';
import { Button } from '../components/ui/button';
import { CircleIconButton } from '../components/ui/circle-icon-button';
import { ColumnVisibilityPicker } from '../components/ui/column-visibility-picker';
import { ConfirmModal } from '../components/ui/confirm-modal';
import { DateField } from '../components/ui/date-field';
import { Drawer } from '../components/ui/drawer';
import { InlineSelect } from '../components/ui/inline-select';
import { Select } from '../components/ui/select';
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
import { useUsersQuery } from '../features/roles/use-users';
import { ApiError, exportQuotePdf, type Quote, type QuoteStatus } from '../lib/api';
import { loadBlobIntoTabHandle, openBlobInNewTabHandle } from '../lib/download';
import { QUOTE_STATUS_OPTIONS, quoteGrandTotalDisplay } from '../lib/quote-totals';
import { useDebouncedValue } from '../lib/use-debounced-value';
import { tr } from '../i18n/tr';

const STATUS_OPTIONS = QUOTE_STATUS_OPTIONS;

const STATUS_TEXT_CLASS: Record<QuoteStatus, string> = {
  UNSPECIFIED: 'text-app-muted',
  DRAFT: 'text-app-muted',
  PENDING_APPROVAL: 'text-amber-600 dark:text-amber-400',
  APPROVED: 'text-app-success',
  REJECTED: 'text-app-danger',
  REVIZE: 'text-orange-600 dark:text-orange-400',
};

const CONFIRM_REQUIRED_STATUSES: readonly QuoteStatus[] = ['APPROVED', 'REJECTED', 'REVIZE'];

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

export function QuotesListContent() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();
  const meQuery = useMeQuery();
  const usersQuery = useUsersQuery();
  // "Teklifi Oluşturan" kolonu Quote.senderId'yi gösterir (PDF'te temsilci olarak
  // görünen kullanıcı, bkz. quote-meta-fields.tsx senderLabel) - senderId yoksa (örn.
  // içe aktarılan bir teklifte "Teklifi Oluşturan" sütunu eşlenmemiş/eşleşmemişse)
  // quotes.service.ts'teki getPrintData'daki AYNI `senderId ?? createdById` fallback'i
  // kullanılır, importu yapan kullanıcı degil gercek gonderen gosterilsin diye.
  const senderNameById = new Map((usersQuery.data ?? []).map((u) => [u.id, u.name]));
  const [page, setPage] = useState(1);
  const [qInput, setQInput] = useState('');
  const q = useDebouncedValue(qInput.trim());
  const [status, setStatus] = useState<QuoteStatus | ''>(() => {
    const fromUrl = searchParams.get('status');
    return STATUS_OPTIONS.some((option) => option.value === fromUrl)
      ? (fromUrl as QuoteStatus)
      : '';
  });
  // Rapor sekmesindeki KPI kartlarindan "?status=..." ile gelindiginde baslangic
  // filtresini uygulamak icin yukarida okunuyor - URL'de kalip kafa karistirmasin diye
  // tuketildikten sonra temizlenir (tab parametresi dokunulmadan kalir).
  useEffect(() => {
    if (!searchParams.has('status')) return;
    const next = new URLSearchParams(searchParams);
    next.delete('status');
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [createdById, setCreatedById] = useState('');
  const [sinceInput, setSinceInput] = useState('');
  const [rangeFromInput, setRangeFromInput] = useState('');
  const [rangeToInput, setRangeToInput] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [deletingQuote, setDeletingQuote] = useState<Quote | undefined>(undefined);
  const [messageQuote, setMessageQuote] = useState<Quote | undefined>(undefined);
  const [pendingStatusChange, setPendingStatusChange] = useState<
    { quote: Quote; status: QuoteStatus } | undefined
  >(undefined);
  // REJECTED icin iki asamali akis: ConfirmModal "evet, degistir" sonrasi bu geri
  // bildirim modali acilir (reason+opsiyonel not) - APPROVED'daki ApproveQuoteModal
  // ile ayni "once onay, sonra form" deseni, REVIZE'de boyle bir ikinci adim yok.
  const [rejectFeedbackOpen, setRejectFeedbackOpen] = useState(false);
  // Iki tarih filtresi ayni quoteDate alanini hedefler, birbirini sifirlar: aralik
  // girildiyse tek-tarih ("itibaren") gormezden gelinir (bkz. opportunities-list-page.tsx).
  const hasRange = Boolean(rangeFromInput) || Boolean(rangeToInput);
  const from = hasRange ? rangeFromInput || undefined : sinceInput || undefined;
  const to = hasRange ? rangeToInput || undefined : undefined;
  const hasActiveFilter = Boolean(status) || Boolean(createdById) || Boolean(from) || Boolean(to);
  const pageSize = meQuery.data?.defaultPageSize ?? 25;
  const quotesQuery = useQuotesQuery({
    page,
    pageSize,
    q: q || undefined,
    status: status || undefined,
    createdById: createdById || undefined,
    from,
    to,
  });
  const statusCounts = useQuoteStatusCounts(STATUS_OPTIONS.map((option) => option.value));
  const filterCounts: Partial<Record<QuoteStatus | '', number>> = {
    '': statusCounts.all,
    ...statusCounts.counts,
  };
  const deleteMutation = useDeleteQuoteMutation();
  const confirmStatusMutation = useUpdateQuoteMutation(pendingStatusChange?.quote.id ?? '');
  const canImportQuotes = hasPermission(meQuery.data?.permissions, 'quotes', 'IMPORT');
  const canCreatePurchaseOrder = hasPermission(
    meQuery.data?.permissions,
    'purchase-orders',
    'CREATE',
  );
  const exportPdfMutation = useMutation({
    mutationFn: (quoteId: string) => exportQuotePdf(quoteId),
    onMutate: () => ({ tabHandle: openBlobInNewTabHandle() }),
    onSuccess: (blob, _vars, context) => loadBlobIntoTabHandle(context.tabHandle, blob),
    onError: (error, _vars, context) => {
      context?.tabHandle?.close();
      toast.error(error instanceof ApiError ? error.message : tr.crm.quotes.detail.exportPdfError);
    },
  });

  async function handleCopyQuoteNumber(quoteNumber: string) {
    await navigator.clipboard.writeText(quoteNumber);
    toast.success(tr.crm.quotes.quoteNumberCopiedToast);
  }

  async function handleCopyAccountName(accountName: string) {
    await navigator.clipboard.writeText(accountName);
    toast.success(tr.crm.quotes.accountNameCopiedToast);
  }

  function resetFilters() {
    setPage(1);
    setStatus('');
    setCreatedById('');
    setSinceInput('');
    setRangeFromInput('');
    setRangeToInput('');
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

  function handleConfirmStatusChange(extra?: {
    warehouseId?: string;
    rejectionReason?: string;
    rejectionNote?: string;
  }) {
    if (!pendingStatusChange) return;
    const { quote, status } = pendingStatusChange;
    confirmStatusMutation.mutate(
      { status, ...extra },
      {
        onSuccess: () => {
          toast.success(tr.crm.quotes.statusUpdateSuccess);
          setPendingStatusChange(undefined);
          setRejectFeedbackOpen(false);
          if (status === 'REVIZE') {
            navigate(`/teklifler/duzenle/${quote.id}`);
          }
        },
        onError: (error) => {
          toast.error(error instanceof ApiError ? error.message : tr.crm.quotes.statusUpdateError);
        },
      },
    );
  }

  const ALL_COLUMNS: TableColumn<Quote>[] = [
    {
      key: 'title',
      header: tr.crm.quotes.titleColumn,
      className: 'text-app-muted',
      render: (q) => q.title ?? '—',
    },
    {
      key: 'quoteNumber',
      header: tr.crm.quotes.numberColumn,
      required: true,
      render: (q) => (
        <div className="flex items-center gap-1">
          <span className="font-semibold text-app-text">{q.quoteNumber}</span>
          <IconActionButton
            icon={Copy}
            tooltip={tr.crm.quotes.copyQuoteNumberButton}
            iconSize={14}
            onClick={() => void handleCopyQuoteNumber(q.quoteNumber)}
          />
        </div>
      ),
    },
    {
      key: 'account',
      header: tr.crm.quotes.accountColumn,
      render: (q) => (
        <div className="flex items-center gap-1">
          <span>{q.account.name}</span>
          <IconActionButton
            icon={Copy}
            tooltip={tr.crm.quotes.copyAccountNameButton}
            iconSize={14}
            onClick={() => void handleCopyAccountName(q.account.name)}
          />
        </div>
      ),
    },
    {
      key: 'quoteDate',
      header: tr.crm.quotes.quoteDateColumn,
      className: 'text-app-muted',
      render: (q) => new Date(q.quoteDate).toLocaleDateString('tr-TR'),
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
      render: (q) => <span>{quoteGrandTotalDisplay(q)}</span>,
    },
    {
      key: 'revised',
      header: tr.crm.quotes.revisedColumn,
      className: 'text-center',
      render: (q) =>
        q.revisionCount > 0 ? (
          <span title={tr.crm.quotes.revisedTooltip(q.revisionCount)}>✅</span>
        ) : (
          <span className="text-app-muted">—</span>
        ),
    },
    {
      key: 'createdByName',
      header: tr.crm.quotes.createdByColumn,
      className: 'text-app-muted',
      render: (q) =>
        (q.senderId ? senderNameById.get(q.senderId) : undefined) ?? q.createdByName ?? '—',
    },
    {
      key: 'actions',
      header: tr.crm.quotes.actionsColumn,
      className: 'w-px',
      required: true,
      render: (q) => (
        <div className="flex items-center gap-1">
          <IconActionButton
            icon={Mail}
            tooltip={tr.crm.quotes.detail.createMessageTooltip}
            onClick={() => setMessageQuote(q)}
          />
          {(q.status === 'DRAFT' ||
            q.status === 'PENDING_APPROVAL' ||
            q.status === 'REVIZE' ||
            q.status === 'UNSPECIFIED') && (
            <>
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
            </>
          )}
          {q.status === 'UNSPECIFIED' && (
            <IconActionButton
              icon={FileDown}
              tooltip={tr.crm.quotes.detail.exportPdfButton}
              onClick={() => exportPdfMutation.mutate(q.id)}
              disabled={exportPdfMutation.isPending}
            />
          )}
          {q.status === 'APPROVED' &&
            canCreatePurchaseOrder &&
            q.itemsEntryMode !== 'MANUAL_TOTAL' && (
              <IconActionButton
                icon={ShoppingCart}
                tooltip={tr.crm.quotes.createPurchaseOrderButton}
                onClick={() => navigate(`/siparisler/yeni?quoteId=${q.id}`)}
              />
            )}
        </div>
      ),
    },
  ];

  const { isColumnVisible, optionalColumns, visibleOptionalKeys, setVisibleOptionalKeys } =
    useColumnVisibility(
      'quotes',
      ALL_COLUMNS.map((c) => ({ key: c.key, label: c.header, required: c.required })),
    );
  const columns = ALL_COLUMNS.filter((c) => isColumnVisible(c.key));

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-app-text">{tr.crm.quotes.title}</h1>
            <PageHelp text={tr.help.quotes} />
          </div>
          <p className="mt-1 text-sm text-app-muted">{tr.crm.quotes.subtitle}</p>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <CircleIconButton
            icon={ListFilter}
            tooltip={tr.crm.quotes.filterButton}
            onClick={() => setDrawerOpen(true)}
          >
            {hasActiveFilter && (
              <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 ring-2 ring-app-surface" />
            )}
          </CircleIconButton>
          {canImportQuotes && (
            <CircleIconButton
              icon={Download}
              tooltip={tr.crm.quotes.importButton}
              onClick={() => navigate('/teklifler/ice-aktar')}
            />
          )}
          <CircleIconButton
            icon={Plus}
            tooltip={tr.crm.quotes.newButton}
            variant="success"
            strokeWidth={3}
            onClick={() => navigate('/teklifler/yeni')}
          />
        </div>
      </div>

      <div className="relative mt-6 w-full">
        <Search
          size={16}
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-app-muted"
        />
        <input
          type="search"
          value={qInput}
          onChange={(event) => {
            setPage(1);
            setQInput(event.target.value);
          }}
          placeholder={tr.crm.quotes.searchPlaceholder}
          className="w-full rounded-lg border border-app-border bg-app-surface py-2.5 pr-3 pl-9 text-sm text-app-text outline-none focus:border-app-primary"
        />
      </div>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
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
        getRowHref={(quote) => `/teklifler/${quote.id}`}
        isLoading={quotesQuery.isPending}
        loadingMessage={tr.crm.quotes.loading}
        emptyMessage={tr.crm.quotes.empty}
      />

      {quotesQuery.data && quotesQuery.data.data.length > 0 && (
        <Pagination
          page={quotesQuery.data.meta.page}
          totalPages={quotesQuery.data.meta.totalPages}
          total={quotesQuery.data.meta.total}
          onPageChange={setPage}
          onPrevious={() => setPage((p) => p - 1)}
          onNext={() => setPage((p) => p + 1)}
        />
      )}

      {drawerOpen && (
        <Drawer title={tr.crm.quotes.filterDrawer.title} onClose={() => setDrawerOpen(false)}>
          <div className="flex flex-col gap-4">
            <Select
              label={tr.crm.quotes.filterDrawer.statusLabel}
              placeholder={tr.crm.quotes.filterDrawer.statusPlaceholder}
              value={status}
              onChange={(event) => {
                setPage(1);
                setStatus(event.target.value as QuoteStatus | '');
              }}
              options={STATUS_OPTIONS}
              clearable
              onClear={() => {
                setPage(1);
                setStatus('');
              }}
            />
            <Select
              label={tr.crm.quotes.filterDrawer.createdByLabel}
              placeholder={tr.crm.quotes.filterDrawer.createdByPlaceholder}
              value={createdById}
              onChange={(event) => {
                setPage(1);
                setCreatedById(event.target.value);
              }}
              options={(usersQuery.data ?? []).map((u) => ({ value: u.id, label: u.name }))}
              clearable
              onClear={() => {
                setPage(1);
                setCreatedById('');
              }}
            />
            <DateField
              label={tr.crm.quotes.filterDrawer.sinceLabel}
              value={sinceInput}
              onChange={(value) => {
                setPage(1);
                setRangeFromInput('');
                setRangeToInput('');
                setSinceInput(value);
              }}
              clearable
              onClear={() => {
                setPage(1);
                setSinceInput('');
              }}
            />
            <DateField
              label={tr.crm.quotes.filterDrawer.rangeFromLabel}
              value={rangeFromInput}
              onChange={(value) => {
                setPage(1);
                setSinceInput('');
                setRangeFromInput(value);
              }}
              clearable
              onClear={() => {
                setPage(1);
                setRangeFromInput('');
              }}
            />
            <DateField
              label={tr.crm.quotes.filterDrawer.rangeToLabel}
              value={rangeToInput}
              onChange={(value) => {
                setPage(1);
                setSinceInput('');
                setRangeToInput(value);
              }}
              clearable
              onClear={() => {
                setPage(1);
                setRangeToInput('');
              }}
            />
            <Button type="button" variant="secondary" onClick={resetFilters}>
              {tr.crm.quotes.filterDrawer.reset}
            </Button>
          </div>
        </Drawer>
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

      {pendingStatusChange?.status === 'APPROVED' && (
        <ApproveQuoteModal
          isPending={confirmStatusMutation.isPending}
          onConfirm={(warehouseId) => handleConfirmStatusChange({ warehouseId })}
          onCancel={() => setPendingStatusChange(undefined)}
        />
      )}
      {pendingStatusChange &&
        pendingStatusChange.status !== 'APPROVED' &&
        !(pendingStatusChange.status === 'REJECTED' && rejectFeedbackOpen) && (
          <ConfirmModal
            title={tr.crm.quotes.statusChangeConfirmTitle}
            message={
              pendingStatusChange.status === 'REVIZE'
                ? tr.crm.quotes.reviseConfirmMessage
                : tr.crm.quotes.statusChangeConfirm(
                    tr.crm.quotes.statusOptions[pendingStatusChange.status],
                  )
            }
            confirmLabel={tr.crm.quotes.statusChangeConfirmButton}
            isPending={
              pendingStatusChange.status === 'REJECTED' ? false : confirmStatusMutation.isPending
            }
            onConfirm={() =>
              pendingStatusChange.status === 'REJECTED'
                ? setRejectFeedbackOpen(true)
                : handleConfirmStatusChange()
            }
            onCancel={() => setPendingStatusChange(undefined)}
          />
        )}
      {pendingStatusChange?.status === 'REJECTED' && rejectFeedbackOpen && (
        <RejectQuoteModal
          isPending={confirmStatusMutation.isPending}
          onConfirm={(reason, note) =>
            handleConfirmStatusChange({ rejectionReason: reason, rejectionNote: note })
          }
          onCancel={() => {
            setRejectFeedbackOpen(false);
            setPendingStatusChange(undefined);
          }}
        />
      )}

      {messageQuote && (
        <NewMessageModal
          onClose={() => setMessageQuote(undefined)}
          defaultToUserIds={messageQuote.createdById ? [messageQuote.createdById] : []}
          defaultRelatedEntity="QUOTE"
          defaultRelatedEntityId={messageQuote.id}
        />
      )}
    </>
  );
}

export function QuotesListPage() {
  return (
    <AppShell>
      <QuotesListContent />
    </AppShell>
  );
}
