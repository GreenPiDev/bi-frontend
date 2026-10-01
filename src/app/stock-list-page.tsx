import {
  AlertTriangle,
  ArrowLeftRight,
  ChevronDown,
  ChevronUp,
  ListFilter,
  Minus,
  Plus,
  Search,
} from 'lucide-react';
import { useState } from 'react';
import { AppShell } from './app-shell';
import { Button } from '../components/ui/button';
import { CircleIconButton } from '../components/ui/circle-icon-button';
import { ColumnVisibilityPicker } from '../components/ui/column-visibility-picker';
import { Drawer } from '../components/ui/drawer';
import { IconActionButton } from '../components/ui/icon-action-button';
import { Pagination, Table, type TableColumn, type TableSort } from '../components/ui/table';
import { PageHelp } from '../components/ui/page-help';
import { Select } from '../components/ui/select';
import { Tooltip } from '../components/ui/tooltip';
import { useColumnVisibility } from '../features/auth/use-column-visibility';
import { useMeQuery } from '../features/auth/use-auth';
import { useBrandOptionsQuery } from '../features/crm/use-brand-options';
import { useProductCategoryOptionsQuery } from '../features/crm/use-product-categories';
import { useProductListsQuery } from '../features/crm/use-product-lists';
import { useLowStockItemsQuery, useStockItemsQuery } from '../features/crm/use-stock-items';
import { isLowStock, stockStatusRowClassName } from '../features/crm/stock-status';
import { StockStatusLegend } from '../features/crm/stock-status-legend';
import { StockAdjustModal } from './stock-adjust-modal';
import { StockTransferModal } from './stock-transfer-modal';
import type { StockItem, StockStatusFilter } from '../lib/api';
import { useDebouncedValue } from '../lib/use-debounced-value';
import { tr } from '../i18n/tr';

function StockWarehouseBreakdown({ item }: { item: StockItem }) {
  const [transferringFromWarehouseId, setTransferringFromWarehouseId] = useState<string | null>(
    null,
  );

  if (item.warehouses.length === 0) {
    return <p className="text-sm text-app-muted">{tr.crm.stock.breakdown.empty}</p>;
  }
  const columns: TableColumn<StockItem['warehouses'][number]>[] = [
    {
      key: 'warehouse',
      header: tr.crm.stock.breakdown.warehouseColumn,
      required: true,
      render: (w) => <span className="font-semibold text-app-text">{w.warehouseName}</span>,
    },
    {
      key: 'quantity',
      header: tr.crm.stock.breakdown.quantityColumn,
      required: true,
      render: (w) => w.quantity,
    },
    {
      key: 'actions',
      header: tr.crm.stock.breakdown.actionsColumn,
      className: 'w-px',
      required: true,
      render: (w) => (
        <IconActionButton
          icon={ArrowLeftRight}
          tooltip={tr.crm.stock.breakdown.transferTooltip}
          onClick={() => setTransferringFromWarehouseId(w.warehouseId)}
        />
      ),
    },
  ];
  return (
    <>
      <Table
        columns={columns}
        data={item.warehouses}
        keyField={(w) => w.warehouseId}
        emptyMessage={tr.crm.stock.breakdown.empty}
      />
      {transferringFromWarehouseId && (
        <StockTransferModal
          item={item}
          fromWarehouseId={transferringFromWarehouseId}
          onClose={() => setTransferringFromWarehouseId(null)}
        />
      )}
    </>
  );
}

