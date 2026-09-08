import { AlertTriangle, Pencil, Search } from 'lucide-react';
import { useState, type ChangeEvent, type FormEvent } from 'react';
import { AppShell } from './app-shell';
import { Button } from '../components/ui/button';
import { Pagination, Table, type TableColumn } from '../components/ui/table';
import { PageHelp } from '../components/ui/page-help';
import { Tooltip } from '../components/ui/tooltip';
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

function QuantityEditor({ item, onDone }: { item: StockItem; onDone: () => void }) {
  const toast = useToast();
  const [value, setValue] = useState(item.quantity);
  const mutation = useUpsertStockItemMutation();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    mutation.mutate(
      { productId: item.productId, quantity: Number(value) },
      {
        onSuccess: () => {
          toast.success(tr.crm.stock.saveSuccess);
          onDone();
        },
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
        autoFocus
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [qInput, setQInput] = useState('');
  const stockItemsQuery = useStockItemsQuery({ page, q: q || undefined });
  const lowStockQuery = useLowStockItemsQuery();
  const lowStockIds = new Set((lowStockQuery.data ?? []).map((item) => item.id));

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

  const columns: TableColumn<StockItem>[] = [
    {
      key: 'product',
      header: tr.crm.stock.productColumn,
      className: 'font-semibold text-app-text',
      render: (item) => (
        <span className="flex items-center gap-1.5">
          {(lowStockIds.has(item.id) || isLowStock(item)) && (
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
      render: (item) =>
        editingId === item.id ? (
          <QuantityEditor item={item} onDone={() => setEditingId(null)} />
        ) : (
          item.quantity
        ),
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
      render: (item) => (
        <Tooltip content={tr.crm.stock.editTooltip}>
          <button
            type="button"
            aria-label={tr.crm.stock.editTooltip}
            onClick={() => setEditingId(item.id)}
            className="rounded-lg p-2 text-app-muted hover:bg-app-bg hover:text-app-text"
          >
            <Pencil size={16} />
          </button>
        </Tooltip>
      ),
    },
  ];

  return (
    <AppShell>
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-app-text">{tr.crm.stock.title}</h1>
          <PageHelp text={tr.help.stock} />
        </div>
        <p className="mt-1 text-sm text-app-muted">{tr.crm.stock.subtitle}</p>
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
            placeholder={tr.crm.stock.searchPlaceholder}
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
