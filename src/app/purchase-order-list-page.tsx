import { clsx } from 'clsx';
import { Copy, ListFilter, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AppShell } from './app-shell';
import { Button } from '../components/ui/button';
import { CircleIconButton } from '../components/ui/circle-icon-button';
import { ColumnVisibilityPicker } from '../components/ui/column-visibility-picker';
import { ConfirmModal } from '../components/ui/confirm-modal';
import { DateField } from '../components/ui/date-field';
import { Drawer } from '../components/ui/drawer';
import { FilterButtonGroup } from '../components/ui/filter-button-group';
import { IconActionButton } from '../components/ui/icon-action-button';
import { PageHelp } from '../components/ui/page-help';
import { Select } from '../components/ui/select';
import { Pagination, Table, type TableColumn } from '../components/ui/table';
import { useToast } from '../components/ui/toast-context';
import { hasPermission } from '../features/auth/permissions';
import { useColumnVisibility } from '../features/auth/use-column-visibility';
import { useMeQuery } from '../features/auth/use-auth';
import {
  useDeletePurchaseOrderMutation,
  usePurchaseOrderStatusCounts,
  usePurchaseOrdersQuery,
  useUpdatePurchaseOrderMutation,
} from '../features/crm/use-purchase-orders';
import { useUsersQuery } from '../features/roles/use-users';
import { ApiError, type PurchaseOrder, type PurchaseOrderStatus } from '../lib/api';
import { useDebouncedValue } from '../lib/use-debounced-value';
import { tr } from '../i18n/tr';

const STATUS_OPTIONS: { value: PurchaseOrderStatus; label: string }[] = (
  ['DRAFT', 'CONFIRMED'] as const
).map((status) => ({ value: status, label: tr.crm.purchaseOrders.statusOptions[status] }));

