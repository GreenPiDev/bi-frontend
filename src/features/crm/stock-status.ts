/**
 * Stok durumuna gore renklendirme/sirlama - /envanter?tab=stock ve /envanter?tab=products
 * ayni mantigi kullaniyor (bkz. CLAUDE.md), kod tekrarini onlemek icin ortak burada.
 */
export type StockStatus = 'low' | 'equal' | 'ok' | 'unknown';

/** minStockLevel tanimli degilse durum bilinmiyor sayilir (renklendirme/sirlama uygulanmaz). */
export function getStockStatus(
  quantity: number | string,
  minStockLevel: number | null,
): StockStatus {
  if (minStockLevel === null) return 'unknown';
  const qty = Number(quantity);
  if (qty < minStockLevel) return 'low';
  if (qty === minStockLevel) return 'equal';
  return 'ok';
}

/** Uyari ikonu esigi: miktar minimum seviyenin altinda VEYA esit. */
export function isLowStock(quantity: number | string, minStockLevel: number | null): boolean {
  const status = getStockStatus(quantity, minStockLevel);
  return status === 'low' || status === 'equal';
}

const STOCK_STATUS_ROW_CLASS: Record<StockStatus, string | undefined> = {
  low: 'bg-red-50',
  equal: 'bg-blue-50',
  ok: 'bg-green-50',
  unknown: undefined,
};

export function stockStatusRowClassName(
  quantity: number | string,
  minStockLevel: number | null,
): string | undefined {
  return STOCK_STATUS_ROW_CLASS[getStockStatus(quantity, minStockLevel)];
}
