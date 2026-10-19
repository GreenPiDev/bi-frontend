import { zodResolver } from '@hookform/resolvers/zod';
import { X } from 'lucide-react';
import { useState, type ChangeEvent } from 'react';
import { Controller, useFieldArray, useForm, type UseFormRegisterReturn } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AppShell } from './app-shell';
import { AccountAutocomplete } from '../features/crm/account-autocomplete';
import { BackLink } from '../components/ui/back-link';
import { Button } from '../components/ui/button';
import { FormError } from '../components/ui/form-error';
import { IconActionButton } from '../components/ui/icon-action-button';
import { PageHelp } from '../components/ui/page-help';
import { Select } from '../components/ui/select';
import { Table, type TableColumn } from '../components/ui/table';
import { TextField } from '../components/ui/text-field';
import { useToast } from '../components/ui/toast-context';
import { AddOptionModal } from '../features/crm/add-option-modal';
import { BrandSelect } from '../features/crm/brand-select';
import { NewProductModal } from '../features/crm/new-product-modal';
import { QUOTE_CURRENCY_OPTIONS } from '../features/crm/quote-meta-fields';
import { ProductAutocomplete } from '../features/crm/product-autocomplete';
import { useCreateBrandOptionMutation } from '../features/crm/use-brand-options';
import { useProductListsQuery } from '../features/crm/use-product-lists';
import { useCreateSalesOrderMutation } from '../features/crm/use-sales-orders';
import { useTenantSettingsQuery } from '../features/crm/use-tenant-settings';
import {
  DEFAULT_QUOTE_VAT_PCT,
  DEFAULT_QUOTE_VAT_PCT_KEY,
} from '../features/crm/tenant-settings.constants';
import {
  salesOrderCreateFormSchema,
  type SalesOrderCreateFormValues,
} from '../features/crm/schemas';
import { ApiError, convertCurrencyAmount, getProduct, type Product } from '../lib/api';
import { computeLineTotal, formatCurrencyAmount, groupQuoteItemTotals } from '../lib/quote-totals';
import { tr } from '../i18n/tr';

interface ItemRow {
  id: string;
  index: number;
}

function sanitizeDecimalInput(value: string): string {
  return value.replace(/[^0-9.]/g, '');
}

function decimalOnly(registration: UseFormRegisterReturn) {
  return {
    ...registration,
    onChange: (event: ChangeEvent<HTMLInputElement>) => {
      event.target.value = sanitizeDecimalInput(event.target.value);
      return registration.onChange(event);
    },
  };
}

function defaultItem(vatPct: string) {
  return {
    productId: '',
    quantity: '1',
    unitPrice: '',
    currency: 'TRY',
    discountPct: '0',
    vatPct,
    brand: '',
  };
}

/** /satis-siparisleri/yeni - urun secimi/ekleme formu quote-form-page.tsx'teki "Teklif
 * Özeti" kartiyla AYNI (2026-10-19 kullanici istegi: "ayni olsun"): tek seferlik urun
 * listesi secimi + "+ Yeni Ürün" (NewProductModal), satir tablosu (Urun/Miktar/Birim
 * Fiyat/Para Birimi/Iskonto (%)/KDV (%)/Marka + "+ Yeni Marka", Tutar), para birimi
 * kur cevrimi, para birimi bazinda ara toplam/KDV/genel toplam ozeti - bkz. backend
 * SalesOrderItem model doc comment'i (costPriceAtSale/iskonto-onay akisi HARIC,
 * bkz. docs/VARSAYIMLAR.md V69). */
