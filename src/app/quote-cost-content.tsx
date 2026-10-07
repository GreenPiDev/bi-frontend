import { Table, type TableColumn } from '../components/ui/table';
import { Tooltip } from '../components/ui/tooltip';
import type { Quote } from '../lib/api';
import {
  computeQuoteCostBreakdown,
  formatCurrencyAmountPrecise,
  type QuoteCostRow,
} from '../lib/quote-totals';
import { tr } from '../i18n/tr';

function KpiCard({ label, value, tooltip }: { label: string; value: string; tooltip: string }) {
  return (
    <Tooltip content={tooltip} className="w-full">
      <div className="flex w-full flex-col gap-1 border border-app-border bg-app-surface p-6">
        <span className="text-2xl font-bold text-app-text">{value}</span>
        <span className="text-sm font-medium text-app-muted">{label}</span>
      </div>
    </Tooltip>
  );
}

const TOTAL_ROW_ID = '__total__';

type QuoteCostTableRow = QuoteCostRow & { isTotalRow?: boolean };

export function QuoteCostContent({ quote }: { quote: Quote }) {
  const breakdown = computeQuoteCostBreakdown(quote);
  const currency = quote.quoteCurrency;

  const totalRow: QuoteCostTableRow = {
    itemId: TOTAL_ROW_ID,
    isTotalRow: true,
    productName: tr.crm.quotes.costTab.totalRowLabel,
    quantity: breakdown.totalQuantity,
    currency,
    unitPrice: 0,
    unitCost: breakdown.avgUnitCost,
    grossAmount: breakdown.totalGrossAmount,
    lineTotal: breakdown.grandTotal,
    discountPct: 0,
    discountAmount: breakdown.totalDiscount,
    netSalesAmount: breakdown.totalNetSalesAmount,
    vatPct: 0,
    vatAmount: breakdown.totalVat,
    cost: breakdown.totalCost,
    profit: breakdown.netProfit,
  };

  const tableData: QuoteCostTableRow[] =
    breakdown.rows.length > 0 ? [...breakdown.rows, totalRow] : breakdown.rows;

  const columns: TableColumn<QuoteCostTableRow>[] = [
    {
      key: 'product',
      header: tr.crm.quotes.costTab.productColumn,
      className: 'break-words',
      render: (row) => row.productName,
    },
    {
      key: 'quantity',
      header: tr.crm.quotes.costTab.quantityColumn,
      className: 'w-20 whitespace-nowrap text-right text-app-muted',
      render: (row) => row.quantity,
    },
    {
      key: 'unitCost',
      header: tr.crm.quotes.costTab.unitCostColumn,
      className: 'w-28 whitespace-nowrap text-right text-app-muted',
      render: (row) => formatCurrencyAmountPrecise(row.unitCost, currency),
    },
    {
      key: 'cost',
      header: tr.crm.quotes.costTab.costColumn,
      className: 'w-28 whitespace-nowrap text-right text-app-muted',
      render: (row) => formatCurrencyAmountPrecise(row.cost, currency),
    },
    {
      key: 'unitPrice',
      header: tr.crm.quotes.costTab.unitPriceColumn,
      className: 'w-28 whitespace-nowrap text-right text-app-muted',
      render: (row) =>
        row.isTotalRow ? '—' : formatCurrencyAmountPrecise(row.unitPrice, currency),
    },
    {
      key: 'grossAmount',
      header: tr.crm.quotes.costTab.grossAmountColumn,
      className: 'w-28 whitespace-nowrap text-right text-app-muted',
      render: (row) => formatCurrencyAmountPrecise(row.grossAmount, currency),
    },
    {
      key: 'discountAmount',
      header: tr.crm.quotes.costTab.discountAmountColumn,
      className: 'w-32 whitespace-nowrap text-right',
      render: (row) => (
        <span className="text-app-danger">
          {row.isTotalRow
            ? `-${formatCurrencyAmountPrecise(row.discountAmount, currency)}`
            : `-${formatCurrencyAmountPrecise(row.discountAmount, currency)} (%${row.discountPct})`}
        </span>
      ),
    },
    {
      key: 'netSalesAmount',
      header: tr.crm.quotes.costTab.netSalesAmountColumn,
      className: 'w-28 whitespace-nowrap text-right text-app-muted',
      render: (row) => formatCurrencyAmountPrecise(row.netSalesAmount, currency),
    },
    {
      key: 'vatAmount',
      header: tr.crm.quotes.costTab.vatAmountColumn,
      className: 'w-32 whitespace-nowrap text-right',
      render: (row) => (
        <span className="text-app-success">
          {row.isTotalRow
            ? `+${formatCurrencyAmountPrecise(row.vatAmount, currency)}`
            : `+${formatCurrencyAmountPrecise(row.vatAmount, currency)} (%${row.vatPct})`}
        </span>
      ),
    },
    {
      key: 'lineTotal',
      header: tr.crm.quotes.costTab.lineTotalColumn,
      className: 'w-28 whitespace-nowrap text-right',
      render: (row) => formatCurrencyAmountPrecise(row.lineTotal, currency),
    },
    {
      key: 'profit',
      header: tr.crm.quotes.costTab.profitColumn,
      className: 'w-28 whitespace-nowrap text-right',
      render: (row) => formatCurrencyAmountPrecise(row.profit, currency),
    },
  ];

  return (
    <div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard
          label={tr.crm.quotes.costTab.grandTotalLabel}
          value={formatCurrencyAmountPrecise(breakdown.grandTotal, currency)}
          tooltip={tr.crm.quotes.costTab.grandTotalTooltip}
        />
        <KpiCard
          label={tr.crm.quotes.costTab.totalDiscountLabel}
          value={formatCurrencyAmountPrecise(breakdown.totalDiscount, currency)}
          tooltip={tr.crm.quotes.costTab.totalDiscountTooltip}
        />
        <KpiCard
          label={tr.crm.quotes.costTab.totalVatLabel}
          value={formatCurrencyAmountPrecise(breakdown.totalVat, currency)}
          tooltip={tr.crm.quotes.costTab.totalVatTooltip}
        />
        <KpiCard
          label={tr.crm.quotes.costTab.avgUnitCostLabel}
          value={formatCurrencyAmountPrecise(breakdown.avgUnitCost, currency)}
          tooltip={tr.crm.quotes.costTab.avgUnitCostTooltip}
        />
        <KpiCard
          label={tr.crm.quotes.costTab.netProfitLabel}
          value={formatCurrencyAmountPrecise(breakdown.netProfit, currency)}
          tooltip={tr.crm.quotes.costTab.netProfitTooltip}
        />
      </div>

      {breakdown.missingRateCurrencies.length > 0 && (
        <p className="mt-3 text-xs text-app-danger">
          {tr.crm.quotes.costTab.missingExchangeRate(breakdown.missingRateCurrencies)}
        </p>
      )}

      <div className="mt-8">
        <h2 className="mb-4 text-[11px] font-bold tracking-wide text-app-muted uppercase">
          {tr.crm.quotes.costTab.itemsTitle}
        </h2>
        <div className="[&_tbody_td]:text-xs">
          <Table
            columns={columns}
            data={tableData}
            keyField={(row) => row.itemId}
            emptyMessage={tr.crm.quotes.costTab.empty}
            rowClassName={(row) => (row.isTotalRow ? 'font-bold border-t-2' : undefined)}
            fixedLayout
          />
        </div>
      </div>
    </div>
  );
}