export function StockListContent() {
  const [page, setPage] = useState(1);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [adjustingItem, setAdjustingItem] = useState<{
    item: StockItem;
    mode: 'increase' | 'decrease';
  } | null>(null);
  const [qInput, setQInput] = useState('');
  const q = useDebouncedValue(qInput.trim());
  const [filterListId, setFilterListId] = useState('');
  const [filterBrand, setFilterBrand] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStockStatus, setFilterStockStatus] = useState<StockStatusFilter | ''>('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Urun kolonu icin 3 durumlu siralama: asc -> desc -> null (varsayilan renk/durum
  // bazli sort'a don). Server-side yapiliyor (kisiler sayfasiyla ayni `sort` deseni) -
  // aksi halde sadece o anki sayfanin satirlari siralanir, tum sonuc kumesi degil
  // (bkz. kullanici bulgusu).
  const [sort, setSort] = useState<TableSort | null>(null);
  const meQuery = useMeQuery();
  const pageSize = meQuery.data?.defaultPageSize ?? 25;
  const stockItemsQuery = useStockItemsQuery({
    page,
    pageSize,
    q: q || undefined,
    productListId: filterListId || undefined,
    brand: filterBrand || undefined,
    category: filterCategory || undefined,
    stockStatus: filterStockStatus || undefined,
    sort: sort ? `${sort.key}:${sort.direction}` : undefined,
  });
  const lowStockQuery = useLowStockItemsQuery();
  const productListsQuery = useProductListsQuery();
  const brandOptionsQuery = useBrandOptionsQuery();
  const categoryOptionsQuery = useProductCategoryOptionsQuery();
  const lowStockIds = new Set((lowStockQuery.data ?? []).map((item) => item.id));
  const hasActiveFilter =
    Boolean(filterListId) ||
    Boolean(filterBrand) ||
    Boolean(filterCategory) ||
    Boolean(filterStockStatus);

  function resetFilters() {
    setPage(1);
    setFilterListId('');
    setFilterBrand('');
    setFilterCategory('');
    setFilterStockStatus('');
  }

  const ALL_COLUMNS: TableColumn<StockItem>[] = [
    {
      key: 'product',
      header: tr.crm.stock.productColumn,
      className: 'font-semibold text-app-text',
      required: true,
      sortKey: 'name',
      render: (item) => (
        <span className="flex items-center gap-1.5">
          {expandedItemId === item.id ? (
            <ChevronUp size={16} className="shrink-0 text-app-muted" />
          ) : (
            <ChevronDown size={16} className="shrink-0 text-app-muted" />
          )}
          {(lowStockIds.has(item.id) || isLowStock(item.quantity, item.product.minStockLevel)) && (
            <Tooltip content={tr.crm.stock.lowStockTooltip}>
              <AlertTriangle size={18} strokeWidth={2.5} className="shrink-0 text-red-600" />
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
      key: 'avgCost',
      header: tr.crm.stock.avgCostColumn,
      className: 'text-app-muted',
      render: (item) => item.product.avgCost ?? '—',
    },
    {
      key: 'actions',
      header: tr.crm.stock.actionsColumn,
      className: 'w-px',
      required: true,
      render: (item) => (
        <div className="flex items-center gap-1">
          <IconActionButton
            icon={Plus}
            tooltip={tr.crm.stock.increaseTooltip}
            className="rounded-full border border-app-border hover:text-app-success"
            onClick={() => setAdjustingItem({ item, mode: 'increase' })}
          />
          <IconActionButton
            icon={Minus}
            tooltip={tr.crm.stock.decreaseTooltip}
            className="rounded-full border border-app-border hover:text-app-danger"
            onClick={() => setAdjustingItem({ item, mode: 'decrease' })}
          />
        </div>
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
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-app-text">{tr.crm.stock.title}</h1>
            <PageHelp text={tr.help.stock} />
          </div>
          <p className="mt-1 text-sm text-app-muted">{tr.crm.stock.subtitle}</p>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <CircleIconButton
            icon={ListFilter}
            tooltip={tr.crm.stock.filterButton}
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
        data={stockItemsQuery.data?.data ?? []}
        keyField={(item) => item.id}
        sort={sort}
        onSortChange={setSort}
        isLoading={stockItemsQuery.isPending}
        loadingMessage={tr.crm.stock.loading}
        emptyMessage={tr.crm.stock.empty}
        rowClassName={(item) => stockStatusRowClassName(item.quantity, item.product.minStockLevel)}
        onRowClick={(item) => setExpandedItemId(expandedItemId === item.id ? null : item.id)}
        isRowExpanded={(item) => expandedItemId === item.id}
        renderExpandedRow={(item) => <StockWarehouseBreakdown item={item} />}
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

      {drawerOpen && (
        <Drawer title={tr.crm.stock.filterDrawer.title} onClose={() => setDrawerOpen(false)}>
          <div className="flex flex-col gap-4">
            <Select
              label={tr.crm.stock.filterListLabel}
              placeholder={tr.crm.stock.filterListPlaceholder}
              clearable
              value={filterListId}
              onChange={(event) => {
                setPage(1);
                setFilterListId(event.target.value);
              }}
              onClear={() => {
                setPage(1);
                setFilterListId('');
              }}
              options={(productListsQuery.data?.data ?? []).map((productList) => ({
                value: productList.id,
                label: productList.name,
              }))}
            />
            <Select
              label={tr.crm.stock.filterDrawer.brandLabel}
              placeholder={tr.crm.stock.filterDrawer.brandPlaceholder}
              clearable
              value={filterBrand}
              onChange={(event) => {
                setPage(1);
                setFilterBrand(event.target.value);
              }}
              onClear={() => {
                setPage(1);
                setFilterBrand('');
              }}
              options={(brandOptionsQuery.data ?? []).map((option) => ({
                value: option.label,
                label: option.label,
              }))}
            />
            <Select
              label={tr.crm.stock.filterDrawer.categoryLabel}
              placeholder={tr.crm.stock.filterDrawer.categoryPlaceholder}
              clearable
              value={filterCategory}
              onChange={(event) => {
                setPage(1);
                setFilterCategory(event.target.value);
              }}
              onClear={() => {
                setPage(1);
                setFilterCategory('');
              }}
              options={(categoryOptionsQuery.data ?? []).map((option) => ({
                value: option.label,
                label: option.label,
              }))}
            />
            <Select
              label={tr.crm.stock.filterDrawer.stockStatusLabel}
              placeholder={tr.crm.stock.filterDrawer.stockStatusPlaceholder}
              clearable
              value={filterStockStatus}
              onChange={(event) => {
                setPage(1);
                setFilterStockStatus(event.target.value as StockStatusFilter);
              }}
              onClear={() => {
                setPage(1);
                setFilterStockStatus('');
              }}
              options={[
                { value: 'low', label: tr.crm.stock.filterDrawer.stockStatusOptions.low },
                { value: 'equal', label: tr.crm.stock.filterDrawer.stockStatusOptions.equal },
                { value: 'ok', label: tr.crm.stock.filterDrawer.stockStatusOptions.ok },
                {
                  value: 'unknown',
                  label: tr.crm.stock.filterDrawer.stockStatusOptions.unknown,
                },
              ]}
            />
            <Button type="button" variant="secondary" onClick={resetFilters}>
              {tr.crm.stock.filterDrawer.reset}
            </Button>
          </div>
        </Drawer>
      )}

      {adjustingItem && (
        <StockAdjustModal
          item={adjustingItem.item}
          mode={adjustingItem.mode}
          onClose={() => setAdjustingItem(null)}
        />
      )}
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
