import { Search } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from './app-shell';
import { Button } from '../components/ui/button';
import { Pagination, Table, type TableColumn } from '../components/ui/table';
import { useProductsQuery } from '../features/crm/use-products';
import type { Product } from '../lib/api';
import { tr } from '../i18n/tr';

const columns: TableColumn<Product>[] = [
  {
    key: 'name',
    header: tr.crm.products.nameColumn,
    render: (p) => <span className="font-semibold text-app-text">{p.name}</span>,
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
    key: 'maxDiscountPct',
    header: tr.crm.products.maxDiscountColumn,
    className: 'text-app-muted',
    render: (p) => (p.maxDiscountPct ? `%${p.maxDiscountPct}` : '—'),
  },
];

export function ProductsListPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [qInput, setQInput] = useState('');
  const productsQuery = useProductsQuery({ page, q: q || undefined });

  function handleSearchSubmit(event: FormEvent) {
    event.preventDefault();
    setPage(1);
    setQ(qInput.trim());
  }

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

      <form onSubmit={handleSearchSubmit} className="mt-6 flex max-w-md items-center gap-2">
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
          {tr.crm.products.title}
        </Button>
      </form>

      <Table
        columns={columns}
        data={productsQuery.data?.data ?? []}
        keyField={(product) => product.id}
        onRowClick={(product) => navigate(`/urunler/${product.id}/duzenle`)}
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
    </AppShell>
  );
}
