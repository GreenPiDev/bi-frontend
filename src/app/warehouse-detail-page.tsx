import { Search } from 'lucide-react';
import { useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { AppShell } from './app-shell';
import { BackLink } from '../components/ui/back-link';
import { PageHelp } from '../components/ui/page-help';
import { Pagination, Table, type TableColumn } from '../components/ui/table';
import { useMeQuery } from '../features/auth/use-auth';
import { useWarehouseQuery, useWarehouseStockItemsQuery } from '../features/crm/use-warehouses';
import type { WarehouseStockRow } from '../lib/api';
import { useDebouncedValue } from '../lib/use-debounced-value';
import { tr } from '../i18n/tr';

const COLUMNS: TableColumn<WarehouseStockRow>[] = [
  {
    key: 'productName',
    header: tr.crm.warehouses.detail.productColumn,
    required: true,
    render: (row) => <span className="font-semibold text-app-text">{row.productName}</span>,
  },
  {
    key: 'sku',
    header: tr.crm.warehouses.detail.skuColumn,
    className: 'text-app-muted',
    render: (row) => row.sku ?? '—',
  },
  {
    key: 'quantity',
    header: tr.crm.warehouses.detail.quantityColumn,
    render: (row) => new Intl.NumberFormat('tr-TR').format(row.quantity),
  },
  {
    key: 'unit',
    header: tr.crm.warehouses.detail.unitColumn,
    className: 'text-app-muted',
    render: (row) => row.unit,
  },
];

export function WarehouseDetailPage() {
  const { id = '' } = useParams();
  const location = useLocation();
  const backTo = (location.state as { from?: string } | null)?.from ?? '/depolar';
  const warehouseQuery = useWarehouseQuery(id);
  const [page, setPage] = useState(1);
  const [qInput, setQInput] = useState('');
  const q = useDebouncedValue(qInput.trim());
  const meQuery = useMeQuery();
  const pageSize = meQuery.data?.defaultPageSize ?? 25;
  const stockItemsQuery = useWarehouseStockItemsQuery(id, {
    page,
    pageSize,
    q: q || undefined,
  });

  if (warehouseQuery.isPending) {
    return (
      <AppShell>
        <p className="text-sm text-app-muted">{tr.crm.warehouses.detail.loading}</p>
      </AppShell>
    );
  }

  if (!warehouseQuery.data) {
    return null;
  }

  const warehouse = warehouseQuery.data;

  return (
    <AppShell>
      <BackLink to={backTo} label={tr.crm.warehouses.detail.back} />

      <div className="mt-6 flex items-center gap-2">
        <h1 className="text-xl font-bold text-app-text">{warehouse.name}</h1>
        <PageHelp text={tr.help.warehouseDetail} />
      </div>
      {warehouse.address && <p className="mt-1 text-sm text-app-muted">{warehouse.address}</p>}

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
          placeholder={tr.crm.warehouses.detail.searchPlaceholder}
          className="w-full rounded-lg border border-app-border bg-app-surface py-2.5 pr-3 pl-9 text-sm text-app-text outline-none focus:border-app-primary"
        />
      </div>

      <Table
        columns={COLUMNS}
        data={stockItemsQuery.data?.data ?? []}
        keyField={(row) => row.productId}
        isLoading={stockItemsQuery.isPending}
        loadingMessage={tr.crm.warehouses.detail.stockLoading}
        emptyMessage={tr.crm.warehouses.detail.stockEmpty}
      />

      {stockItemsQuery.data && stockItemsQuery.data.data.length > 0 && (
        <Pagination
          page={stockItemsQuery.data.meta.page}
          totalPages={stockItemsQuery.data.meta.totalPages}
          total={stockItemsQuery.data.meta.total}
          onPageChange={setPage}
          onPrevious={() => setPage((p) => p - 1)}
          onNext={() => setPage((p) => p + 1)}
        />
      )}
    </AppShell>
  );
}
