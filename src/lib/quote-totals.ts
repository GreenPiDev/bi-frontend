/**
 * Teklif satırları farklı para birimli ürünler (EUR/USD/TRY) içerebilir (bkz.
 * Product.currency, kur çevrimi YOK) - bu yüzden tek bir "genel toplam" yerine para
 * birimi başına ayrı alt toplamlar hesaplanır. quote-form-page/quote-edit-page/
 * quote-detail-page/quotes-list-page'deki aynı hesaplama burada tek yerde toplanır.
 */

export interface QuoteLineForTotals {
  quantity: number;
  unitPrice: number;
  discountPct: number;
  vatPct: number;
  currency: string;
}

export interface QuoteCurrencyTotals {
  currency: string;
  subtotal: number;
  vatTotal: number;
  grandTotal: number;
}

const formattersByCurrency = new Map<string, Intl.NumberFormat>();

export function formatCurrencyAmount(amount: number, currencyCode: string): string {
  // Bos/eksik currency (orn. eski Redis cache girdisi, migration'dan once serialize
  // edilmis) Intl.NumberFormat'i TypeError ile cokertir - TRY'ye dusulur, sayfa cokmez.
  const code = currencyCode || 'TRY';
  let formatter = formattersByCurrency.get(code);
  if (!formatter) {
    formatter = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: code });
    formattersByCurrency.set(code, formatter);
  }
  return formatter.format(amount);
}

export function computeLineTotal(
  line: Pick<QuoteLineForTotals, 'quantity' | 'unitPrice' | 'discountPct' | 'vatPct'>,
): { lineSubtotal: number; lineTotal: number } {
  const lineSubtotal = line.quantity * line.unitPrice * (1 - line.discountPct / 100);
  const lineTotal = lineSubtotal * (1 + line.vatPct / 100);
  return { lineSubtotal, lineTotal };
}

/** Satırları currency'ye göre gruplayıp her grup için ara toplam/KDV/genel toplam
 * döner - sıra, satırlarda ilk görülen para birimi sırasıyla korunur. */
export function groupQuoteItemTotals(items: QuoteLineForTotals[]): QuoteCurrencyTotals[] {
  const byCurrency = new Map<string, QuoteCurrencyTotals>();
  for (const item of items) {
    const currency = item.currency || 'TRY';
    const { lineSubtotal, lineTotal } = computeLineTotal(item);
    const existing = byCurrency.get(currency) ?? {
      currency,
      subtotal: 0,
      vatTotal: 0,
      grandTotal: 0,
    };
    existing.subtotal += lineSubtotal;
    existing.grandTotal += lineTotal;
    existing.vatTotal = existing.grandTotal - existing.subtotal;
    byCurrency.set(currency, existing);
  }
  return [...byCurrency.values()];
}
