import { clsx } from 'clsx';
import { Copy, Filter, Search } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from './app-shell';
import { Button } from '../components/ui/button';
import { CircleIconButton } from '../components/ui/circle-icon-button';
import { ColumnVisibilityPicker } from '../components/ui/column-visibility-picker';
import { DateField } from '../components/ui/date-field';
import { Drawer } from '../components/ui/drawer';
import { FilterButtonGroup } from '../components/ui/filter-button-group';
import { IconActionButton } from '../components/ui/icon-action-button';
import { InlineSelect } from '../components/ui/inline-select';
import { PageHelp } from '../components/ui/page-help';
import { Pagination, Table, type TableColumn } from '../components/ui/table';
import { useToast } from '../components/ui/toast-context';
import { useColumnVisibility } from '../features/auth/use-column-visibility';
import { useMeQuery } from '../features/auth/use-auth';
import {
  useMarkPostSaleFeedbackMutation,
  usePostSaleCaseStatusCounts,
  usePostSaleCasesQuery,
} from '../features/crm/use-post-sale-cases';
import { ApiError, type PostSaleCase, type PostSaleCaseStatus } from '../lib/api';
import { useDebouncedValue } from '../lib/use-debounced-value';
import { tr } from '../i18n/tr';

const STATUS_OPTIONS: { value: PostSaleCaseStatus; label: string }[] = (
  ['BEKLEMEDE', 'HATIRLATILDI', 'GERI_BILDIRIM_ALINDI'] as const
).map((status) => ({ value: status, label: tr.crm.postSaleCases.statusOptions[status] }));

const STATUS_TEXT_CLASS: Record<PostSaleCaseStatus, string> = {
  BEKLEMEDE: 'text-app-muted',
  HATIRLATILDI: 'text-amber-600 dark:text-amber-400',
  GERI_BILDIRIM_ALINDI: 'text-app-success',
};

/** "Durum" gercekte reminderSentAt/feedbackReceivedAt zaman damgalarindan hesaplanir
 * (bkz. post-sale-cases.service.ts computeStatus) - serbestce her degere atlanabilen bir
 * alan degil. HATIRLATILDI, gunluk bir arka plan isinin (S2, satis temsilcisine e-posta)
 * set ettigi bir ara durum - manuel tetiklenemez, bu yuzden dropdown'da secenek olarak
 * SUNULMAZ. Elle yapilabilecek tek gercek aksiyon "geri bildirim isaretle"dir (dogrudan
 * GERI_BILDIRIM_ALINDI'ye gecirir, BEKLEMEDE'den de HATIRLATILDI'den de mumkun). Bu son
 * durum geri donusu olmadigi icin, /teklifler'deki QuoteStatusSelect'teki kilitli-durum
 * deseniyle ayni sekilde kilitli duz metin olarak gosterilir. */
function PostSaleCaseStatusSelect({ postSaleCase }: { postSaleCase: PostSaleCase }) {
  const toast = useToast();
  const markFeedbackMutation = useMarkPostSaleFeedbackMutation(postSaleCase.id);

  if (postSaleCase.status === 'GERI_BILDIRIM_ALINDI') {
    return (
      <span className={clsx('text-sm font-semibold', STATUS_TEXT_CLASS[postSaleCase.status])}>
        {tr.crm.postSaleCases.statusOptions[postSaleCase.status]}
      </span>
    );
  }

  return (
    <InlineSelect
      value={postSaleCase.status}
      options={[
        {
          value: postSaleCase.status,
          label: tr.crm.postSaleCases.statusOptions[postSaleCase.status],
        },
        {
          value: 'GERI_BILDIRIM_ALINDI',
          label: tr.crm.postSaleCases.statusOptions.GERI_BILDIRIM_ALINDI,
        },
      ]}
      disabled={markFeedbackMutation.isPending}
      selectClassName={clsx(
        'font-semibold disabled:opacity-80',
        STATUS_TEXT_CLASS[postSaleCase.status],
      )}
      onChange={(value) => {
        const status = value as PostSaleCaseStatus;
        if (status !== 'GERI_BILDIRIM_ALINDI') return;
        markFeedbackMutation.mutate(
          {},
          {
            onSuccess: () => toast.success(tr.crm.postSaleCases.detail.markFeedbackSuccess),
            onError: (error) => {
              toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
            },
          },
        );
      }}
    />
  );
}

/** AppShell'siz icerik - /satis-sonrasi yonetim sayfasinda sekme olarak gomulur
 * (bkz. orders-management-page.tsx'teki *ListContent deseni). */
