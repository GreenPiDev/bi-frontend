import { clsx } from 'clsx';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AppShell } from './app-shell';
import { CircleIconButton } from '../components/ui/circle-icon-button';
import { ColumnVisibilityPicker } from '../components/ui/column-visibility-picker';
import { ConfirmModal } from '../components/ui/confirm-modal';
import { FilterButtonGroup } from '../components/ui/filter-button-group';
import { IconActionButton } from '../components/ui/icon-action-button';
import { PageHelp } from '../components/ui/page-help';
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
import { ApiError, type PurchaseOrder, type PurchaseOrderStatus } from '../lib/api';
import { tr } from '../i18n/tr';

const STATUS_OPTIONS: { value: PurchaseOrderStatus; label: string }[] = (
  ['DRAFT', 'CONFIRMED'] as const
).map((status) => ({ value: status, label: tr.crm.purchaseOrders.statusOptions[status] }));

const STATUS_TEXT_CLASS: Record<PurchaseOrderStatus, string> = {
  DRAFT: 'text-app-muted',
  CONFIRMED: 'text-app-success',
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('tr-TR').format(new Date(value));
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

export function PurchaseOrderListPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<PurchaseOrderStatus | ''>('');
  const quoteId = searchParams.get('quoteId') ?? undefined;
  const projectId = searchParams.get('projectId') ?? undefined;
  const meQuery = useMeQuery();
  const pageSize = meQuery.data?.defaultPageSize ?? 25;
  const purchaseOrdersQuery = usePurchaseOrdersQuery({
    page,
    pageSize,
    quoteId,
    projectId,
    status: status || undefined,
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
      key: 'orderNumber',
      header: tr.crm.purchaseOrders.numberColumn,
      className: 'font-semibold text-app-text',
      required: true,
      render: (order) => order.orderNumber,
    },
    {
      key: 'quote',
      header: tr.crm.purchaseOrders.quoteColumn,
      render: (order) => order.quote?.quoteNumber ?? '—',
    },
    {
      key: 'project',
      header: tr.crm.purchaseOrders.projectColumn,
      render: (order) => order.quote?.project?.name ?? tr.crm.purchaseOrders.noProject,
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
    <AppShell>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-app-text">{tr.crm.purchaseOrders.title}</h1>
            <PageHelp text={tr.help.purchaseOrders} />
          </div>
          <p className="mt-1 text-sm text-app-muted">{tr.crm.purchaseOrders.subtitle}</p>
        </div>
        {canCreatePurchaseOrder && (
          <CircleIconButton
            icon={Plus}
            tooltip={tr.crm.purchaseOrders.newButton}
            variant="success"
            strokeWidth={3}
            onClick={() => navigate('/siparisler/yeni')}
            className="mt-1"
          />
        )}
      </div>

      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
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
          onPrevious={() => setPage((p) => p - 1)}
          onNext={() => setPage((p) => p + 1)}
        />
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
    </AppShell>
  );
}
