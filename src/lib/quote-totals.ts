/**
 * Teklif satırları farklı para birimli ürünler (EUR/USD/TRY) içerebilir (bkz.
 * Product.currency) - bu yüzden her para birimi için ayrı alt toplamlar hesaplanır
 * (subtotal/vatTotal/grandTotal). Kullanıcının seçtiği "teklif para birimi"
 * (Quote.quoteCurrency) ve girdiği kur (Quote.exchangeRates) ile bu alt toplamlar TEK
 * bir genel toplama da çevrilebilir - bkz. convertTotalsToQuoteCurrency. quote-form-page/
 * quote-edit-page/quote-detail-page/quotes-list-page'deki aynı hesaplama burada tek
 * yerde toplanır.
 */

import type { QuoteStatus } from './api';
import { tr } from '../i18n/tr';

export const QUOTE_STATUS_OPTIONS: { value: QuoteStatus; label: string }[] = (
  ['UNSPECIFIED', 'DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'REVIZE'] as const
).map((status) => ({ value: status, label: tr.crm.quotes.statusOptions[status] }));

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

const preciseFormattersByCurrency = new Map<string, Intl.NumberFormat>();

/** formatCurrencyAmount'un en fazla 4 ondalik basamakli hali - teklif maliyet tab'i (WAC
 * birim maliyet gibi kucuk kesirli farklarin 2 basamakta kaybolabilecegi) icin. Sondaki
 * sifirlar gosterilmez (minimumFractionDigits: 0) - tam sayi bir tutar "591 TRY" olarak
 * gorunur, "591,0000 TRY" degil. Diger ekranlardaki standart 2 basamakli para gosterimini
 * etkilemez. */
export function formatCurrencyAmountPrecise(amount: number, currencyCode: string): string {
  const code = currencyCode || 'TRY';
  let formatter = preciseFormattersByCurrency.get(code);
  if (!formatter) {
    formatter = new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: code,
      minimumFractionDigits: 0,
      maximumFractionDigits: 4,
    });
    preciseFormattersByCurrency.set(code, formatter);
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

export interface QuoteCostRow {
  itemId: string;
  productName: string;
  quantity: number;
  currency: string;
  unitPrice: number;
  unitCost: number;
  /** Iskonto/KDV oncesi ham tutar: miktar * birim fiyat. */
  grossAmount: number;
  lineTotal: number;
  discountPct: number;
  discountAmount: number;
  /** Iskonto dustukten sonraki, KDV haric net satis tutari: grossAmount - discountAmount.
   * Kar bu tutardan maliyet cikarilarak bulunur (bkz. profit). */
  netSalesAmount: number;
  vatPct: number;
  vatAmount: number;
  cost: number;
  profit: number;
}

export interface QuoteCostBreakdown {
  rows: QuoteCostRow[];
  totalQuantity: number;
  grandTotal: number;
  totalDiscount: number;
  totalVat: number;
  totalCost: number;
  avgUnitCost: number;
  netProfit: number;
  totalGrossAmount: number;
  totalNetSalesAmount: number;
  /** Item para birimi quoteCurrency'den farkli ve rates'te kuru yoksa buraya eklenir -
   * bu durumda ilgili satir/toplamlar donusturulmemis (ham) tutarla hesaplanmistir. */
  missingRateCurrencies: string[];
}

export interface QuoteItemForCost {
  id: string;
  quantity: string;
  unitPrice: string;
  discountPct: string;
  vatPct: string;
  currency: string;
  product: { name: string; avgCost: string | null };
}

export interface QuoteForCost {
  quoteCurrency: string;
  exchangeRates: { rates?: Record<string, number> } | null;
  items: QuoteItemForCost[];
}

/** Maliyet tab'i (ürün kalemi bazında satış/iskonto/KDV/maliyet/kâr) için tek yer -
 * her ürünün WAC maliyeti (Product.avgCost) ile satış tutarı karşılaştırılır. Kalemler
 * quoteCurrency dışında bir para biriminde olabilir, aynı quote.exchangeRates.rates
 * kuruyla (bkz. convertTotalsToQuoteCurrency) quoteCurrency'ye çevrilir. */
export function computeQuoteCostBreakdown(quote: QuoteForCost): QuoteCostBreakdown {
  const rates = quote.exchangeRates?.rates ?? {};
  const quoteCurrency = quote.quoteCurrency;
  const missing = new Set<string>();

  function convert(amount: number, currency: string): number {
    if (currency === quoteCurrency) return amount;
    const rate = rates[currency];
    if (rate === undefined) {
      missing.add(currency);
      return amount;
    }
    return amount * rate;
  }

  const rows: QuoteCostRow[] = quote.items.map((item) => {
    const quantity = Number(item.quantity);
    const unitPrice = Number(item.unitPrice);
    const discountPct = Number(item.discountPct);
    const vatPct = Number(item.vatPct);
    const currency = item.currency || 'TRY';
    const { lineSubtotal, lineTotal } = computeLineTotal({
      quantity,
      unitPrice,
      discountPct,
      vatPct,
    });
    const grossAmount = quantity * unitPrice;
    const discountAmount = quantity * unitPrice * (discountPct / 100);
    const vatAmount = lineTotal - lineSubtotal;
    const unitCost = Number(item.product.avgCost ?? 0);
    const cost = quantity * unitCost;
    const profit = lineSubtotal - cost;

    return {
      itemId: item.id,
      productName: item.product.name,
      quantity,
      currency,
      unitPrice: convert(unitPrice, currency),
      unitCost: convert(unitCost, currency),
      grossAmount: convert(grossAmount, currency),
      lineTotal: convert(lineTotal, currency),
      discountPct,
      discountAmount: convert(discountAmount, currency),
      netSalesAmount: convert(lineSubtotal, currency),
      vatPct,
      vatAmount: convert(vatAmount, currency),
      cost: convert(cost, currency),
      profit: convert(profit, currency),
    };
  });

  const totalQuantity = rows.reduce((sum, row) => sum + row.quantity, 0);
  const totalCost = rows.reduce((sum, row) => sum + row.cost, 0);

  return {
    rows,
    totalQuantity,
    grandTotal: rows.reduce((sum, row) => sum + row.lineTotal, 0),
    totalDiscount: rows.reduce((sum, row) => sum + row.discountAmount, 0),
    totalVat: rows.reduce((sum, row) => sum + row.vatAmount, 0),
    totalCost,
    avgUnitCost: totalQuantity > 0 ? totalCost / totalQuantity : 0,
    netProfit: rows.reduce((sum, row) => sum + row.profit, 0),
    totalGrossAmount: rows.reduce((sum, row) => sum + row.grossAmount, 0),
    totalNetSalesAmount: rows.reduce((sum, row) => sum + row.netSalesAmount, 0),
    missingRateCurrencies: [...missing],
  };
}

export interface QuoteForGrandTotalDisplay extends QuoteForTotals {
  quoteCurrency: string;
  exchangeRates: { rates?: Record<string, number> } | null;
}

/** Teklif kalemleri farklı para birimlerinde olabilir - bu yüzden tek bir "Genel Toplam"
 * göstermek için hepsi teklifin kendi para birimine (quote.quoteCurrency) çevrilir. Eksik
 * kur varsa (henüz girilmemiş) tek satırda gösterilemez, para birimi bazlı toplamlar "+"
 * ile ayrılarak listelenir. quotes-list-page.tsx/project-detail-page.tsx'teki aynı ekran
 * burada tek yerde toplanır. */
export function quoteGrandTotalDisplay(quote: QuoteForGrandTotalDisplay): string {
  const totals = getQuoteCurrencyTotals(quote);
  const foreignCurrencyTotals = totals.filter((t) => t.currency !== quote.quoteCurrency);
  if (foreignCurrencyTotals.length === 0) {
    return totals.map((t) => formatCurrencyAmount(t.grandTotal, t.currency)).join(' + ');
  }
  const conversion = convertTotalsToQuoteCurrency(
    totals,
    quote.quoteCurrency,
    quote.exchangeRates?.rates ?? {},
  );
  if (conversion.missingRateCurrencies.length > 0) {
    return totals.map((t) => formatCurrencyAmount(t.grandTotal, t.currency)).join(' + ');
  }
  return formatCurrencyAmount(conversion.grandTotal, quote.quoteCurrency);
}
