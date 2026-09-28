import { ChevronDown, ChevronUp, Search } from 'lucide-react';
import { useState } from 'react';
import { AppShell } from './app-shell';
import { PageHelp } from '../components/ui/page-help';
import { Pagination, Table, type TableColumn } from '../components/ui/table';
import { usePriceHistoryQuery, useProductsQuery } from '../features/crm/use-products';
import { useMeQuery } from '../features/auth/use-auth';
import { useDebouncedValue } from '../lib/use-debounced-value';
import type { ProductPriceMovement, ProductWithStock } from '../lib/api';
import { tr } from '../i18n/tr';

const dateFormatter = new Intl.DateTimeFormat('tr-TR', {
  dateStyle: 'short',
  timeStyle: 'short',
});

function formatPrice(price: number | null, currency: string) {
  if (price == null) return '—';
  return `${price} ${currency}`;
}

function ProductPriceMovements({ productId }: { productId: string }) {
  const historyQuery = usePriceHistoryQuery({ productId }, { enabled: Boolean(productId) });

  const columns: TableColumn<ProductPriceMovement>[] = [
    {
      key: 'user',
      header: tr.crm.products.priceHistory.userColumn,
      className: 'whitespace-nowrap',
      required: true,
      render: (row) => row.userName,
    },
    {
      key: 'previousPrice',
      header: tr.crm.products.priceHistory.previousPriceColumn,
      className: 'whitespace-nowrap text-app-muted',
      render: (row) =>
        row.previousPrice == null
          ? tr.crm.products.priceHistory.firstPriceLabel
          : formatPrice(row.previousPrice, row.previousCurrency ?? row.currency),
    },
    {
      key: 'price',
      header: tr.crm.products.priceHistory.newPriceColumn,
      className: 'whitespace-nowrap font-semibold text-app-text',
      required: true,
      render: (row) => formatPrice(row.price, row.currency),
    },
    {
      key: 'createdAt',
      header: tr.crm.products.priceHistory.dateColumn,
      className: 'whitespace-nowrap text-app-muted',
      render: (row) => dateFormatter.format(new Date(row.createdAt)),
    },
  ];

  return (
    <Table
      columns={columns}
      data={historyQuery.data ?? []}
      keyField={(row) => row.id}
      isLoading={historyQuery.isPending}
      loadingMessage={tr.crm.products.priceHistory.movementsLoading}
      emptyMessage={tr.crm.products.priceHistory.movementsEmpty}
    />
  );
}

export function PriceHistoryContent() {
  const [page, setPage] = useState(1);
  const [qInput, setQInput] = useState('');
  const q = useDebouncedValue(qInput.trim());
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);
  const meQuery = useMeQuery();
  const pageSize = meQuery.data?.defaultPageSize ?? 25;
  const productsQuery = useProductsQuery({ page, pageSize, q: q || undefined });

  const columns: TableColumn<ProductWithStock>[] = [
    {
      key: 'name',
      header: tr.crm.products.priceHistory.nameColumn,
      className: 'font-semibold text-app-text',
      required: true,
      render: (p) => (
        <span className="inline-flex items-center gap-1.5">
          {expandedProductId === p.id ? (
            <ChevronUp size={16} className="shrink-0 text-app-muted" />
          ) : (
            <ChevronDown size={16} className="shrink-0 text-app-muted" />
          )}
          {p.name}
        </span>
      ),
    },
    {
      key: 'productList',
      header: tr.crm.products.priceHistory.productListColumn,
      className: 'text-app-muted',
      render: (p) => p.productList.name,
    },
    {
      key: 'price',
      header: tr.crm.products.priceHistory.priceColumn,
      className: 'whitespace-nowrap text-app-muted',
      required: true,
      render: (p) => formatPrice(p.price != null ? Number(p.price) : null, p.currency),
    },
  ];

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-app-text">
              {tr.crm.products.priceHistory.title}
            </h1>
            <PageHelp text={tr.help.priceHistory} />
          </div>
          <p className="mt-1 text-sm text-app-muted">{tr.crm.products.priceHistory.subtitle}</p>
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
          className="w-full rounded-lg border border-app-border bg-app-surface py-2.5 pr-3 pl-9 text-sm text-app-text outline-none focus:ring-2 focus:ring-app-primary"
        />
      </div>

      <Table
        columns={columns}
        data={productsQuery.data?.data ?? []}
        keyField={(p) => p.id}
        isLoading={productsQuery.isPending}
        loadingMessage={tr.crm.products.priceHistory.loading}
        emptyMessage={tr.crm.products.priceHistory.empty}
        onRowClick={(p) => setExpandedProductId(expandedProductId === p.id ? null : p.id)}
        isRowExpanded={(p) => expandedProductId === p.id}
        renderExpandedRow={(p) => <ProductPriceMovements productId={p.id} />}
      />

      {productsQuery.data && productsQuery.data.data.length > 0 && (
        <Pagination
          page={productsQuery.data.meta.page}
          totalPages={productsQuery.data.meta.totalPages}
          total={productsQuery.data.meta.total}
          onPrevious={() => setPage((p) => p - 1)}
          onNext={() => setPage((p) => p + 1)}
        />
      )}
    </>
  );
}

export function PriceHistoryPage() {
  return (
    <AppShell>
      <PriceHistoryContent />
    </AppShell>
  );
}
