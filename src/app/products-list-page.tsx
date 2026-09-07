import { Pencil, Search, Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from './app-shell';
import { Button } from '../components/ui/button';
import { ConfirmModal } from '../components/ui/confirm-modal';
import { Pagination, Table, type TableColumn } from '../components/ui/table';
import { Tooltip } from '../components/ui/tooltip';
import { useToast } from '../components/ui/toast-context';
import { useDeleteProductMutation, useProductsQuery } from '../features/crm/use-products';
import { ApiError, type Product } from '../lib/api';
import { tr } from '../i18n/tr';

export function ProductsListPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [qInput, setQInput] = useState('');
  const [deletingProduct, setDeletingProduct] = useState<Product | undefined>(undefined);
  const productsQuery = useProductsQuery({ page, q: q || undefined });
  const deleteMutation = useDeleteProductMutation();

  function handleSearchSubmit(event: FormEvent) {
    event.preventDefault();
    setPage(1);
    setQ(qInput.trim());
  }

  function handleSearchReset() {
    setPage(1);
    setQInput('');
    setQ('');
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

  const columns: TableColumn<Product>[] = [
    {
      key: 'name',
      header: tr.crm.products.nameColumn,
      render: (p) => (
        <div className="flex items-center gap-2.5">
          {p.imageUrl ? (
            <img
              src={p.imageUrl}
              alt=""
              className="h-8 w-8 rounded-md border border-app-border object-cover"
            />
          ) : (
            <div className="h-8 w-8 rounded-md border border-dashed border-app-border" />
          )}
          <span className="font-semibold text-app-text">{p.name}</span>
        </div>
      ),
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
      render: (p) => p.unit,
    },
    {
      key: 'category',
      header: tr.crm.products.categoryColumn,
      className: 'text-app-muted',
      render: (p) => p.category ?? '—',
    },
    {
      key: 'maxDiscountPct',
      header: tr.crm.products.maxDiscountColumn,
      className: 'text-app-muted',
      render: (p) => (p.maxDiscountPct ? `%${p.maxDiscountPct}` : '—'),
    },
    {
      key: 'actions',
      header: tr.crm.products.actionsColumn,
      className: 'w-px',
      render: (p) => (
        <div className="flex items-center gap-1">
          <Tooltip content={tr.crm.products.editTooltip}>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                navigate(`/urunler/duzenle/${p.id}`);
              }}
              className="rounded-lg p-2 text-app-muted hover:bg-app-bg hover:text-app-text"
            >
              <Pencil size={16} />
            </button>
          </Tooltip>
          <Tooltip content={tr.crm.products.deleteTooltip}>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setDeletingProduct(p);
              }}
              className="rounded-lg p-2 text-app-muted hover:bg-app-bg hover:text-red-600"
            >
              <Trash2 size={16} />
            </button>
          </Tooltip>
        </div>
      ),
    },
  ];

  return (
    <AppShell>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-app-text">{tr.crm.products.title}</h1>
          <p className="mt-1 text-sm text-app-muted">{tr.crm.products.subtitle}</p>
        </div>
        <Button type="button" onClick={() => navigate('/urunler/yeni')}>
          {tr.crm.products.newButton}
        </Button>
      </div>

      <form onSubmit={handleSearchSubmit} className="mt-6 flex w-full items-center gap-2">
        <div className="relative flex-1">
          <Search
            size={16}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-app-muted"
          />
          <input
            type="search"
            value={qInput}
            onChange={(event) => setQInput(event.target.value)}
            placeholder={tr.crm.products.searchPlaceholder}
            className="w-full rounded-lg border border-app-border bg-app-surface py-2.5 pr-3 pl-9 text-sm text-app-text outline-none focus:ring-2 focus:ring-app-primary"
          />
        </div>
        <Button type="submit" variant="secondary">
          {tr.common.search}
        </Button>
        <Button type="button" variant="secondary" onClick={handleSearchReset}>
          {tr.common.reset}
        </Button>
      </form>

      <Table
        columns={columns}
        data={productsQuery.data?.data ?? []}
        keyField={(product) => product.id}
        onRowClick={(product) => navigate(`/urunler/${product.id}`)}
        isLoading={productsQuery.isPending}
        loadingMessage={tr.crm.products.loading}
        emptyMessage={tr.crm.products.empty}
      />

      {productsQuery.data && productsQuery.data.data.length > 0 && (
        <Pagination
          page={productsQuery.data.meta.page}
          totalPages={productsQuery.data.meta.totalPages}
          onPrevious={() => setPage((p) => p - 1)}
          onNext={() => setPage((p) => p + 1)}
        />
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
    </AppShell>
  );
}
