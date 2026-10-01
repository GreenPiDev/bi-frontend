import { AlertTriangle, ListFilter, Pencil, Search, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AppShell } from './app-shell';
import { Button } from '../components/ui/button';
import { CircleIconButton } from '../components/ui/circle-icon-button';
import { ColumnVisibilityPicker } from '../components/ui/column-visibility-picker';
import { ConfirmModal } from '../components/ui/confirm-modal';
import { Drawer } from '../components/ui/drawer';
import { Badge } from '../components/ui/badge';
import { PageHelp } from '../components/ui/page-help';
import { Select } from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import { Pagination, Table, type TableColumn } from '../components/ui/table';
import { TextField } from '../components/ui/text-field';
import { Tooltip } from '../components/ui/tooltip';
import { useToast } from '../components/ui/toast-context';
import { IconActionButton } from '../components/ui/icon-action-button';
import { useColumnVisibility } from '../features/auth/use-column-visibility';
import { useMeQuery } from '../features/auth/use-auth';
import { useBrandOptionsQuery } from '../features/crm/use-brand-options';
import { ProductListInlineSelect } from '../features/crm/product-list-inline-select';
import { ProductUnitSelect } from '../features/crm/product-unit-select';
import { useProductCategoryOptionsQuery } from '../features/crm/use-product-categories';
import { useProductListsQuery } from '../features/crm/use-product-lists';
import {
  useBulkDeleteProductsMutation,
  useBulkMoveProductsMutation,
  useDeleteProductMutation,
  useProductAttributeKeysQuery,
  useProductsQuery,
} from '../features/crm/use-products';
import { isLowStock, stockStatusRowClassName } from '../features/crm/stock-status';
import { StockStatusLegend } from '../features/crm/stock-status-legend';
import { ApiError, type ProductWithStock } from '../lib/api';
import { useDebouncedValue } from '../lib/use-debounced-value';
import { tr } from '../i18n/tr';

