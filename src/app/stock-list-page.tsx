import { useState, type ChangeEvent, type FormEvent } from 'react';
import { AppShell } from './app-shell';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Pagination, Table, type TableColumn } from '../components/ui/table';
import { useToast } from '../components/ui/toast-context';
import {
  useLowStockItemsQuery,
  useStockItemsQuery,
  useUpsertStockItemMutation,
} from '../features/crm/use-stock-items';
import { ApiError, type StockItem } from '../lib/api';
import { tr } from '../i18n/tr';

function isLowStock(item: StockItem): boolean {
  return item.product.minStockLevel !== null && Number(item.quantity) <= item.product.minStockLevel;
}

function QuantityEditor({ item }: { item: StockItem }) {
  const toast = useToast();
  const [value, setValue] = useState(item.quantity);
  const mutation = useUpsertStockItemMutation();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    mutation.mutate(
      { productId: item.productId, quantity: Number(value) },
      {
        onSuccess: () => toast.success(tr.crm.stock.saveSuccess),
        onError: (error) => {
          toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
        },
      },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          setValue(event.target.value.replace(/[^0-9.]/g, ''))
        }
        className="w-24 rounded-lg border border-app-border bg-app-surface px-3 py-1.5 text-sm text-app-text outline-none focus:ring-2 focus:ring-app-primary"
      />
      <Button type="submit" variant="secondary" disabled={mutation.isPending}>
        {mutation.isPending ? tr.crm.stock.saving : tr.crm.stock.save}
      </Button>
    </form>
  );
}

export function StockListPage() {
  const [page, setPage] = useState(1);
  const stockItemsQuery = useStockItemsQuery({ page });
  const lowStockQuery = useLowStockItemsQuery();
  const lowStockIds = new Set((lowStockQuery.data ?? []).map((item) => item.id));

  const columns: TableColumn<StockItem>[] = [
    {
      key: 'product',
      header: tr.crm.stock.productColumn,
      className: 'font-semibold text-app-text',
      render: (item) => (
        <span className="flex items-center gap-2">
          {item.product.name}
          {(lowStockIds.has(item.id) || isLowStock(item)) && (
            <Badge variant="danger">{tr.crm.stock.lowStockBadge}</Badge>
          )}
        </span>
      ),
    },
    {
      key: 'quantity',
      header: tr.crm.stock.quantityColumn,
      render: (item) => <QuantityEditor item={item} />,
    },
    {
      key: 'minStockLevel',
      header: tr.crm.stock.minStockLevelColumn,
      className: 'text-app-muted',
      render: (item) => item.product.minStockLevel ?? '—',
    },
  ];

  return (
    <AppShell>
      <div>
        <h1 className="text-xl font-bold text-app-text">{tr.crm.stock.title}</h1>
        <p className="mt-1 text-sm text-app-muted">{tr.crm.stock.subtitle}</p>
      </div>

      <p className="mt-4 text-sm text-app-muted">
        {(lowStockQuery.data?.length ?? 0) > 0
          ? tr.crm.stock.lowStockSummary(lowStockQuery.data?.length ?? 0)
          : tr.crm.stock.noLowStock}
      </p>

      <Table
        columns={columns}
        data={stockItemsQuery.data?.data ?? []}
        keyField={(item) => item.id}
        isLoading={stockItemsQuery.isPending}
        loadingMessage={tr.crm.stock.loading}
        emptyMessage={tr.crm.stock.empty}
      />

      {stockItemsQuery.data && stockItemsQuery.data.data.length > 0 && (
        <Pagination
          page={stockItemsQuery.data.meta.page}
          totalPages={stockItemsQuery.data.meta.totalPages}
          onPrevious={() => setPage((p) => p - 1)}
          onNext={() => setPage((p) => p + 1)}
        />
      )}
    </AppShell>
  );
}