export function SalesOrderCreatePage() {
  const navigate = useNavigate();
  const toast = useToast();
  const createMutation = useCreateSalesOrderMutation();
  const [searchParams] = useSearchParams();
  const prefillAccountId = searchParams.get('accountId') ?? '';
  const tenantSettingsQuery = useTenantSettingsQuery();
  const defaultVatPctSetting = tenantSettingsQuery.data?.find(
    (setting) => setting.key === DEFAULT_QUOTE_VAT_PCT_KEY,
  );
  const defaultVatPct = String(defaultVatPctSetting?.value ?? DEFAULT_QUOTE_VAT_PCT);
  const createBrandOptionMutation = useCreateBrandOptionMutation();

  const [isNewProductModalOpen, setIsNewProductModalOpen] = useState(false);
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);
  // "+ Yeni Marka" hangi satirdan tetiklendi - quote-form-page.tsx'teki
  // brandTargetIndex ile ayni desen.
  const [brandTargetIndex, setBrandTargetIndex] = useState<number | null>(null);

  const {
    control,
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SalesOrderCreateFormValues>({
    resolver: zodResolver(salesOrderCreateFormSchema),
    defaultValues: {
      accountId: prefillAccountId,
      items: [defaultItem(defaultVatPct)],
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const productListsQuery = useProductListsQuery({ pageSize: 100 });
  const productListOptions = (productListsQuery.data?.data ?? []).map((productList) => ({
    value: productList.id,
    label: productList.name,
  }));
  // quote-form-page.tsx ile ayni desen: urun listesi sayfa basina BIR kere secilir,
  // tum kalemlerin urun secicisi bu tek deger ile filtrelenir (artik her satirda
  // tekrar tekrar secilmez).
  const selectedProductListId = watch('productListId');
  const watchedItems = watch('items');

  // Urun satirina yeni bir urun secilince fiyat/para birimi/marka varsayilanlarini o
  // satira uygular - quote-form-page.tsx'teki handleRowProductChange ile ayni desen.
  async function handleRowProductChange(index: number, productId: string) {
    try {
      const product = await getProduct(productId);
      setValue(`items.${index}.unitPrice`, product.price ?? '');
      setValue(`items.${index}.currency`, product.currency);
      setValue(`items.${index}.brand`, product.brand ?? '');
      if (!watch(`items.${index}.vatPct`)) {
        setValue(`items.${index}.vatPct`, defaultVatPct);
      }
    } catch {
      // Urun detaylari cekilemezse kullanici fiyat/marka alanlarini elle doldurur.
    }
  }

  // Satir para birimi degistirilince girilmis birim fiyat anlik kurla yeni para
  // birimine cevrilir - quote-form-page.tsx'teki handleRowCurrencyChange ile ayni.
  async function handleRowCurrencyChange(index: number, newCurrency: string) {
    const oldCurrency = watch(`items.${index}.currency`) || 'TRY';
    setValue(`items.${index}.currency`, newCurrency);
    const currentPrice = watch(`items.${index}.unitPrice`);
    const amount = Number(currentPrice);
    if (oldCurrency === newCurrency || !currentPrice || Number.isNaN(amount) || amount <= 0) {
      return;
    }
    const converted = await convertCurrencyAmount(amount, oldCurrency, newCurrency);
    if (converted !== null) {
      setValue(`items.${index}.unitPrice`, converted.toFixed(2));
    }
  }

  // "+ Yeni Ürün" ile sistemde hic kayitli olmayan bir urun olusturulunca, hem secili
  // urun listesine kalici olarak eklenir (NewProductModal icinde) hem de bu siparise
  // varsayilan miktar/fiyatla dogrudan satir olarak eklenir - quote-form-page.tsx'teki
  // handleProductCreated ile ayni desen.
  function handleProductCreated(product: Product) {
    append({
      productId: product.id,
      quantity: '1',
      unitPrice: product.price ?? '',
      currency: product.currency,
      discountPct: '0',
      vatPct: defaultVatPct,
      brand: product.brand ?? '',
    });
    setIsNewProductModalOpen(false);
  }

  const itemRows: ItemRow[] = fields.map((field, index) => ({ id: field.id, index }));

  const summaryRows = (watchedItems ?? []).map((item, index) => {
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
      header: tr.crm.salesOrders.detail.productColumn,
      className: 'align-top w-[18%]',
      render: (row) => (
        <Controller
          control={control}
          name={`items.${row.index}.productId` as const}
          render={({ field }) => (
            <ProductAutocomplete
              label={tr.crm.salesOrders.detail.productColumn}
              hideLabel
              placeholder={
                selectedProductListId
                  ? tr.crm.quotes.form.pickerSearchPlaceholder
                  : tr.crm.quotes.form.pickerSelectProductListFirst
              }
              error={errors.items?.[row.index]?.productId?.message}
              value={field.value}
              onChange={(productId) => {
                field.onChange(productId ?? '');
                if (productId) void handleRowProductChange(row.index, productId);
              }}
              productListId={selectedProductListId || undefined}
              disabled={!selectedProductListId}
              clearable
            />
          )}
        />
      ),
    },
    {
      key: 'quantity',
      header: tr.crm.salesOrders.detail.quantityColumn,
      className: 'align-top w-[7%]',
      render: (row) => (
        <TextField
          type="text"
          inputMode="decimal"
          label={tr.crm.salesOrders.detail.quantityColumn}
          hideLabel
          error={errors.items?.[row.index]?.quantity?.message}
          {...decimalOnly(register(`items.${row.index}.quantity` as const))}
        />
      ),
    },
    {
      key: 'unitPrice',
      header: tr.crm.quotes.form.unitPriceLabel('TRY'),
      className: 'align-top w-[12%]',
      render: (row) => {
        const currency = watchedItems?.[row.index]?.currency || 'TRY';
        return (
          <TextField
            type="text"
            inputMode="decimal"
            label={tr.crm.quotes.form.unitPriceLabel(currency)}
            hideLabel
            error={errors.items?.[row.index]?.unitPrice?.message}
            {...decimalOnly(register(`items.${row.index}.unitPrice` as const))}
          />
        );
      },
    },
    {
      key: 'currency',
      header: tr.crm.quotes.form.currencyLabel,
      className: 'align-top w-[9%]',
      render: (row) => (
        <Controller
          control={control}
          name={`items.${row.index}.currency` as const}
          render={({ field }) => (
            <Select
              label={tr.crm.quotes.form.currencyLabel}
              hideLabel
              options={QUOTE_CURRENCY_OPTIONS}
              value={field.value || 'TRY'}
              onChange={(event) => void handleRowCurrencyChange(row.index, event.target.value)}
            />
          )}
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
          label={tr.crm.quotes.form.discountPctLabel}
          hideLabel
          error={errors.items?.[row.index]?.discountPct?.message}
          {...decimalOnly(register(`items.${row.index}.discountPct` as const))}
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
          label={tr.crm.quotes.form.vatPctLabel}
          hideLabel
          error={errors.items?.[row.index]?.vatPct?.message}
          {...decimalOnly(register(`items.${row.index}.vatPct` as const))}
        />
      ),
    },
    {
      key: 'brand',
      header: tr.crm.products.brandColumn,
      className: 'align-top w-[19%]',
      render: (row) => (
        <Controller
          control={control}
          name={`items.${row.index}.brand` as const}
          render={({ field }) => (
            <BrandSelect
              value={field.value ?? ''}
              onChange={field.onChange}
              hideLabel
              compactAddButton
              onRequestAddNew={() => {
                setBrandTargetIndex(row.index);
                setIsBrandModalOpen(true);
              }}
            />
          )}
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
        <div className="flex items-center justify-end">
          <IconActionButton
            icon={X}
            tooltip={tr.crm.purchaseOrders.detail.removeItem}
            variant="danger"
            onClick={() => remove(row.index)}
          />
        </div>
      ),
    },
  ];

  const onSubmit = handleSubmit((values) => {
    createMutation.mutate(
      {
        accountId: values.accountId,
        items: values.items.map((item) => ({
          productId: item.productId,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          currency: item.currency || undefined,
          discountPct: item.discountPct ? Number(item.discountPct) : 0,
          vatPct: item.vatPct ? Number(item.vatPct) : 0,
          brand: item.brand || undefined,
        })),
      },
      {
        onSuccess: (salesOrder) => {
          toast.success(tr.crm.salesOrders.form.createSuccess);
          navigate(`/satis-siparisleri/${salesOrder.id}`);
        },
        onError: (error) => {
          toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
        },
      },
    );
  });

  const apiErrorMessage =
    createMutation.error instanceof ApiError ? createMutation.error.message : undefined;

  return (
    <AppShell>
      <BackLink to="/siparisler?tab=salesOrders" label={tr.crm.salesOrders.detail.back} />

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-bold text-app-text">{tr.crm.salesOrders.form.newTitle}</h1>
        <PageHelp text={tr.help.salesOrderCreate} />
      </div>

      <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-6" noValidate>
        <FormError message={apiErrorMessage} />

        <Controller
          name="accountId"
          control={control}
          render={({ field }) => (
            <AccountAutocomplete
              label={tr.crm.salesOrders.form.accountLabel}
              error={errors.accountId?.message}
              value={field.value}
              onChange={field.onChange}
              loadAllWhenEmpty
            />
          )}
        />

        <div className="flex flex-col gap-4 rounded-lg border border-app-border bg-app-surface p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-app-text">
              {tr.crm.salesOrders.form.summaryTitle}
            </h2>
            <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold text-app-primary">
              {tr.crm.salesOrders.form.summaryItemCount(summaryRows.length)}
            </span>
          </div>

          <Select
            label={tr.crm.salesOrders.form.productListLabel}
            required
            placeholder={tr.crm.salesOrders.form.productListPlaceholder}
            hint={tr.crm.salesOrders.form.productListHint}
            error={errors.productListId?.message}
            options={productListOptions}
            trailingAction={
              <Button
                type="button"
                variant="navy"
                className="shrink-0"
                onClick={() => setIsNewProductModalOpen(true)}
              >
                {tr.crm.quotes.form.newProductButton}
              </Button>
            }
            {...register('productListId')}
          />

          <FormError message={errors.items?.message} />

          <div>
            <Button
              type="button"
              className="w-full"
              disabled={!selectedProductListId}
              onClick={() => append(defaultItem(defaultVatPct))}
            >
              {tr.crm.quotes.form.addLineButton}
            </Button>
          </div>

          {!selectedProductListId ? (
            <p className="rounded-lg border border-dashed border-app-border p-4 text-center text-sm text-app-muted">
              {tr.crm.quotes.form.pickerSelectProductListFirst}
            </p>
          ) : summaryRows.length === 0 ? (
            <p className="text-sm text-app-muted">{tr.crm.salesOrders.form.summaryEmpty}</p>
          ) : (
            <Table columns={itemColumns} data={itemRows} keyField={(row) => row.id} fixedLayout />
          )}

          {summaryTotalsByCurrency.length > 0 && (
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
          )}
        </div>

        <div>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending
              ? tr.crm.salesOrders.form.creating
              : tr.crm.salesOrders.form.create}
          </Button>
        </div>
      </form>

      {isNewProductModalOpen && (
        <NewProductModal
          defaultProductListId={selectedProductListId}
          onClose={() => setIsNewProductModalOpen(false)}
          onCreated={handleProductCreated}
        />
      )}
      {isBrandModalOpen && (
        <AddOptionModal
          title={tr.crm.products.form.brandNewModalTitle}
          fieldLabel={tr.crm.products.form.brandNewFieldLabel}
          placeholder={tr.crm.products.form.brandNewPlaceholder}
          successMessage={tr.crm.products.form.brandNewSuccess}
          createMutation={createBrandOptionMutation}
          onClose={() => {
            setIsBrandModalOpen(false);
            setBrandTargetIndex(null);
          }}
          onCreated={(label) => {
            if (brandTargetIndex !== null) {
              setValue(`items.${brandTargetIndex}.brand`, label);
            }
            setIsBrandModalOpen(false);
            setBrandTargetIndex(null);
          }}
        />
      )}
    </AppShell>
  );
}
