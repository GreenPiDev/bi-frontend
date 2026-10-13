import { clsx } from 'clsx';
import { Copy, Search } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from './app-shell';
import { ColumnVisibilityPicker } from '../components/ui/column-visibility-picker';
import { FilterButtonGroup } from '../components/ui/filter-button-group';
import { IconActionButton } from '../components/ui/icon-action-button';
import { PageHelp } from '../components/ui/page-help';
import { Pagination, Table, type TableColumn } from '../components/ui/table';
import { useToast } from '../components/ui/toast-context';
import { useColumnVisibility } from '../features/auth/use-column-visibility';
import { useMeQuery } from '../features/auth/use-auth';
import {
  useSalesOrderStatusCounts,
  useSalesOrdersQuery,
  useUpdateSalesOrderStatusMutation,
} from '../features/crm/use-sales-orders';
import { ApiError, type SalesOrder, type SalesOrderStatus } from '../lib/api';
import { useDebouncedValue } from '../lib/use-debounced-value';
import { tr } from '../i18n/tr';

const STATUS_OPTIONS: { value: SalesOrderStatus; label: string }[] = (
  [
    'PENDING',
    'PROCESSING',
    'READY_FOR_SHIPMENT',
    'SHIPPED',
    'DELIVERED',
    'COMPLETED',
    'CANCELLED',
  ] as const
).map((status) => ({ value: status, label: tr.crm.salesOrders.statusOptions[status] }));

const STATUS_TEXT_CLASS: Record<SalesOrderStatus, string> = {
  PENDING: 'text-app-muted',
  PROCESSING: 'text-app-primary',
  READY_FOR_SHIPMENT: 'text-app-primary',
  SHIPPED: 'text-app-primary',
  DELIVERED: 'text-app-success',
  COMPLETED: 'text-app-success',
  CANCELLED: 'text-app-danger',
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('tr-TR').format(new Date(value));
}

/** /siparisler (Satin Alma) ve /teklifler'deki durum dropdown'u ile ayni desen:
 * durum dogrudan tablo icinde, satira tiklamayi tetiklemeyen bir dropdown ile
 * guncellenebilir. */
function SalesOrderStatusSelect({ order }: { order: SalesOrder }) {
  const toast = useToast();
  const updateMutation = useUpdateSalesOrderStatusMutation(order.id);

  return (
    <select
      value={order.status}
      onClick={(event) => event.stopPropagation()}
      onChange={(event) => {
        const status = event.target.value as SalesOrderStatus;
        updateMutation.mutate(
          { status },
          {
            onSuccess: () => toast.success(tr.crm.salesOrders.statusUpdateSuccess),
            onError: (error) => {
              toast.error(
                error instanceof ApiError ? error.message : tr.crm.salesOrders.statusUpdateError,
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
export function SalesOrdersListContent() {
  const navigate = useNavigate();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [qInput, setQInput] = useState('');
  const q = useDebouncedValue(qInput.trim());
  const [status, setStatus] = useState<SalesOrderStatus | ''>('');
  const meQuery = useMeQuery();
  const pageSize = meQuery.data?.defaultPageSize ?? 25;
  const salesOrdersQuery = useSalesOrdersQuery({
    page,
    pageSize,
    q: q || undefined,
    status: status || undefined,
  });
  const statusCounts = useSalesOrderStatusCounts(STATUS_OPTIONS.map((option) => option.value));
  const filterCounts: Partial<Record<SalesOrderStatus | '', number>> = {
    '': statusCounts.all,
    ...statusCounts.counts,
  };

  async function handleCopyOrderNumber(orderNumber: string) {
    await navigator.clipboard.writeText(orderNumber);
    toast.success(tr.crm.salesOrders.orderNumberCopiedToast);
  }

  const ALL_COLUMNS: TableColumn<SalesOrder>[] = [
    {
      key: 'orderNumber',
      header: tr.crm.salesOrders.numberColumn,
      className: 'font-semibold text-app-text',
      required: true,
      render: (order) => (
        <div className="flex items-center gap-1">
          <span>{order.orderNumber}</span>
          <IconActionButton
            icon={Copy}
            tooltip={tr.crm.salesOrders.copyOrderNumberButton}
            iconSize={14}
            onClick={() => void handleCopyOrderNumber(order.orderNumber)}
          />
        </div>
      ),
    },
    {
      key: 'account',
      header: tr.crm.salesOrders.accountColumn,
      render: (order) => order.account?.name ?? '—',
    },
    {
      key: 'quote',
      header: tr.crm.salesOrders.quoteColumn,
      render: (order) => order.quote?.quoteNumber ?? '—',
    },
    {
      key: 'project',
      header: tr.crm.salesOrders.projectColumn,
      render: (order) => order.quote?.project?.name ?? tr.crm.salesOrders.noProject,
    },
    {
      key: 'status',
      header: tr.crm.salesOrders.statusColumn,
      render: (order) => <SalesOrderStatusSelect order={order} />,
    },
    {
      key: 'createdAt',
      header: tr.crm.salesOrders.createdAtColumn,
      className: 'text-app-muted',
      render: (order) => formatDate(order.createdAt),
    },
  ];

  const { isColumnVisible, optionalColumns, visibleOptionalKeys, setVisibleOptionalKeys } =
    useColumnVisibility(
      'sales-orders',
      ALL_COLUMNS.map((c) => ({ key: c.key, label: c.header, required: c.required })),
    );
  const columns = ALL_COLUMNS.filter((c) => isColumnVisible(c.key));

  return (
    <div>
      <div className="relative w-full">
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
          placeholder={tr.crm.salesOrders.searchPlaceholder}
          className="w-full rounded-lg border border-app-border bg-app-surface py-2.5 pr-3 pl-9 text-sm text-app-text outline-none focus:border-app-primary"
        />
      </div>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <FilterButtonGroup
          label={tr.crm.salesOrders.statusFilterLabel}
          value={status}
          onChange={(next) => {
            setPage(1);
            setStatus(next);
          }}
          allLabel={tr.crm.salesOrders.allStatuses}
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
        data={salesOrdersQuery.data?.data ?? []}
        keyField={(order) => order.id}
        onRowClick={(order) => navigate(`/satis-siparisleri/${order.id}`)}
        getRowHref={(order) => `/satis-siparisleri/${order.id}`}
        isLoading={salesOrdersQuery.isPending}
        loadingMessage={tr.crm.salesOrders.loading}
        emptyMessage={tr.crm.salesOrders.empty}
      />

      {salesOrdersQuery.data && salesOrdersQuery.data.data.length > 0 && (
        <Pagination
          page={salesOrdersQuery.data.meta.page}
          totalPages={salesOrdersQuery.data.meta.totalPages}
          total={salesOrdersQuery.data.meta.total}
          onPageChange={setPage}
          onPrevious={() => setPage((p) => p - 1)}
          onNext={() => setPage((p) => p + 1)}
        />
      )}
    </div>
  );
}

export function SalesOrderListPage() {
  return (
    <AppShell>
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-bold text-app-text">{tr.crm.salesOrders.title}</h1>
        <PageHelp text={tr.help.salesOrders} />
      </div>
      <p className="mt-1 text-sm text-app-muted">{tr.crm.salesOrders.subtitle}</p>
      <div className="mt-6">
        <SalesOrdersListContent />
      </div>
    </AppShell>
  );
}
