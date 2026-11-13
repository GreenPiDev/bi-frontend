import { clsx } from 'clsx';
import { ArrowDown, ArrowUp, GripVertical, X } from 'lucide-react';
import { type DragEvent, type ReactNode, useState } from 'react';
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
import { useUnitOptionsQuery } from './use-unit-options';
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
  /** Hızlı ürün eklemede SKU hücresine yazılan serbest metin - yeni ürünün SKU'su olur. */
  productSku?: string;
  quantity: string;
  /** Satır birimi - ürün seçilince Product.unit'ten gelir, satır için değiştirilebilir. */
  unit?: string;
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
  /** "Gruba fiyat ataması yap" açıkken kullanıcının girdiği KDV dahil grup fiyatı
   * (form girdisi olduğu için string). */
  price?: string;
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
  productListHint?: string;
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
  /** Verilirse, "Yeni Ürün" butonunun soluna "Yeni Ürün Listesi" butonu eklenir
   * (modal'ın kendisi çağıranda, dış `<form>`'un dışında render edilir). */
  onRequestCreateProductList?: () => void;

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

  /** Birim kolonunu gizler - birimi kalıcı tutmayan çağıranlar (satış siparişi) için. */
  hideUnit?: boolean;

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
  /** "Gruba fiyat ataması yap" checkbox'ı - sadece groupItemsByProduct açıkken görünür. */
  groupPricingEnabled?: boolean;
  onGroupPricingEnabledChange?: (value: boolean) => void;
  onGroupPriceChange?: (groupId: string, price: string) => void;
  /** Grup fiyatlari bu para biriminde girilir (teklif para birimi). */
  quoteCurrency?: string;

  /** Kart başlığının sağ üstünde, ürün sayısı rozetinin yanında gösterilecek ek
   * aksiyonlar (örn. teklif formundaki Excel içe aktarma butonları). Kasıtlı olarak
   * SADECE grupsuz modda render edilir - içe aktarılan satırların hangi gruba
   * gideceği belirsiz olurdu (kullanıcı talebi: "sadece grupsuz teklifler için"). */
  headerActions?: ReactNode;
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
  onRequestCreateProductList,
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
  hideUnit,
  groupItemsByProduct,
  onGroupItemsByProductChange,
  productGroups,
  onAddGroup,
  onRemoveGroup,
  onGroupNameChange,
  groupPricingEnabled,
  onGroupPricingEnabledChange,
  onGroupPriceChange,
  quoteCurrency,
  headerActions,
}: QuoteItemLinesCardProps) {
  const unitOptionsQuery = useUnitOptionsQuery();

  // Urun secilince fiyat/para birimi/marka varsayilanlarini o satira uygular -
  // quote-form-page.tsx/sales-order-create-page.tsx'teki eski handleRowProductChange
  // ile ayni mantik, artik tek yerde.
  async function handleProductChange(index: number, productId: string) {
    onItemChange(index, 'productId', productId);
    if (!productId) return;
    onItemChange(index, 'productSku', '');
    try {
      const product = await getProduct(productId);
      onItemChange(index, 'unitPrice', product.price ?? '');
      onItemChange(index, 'currency', product.currency);
      onItemChange(index, 'brand', product.brand ?? '');
      onItemChange(index, 'unit', product.unit);
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
  const baseTotalsByCurrency = groupQuoteItemTotals(
    isGroupedMode && groupPricingEnabled
      ? summaryRows.filter((row) => !items[row.index]?.groupId)
      : summaryRows,
  );
  // "Gruba fiyat ataması yap": gruplu kalemler yerine elle girilen KDV dahil grup
  // fiyatlari toplama eklenir (para birimi karisik oldugundan kalem bazli ozet
  // bu modda sadece kalem para birimine ait toplamlari + grup fiyatlarini gosterir).
  const groupPriceSum =
    isGroupedMode && groupPricingEnabled
      ? (productGroups ?? [])
          .filter((group) => items.some((item) => item.groupId === group.id))
          .reduce((sum, group) => sum + (Number(group.price) || 0), 0)
      : 0;
  const summaryTotalsByCurrency = [...baseTotalsByCurrency];
  if (groupPriceSum > 0) {
    const currency = quoteCurrency || 'TRY';
    const existing = summaryTotalsByCurrency.find((t) => t.currency === currency);
    if (existing) {
      summaryTotalsByCurrency[summaryTotalsByCurrency.indexOf(existing)] = {
        ...existing,
        subtotal: existing.subtotal + groupPriceSum,
        grandTotal: existing.grandTotal + groupPriceSum,
      };
    } else {
      summaryTotalsByCurrency.push({
        currency,
        subtotal: groupPriceSum,
        vatTotal: 0,
        grandTotal: groupPriceSum,
      });
    }
  }

  // Satirlari tutamactan (GripVertical) surukleyerek siralama - native HTML5 DnD.
  // Gruplu modda sadece ayni grup icindeki satirlar arasinda birakilabilir (move()
  // global indeksle calisir; ayni gruptaki iki satir arasinda tasima diger gruplarin
  // kendi ic sirasini bozmaz).
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  function resetDrag() {
    setDragIndex(null);
    setDropIndex(null);
  }
  function canDropOn(index: number): boolean {
    if (dragIndex === null || dragIndex === index) return false;
    if (!isGroupedMode) return true;
    return items[dragIndex]?.groupId === items[index]?.groupId;
  }
  function handleDragStart(event: DragEvent<HTMLElement>, index: number) {
    setDragIndex(index);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(index));
    const rowElement = event.currentTarget.closest('tr');
    if (rowElement) event.dataTransfer.setDragImage(rowElement, 16, 16);
  }
  const dragTableProps = onMoveItem
    ? {
        rowDropHandlers: (row: ItemRow) => ({
          onDragOver: (event: DragEvent<HTMLTableRowElement>) => {
            if (!canDropOn(row.index)) return;
            event.preventDefault();
            event.dataTransfer.dropEffect = 'move';
            if (dropIndex !== row.index) setDropIndex(row.index);
          },
          onDrop: (event: DragEvent<HTMLTableRowElement>) => {
            if (dragIndex === null || !canDropOn(row.index)) return;
            event.preventDefault();
            onMoveItem(dragIndex, row.index);
            resetDrag();
          },
        }),
        rowClassName: (row: ItemRow) =>
          clsx(
            row.index === dragIndex && 'opacity-50',
            dragIndex !== null &&
              row.index === dropIndex &&
              (dragIndex < row.index
                ? '[&>td]:shadow-[inset_0_-4px_0_0_var(--color-app-primary)]'
                : '[&>td]:shadow-[inset_0_4px_0_0_var(--color-app-primary)]'),
          ),
      }
    : {};

  const dragHandleColumn: TableColumn<ItemRow> = {
    key: 'drag',
    header: '',
    className: 'align-middle w-[3%] !px-1',
    render: (row) => (
      <span
        draggable
        role="button"
        aria-label={tr.crm.quotes.form.dragItem}
        title={tr.crm.quotes.form.dragItem}
        className="flex cursor-grab justify-center text-app-muted hover:text-app-text active:cursor-grabbing"
        onDragStart={(event) => handleDragStart(event, row.index)}
        onDragEnd={resetDrag}
      >
        <GripVertical size={16} />
      </span>
    ),
  };

  const allItemColumns: TableColumn<ItemRow>[] = [
    ...(onMoveItem ? [dragHandleColumn] : []),
    {
      key: 'sku',
      header: tr.crm.quotes.form.skuLabel,
      className: 'align-top w-[10%]',
      // Urun adi hucresiyle ayni secici, SKU ile arar/gosterir - ikisi ayni
      // productId'ye bagli, birinden secim digerini de gunceller.
      render: (row) => (
        <ProductAutocomplete
          label={tr.crm.quotes.form.skuLabel}
          hideLabel
          displayField="sku"
          menuFitContent
          placeholder={
            productListId
              ? tr.crm.quotes.form.skuSearchPlaceholder
              : tr.crm.quotes.form.pickerSelectProductListFirst
          }
          value={items[row.index]?.productId}
          onChange={(productId) => {
            onProductFreeTextChange?.(row.index, '');
            void handleProductChange(row.index, productId ?? '');
          }}
          // Hizli urun ekleme destekleniyorsa, eslesmeyen SKU metni saklanir ve
          // submit'te olusturulan yeni urunun SKU'su olur (bkz. resolveQuickAddedProducts).
          onFreeTextChange={
            onProductFreeTextChange
              ? (text) => onItemChange(row.index, 'productSku', text)
              : undefined
          }
          freeText={items[row.index]?.productSku}
          productListId={productListId || undefined}
          disabled={!productListId}
        />
      ),
    },
    {
      key: 'product',
      header: tr.crm.quotes.form.productLabel,
      className: 'align-top w-[16%]',
      render: (row) => (
        <ProductAutocomplete
          label={tr.crm.quotes.form.productLabel}
          hideLabel
          menuFitContent
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
          freeText={items[row.index]?.productName}
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
      key: 'unit',
      header: tr.crm.quotes.form.unitLabel,
      className: 'align-top w-[7%]',
      render: (row) => {
        const current = items[row.index]?.unit ?? '';
        const labels = (unitOptionsQuery.data ?? []).map((option) => option.label);
        // Urunun/satirin birimi tenant listesinde yoksa (eski kayit) yine de secilebilir kalsin.
        if (current && !labels.includes(current)) labels.unshift(current);
        return (
          <Select
            label={tr.crm.quotes.form.unitLabel}
            name={`items.${row.index}.unit`}
            hideLabel
            options={[
              ...(current ? [] : [{ value: '', label: '—' }]),
              ...labels.map((label) => ({ value: label, label })),
            ]}
            value={current}
            onChange={(event) => onItemChange(row.index, 'unit', event.target.value)}
          />
        );
      },
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
      className: 'align-top w-[14%]',
      render: (row) => (
        <BrandSelect
          value={items[row.index]?.brand ?? ''}
          onChange={(value) => onItemChange(row.index, 'brand', value)}
          hideLabel
          compactAddButton
          paginated
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
  const itemColumns = hideUnit
    ? allItemColumns.filter((column) => column.key !== 'unit')
    : allItemColumns;

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-app-border bg-app-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-app-text">{texts.title}</h2>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold text-app-primary">
            {tr.crm.quotes.form.summaryItemCount(summaryRows.length)}
          </span>
          {!isGroupedMode && headerActions}
        </div>
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

      {onGroupPricingEnabledChange && groupItemsByProduct && (
        <label className="flex items-center gap-2 text-sm font-semibold text-app-text">
          <input
            type="checkbox"
            className="accent-app-primary"
            checked={groupPricingEnabled ?? false}
            onChange={(event) => onGroupPricingEnabledChange(event.target.checked)}
          />
          {tr.crm.quotes.form.groupPricingCheckboxLabel}
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
          <>
            {onRequestCreateProductList && (
              <Button
                type="button"
                variant="navy"
                className="shrink-0"
                onClick={onRequestCreateProductList}
              >
                {tr.crm.quotes.form.newProductListButton}
              </Button>
            )}
            <Button
              type="button"
              variant="navy"
              className="shrink-0"
              onClick={onRequestAddProductList}
            >
              {tr.crm.quotes.form.newProductButton}
            </Button>
          </>
        }
      />

      <FormError message={itemsError} />

      {isGroupedMode ? (
        <div className="flex flex-col gap-4">
          <Button type="button" className="w-full" onClick={onAddGroup}>
            {tr.crm.quotes.form.addGroupButton}
          </Button>

          {onProductFreeTextChange && (
            <p className="text-sm text-app-muted">{tr.crm.quotes.form.freeTextProductHint}</p>
          )}

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

                  {groupPricingEnabled && (
                    <TextField
                      label={tr.crm.quotes.form.groupPriceLabel}
                      hint={tr.crm.quotes.form.groupPriceHint}
                      inputMode="decimal"
                      value={group.price ?? ''}
                      onChange={(event) =>
                        onGroupPriceChange?.(group.id, sanitizeDecimalInput(event.target.value))
                      }
                    />
                  )}

                  {groupRows.length === 0 ? (
                    <p className="text-sm text-app-muted">{texts.emptyState}</p>
                  ) : (
                    <Table
                      columns={itemColumns}
                      data={groupRows}
                      keyField={(row) => row.key}
                      fixedLayout
                      {...dragTableProps}
                    />
                  )}

                  <Button
                    type="button"
                    disabled={!productListId}
                    onClick={() => onAddItem(group.id)}
                  >
                    {group.name.trim()
                      ? tr.crm.quotes.form.addLineToGroupButton(group.name.trim())
                      : tr.crm.quotes.form.addLineButton}
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

          {onProductFreeTextChange && (
            <p className="text-sm text-app-muted">{tr.crm.quotes.form.freeTextProductHint}</p>
          )}

          {summaryRows.length === 0 ? (
            <p className="text-sm text-app-muted">{texts.emptyState}</p>
          ) : (
            <Table
              columns={itemColumns}
              data={itemRows}
              keyField={(row) => row.key}
              fixedLayout
              {...dragTableProps}
              // Tablonun varsayilan `mt-6` ust boslugu, ipucu gorunurken ipucunun ustundeki
              // (buton-ipucu) bosluktan buyuk kalir; ipucu yoksa varsayilan korunur.
              className={onProductFreeTextChange ? 'mt-0' : undefined}
            />
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
