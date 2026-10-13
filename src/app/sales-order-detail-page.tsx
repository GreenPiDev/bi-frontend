import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppShell } from './app-shell';
import { QuoteViewModal } from './quote-view-modal';
import { BackLink } from '../components/ui/back-link';
import { Badge } from '../components/ui/badge';
import { PageHelp } from '../components/ui/page-help';
import { Table, type TableColumn } from '../components/ui/table';
import { useToast } from '../components/ui/toast-context';
import {
  useSalesOrderQuery,
  useUpdateSalesOrderStatusMutation,
} from '../features/crm/use-sales-orders';
import { ApiError, type Product, type SalesOrderStatus } from '../lib/api';
import { tr } from '../i18n/tr';

const STATUS_BADGE_VARIANT: Record<SalesOrderStatus, 'success' | 'neutral' | 'warning' | 'danger'> =
  {
    PENDING: 'neutral',
    PROCESSING: 'warning',
    READY_FOR_SHIPMENT: 'warning',
    SHIPPED: 'success',
    DELIVERED: 'success',
    COMPLETED: 'success',
    CANCELLED: 'danger',
  };

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

/** Hem Quote.items hem kendi SalesOrderItem'lari ayni kolonlarda gosterilebilir -
 * ikisi de product/quantity/unitPrice/currency tasiyor (bkz. SalesOrder.items alani). */
interface DisplayItem {
  id: string;
  product: Product;
  quantity: string;
  unitPrice: string;
  currency: string;
}

const ITEM_COLUMNS: TableColumn<DisplayItem>[] = [
  {
    key: 'product',
    header: tr.crm.salesOrders.detail.productColumn,
    render: (item) => item.product?.name ?? '—',
  },
  {
    key: 'quantity',
    header: tr.crm.salesOrders.detail.quantityColumn,
    className: 'text-app-muted',
    render: (item) => item.quantity,
  },
  {
    key: 'unitPrice',
    header: tr.crm.salesOrders.detail.unitPriceColumn,
    className: 'text-app-muted',
    render: (item) => `${item.unitPrice} ${item.currency}`,
  },
];

export function SalesOrderDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const salesOrderQuery = useSalesOrderQuery(id);
  const updateMutation = useUpdateSalesOrderStatusMutation(id);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);

  if (salesOrderQuery.isPending) {
    return (
      <AppShell>
        <p className="text-sm text-app-muted">{tr.common.loading}</p>
      </AppShell>
    );
  }

  if (!salesOrderQuery.data) {
    return null;
  }

  const salesOrder = salesOrderQuery.data;
  const relatedProject = salesOrder.quote?.project ?? null;
  // Teklifli siparislerde kalemler Quote.items'tan (MANUAL_TOTAL teklifte bos),
  // teklifsiz (manuel) siparislerde kendi SalesOrderItem'larindan gelir.
  const isManualTotalQuote = salesOrder.quote?.itemsEntryMode === 'MANUAL_TOTAL';
  const displayItems: DisplayItem[] = salesOrder.quoteId
    ? (salesOrder.quote?.items ?? [])
    : salesOrder.items;

  return (
    <AppShell>
      <BackLink to="/siparisler?tab=salesOrders" label={tr.crm.salesOrders.detail.back} />

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-bold text-app-text">{salesOrder.orderNumber}</h1>
        <PageHelp text={tr.help.salesOrderDetail} />
        <Badge variant={STATUS_BADGE_VARIANT[salesOrder.status]}>
          {tr.crm.salesOrders.statusOptions[salesOrder.status]}
        </Badge>
      </div>

      <p className="mt-1 text-sm text-app-muted">{salesOrder.account?.name}</p>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm font-semibold text-app-text">
          {tr.crm.salesOrders.detail.statusLabel}
          <select
            value={salesOrder.status}
            onChange={(event) => {
              const status = event.target.value as SalesOrderStatus;
              updateMutation.mutate(
                { status },
                {
                  onSuccess: () => toast.success(tr.crm.salesOrders.statusUpdateSuccess),
                  onError: (error) => {
                    toast.error(
                      error instanceof ApiError
                        ? error.message
                        : tr.crm.salesOrders.statusUpdateError,
                    );
                  },
                },
              );
            }}
            disabled={updateMutation.isPending}
            className="rounded-md border border-app-border bg-app-surface px-3 py-1.5 text-sm text-app-text outline-none focus:border-app-primary disabled:opacity-80"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {salesOrder.quoteId && (
          <button
            type="button"
            onClick={() => setIsQuoteModalOpen(true)}
            className="text-sm font-semibold text-app-brand hover:underline"
          >
            {tr.crm.salesOrders.detail.relatedQuoteLink}
          </button>
        )}
        {relatedProject && (
          <button
            type="button"
            onClick={() => navigate(`/projeler/${relatedProject.projectNumber}`)}
            className="text-sm font-semibold text-app-brand hover:underline"
          >
            {tr.crm.salesOrders.detail.relatedProjectLink}
          </button>
        )}
      </div>

      <div className="mt-6 border-t border-app-border p-6">
        <h2 className="text-sm font-bold text-app-text">{tr.crm.salesOrders.detail.itemsTitle}</h2>

        <div className="mt-3">
          {isManualTotalQuote ? (
            <p className="text-sm text-app-muted">{tr.crm.salesOrders.detail.itemsEmpty}</p>
          ) : (
            <Table
              columns={ITEM_COLUMNS}
              data={displayItems}
              keyField={(item) => item.id}
              emptyMessage={tr.crm.salesOrders.detail.itemsEmpty}
              fixedLayout
            />
          )}
        </div>
      </div>

      {isQuoteModalOpen && salesOrder.quoteId && (
        <QuoteViewModal quoteId={salesOrder.quoteId} onClose={() => setIsQuoteModalOpen(false)} />
      )}
    </AppShell>
  );
}
