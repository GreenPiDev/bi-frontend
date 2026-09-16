import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AppShell } from './app-shell';
import { Badge } from '../components/ui/badge';
import { ColumnVisibilityPicker } from '../components/ui/column-visibility-picker';
import { PageHelp } from '../components/ui/page-help';
import { Pagination, Table, type TableColumn } from '../components/ui/table';
import { useColumnVisibility } from '../features/auth/use-column-visibility';
import { useMeQuery } from '../features/auth/use-auth';
import { usePurchaseOrdersQuery } from '../features/crm/use-purchase-orders';
import type { PurchaseOrder, PurchaseOrderStatus } from '../lib/api';
import { tr } from '../i18n/tr';

const STATUS_BADGE_VARIANT: Record<PurchaseOrderStatus, 'success' | 'neutral'> = {
  DRAFT: 'neutral',
  CONFIRMED: 'success',
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('tr-TR').format(new Date(value));
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
    render: (order) => order.project?.name ?? tr.crm.purchaseOrders.noProject,
  },
  {
    key: 'status',
    header: tr.crm.purchaseOrders.statusColumn,
    render: (order) => (
      <Badge variant={STATUS_BADGE_VARIANT[order.status]}>
        {tr.crm.purchaseOrders.statusOptions[order.status]}
      </Badge>
    ),
  },
  {
    key: 'createdAt',
    header: tr.crm.purchaseOrders.createdAtColumn,
    className: 'text-app-muted',
    render: (order) => formatDate(order.createdAt),
  },
];

export function PurchaseOrderListPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const quoteId = searchParams.get('quoteId') ?? undefined;
  const projectId = searchParams.get('projectId') ?? undefined;
  const meQuery = useMeQuery();
  const pageSize = meQuery.data?.defaultPageSize ?? 25;
  const purchaseOrdersQuery = usePurchaseOrdersQuery({ page, pageSize, quoteId, projectId });
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
      </div>

      <div className="mt-4 flex justify-end">
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
        isLoading={purchaseOrdersQuery.isPending}
        loadingMessage={tr.crm.purchaseOrders.loading}
        emptyMessage={tr.crm.purchaseOrders.empty}
      />

      {purchaseOrdersQuery.data && purchaseOrdersQuery.data.data.length > 0 && (
        <Pagination
          page={purchaseOrdersQuery.data.meta.page}
          totalPages={purchaseOrdersQuery.data.meta.totalPages}
          onPrevious={() => setPage((p) => p - 1)}
          onNext={() => setPage((p) => p + 1)}
        />
      )}
    </AppShell>
  );
}
