import { RefreshCw } from 'lucide-react';
import { useEffect } from 'react';
import { IconActionButton } from '../../components/ui/icon-action-button';
import { TextField } from '../../components/ui/text-field';
import { tr } from '../../i18n/tr';
import {
  convertTotalsToQuoteCurrency,
  formatCurrencyAmount,
  type QuoteCurrencyTotals,
} from '../../lib/quote-totals';
import { useFxRatesQuery } from './use-quotes';

/** FxService'ten gelen kur, ondalikta anlamsiz uzunlukta gelebilir (orn.
 * "48.99559039686428") - kullanicinin girecegi/gorecegi deger icin 3 basamak yeterli. */
function roundRate(rate: number): string {
  return rate.toFixed(2);
}

/** Sayısal metin alanları icin: type="number" spinner oklarini kaldirmak amaciyla
 * type="text" kullanilir (quote-form-page.tsx'teki sanitizeDecimalInput ile ayni desen). */
function sanitizeDecimalInput(value: string): string {
  return value.replace(/[^0-9.]/g, '');
}

export interface QuoteExchangeRatesValue {
  /** Kur input'larinin ekrandaki metin degeri, currency -> "41.20" gibi bir string. */
  rates: Record<string, string>;
  asOf?: string;
}

interface QuoteExchangeRatesProps {
  quoteCurrency: string;
  totalsByCurrency: QuoteCurrencyTotals[];
  value: QuoteExchangeRatesValue;
  onChange: (value: QuoteExchangeRatesValue) => void;
}

/**
 * Kalemler quoteCurrency disinda para birimleri iceriyorsa: her yabanci para birimi
 * icin (once FxService'ten otomatik cekilen, sonra kullanici tarafindan duzenlenebilen)
 * kur input'u + bu kurlarla hesaplanmis TEK bir genel toplam + kullanilan kurlari
 * ozetleyen bir not gosterir. quote-form-page.tsx ve quote-edit-page.tsx arasinda
 * paylasilir.
 */
export function QuoteExchangeRatesSection({
  quoteCurrency,
  totalsByCurrency,
  value,
  onChange,
}: QuoteExchangeRatesProps) {
  const foreignCurrencies = [
    ...new Set(
      totalsByCurrency
        .map((total) => total.currency)
        .filter((currency) => currency !== quoteCurrency),
    ),
  ].sort();

  const fxRatesQuery = useFxRatesQuery(quoteCurrency, foreignCurrencies);

  // Otomatik on-doldurma: sadece HENUZ deger girilmemis para birimleri icin - kullanicinin
  // elle degistirdigi bir kuru sessizce ezmemek gerekir (bkz. kullanici istegi: "otomatik
  // cekelim ama duzenleyebilelim"). "missing" kontrolunun kendisi idempotent oldugu icin
  // (zaten doldurulmus bir para birimi bir daha yazilmaz) ekstra bir "zaten islendi" ref'ine
  // gerek yok - eskiden asOf'a gore atlanan bir gate vardi, ama ayni gun icinde farkli bir
  // kalem yeni bir yabanci para birimi eklediginde (orn. once EUR, sonra USD kalemi) yeni
  // sorgunun asOf'u ayni gune denk geldigi icin o gate USD'yi hic doldurmadan atlıyordu.
  useEffect(() => {
    const fetched = fxRatesQuery.data;
    if (!fetched) {
      return;
    }
    const missing = foreignCurrencies.filter((currency) => !value.rates[currency]);
    if (missing.length === 0) {
      return;
    }
    const nextRates = { ...value.rates };
    for (const currency of missing) {
      const rate = fetched.rates[currency];
      if (rate !== undefined) {
        nextRates[currency] = roundRate(rate);
      }
    }
    onChange({ rates: nextRates, asOf: value.asOf ?? fetched.asOf });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sadece fetch sonucu degisince calismali
  }, [fxRatesQuery.data]);

  // "Yenile" butonu: mevcut deger doldurulmus olsa da o para birimini guncel kurla
  // ezer (yukaridaki otomatik on-doldurmadan farki bu - kullanicinin bilincli istegi).
  async function handleRefresh(currency: string) {
    const result = await fxRatesQuery.refetch();
    const rate = result.data?.rates[currency];
    if (rate === undefined) {
      return;
    }
    onChange({
      rates: { ...value.rates, [currency]: roundRate(rate) },
      asOf: result.data?.asOf,
    });
  }

  if (foreignCurrencies.length === 0) {
    return null;
  }

  const numericRates = Object.fromEntries(
    foreignCurrencies.map((currency) => [currency, Number(value.rates[currency]) || 0]),
  );
  const { grandTotal, missingRateCurrencies } = convertTotalsToQuoteCurrency(
    totalsByCurrency,
    quoteCurrency,
    numericRates,
  );

  return (
    <div className="flex flex-col gap-3 border-t border-app-border pt-4">
      <p className="text-xs font-semibold text-app-text">{tr.crm.quotes.form.exchangeRatesTitle}</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {foreignCurrencies.map((currency) => (
          <div key={currency} className="flex items-end gap-1.5">
            <div className="flex-1">
              <TextField
                type="text"
                inputMode="decimal"
                label={tr.crm.quotes.form.exchangeRateLabel(currency, quoteCurrency)}
                hint={fxRatesQuery.isPending ? tr.crm.quotes.form.exchangeRateLoading : undefined}
                value={value.rates[currency] ?? ''}
                onChange={(event) =>
                  onChange({
                    ...value,
                    rates: {
                      ...value.rates,
                      [currency]: sanitizeDecimalInput(event.target.value),
                    },
                  })
                }
              />
            </div>
            <IconActionButton
              icon={RefreshCw}
              tooltip={tr.crm.quotes.form.exchangeRateRefreshTooltip}
              disabled={fxRatesQuery.isFetching}
              onClick={() => handleRefresh(currency)}
            />
          </div>
        ))}
      </div>

      {missingRateCurrencies.length === 0 ? (
        <>
          <div className="flex justify-between text-base font-bold text-app-text">
            <span>{tr.crm.quotes.form.convertedGrandTotalLabel(quoteCurrency)}</span>
            <span>{formatCurrencyAmount(grandTotal, quoteCurrency)}</span>
          </div>
          <p className="text-xs text-app-muted">
            {tr.crm.quotes.form.exchangeRateNote(
              foreignCurrencies.map(
                (currency) => `1 ${currency} = ${value.rates[currency]} ${quoteCurrency}`,
              ),
              value.asOf,
            )}
          </p>
        </>
      ) : (
        <p className="text-xs text-app-danger">
          {tr.crm.quotes.form.missingExchangeRate(missingRateCurrencies)}
        </p>
      )}
    </div>
  );
}
