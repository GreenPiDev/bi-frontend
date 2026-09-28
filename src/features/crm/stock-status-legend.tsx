import { tr } from '../../i18n/tr';

/**
 * /envanter?tab=products ve /envanter?tab=stock tablolarindaki satir renklerini
 * aciklayan bilgi kutusu - renkler stock-status.ts'teki STOCK_STATUS_ROW_CLASS ile
 * birebir eslenir, buradan bagimsiz sabit renk kullanma.
 */
export function StockStatusLegend() {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border border-app-border bg-app-surface px-4 py-2.5 text-sm">
      <span className="flex items-center gap-1.5 text-app-muted">
        <span className="h-3 w-3 rounded-sm bg-red-50 ring-1 ring-inset ring-red-200" />
        {tr.crm.stockStatusLegend.low}
      </span>
      <span className="flex items-center gap-1.5 text-app-muted">
        <span className="h-3 w-3 rounded-sm bg-blue-50 ring-1 ring-inset ring-blue-200" />
        {tr.crm.stockStatusLegend.equal}
      </span>
      <span className="flex items-center gap-1.5 text-app-muted">
        <span className="h-3 w-3 rounded-sm bg-green-50 ring-1 ring-inset ring-green-200" />
        {tr.crm.stockStatusLegend.ok}
      </span>
      <span className="flex items-center gap-1.5 text-app-muted">
        <span className="h-3 w-3 rounded-sm bg-white ring-1 ring-inset ring-app-border" />
        {tr.crm.stockStatusLegend.unknown}
      </span>
    </div>
  );
}