export function ProductsListContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const backState = { from: `${location.pathname}${location.search}` };
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [qInput, setQInput] = useState('');
  const q = useDebouncedValue(qInput.trim());
  const [filterListId, setFilterListId] = useState('');
  const [filterBrand, setFilterBrand] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [attrFilters, setAttrFilters] = useState<Record<string, string>>({});
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState<ProductWithStock | undefined>(undefined);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [moveTargetListId, setMoveTargetListId] = useState('');
  const [showDeleted, setShowDeleted] = useState(false);
  const meQuery = useMeQuery();
  const pageSize = meQuery.data?.defaultPageSize ?? 25;
  const activeAttrFilters = Object.fromEntries(
    Object.entries(attrFilters).filter(([, value]) => value.trim() !== ''),
  );
  const productsQuery = useProductsQuery({
    page,
    pageSize,
    q: q || undefined,
    productListId: filterListId || undefined,
    brand: filterBrand || undefined,
    category: filterCategory || undefined,
    attr: Object.keys(activeAttrFilters).length > 0 ? activeAttrFilters : undefined,
    includeDeleted: showDeleted,
  });
  const productListsQuery = useProductListsQuery();
  const brandOptionsQuery = useBrandOptionsQuery();
  const categoryOptionsQuery = useProductCategoryOptionsQuery();
  const attributeKeysQuery = useProductAttributeKeysQuery();
  const deleteMutation = useDeleteProductMutation();
  const bulkMoveMutation = useBulkMoveProductsMutation();
  const bulkDeleteMutation = useBulkDeleteProductsMutation();
  const hasActiveFilter =
    Boolean(filterListId) ||
    Boolean(filterBrand) ||
    Boolean(filterCategory) ||
    Object.keys(activeAttrFilters).length > 0;

  function resetFilters() {
    setPage(1);
    setFilterListId('');
    setFilterBrand('');
    setFilterCategory('');
    setAttrFilters({});
  }

  function setAttrFilter(key: string, value: string) {
    setPage(1);
    setAttrFilters((prev) => ({ ...prev, [key]: value }));
  }

  function handleConfirmDelete() {
    if (!deletingProduct) return;
    deleteMutation.mutate(deletingProduct.id, {
      onSuccess: () => {
        toast.success(tr.crm.products.deleteSuccess);
        setDeletingProduct(undefined);
      },
      onError: (error) => {
        toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
      },
    });
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function handleMoveSelected() {
    if (selectedIds.size === 0 || !moveTargetListId) return;
    bulkMoveMutation.mutate(
      { productIds: [...selectedIds], targetProductListId: moveTargetListId },
      {
        onSuccess: () => {
          toast.success(tr.crm.products.moveSuccess);
          setSelectedIds(new Set());
          setMoveTargetListId('');
        },
        onError: (error) => {
          toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
        },
      },
    );
  }

  function handleBulkDelete() {
    if (selectedIds.size === 0) return;
    bulkDeleteMutation.mutate([...selectedIds], {
      onSuccess: () => {
        toast.success(tr.crm.products.bulkDeleteSuccess);
        setSelectedIds(new Set());
        setBulkDeleteConfirmOpen(false);
      },
      onError: (error) => {
        toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
      },
    });
  }

  // İçe aktarma sırasında "özel alan olarak sakla" seçilen kolonlar (Faz B) - farklı ürün
  // listelerinde (markalarda) farklı anahtarlar olabilir. Kolon seçenekleri, sadece o anki
  // sayfada yüklenen ürünler değil tüm katalogdaki anahtarlar (attributeKeysQuery, filtre
  // çekmecesiyle aynı tenant-geneli uç) üzerinden kurulur - aksi halde başka sayfadaki bir
  // üründe olan özel alan, kullanıcı o sayfaya gelene kadar gösterilecek kolonlar listesinde
  // hiç görünmezdi. Bir üründe o anahtar yoksa hücre boş kalır.
  const attributeKeys = [...(attributeKeysQuery.data ?? [])].sort();
  const attributeColumns: TableColumn<ProductWithStock>[] = attributeKeys.map((key) => ({
    key: `attr:${key}`,
    header: key,
    className: 'text-app-muted',
    render: (p) => p.attributes?.[key] ?? '—',
  }));

  const ALL_COLUMNS: TableColumn<ProductWithStock>[] = [
    {
      key: 'select',
      header: tr.crm.products.selectColumn,
      className: 'w-px',
      required: true,
      render: (p) => (
        <input
          type="checkbox"
          checked={selectedIds.has(p.id)}
          disabled={Boolean(p.deletedAt)}
          onChange={() => toggleSelected(p.id)}
          onClick={(event) => event.stopPropagation()}
          className="h-4 w-4 rounded border-app-border"
        />
      ),
    },
    {
      key: 'name',
      header: tr.crm.products.nameColumn,
      required: true,
      render: (p) => (
        <span className="flex items-center gap-1.5">
          {isLowStock(p.stockQuantity, p.minStockLevel) && (
            <Tooltip content={tr.crm.stock.lowStockTooltip}>
              <AlertTriangle size={18} strokeWidth={2.5} className="shrink-0 text-red-600" />
            </Tooltip>
          )}
          <span className="font-semibold text-app-text">{p.name}</span>
          {p.deletedAt && <Badge variant="danger">{tr.crm.products.deletedBadge}</Badge>}
        </span>
      ),
    },
    {
      key: 'productList',
      header: tr.crm.products.productListColumn,
      className: 'text-app-muted',
      render: (p) => <ProductListInlineSelect product={p} />,
    },
    {
      key: 'sku',
      header: tr.crm.products.skuColumn,
      className: 'text-app-muted',
      render: (p) => p.sku ?? '—',
    },
    {
      key: 'unit',
      header: tr.crm.products.unitColumn,
      className: 'text-app-muted',
      render: (p) => <ProductUnitSelect product={p} />,
    },
    {
      key: 'category',
      header: tr.crm.products.categoryColumn,
      className: 'text-app-muted',
      render: (p) => p.category ?? '—',
    },
    {
      key: 'brand',
      header: tr.crm.products.brandColumn,
      className: 'text-app-muted',
      render: (p) => p.brand ?? '—',
    },
    {
      key: 'maxDiscountPct',
      header: tr.crm.products.maxDiscountColumn,
      className: 'text-app-muted',
      render: (p) => (p.maxDiscountPct ? `%${p.maxDiscountPct}` : '—'),
    },
    {
      key: 'price',
      header: tr.crm.products.priceColumn,
      className: 'text-app-muted',
      render: (p) => (p.price != null ? p.price : '—'),
    },
    {
      key: 'currency',
      header: tr.crm.products.currencyColumn,
      className: 'text-app-muted',
      render: (p) => p.currency ?? '—',
    },
    {
      key: 'avgCost',
      header: tr.crm.products.avgCostColumn,
      className: 'text-app-muted',
      render: (p) => (p.avgCost != null ? p.avgCost : '—'),
    },
    {
      key: 'stockQuantity',
      header: tr.crm.products.stockQuantityColumn,
      required: true,
      render: (p) => p.stockQuantity,
    },
    {
      key: 'minStockLevel',
      header: tr.crm.products.minStockLevelColumn,
      className: 'text-app-muted',
      render: (p) => (p.minStockLevel != null ? p.minStockLevel : '—'),
    },
    {
      key: 'description',
      header: tr.crm.products.descriptionColumn,
      className: 'text-app-muted',
      render: (p) => p.description ?? '—',
    },
    ...attributeColumns,
    {
      key: 'actions',
      header: tr.crm.products.actionsColumn,
      className: 'w-px',
      required: true,
      render: (p) =>
        p.deletedAt ? (
          <span className="text-app-muted">—</span>
        ) : (
          <div className="flex items-center gap-1">
            <IconActionButton
              icon={Pencil}
              tooltip={tr.crm.products.editTooltip}
              onClick={() => navigate(`/urunler/duzenle/${p.id}`, { state: backState })}
            />
            <IconActionButton
              icon={Trash2}
              tooltip={tr.crm.products.deleteTooltip}
              variant="danger"
              onClick={() => setDeletingProduct(p)}
            />
          </div>
        ),
    },
  ];

  const { isColumnVisible, optionalColumns, visibleOptionalKeys, setVisibleOptionalKeys } =
    useColumnVisibility(
      'products',
      ALL_COLUMNS.map((c) => ({ key: c.key, label: c.header, required: c.required })),
    );
  const columns = ALL_COLUMNS.filter((c) => isColumnVisible(c.key));

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-app-text">{tr.crm.products.title}</h1>
            <PageHelp text={tr.help.products} />
          </div>
          <p className="mt-1 text-sm text-app-muted">{tr.crm.products.subtitle}</p>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <CircleIconButton
            icon={ListFilter}
            tooltip={tr.crm.products.filterButton}
            onClick={() => setDrawerOpen(true)}
          >
            {hasActiveFilter && (
              <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 ring-2 ring-app-surface" />
            )}
          </CircleIconButton>
          <Button type="button" onClick={() => navigate('/urunler/yeni', { state: backState })}>
            {tr.crm.products.newButton}
          </Button>
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
          placeholder={tr.crm.products.searchPlaceholder}
          className="w-full rounded-lg border border-app-border bg-app-surface py-2.5 pr-3 pl-9 text-sm text-app-text outline-none focus:border-app-primary"
        />
      </div>

      <div className="mt-4 flex flex-wrap items-end justify-end gap-3">
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-transparent select-none" aria-hidden="true">
            {tr.crm.products.showDeletedLabel}
          </span>
          <div className="flex h-[42px] items-center gap-2">
            <Switch
              checked={showDeleted}
              onChange={(checked) => {
                setPage(1);
                setShowDeleted(checked);
              }}
              label={tr.crm.products.showDeletedLabel}
            />
            <span className="text-sm font-semibold text-app-text">
              {tr.crm.products.showDeletedLabel}
            </span>
          </div>
        </div>
        <ColumnVisibilityPicker
          columns={optionalColumns}
          value={visibleOptionalKeys}
          onChange={setVisibleOptionalKeys}
        />
      </div>

      {selectedIds.size > 0 && (
        <div className="mt-4 flex flex-wrap items-end gap-3 rounded-lg border border-app-border bg-app-surface p-3">
          <span className="text-sm font-semibold text-app-text">
            {tr.crm.products.selectedCount(selectedIds.size)}
          </span>
          <div className="min-w-[220px]">
            <Select
              label={tr.crm.products.moveToListLabel}
              placeholder={tr.crm.products.movePlaceholder}
              value={moveTargetListId}
              onChange={(event) => setMoveTargetListId(event.target.value)}
              options={(productListsQuery.data?.data ?? []).map((productList) => ({
                value: productList.id,
                label: productList.name,
              }))}
            />
          </div>
          <Button
            type="button"
            onClick={handleMoveSelected}
            disabled={!moveTargetListId || bulkMoveMutation.isPending}
          >
            {bulkMoveMutation.isPending ? tr.crm.products.moving : tr.crm.products.moveButton}
          </Button>
          <Button type="button" variant="secondary" onClick={() => setSelectedIds(new Set())}>
            {tr.crm.products.clearSelection}
          </Button>
          <Button type="button" variant="danger" onClick={() => setBulkDeleteConfirmOpen(true)}>
            {tr.crm.products.bulkDeleteButton}
          </Button>
        </div>
      )}

      <StockStatusLegend />

      <Table
        columns={columns}
        data={productsQuery.data?.data ?? []}
        keyField={(product) => product.id}
        onRowClick={(product) => navigate(`/urunler/${product.id}`, { state: backState })}
        getRowHref={(product) => `/urunler/${product.id}`}
        isLoading={productsQuery.isPending}
        loadingMessage={tr.crm.products.loading}
        emptyMessage={tr.crm.products.empty}
        rowClassName={(product) =>
          product.deletedAt
            ? 'opacity-50 bg-app-bg-muted'
            : stockStatusRowClassName(product.stockQuantity, product.minStockLevel)
        }
      />

      {productsQuery.data && productsQuery.data.data.length > 0 && (
        <Pagination
          page={productsQuery.data.meta.page}
          totalPages={productsQuery.data.meta.totalPages}
          total={productsQuery.data.meta.total}
          onPageChange={setPage}
          onPrevious={() => setPage((p) => p - 1)}
          onNext={() => setPage((p) => p + 1)}
        />
      )}

      {drawerOpen && (
        <Drawer title={tr.crm.products.filterDrawer.title} onClose={() => setDrawerOpen(false)}>
          <div className="flex flex-col gap-4">
            <Select
              label={tr.crm.products.filterListLabel}
              placeholder={tr.crm.products.filterListPlaceholder}
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
              label={tr.crm.products.filterDrawer.brandLabel}
              placeholder={tr.crm.products.filterDrawer.brandPlaceholder}
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
              label={tr.crm.products.filterDrawer.categoryLabel}
              placeholder={tr.crm.products.filterDrawer.categoryPlaceholder}
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
            {(attributeKeysQuery.data ?? []).map((key) => (
              <TextField
                key={key}
                label={key}
                placeholder={tr.crm.products.filterDrawer.attrPlaceholder(key)}
                value={attrFilters[key] ?? ''}
                onChange={(event) => setAttrFilter(key, event.target.value)}
                clearable
                onClear={() => setAttrFilter(key, '')}
              />
            ))}
            <Button type="button" variant="secondary" onClick={resetFilters}>
              {tr.crm.products.filterDrawer.reset}
            </Button>
          </div>
        </Drawer>
      )}

      {deletingProduct && (
        <ConfirmModal
          title={tr.crm.products.deleteConfirmTitle}
          message={tr.crm.products.deleteConfirm}
          confirmLabel={tr.crm.products.deleteTooltip}
          isPending={deleteMutation.isPending}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeletingProduct(undefined)}
        />
      )}

      {bulkDeleteConfirmOpen && (
        <ConfirmModal
          title={tr.crm.products.bulkDeleteConfirmTitle}
          message={tr.crm.products.bulkDeleteConfirm(selectedIds.size)}
          confirmLabel={tr.crm.products.bulkDeleteButton}
          isPending={bulkDeleteMutation.isPending}
          onConfirm={handleBulkDelete}
          onCancel={() => setBulkDeleteConfirmOpen(false)}
        />
      )}
    </>
  );
}

export function ProductsListPage() {
  return (
    <AppShell>
      <ProductsListContent />
    </AppShell>
  );
}
