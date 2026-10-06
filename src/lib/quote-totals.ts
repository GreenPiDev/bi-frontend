/**
 * Teklif satırları farklı para birimli ürünler (EUR/USD/TRY) içerebilir (bkz.
 * Product.currency) - bu yüzden her para birimi için ayrı alt toplamlar hesaplanır
 * (subtotal/vatTotal/grandTotal). Kullanıcının seçtiği "teklif para birimi"
 * (Quote.quoteCurrency) ve girdiği kur (Quote.exchangeRates) ile bu alt toplamlar TEK
 * bir genel toplama da çevrilebilir - bkz. convertTotalsToQuoteCurrency. quote-form-page/
 * quote-edit-page/quote-detail-page/quotes-list-page'deki aynı hesaplama burada tek
 * yerde toplanır.
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

/** Para birimi bazlı alt toplamları, `rates` (her currency icin "1 currency = ?
 * quoteCurrency") kullanarak TEK bir quoteCurrency toplamına çevirir. quoteCurrency'nin
 * kendisi icin kur gerekmez (1 kabul edilir). Eksik kuru olan bir para birimi varsa
 * (henuz cekilmemis/girilmemis) o grup toplama dahil edilmez - caller
 * `missingRateCurrencies` ile bunu kullanıcıya bildirmeli. */
/** Ad-hoc /teklifler Excel ice aktarma (bkz. docs/VARSAYIMLAR.md) - MANUAL_TOTAL
 * tekliflerde items bos olur, kalem detayi yok, sadece tek bir toplam tutar var. */
export interface QuoteForTotals {
  itemsEntryMode: 'ITEMIZED' | 'MANUAL_TOTAL';
  manualSubtotal: string | null;
  manualVatAmount: string | null;
  manualCurrency: string | null;
  items: {
    quantity: string;
    unitPrice: string;
    discountPct: string;
    vatPct: string;
    currency: string;
  }[];
}

/** groupQuoteItemTotals'un MANUAL_TOTAL farkindaligi olan sarmalayicisi - detay/liste/
 * yazdirma ekranlarinin tamami buradan gecer, boylece ikisi arasindaki fark tek yerde
 * yonetilir. */
export function getQuoteCurrencyTotals(quote: QuoteForTotals): QuoteCurrencyTotals[] {
  if (quote.itemsEntryMode === 'MANUAL_TOTAL') {
    const subtotal = Number(quote.manualSubtotal ?? 0);
    const vatTotal = Number(quote.manualVatAmount ?? 0);
    return [
      {
        currency: quote.manualCurrency || 'TRY',
        subtotal,
        vatTotal,
        grandTotal: subtotal + vatTotal,
      },
    ];
  }
  return groupQuoteItemTotals(
    quote.items.map((item) => ({
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      discountPct: Number(item.discountPct),
      vatPct: Number(item.vatPct),
      currency: item.currency,
    })),
  );
}

export function convertTotalsToQuoteCurrency(
  totals: QuoteCurrencyTotals[],
  quoteCurrency: string,
  rates: Record<string, number>,
): { grandTotal: number; missingRateCurrencies: string[] } {
  let grandTotal = 0;
  const missingRateCurrencies: string[] = [];
  for (const total of totals) {
    if (total.currency === quoteCurrency) {
      grandTotal += total.grandTotal;
      continue;
    }
    const rate = rates[total.currency];
    if (rate === undefined) {
      missingRateCurrencies.push(total.currency);
      continue;
    }
    grandTotal += total.grandTotal * rate;
  }
  return { grandTotal, missingRateCurrencies };
}
