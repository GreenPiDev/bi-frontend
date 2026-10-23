import { ArrowDown, ArrowUp, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '../../components/ui/button';
import { FormError } from '../../components/ui/form-error';
import { IconActionButton } from '../../components/ui/icon-action-button';
import { Select } from '../../components/ui/select';
import { Table, type TableColumn } from '../../components/ui/table';
import { TextField } from '../../components/ui/text-field';
import { convertCurrencyAmount, getProduct } from '../../lib/api';
import {
  computeLineTotal,
  formatCurrencyAmount,
  groupQuoteItemTotals,
} from '../../lib/quote-totals';
import { tr } from '../../i18n/tr';
import { BrandSelect } from './brand-select';
import { ProductAutocomplete } from './product-autocomplete';
import { QUOTE_CURRENCY_OPTIONS } from './quote-meta-fields';

/** `/teklifler/yeni`, `/teklifler/duzenle/:id` (quote-form-page.tsx) ve
 * `/satis-siparisleri/yeni` (sales-order-create-page.tsx) arasında paylaşılan "ürün
 * satırları" kartı - 2026-10-21 kullanıcı isteğiyle çıkarıldı, teklif formundaki
 * "Teklif Özeti" kartı esas alınmıştır. Tamamen kontrollü (value+onChange) bir
 * bileşendir - react-hook-form'a doğrudan bağlı değildir (QuoteMetaFields ile aynı
 * desen, bkz. doc comment'i), bu yüzden farklı form şemalarına (QuoteFormValues,
 * SalesOrderCreateFormValues) sahip çağıranlarla da çalışır. `useFieldArray`
 * (fields/append/remove/move) sahipliği kasıtlı olarak ÇAĞIRANDA kalır - "+ Yeni
 * Ürün" modalı gibi kart dışı akışların da satır eklemesi gerekiyor. */
export interface QuoteLineItemValues {
  productId?: string;
  /** Seçili ürün listesinde eşleşen bir ürün yoksa serbest metin ad - sadece hızlı
   * ürün ekleme destekleyen çağıranlarda (bkz. onProductFreeTextChange) kullanılır. */
  productName?: string;
  quantity: string;
  unitPrice?: string;
  currency?: string;
  discountPct?: string;
  vatPct?: string;
  brand?: string;
  /** Sadece "Ürünleri Gruplayarak Ekle" modunda kullanılır - bu satırın ait olduğu
   * `QuoteProductGroup.id`'si (bkz. quote-form-page.tsx productGroups state'i). */
  groupId?: string;
}

/** "Ürünleri Gruplayarak Ekle" modunda tanımlanan bir grup - sadece bu formun UI
 * state'inde yaşar, backend'e grup kendisi değil, her satırın çözümlenmiş grup
 * adı (`groupName`) gönderilir (bkz. quote-form-page.tsx onSubmit). */
export interface QuoteProductGroup {
  id: string;
  name: string;
}

export interface QuoteItemRowError {
  productId?: string;
  quantity?: string;
  unitPrice?: string;
  discountPct?: string;
  vatPct?: string;
}

export interface QuoteItemLinesCardTexts {
  /** "Teklif Özeti" | "Sipariş Özeti" */
  title: string;
  /** Ürün listesi seçicisinin altındaki ipucu metni - caller'a göre değişir. */
  productListHint: string;
  /** Hiç satır eklenmemişken gösterilen bos durum metni. */
  emptyState: string;
}

export interface QuoteItemLinesCardProps {
  texts: QuoteItemLinesCardTexts;

  productListId: string | undefined;
  productListOptions: { value: string; label: string }[];
  productListError?: string;
  onProductListChange: (productListId: string) => void;
  onRequestAddProductList: () => void;

  /** Satır key'leri icin - useFieldArray'in fields[].id'si (React key stabilitesi). */
  itemKeys: string[];
  items: QuoteLineItemValues[];
  itemErrors?: (QuoteItemRowError | undefined)[];
  /** Dizi seviyesinde hata (örn. "en az bir ürün satırı eklemelisiniz"). */
  itemsError?: string;
  /** Satırda KDV alanı boş bırakılmışsa yeni ürün seçilince/satır eklenince uygulanacak
   * tenant varsayılanı (bkz. DEFAULT_QUOTE_VAT_PCT_KEY). */
  defaultVatPct: string;

  /** groupId verilirse yeni satır o gruba atanır - sadece gruplu modda kullanılır. */
  onAddItem: (groupId?: string) => void;
  onRemoveItem: (index: number) => void;
  /** Verilmezse satır sıralama okları (yukarı/aşağı) gösterilmez - sadece teklif formu
   * bu özelliği destekler, satış siparişi formu desteklemez. */
  onMoveItem?: (fromIndex: number, toIndex: number) => void;
  onItemChange: <K extends keyof QuoteLineItemValues>(
    index: number,
    field: K,
    value: QuoteLineItemValues[K],
  ) => void;
  onRequestAddBrand: (index: number) => void;
  /** Verilmezse ProductAutocomplete'e serbest metin girişi (hızlı ürün ekleme)
   * desteklenmez - sadece teklif formu destekler. */
  onProductFreeTextChange?: (index: number, text: string) => void;

  /** Toplamların altında, aynı kart içinde gösterilecek ek içerik (örn. kur bilgisi
   * bölümü - sadece teklif formu). */
  footer?: ReactNode;

  /** "Ürünleri Gruplayarak Ekle" checkbox'ı - Quote entity'sine ozgu bir alan (bkz.
   * CLAUDE.md'ye gore domain terimleri sadece CRM modullerinde yasar), bu yuzden
   * sadece teklif formu (quote-form-page.tsx) geçirir - satış siparişi formu
   * (sales-order-create-page.tsx) bu prop'u vermediginde checkbox hic render edilmez. */
  groupItemsByProduct?: boolean;
  onGroupItemsByProductChange?: (value: boolean) => void;

  /** groupItemsByProduct true oldugunda kullanilir - tanimli gruplarin sirali listesi
   * (bkz. QuoteProductGroup). Verilmezse (satis siparisi formu gibi caller'lar) grup
   * UI'si hic render edilmez, mevcut duz tablo davranisi degismez. */
  productGroups?: QuoteProductGroup[];
  onAddGroup?: () => void;
  onRemoveGroup?: (groupId: string) => void;
  onGroupNameChange?: (groupId: string, name: string) => void;
}

function sanitizeDecimalInput(value: string): string {
  return value.replace(/[^0-9.]/g, '');
}

interface ItemRow {
  key: string;
  index: number;
}

export function QuoteItemLinesCard({
  texts,
  productListId,
  productListOptions,
  productListError,
  onProductListChange,
  onRequestAddProductList,
  itemKeys,
  items,
  itemErrors,
  itemsError,
  defaultVatPct,
  onAddItem,
  onRemoveItem,
  onMoveItem,
  onItemChange,
  onRequestAddBrand,
  onProductFreeTextChange,
  footer,
  groupItemsByProduct,
  onGroupItemsByProductChange,
  productGroups,
  onAddGroup,
  onRemoveGroup,
  onGroupNameChange,
}: QuoteItemLinesCardProps) {
  // Urun secilince fiyat/para birimi/marka varsayilanlarini o satira uygular -
  // quote-form-page.tsx/sales-order-create-page.tsx'teki eski handleRowProductChange
  // ile ayni mantik, artik tek yerde.
  async function handleProductChange(index: number, productId: string) {
    onItemChange(index, 'productId', productId);
    if (!productId) return;
    try {
      const product = await getProduct(productId);
      onItemChange(index, 'unitPrice', product.price ?? '');
      onItemChange(index, 'currency', product.currency);
      onItemChange(index, 'brand', product.brand ?? '');
      if (!items[index]?.vatPct) {
        onItemChange(index, 'vatPct', defaultVatPct);
      }
    } catch {
      // Urun detaylari cekilemezse kullanici fiyat/marka alanlarini elle doldurur.
    }
  }

  // Satir para birimi degistirilince girilmis birim fiyat anlik kurla yeni para
  // birimine cevrilir - eski handleRowCurrencyChange ile ayni mantik.
  async function handleCurrencyChange(index: number, newCurrency: string) {
    const oldCurrency = items[index]?.currency || 'TRY';
    onItemChange(index, 'currency', newCurrency);
    const currentPrice = items[index]?.unitPrice;
    const amount = Number(currentPrice);
    if (oldCurrency === newCurrency || !currentPrice || Number.isNaN(amount) || amount <= 0) {
      return;
    }
    const converted = await convertCurrencyAmount(amount, oldCurrency, newCurrency);
    if (converted !== null) {
      onItemChange(index, 'unitPrice', converted.toFixed(2));
    }
  }

  const itemRows: ItemRow[] = itemKeys.map((key, index) => ({ key, index }));
  // Gruplu moddaki satirlar farkli gruplar arasinda serbestce tasindiginda grup
  // sinirlarini anlamsizlastirir - bu yuzden yukari/asagi oklari sadece duz (grupsuz)
  // modda gosterilir (bkz. asagidaki 'actions' kolonu).
  const isGroupedMode = Boolean(groupItemsByProduct && productGroups);

  const summaryRows = items.map((item, index) => {
    const quantity = Number(item.quantity) || 0;
    const unitPrice = Number(item.unitPrice) || 0;
    const discountPct = Number(item.discountPct) || 0;
    const vatPct = Number(item.vatPct) || 0;
    const currency = item.currency || 'TRY';
    const { lineSubtotal, lineTotal } = computeLineTotal({
      quantity,
      unitPrice,
      discountPct,
      vatPct,
    });
    return { index, quantity, unitPrice, currency, discountPct, vatPct, lineSubtotal, lineTotal };
  });
  const summaryTotalsByCurrency = groupQuoteItemTotals(summaryRows);

  const itemColumns: TableColumn<ItemRow>[] = [
    {
      key: 'product',
      header: tr.crm.quotes.form.productLabel,
      className: 'align-top w-[18%]',
      render: (row) => (
        <ProductAutocomplete
          label={tr.crm.quotes.form.productLabel}
          hideLabel
          placeholder={
            productListId
              ? tr.crm.quotes.form.pickerSearchPlaceholder
              : tr.crm.quotes.form.pickerSelectProductListFirst
          }
          value={items[row.index]?.productId}
          onChange={(productId) => void handleProductChange(row.index, productId ?? '')}
          onFreeTextChange={
            onProductFreeTextChange ? (text) => onProductFreeTextChange(row.index, text) : undefined
          }
          productListId={productListId || undefined}
          disabled={!productListId}
          error={itemErrors?.[row.index]?.productId}
          clearable
        />
      ),
    },
    {
      key: 'quantity',
      header: tr.crm.quotes.form.quantityLabel,
      className: 'align-top w-[7%]',
      render: (row) => (
        <TextField
          type="text"
          inputMode="decimal"
          name={`items.${row.index}.quantity`}
          label={tr.crm.quotes.form.quantityLabel}
          hideLabel
          error={itemErrors?.[row.index]?.quantity}
          value={items[row.index]?.quantity ?? ''}
          onChange={(event) =>
            onItemChange(row.index, 'quantity', sanitizeDecimalInput(event.target.value))
          }
        />
      ),
    },
    {
      key: 'unitPrice',
      header: tr.crm.quotes.form.unitPriceLabel('TRY'),
      className: 'align-top w-[12%]',
      render: (row) => {
        const currency = items[row.index]?.currency || 'TRY';
        return (
          <TextField
            type="text"
            inputMode="decimal"
            name={`items.${row.index}.unitPrice`}
            label={tr.crm.quotes.form.unitPriceLabel(currency)}
            hideLabel
            error={itemErrors?.[row.index]?.unitPrice}
            value={items[row.index]?.unitPrice ?? ''}
            onChange={(event) =>
              onItemChange(row.index, 'unitPrice', sanitizeDecimalInput(event.target.value))
            }
          />
        );
      },
    },
    {
      key: 'currency',
      header: tr.crm.quotes.form.currencyLabel,
      className: 'align-top w-[9%]',
      render: (row) => (
        <Select
          label={tr.crm.quotes.form.currencyLabel}
          name={`items.${row.index}.currency`}
          hideLabel
          options={QUOTE_CURRENCY_OPTIONS}
          value={items[row.index]?.currency || 'TRY'}
          onChange={(event) => void handleCurrencyChange(row.index, event.target.value)}
        />
      ),
    },
    {
      key: 'discountPct',
      header: tr.crm.quotes.form.discountPctLabel,
      className: 'align-top w-[7%]',
      render: (row) => (
        <TextField
          type="text"
          inputMode="decimal"
          name={`items.${row.index}.discountPct`}
          label={tr.crm.quotes.form.discountPctLabel}
          hideLabel
          error={itemErrors?.[row.index]?.discountPct}
          value={items[row.index]?.discountPct ?? ''}
          onChange={(event) =>
            onItemChange(row.index, 'discountPct', sanitizeDecimalInput(event.target.value))
          }
        />
      ),
    },
    {
      key: 'vatPct',
      header: tr.crm.quotes.form.vatPctLabel,
      className: 'align-top w-[7%]',
      render: (row) => (
        <TextField
          type="text"
          inputMode="decimal"
          name={`items.${row.index}.vatPct`}
          label={tr.crm.quotes.form.vatPctLabel}
          hideLabel
          error={itemErrors?.[row.index]?.vatPct}
          value={items[row.index]?.vatPct ?? ''}
          onChange={(event) =>
            onItemChange(row.index, 'vatPct', sanitizeDecimalInput(event.target.value))
          }
        />
      ),
    },
    {
      key: 'brand',
      header: tr.crm.products.brandColumn,
      className: 'align-top w-[19%]',
      render: (row) => (
        <BrandSelect
          value={items[row.index]?.brand ?? ''}
          onChange={(value) => onItemChange(row.index, 'brand', value)}
          hideLabel
          compactAddButton
          onRequestAddNew={() => onRequestAddBrand(row.index)}
        />
      ),
    },
    {
      key: 'lineTotal',
      header: tr.crm.quotes.detail.lineTotalColumn,
      className: 'align-top w-[13%] whitespace-nowrap font-semibold text-app-text',
      render: (row) => {
        const summaryRow = summaryRows[row.index];
        return summaryRow ? formatCurrencyAmount(summaryRow.lineTotal, summaryRow.currency) : '—';
      },
    },
    {
      key: 'actions',
      header: '',
      className: 'align-middle w-[8%]',
      render: (row) => (
        <div className="flex items-center justify-end gap-0.5">
          {onMoveItem && !isGroupedMode && (
            <>
              <IconActionButton
                icon={ArrowUp}
                tooltip={tr.crm.quotes.form.moveItemUp}
                iconSize={16}
                disabled={row.index === 0}
                onClick={() => onMoveItem(row.index, row.index - 1)}
              />
              <IconActionButton
                icon={ArrowDown}
                tooltip={tr.crm.quotes.form.moveItemDown}
                iconSize={16}
                disabled={row.index === itemRows.length - 1}
                onClick={() => onMoveItem(row.index, row.index + 1)}
              />
            </>
          )}
          <IconActionButton
            icon={X}
            tooltip={tr.crm.quotes.form.removeItem}
            variant="danger"
            onClick={() => onRemoveItem(row.index)}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-app-border bg-app-surface p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-app-text">{texts.title}</h2>
        <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold text-app-primary">
          {tr.crm.quotes.form.summaryItemCount(summaryRows.length)}
        </span>
      </div>

      {onGroupItemsByProductChange && (
        <label className="flex items-center gap-2 text-sm font-semibold text-app-text">
          <input
            type="checkbox"
            className="accent-app-primary"
            checked={groupItemsByProduct ?? false}
            onChange={(event) => onGroupItemsByProductChange(event.target.checked)}
          />
          {tr.crm.quotes.form.groupItemsByProductCheckboxLabel}
        </label>
      )}

      <Select
        label={tr.crm.quotes.form.productListLabel}
        name="productListId"
        required
        placeholder={tr.crm.quotes.form.productListPlaceholder}
        hint={texts.productListHint}
        error={productListError}
        options={productListOptions}
        value={productListId ?? ''}
        onChange={(event) => onProductListChange(event.target.value)}
        trailingAction={
          <Button
            type="button"
            variant="navy"
            className="shrink-0"
            onClick={onRequestAddProductList}
          >
            {tr.crm.quotes.form.newProductButton}
          </Button>
        }
      />

      <FormError message={itemsError} />

      {isGroupedMode ? (
        <div className="flex flex-col gap-4">
          <Button type="button" className="w-full" onClick={onAddGroup}>
            {tr.crm.quotes.form.addGroupButton}
          </Button>

          {!productListId && (
            <p className="rounded-lg border border-dashed border-app-border p-4 text-center text-sm text-app-muted">
              {tr.crm.quotes.form.pickerSelectProductListFirst}
            </p>
          )}

          {(productGroups ?? []).length === 0 ? (
            <p className="text-sm text-app-muted">{tr.crm.quotes.form.noGroupsYet}</p>
          ) : (
            (productGroups ?? []).map((group) => {
              const groupRows = itemRows.filter((row) => items[row.index]?.groupId === group.id);
              return (
                <div
                  key={group.id}
                  className="flex flex-col gap-3 rounded-lg border border-app-border p-3"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <TextField
                        label={tr.crm.quotes.form.groupNameLabel}
                        hideLabel
                        placeholder={tr.crm.quotes.form.groupNamePlaceholder}
                        value={group.name}
                        onChange={(event) => onGroupNameChange?.(group.id, event.target.value)}
                      />
                    </div>
                    <IconActionButton
                      icon={X}
                      tooltip={tr.crm.quotes.form.removeGroup}
                      variant="danger"
                      onClick={() => onRemoveGroup?.(group.id)}
                    />
                  </div>

                  {groupRows.length === 0 ? (
                    <p className="text-sm text-app-muted">{texts.emptyState}</p>
                  ) : (
                    <Table
                      columns={itemColumns}
                      data={groupRows}
                      keyField={(row) => row.key}
                      fixedLayout
                    />
                  )}

                  <Button
                    type="button"
                    disabled={!productListId}
                    onClick={() => onAddItem(group.id)}
                  >
                    {tr.crm.quotes.form.addLineButton}
                  </Button>
                </div>
              );
            })
          )}
        </div>
      ) : !productListId ? (
        <p className="rounded-lg border border-dashed border-app-border p-4 text-center text-sm text-app-muted">
          {tr.crm.quotes.form.pickerSelectProductListFirst}
        </p>
      ) : (
        <>
          <div>
            <Button
              type="button"
              className="w-full"
              disabled={!productListId}
              onClick={() => onAddItem()}
            >
              {tr.crm.quotes.form.addLineButton}
            </Button>
          </div>

          {summaryRows.length === 0 ? (
            <p className="text-sm text-app-muted">{texts.emptyState}</p>
          ) : (
            <Table columns={itemColumns} data={itemRows} keyField={(row) => row.key} fixedLayout />
          )}
        </>
      )}

      <div className="flex flex-wrap gap-4 border-t border-app-border pt-4 text-sm">
        {summaryTotalsByCurrency.map((totals) => (
          <div key={totals.currency} className="flex min-w-40 flex-1 flex-col gap-1.5">
            {summaryTotalsByCurrency.length > 1 && (
              <span className="text-xs font-semibold text-app-muted">{totals.currency}</span>
            )}
            <div className="flex justify-between text-app-muted">
              <span>{tr.crm.quotes.detail.subtotalLabel}</span>
              <span>{formatCurrencyAmount(totals.subtotal, totals.currency)}</span>
            </div>
            <div className="flex justify-between text-app-muted">
              <span>{tr.crm.quotes.detail.vatTotalLabel}</span>
              <span>{formatCurrencyAmount(totals.vatTotal, totals.currency)}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-app-text">
              <span>{tr.crm.quotes.detail.totalLabel}</span>
              <span>{formatCurrencyAmount(totals.grandTotal, totals.currency)}</span>
            </div>
          </div>
        ))}
      </div>

      {footer}
    </div>
  );
}