export function PostSaleCasesListContent() {
  const navigate = useNavigate();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<PostSaleCaseStatus | ''>('');
  const [qInput, setQInput] = useState('');
  const q = useDebouncedValue(qInput.trim());
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sinceInput, setSinceInput] = useState('');
  const [rangeFromInput, setRangeFromInput] = useState('');
  const [rangeToInput, setRangeToInput] = useState('');
  const meQuery = useMeQuery();
  const pageSize = meQuery.data?.defaultPageSize ?? 25;
  // Iki tarih filtresi ayni createdAt alanini hedefler, birbirini sifirlar: aralik
  // girildiyse tek-tarih ("itibaren") gormezden gelinir (bkz. quotes-list-page.tsx).
  const hasRange = Boolean(rangeFromInput) || Boolean(rangeToInput);
  const from = hasRange ? rangeFromInput || undefined : sinceInput || undefined;
  const to = hasRange ? rangeToInput || undefined : undefined;
  const hasActiveFilter = Boolean(from) || Boolean(to);
  const casesQuery = usePostSaleCasesQuery({
    page,
    pageSize,
    status: status || undefined,
    q: q || undefined,
    from,
    to,
  });
  const statusCounts = usePostSaleCaseStatusCounts(STATUS_OPTIONS.map((option) => option.value));
  const filterCounts: Partial<Record<PostSaleCaseStatus | '', number>> = {
    '': statusCounts.all,
    ...statusCounts.counts,
  };

  function resetFilters() {
    setPage(1);
    setSinceInput('');
    setRangeFromInput('');
    setRangeToInput('');
  }

  async function handleCopyOrderNumber(orderNumber: string) {
    await navigator.clipboard.writeText(orderNumber);
    toast.success(tr.crm.postSaleCases.orderNumberCopiedToast);
  }

  const ALL_COLUMNS: TableColumn<PostSaleCase>[] = [
    {
      key: 'order',
      header: tr.crm.postSaleCases.orderColumn,
      required: true,
      render: (c) => (
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1">
            <span className="font-semibold text-app-text">{c.salesOrder.orderNumber}</span>
            <IconActionButton
              icon={Copy}
              tooltip={tr.crm.postSaleCases.copyOrderNumberButton}
              iconSize={14}
              onClick={() => void handleCopyOrderNumber(c.salesOrder.orderNumber)}
            />
          </div>
          {c.quote && <span className="text-xs text-app-muted">{c.quote.quoteNumber}</span>}
        </div>
      ),
    },
    {
      key: 'account',
      header: tr.crm.postSaleCases.accountColumn,
      required: true,
      render: (c) => c.account.name,
    },
    {
      key: 'contact',
      header: tr.crm.postSaleCases.contactColumn,
      render: (c) =>
        c.contact ? `${c.contact.firstName} ${c.contact.lastName}` : tr.crm.postSaleCases.noContact,
    },
    {
      key: 'status',
      header: tr.crm.postSaleCases.statusColumn,
      render: (c) => <PostSaleCaseStatusSelect postSaleCase={c} />,
    },
    {
      key: 'createdAt',
      header: tr.crm.postSaleCases.createdAtColumn,
      className: 'text-app-muted',
      render: (c) =>
        new Intl.DateTimeFormat('tr-TR', { dateStyle: 'short', timeStyle: 'short' }).format(
          new Date(c.createdAt),
        ),
    },
  ];

  const { isColumnVisible, optionalColumns, visibleOptionalKeys, setVisibleOptionalKeys } =
    useColumnVisibility(
      'post-sale-cases',
      ALL_COLUMNS.map((c) => ({ key: c.key, label: c.header, required: c.required })),
    );
  const columns = ALL_COLUMNS.filter((c) => isColumnVisible(c.key));

  return (
    <div>
      <div className="flex flex-wrap items-start justify-end gap-4">
        <div className="flex items-center gap-2 pt-1">
          <CircleIconButton
            icon={Filter}
            tooltip={tr.crm.postSaleCases.filterButton}
            onClick={() => setDrawerOpen(true)}
          >
            {hasActiveFilter && (
              <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 ring-2 ring-app-surface" />
            )}
          </CircleIconButton>
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
          placeholder={tr.crm.postSaleCases.searchPlaceholder}
          className="w-full rounded-lg border border-app-border bg-app-surface py-2.5 pr-3 pl-9 text-sm text-app-text outline-none focus:border-app-primary"
        />
      </div>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <FilterButtonGroup
          label={tr.crm.postSaleCases.statusFilterLabel}
          value={status}
          onChange={(next) => {
            setPage(1);
            setStatus(next);
          }}
          allLabel={tr.crm.postSaleCases.allStatuses}
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
        data={casesQuery.data?.data ?? []}
        keyField={(c) => c.id}
        onRowClick={(c) => navigate(`/satis-sonrasi/${c.id}`)}
        getRowHref={(c) => `/satis-sonrasi/${c.id}`}
        isLoading={casesQuery.isPending}
        loadingMessage={tr.crm.postSaleCases.loading}
        emptyMessage={tr.crm.postSaleCases.empty}
      />

      {casesQuery.data && casesQuery.data.data.length > 0 && (
        <Pagination
          page={casesQuery.data.meta.page}
          totalPages={casesQuery.data.meta.totalPages}
          total={casesQuery.data.meta.total}
          onPageChange={setPage}
          onPrevious={() => setPage((p) => p - 1)}
          onNext={() => setPage((p) => p + 1)}
        />
      )}

      {drawerOpen && (
        <Drawer
          title={tr.crm.postSaleCases.filterDrawer.title}
          onClose={() => setDrawerOpen(false)}
        >
          <div className="flex flex-col gap-4">
            <DateField
              label={tr.crm.postSaleCases.filterDrawer.sinceLabel}
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
              label={tr.crm.postSaleCases.filterDrawer.rangeFromLabel}
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
              label={tr.crm.postSaleCases.filterDrawer.rangeToLabel}
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
              {tr.crm.postSaleCases.filterDrawer.reset}
            </Button>
          </div>
        </Drawer>
      )}
    </div>
  );
}

export function PostSaleCaseListPage() {
  return (
    <AppShell>
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-bold text-app-text">{tr.crm.postSaleCases.title}</h1>
        <PageHelp text={tr.help.postSaleCases} />
      </div>
      <p className="mt-1 text-sm text-app-muted">{tr.crm.postSaleCases.subtitle}</p>
      <div className="mt-6">
        <PostSaleCasesListContent />
      </div>
    </AppShell>
  );
}
