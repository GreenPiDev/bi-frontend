import { AppShell } from './app-shell';
import { Table, type TableColumn } from '../components/ui/table';
import { useStockHoldingCostLogQuery } from '../features/crm/use-stock-items';
import type { StockHoldingCostLog } from '../lib/api';
import { tr } from '../i18n/tr';

const dateFormatter = new Intl.DateTimeFormat('tr-TR', { dateStyle: 'short' });
const numberFormatter = new Intl.NumberFormat('tr-TR');
const currencyFormatter = new Intl.NumberFormat('tr-TR', {
  style: 'currency',
  currency: 'TRY',
});

export function StockHoldingCostLogContent() {
  const logQuery = useStockHoldingCostLogQuery();

  const columns: TableColumn<StockHoldingCostLog>[] = [
    {
      key: 'createdAt',
      header: tr.crm.stock.holdingCostLog.dateColumn,
      className: 'whitespace-nowrap text-app-text',
      required: true,
      render: (row) => dateFormatter.format(new Date(row.createdAt)),
    },
    {
      key: 'monthlyRatePct',
      header: tr.crm.stock.holdingCostLog.rateColumn,
      className: 'whitespace-nowrap text-app-muted',
      render: (row) => `%${numberFormatter.format(row.monthlyRatePct)}`,
    },
    {
      key: 'productCount',
      header: tr.crm.stock.holdingCostLog.productCountColumn,
      className: 'whitespace-nowrap text-app-muted',
      required: true,
      render: (row) => numberFormatter.format(row.productCount),
    },
    {
      key: 'totalCostDelta',
      header: tr.crm.stock.holdingCostLog.totalCostDeltaColumn,
      className: 'whitespace-nowrap font-semibold text-app-text',
      required: true,
      render: (row) => currencyFormatter.format(row.totalCostDelta),
    },
  ];

  return (
    <>
      <p className="text-sm text-app-muted">{tr.crm.stock.holdingCostLog.subtitle}</p>
      <div className="mt-4">
        <Table
          columns={columns}
          data={logQuery.data ?? []}
          keyField={(row) => row.id}
          isLoading={logQuery.isPending}
          loadingMessage={tr.crm.stock.holdingCostLog.loading}
          emptyMessage={tr.crm.stock.holdingCostLog.empty}
        />
      </div>
    </>
  );
}

export function StockHoldingCostLogPage() {
  return (
    <AppShell>
      <StockHoldingCostLogContent />
    </AppShell>
  );
}