const STATUS_TEXT_CLASS: Record<PurchaseOrderStatus, string> = {
  DRAFT: 'text-app-muted',
  CONFIRMED: 'text-app-success',
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('tr-TR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

/** /teklifler'deki QuoteStatusSelect ile ayni desen: durum dogrudan tablo icinde,
 * satira tiklamayi tetiklemeyen bir dropdown ile guncellenebilir. */
function PurchaseOrderStatusSelect({ order }: { order: PurchaseOrder }) {
  const toast = useToast();
  const updateMutation = useUpdatePurchaseOrderMutation(order.id);

  return (
    <select
      value={order.status}
      onClick={(event) => event.stopPropagation()}
      onChange={(event) => {
        const status = event.target.value as PurchaseOrderStatus;
        updateMutation.mutate(
          { status },
          {
            onSuccess: () => toast.success(tr.crm.purchaseOrders.statusUpdateSuccess),
            onError: (error) => {
              toast.error(
                error instanceof ApiError ? error.message : tr.crm.purchaseOrders.statusUpdateError,
              );
            },
          },
        );
      }}
      disabled={updateMutation.isPending}
      className={clsx(
        'cursor-pointer rounded-md border-none bg-transparent px-2 py-1 -mx-2 -my-1 text-sm font-semibold outline-none transition-colors hover:bg-[#1a2440] hover:text-white focus:ring-2 focus:ring-app-primary disabled:cursor-not-allowed disabled:opacity-80',
        STATUS_TEXT_CLASS[order.status],
      )}
    >
      {STATUS_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

/** AppShell'siz icerik - /siparisler yonetim sayfasinda sekme olarak gomulur
 * (bkz. inventory-management-page.tsx'teki *ListContent deseni). */
export function PurchaseOrdersListContent() {
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [qInput, setQInput] = useState('');
  const q = useDebouncedValue(qInput.trim());
  // /settings/kullanicilar/:slug "Oluşturduğu Satın Alma Siparişleri" grafiginden
  // "?status=...&createdById=..." ile gelindiginde baslangic filtresini uygulamak
  // icin okunur - URL'de kalip kafa karistirmasin diye tuketildikten sonra temizlenir
  // (bkz. quotes-list-page.tsx'teki ayni desen).
  const [status, setStatus] = useState<PurchaseOrderStatus | ''>(() => {
    const fromUrl = searchParams.get('status');
    return STATUS_OPTIONS.some((option) => option.value === fromUrl)
      ? (fromUrl as PurchaseOrderStatus)
      : '';
  });
  const [createdById, setCreatedById] = useState(() => searchParams.get('createdById') ?? '');
  useEffect(() => {
    if (!searchParams.has('status') && !searchParams.has('createdById')) return;
    const next = new URLSearchParams(searchParams);
    next.delete('status');
    next.delete('createdById');
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sinceInput, setSinceInput] = useState('');
  const [rangeFromInput, setRangeFromInput] = useState('');
  const [rangeToInput, setRangeToInput] = useState('');
  // Iki tarih filtresi ayni createdAt alanini hedefler, birbirini sifirlar: aralik
  // girildiyse tek-tarih ("itibaren") gormezden gelinir - bkz. opportunities-list-page.tsx.
  const hasRange = Boolean(rangeFromInput) || Boolean(rangeToInput);
  const from = hasRange ? rangeFromInput || undefined : sinceInput || undefined;
  const to = hasRange ? rangeToInput || undefined : undefined;
  const hasActiveFilter = Boolean(createdById) || Boolean(from) || Boolean(to);
  const quoteId = searchParams.get('quoteId') ?? undefined;
  const projectId = searchParams.get('projectId') ?? undefined;
  const meQuery = useMeQuery();
  const usersQuery = useUsersQuery();
  const pageSize = meQuery.data?.defaultPageSize ?? 25;
  const purchaseOrdersQuery = usePurchaseOrdersQuery({
    page,
    pageSize,
    q: q || undefined,
    quoteId,
    projectId,
    status: status || undefined,
    createdById: createdById || undefined,
    from,
    to,
  });
  const statusCounts = usePurchaseOrderStatusCounts(STATUS_OPTIONS.map((option) => option.value));
  const filterCounts: Partial<Record<PurchaseOrderStatus | '', number>> = {
    '': statusCounts.all,
    ...statusCounts.counts,
  };
  const deleteMutation = useDeletePurchaseOrderMutation();
  const [deletingOrder, setDeletingOrder] = useState<PurchaseOrder | undefined>(undefined);
  const canCreatePurchaseOrder = hasPermission(
    meQuery.data?.permissions,
    'purchase-orders',
    'CREATE',
  );

  async function handleCopyQuoteNumber(quoteNumber: string) {
    await navigator.clipboard.writeText(quoteNumber);
    toast.success(tr.crm.purchaseOrders.quoteCopiedToast);
  }

  async function handleCopyOrderNumber(orderNumber: string) {
    await navigator.clipboard.writeText(orderNumber);
    toast.success(tr.crm.purchaseOrders.orderNumberCopiedToast);
  }

  function resetFilters() {
    setPage(1);
    setCreatedById('');
    setSinceInput('');
    setRangeFromInput('');
    setRangeToInput('');
  }

  function handleConfirmDelete() {
    if (!deletingOrder) return;
    deleteMutation.mutate(deletingOrder.id, {
      onSuccess: () => {
        setDeletingOrder(undefined);
      },
      onError: (error) => {
        toast.error(error instanceof ApiError ? error.message : tr.crm.purchaseOrders.deleteError);
      },
    });
  }

  const ALL_COLUMNS: TableColumn<PurchaseOrder>[] = [
    {
      key: 'title',
      header: tr.crm.purchaseOrders.titleColumn,
      className: 'text-app-muted',
      render: (order) => order.title ?? '—',
    },
    {
      key: 'orderNumber',
      header: tr.crm.purchaseOrders.numberColumn,
      className: 'font-semibold text-app-text',
      required: true,
      render: (order) => (
        <div className="flex items-center gap-1">
          <span>{order.orderNumber}</span>
          <IconActionButton
            icon={Copy}
            tooltip={tr.crm.purchaseOrders.copyOrderNumberButton}
            iconSize={14}
            onClick={() => void handleCopyOrderNumber(order.orderNumber)}
          />
        </div>
      ),
    },
    {
      key: 'quote',
      header: tr.crm.purchaseOrders.quoteColumn,
      render: (order) => {
        const quoteNumber = order.quote?.quoteNumber;
        if (!quoteNumber) return '—';
        return (
          <div className="flex items-center gap-1">
            <span>{quoteNumber}</span>
            <IconActionButton
              icon={Copy}
              tooltip={tr.crm.purchaseOrders.copyQuoteButton}
              iconSize={14}
              onClick={() => void handleCopyQuoteNumber(quoteNumber)}
            />
          </div>
        );
      },
    },
    {
      key: 'project',
      header: tr.crm.purchaseOrders.projectColumn,
      render: (order) => order.quote?.project?.name ?? tr.crm.purchaseOrders.noProject,
    },
    {
      key: 'product',
      header: tr.crm.purchaseOrders.productColumn,
      className: 'text-app-muted',
      render: (order) => tr.crm.purchaseOrders.productCount(order.items.length),
    },
    {
      key: 'status',
      header: tr.crm.purchaseOrders.statusColumn,
      render: (order) => <PurchaseOrderStatusSelect order={order} />,
    },
    {
      key: 'createdAt',
      header: tr.crm.purchaseOrders.createdAtColumn,
      className: 'text-app-muted',
      render: (order) => formatDate(order.createdAt),
    },
    {
      key: 'actions',
      header: tr.crm.purchaseOrders.actionsColumn,
      className: 'w-px',
      required: true,
      render: (order) => (
        <div className="flex items-center gap-1">
          <IconActionButton
            icon={Pencil}
            tooltip={tr.crm.purchaseOrders.detail.editButton}
            onClick={() => navigate(`/siparisler/duzenle/${order.id}`)}
          />
          <IconActionButton
            icon={Trash2}
            tooltip={tr.crm.purchaseOrders.detail.deleteButton}
            variant="danger"
            onClick={() => setDeletingOrder(order)}
          />
        </div>
      ),
    },
  ];

  const { isColumnVisible, optionalColumns, visibleOptionalKeys, setVisibleOptionalKeys } =
    useColumnVisibility(
      'purchase-orders',
      ALL_COLUMNS.map((c) => ({ key: c.key, label: c.header, required: c.required })),
    );
  const columns = ALL_COLUMNS.filter((c) => isColumnVisible(c.key));

  return (
    <div>
      <div className="flex justify-end gap-2">
        <CircleIconButton
          icon={ListFilter}
          tooltip={tr.crm.purchaseOrders.filterButton}
          onClick={() => setDrawerOpen(true)}
        >
          {hasActiveFilter && (
            <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 ring-2 ring-app-surface" />
          )}
        </CircleIconButton>
        {canCreatePurchaseOrder && (
          <CircleIconButton
            icon={Plus}
            tooltip={tr.crm.purchaseOrders.newButton}
            variant="success"
            strokeWidth={3}
            onClick={() => navigate('/siparisler/yeni')}
          />
        )}
      </div>

      <div className="relative mt-4 w-full">
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
          placeholder={tr.crm.purchaseOrders.searchPlaceholder}
          className="w-full rounded-lg border border-app-border bg-app-surface py-2.5 pr-3 pl-9 text-sm text-app-text outline-none focus:border-app-primary"
        />
      </div>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <FilterButtonGroup
          label={tr.crm.purchaseOrders.statusFilterLabel}
          value={status}
          onChange={(next) => {
            setPage(1);
            setStatus(next);
          }}
          allLabel={tr.crm.purchaseOrders.allStatuses}
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
        data={purchaseOrdersQuery.data?.data ?? []}
        keyField={(order) => order.id}
        onRowClick={(order) => navigate(`/siparisler/${order.id}`)}
        getRowHref={(order) => `/siparisler/${order.id}`}
        isLoading={purchaseOrdersQuery.isPending}
        loadingMessage={tr.crm.purchaseOrders.loading}
        emptyMessage={tr.crm.purchaseOrders.empty}
      />

      {purchaseOrdersQuery.data && purchaseOrdersQuery.data.data.length > 0 && (
        <Pagination
          page={purchaseOrdersQuery.data.meta.page}
          totalPages={purchaseOrdersQuery.data.meta.totalPages}
          total={purchaseOrdersQuery.data.meta.total}
          onPageChange={setPage}
          onPrevious={() => setPage((p) => p - 1)}
          onNext={() => setPage((p) => p + 1)}
        />
      )}

      {drawerOpen && (
        <Drawer
          title={tr.crm.purchaseOrders.filterDrawer.title}
          onClose={() => setDrawerOpen(false)}
        >
          <div className="flex flex-col gap-4">
            <Select
              label={tr.crm.purchaseOrders.filterDrawer.createdByLabel}
              placeholder={tr.crm.purchaseOrders.filterDrawer.createdByPlaceholder}
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
              label={tr.crm.purchaseOrders.filterDrawer.sinceLabel}
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
              label={tr.crm.purchaseOrders.filterDrawer.rangeFromLabel}
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
              label={tr.crm.purchaseOrders.filterDrawer.rangeToLabel}
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
              {tr.crm.purchaseOrders.filterDrawer.reset}
            </Button>
          </div>
        </Drawer>
      )}

      {deletingOrder && (
        <ConfirmModal
          title={tr.crm.purchaseOrders.deleteConfirmTitle}
          message={tr.crm.purchaseOrders.deleteConfirm}
          confirmLabel={tr.crm.purchaseOrders.detail.deleteButton}
          isPending={deleteMutation.isPending}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeletingOrder(undefined)}
        />
      )}
    </div>
  );
}

export function PurchaseOrderListPage() {
  return (
    <AppShell>
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-bold text-app-text">{tr.crm.purchaseOrders.title}</h1>
        <PageHelp text={tr.help.purchaseOrders} />
      </div>
      <p className="mt-1 text-sm text-app-muted">{tr.crm.purchaseOrders.subtitle}</p>
      <div className="mt-6">
        <PurchaseOrdersListContent />
      </div>
    </AppShell>
  );
}
