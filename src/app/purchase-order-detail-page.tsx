import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppShell } from './app-shell';
import { QuoteViewModal } from './quote-view-modal';
import { BackLink } from '../components/ui/back-link';
import { Badge } from '../components/ui/badge';
import { PageHelp } from '../components/ui/page-help';
import { Table, type TableColumn } from '../components/ui/table';
import { usePurchaseOrderQuery } from '../features/crm/use-purchase-orders';
import type { PurchaseOrderItem, PurchaseOrderStatus } from '../lib/api';
import { tr } from '../i18n/tr';

const STATUS_BADGE_VARIANT: Record<PurchaseOrderStatus, 'success' | 'neutral'> = {
  DRAFT: 'neutral',
  CONFIRMED: 'success',
};

const ITEM_COLUMNS: TableColumn<PurchaseOrderItem>[] = [
  {
    key: 'product',
    header: tr.crm.purchaseOrders.detail.productColumn,
    render: (item) => item.product?.name ?? '—',
  },
  {
    key: 'description',
    header: tr.crm.purchaseOrders.detail.descriptionColumn,
    className: 'text-app-muted',
    render: (item) => item.description,
  },
  {
    key: 'quantity',
    header: tr.crm.purchaseOrders.detail.quantityColumn,
    className: 'text-app-muted',
    render: (item) => item.quantity,
  },
];

export function PurchaseOrderDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const purchaseOrderQuery = usePurchaseOrderQuery(id);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);

  if (purchaseOrderQuery.isPending) {
    return (
      <AppShell>
        <p className="text-sm text-app-muted">{tr.common.loading}</p>
      </AppShell>
    );
  }

  if (!purchaseOrderQuery.data) {
    return null;
  }

  const purchaseOrder = purchaseOrderQuery.data;
  const relatedProject = purchaseOrder.quote?.project ?? null;

  return (
    <AppShell>
      <div className="flex flex-col items-start gap-1">
        <BackLink to={'/teklifler'} label={tr.crm.purchaseOrders.detail.backToQuotes} />
        <BackLink to={'/siparisler'} label={tr.crm.purchaseOrders.detail.back} />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-bold text-app-text">{purchaseOrder.orderNumber}</h1>
        <PageHelp text={tr.help.purchaseOrderDetail} />
        <Badge variant={STATUS_BADGE_VARIANT[purchaseOrder.status]}>
          {tr.crm.purchaseOrders.statusOptions[purchaseOrder.status]}
        </Badge>
      </div>

      <div className="mt-4 flex flex-wrap gap-4">
        {purchaseOrder.quoteId && (
          <button
            type="button"
            onClick={() => setIsQuoteModalOpen(true)}
            className="text-sm font-semibold text-app-brand hover:underline"
          >
            {tr.crm.purchaseOrders.detail.relatedQuoteLink}
          </button>
        )}
        {relatedProject && (
          <button
            type="button"
            onClick={() => navigate(`/projeler/${relatedProject.projectNumber}`)}
            className="text-sm font-semibold text-app-brand hover:underline"
          >
            {tr.crm.purchaseOrders.detail.relatedProjectLink}
          </button>
        )}
      </div>

      <div className="mt-6 border-t border-app-border p-6">
        <h2 className="text-sm font-bold text-app-text">
          {tr.crm.purchaseOrders.detail.itemsTitle}
        </h2>

        <div className="mt-3">
          <Table
            columns={ITEM_COLUMNS}
            data={purchaseOrder.items}
            keyField={(item) => item.id}
            emptyMessage={tr.crm.purchaseOrders.detail.itemsEmpty}
          />
        </div>
      </div>

      {isQuoteModalOpen && purchaseOrder.quoteId && (
        <QuoteViewModal
          quoteId={purchaseOrder.quoteId}
          onClose={() => setIsQuoteModalOpen(false)}
        />
      )}
    </AppShell>
  );
}
