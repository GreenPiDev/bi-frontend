import { AlertTriangle, Pencil, Search } from 'lucide-react';
import { useState } from 'react';
import { AppShell } from './app-shell';
import { ColumnVisibilityPicker } from '../components/ui/column-visibility-picker';
import { IconActionButton } from '../components/ui/icon-action-button';
import { Pagination, Table, type TableColumn } from '../components/ui/table';
import { PageHelp } from '../components/ui/page-help';
import { Tooltip } from '../components/ui/tooltip';
import { useColumnVisibility } from '../features/auth/use-column-visibility';
import { useMeQuery } from '../features/auth/use-auth';
import { useLowStockItemsQuery, useStockItemsQuery } from '../features/crm/use-stock-items';
import {
  isLowStock,
  sortByStockStatus,
  stockStatusRowClassName,
} from '../features/crm/stock-status';
import { StockStatusLegend } from '../features/crm/stock-status-legend';
import { StockUpdateModal } from './stock-update-modal';
import type { StockItem } from '../lib/api';
import { useDebouncedValue } from '../lib/use-debounced-value';
import { tr } from '../i18n/tr';

export function StockListContent() {
  const [page, setPage] = useState(1);
  const [editingItem, setEditingItem] = useState<StockItem | null>(null);
  const [qInput, setQInput] = useState('');
  const q = useDebouncedValue(qInput.trim());
  const meQuery = useMeQuery();
  const pageSize = meQuery.data?.defaultPageSize ?? 25;
  const stockItemsQuery = useStockItemsQuery({ page, pageSize, q: q || undefined });
  const lowStockQuery = useLowStockItemsQuery();
  const lowStockIds = new Set((lowStockQuery.data ?? []).map((item) => item.id));

  const ALL_COLUMNS: TableColumn<StockItem>[] = [
    {
      key: 'product',
      header: tr.crm.stock.productColumn,
      className: 'font-semibold text-app-text',
      required: true,
      render: (item) => (
        <span className="flex items-center gap-1.5">
          {(lowStockIds.has(item.id) || isLowStock(item.quantity, item.product.minStockLevel)) && (
            <Tooltip content={tr.crm.stock.lowStockTooltip}>
              <AlertTriangle size={14} className="shrink-0 animate-pulse text-red-600" />
            </Tooltip>
          )}
          {item.product.name}
        </span>
      ),
    },
    {
      key: 'quantity',
      header: tr.crm.stock.quantityColumn,
      required: true,
      render: (item) => item.quantity,
    },
    {
      key: 'minStockLevel',
      header: tr.crm.stock.minStockLevelColumn,
      className: 'text-app-muted',
      render: (item) => item.product.minStockLevel ?? '—',
    },
    {
      key: 'actions',
      header: tr.crm.stock.actionsColumn,
      className: 'w-px',
      required: true,
      render: (item) => (
        <IconActionButton
          icon={Pencil}
          tooltip={tr.crm.stock.editTooltip}
          onClick={() => setEditingItem(item)}
        />
      ),
    },
  ];

  const { isColumnVisible, optionalColumns, visibleOptionalKeys, setVisibleOptionalKeys } =
    useColumnVisibility(
      'stock',
      ALL_COLUMNS.map((c) => ({ key: c.key, label: c.header, required: c.required })),
    );
  const columns = ALL_COLUMNS.filter((c) => isColumnVisible(c.key));

  return (
    <>
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-app-text">{tr.crm.stock.title}</h1>
          <PageHelp text={tr.help.stock} />
        </div>
        <p className="mt-1 text-sm text-app-muted">{tr.crm.stock.subtitle}</p>
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
          placeholder={tr.crm.stock.searchPlaceholder}
          className="w-full rounded-lg border border-app-border bg-app-surface py-2.5 pr-3 pl-9 text-sm text-app-text outline-none focus:border-app-primary"
        />
      </div>

      <p className="mt-4 text-sm text-app-muted">
        {(lowStockQuery.data?.length ?? 0) > 0
          ? tr.crm.stock.lowStockSummary(lowStockQuery.data?.length ?? 0)
          : tr.crm.stock.noLowStock}
      </p>

      <div className="mt-4 flex justify-end">
        <ColumnVisibilityPicker
          columns={optionalColumns}
          value={visibleOptionalKeys}
          onChange={setVisibleOptionalKeys}
        />
      </div>

      <StockStatusLegend />

      <Table
        columns={columns}
        data={sortByStockStatus(stockItemsQuery.data?.data ?? [], (item) => ({
          quantity: item.quantity,
          minStockLevel: item.product.minStockLevel,
        }))}
        keyField={(item) => item.id}
        isLoading={stockItemsQuery.isPending}
        loadingMessage={tr.crm.stock.loading}
        emptyMessage={tr.crm.stock.empty}
        rowClassName={(item) => stockStatusRowClassName(item.quantity, item.product.minStockLevel)}
      />

      {stockItemsQuery.data && stockItemsQuery.data.data.length > 0 && (
        <Pagination
          page={stockItemsQuery.data.meta.page}
          totalPages={stockItemsQuery.data.meta.totalPages}
          total={stockItemsQuery.data.meta.total}
          onPrevious={() => setPage((p) => p - 1)}
          onNext={() => setPage((p) => p + 1)}
        />
      )}

      {editingItem && <StockUpdateModal item={editingItem} onClose={() => setEditingItem(null)} />}
    </>
  );
}

export function StockListPage() {
  return (
    <AppShell>
      <StockListContent />
    </AppShell>
  );
}
