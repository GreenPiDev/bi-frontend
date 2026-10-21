import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AppShell } from './app-shell';
import { AccountAutocomplete } from '../features/crm/account-autocomplete';
import { BackLink } from '../components/ui/back-link';
import { Button } from '../components/ui/button';
import { FormError } from '../components/ui/form-error';
import { PageHelp } from '../components/ui/page-help';
import { useToast } from '../components/ui/toast-context';
import { AddOptionModal } from '../features/crm/add-option-modal';
import { NewProductModal } from '../features/crm/new-product-modal';
import { QuoteItemLinesCard } from '../features/crm/quote-item-lines-card';
import { useCreateBrandOptionMutation } from '../features/crm/use-brand-options';
import { useProductListsQuery } from '../features/crm/use-product-lists';
import { useCreateProductMutation } from '../features/crm/use-products';
import { useCreateSalesOrderMutation } from '../features/crm/use-sales-orders';
import { useTenantSettingsQuery } from '../features/crm/use-tenant-settings';
import { useUnitOptionsQuery } from '../features/crm/use-unit-options';
import {
  DEFAULT_QUOTE_VAT_PCT,
  DEFAULT_QUOTE_VAT_PCT_KEY,
} from '../features/crm/tenant-settings.constants';
import {
  salesOrderCreateFormSchema,
  type SalesOrderCreateFormValues,
} from '../features/crm/schemas';
import { ApiError, type Product } from '../lib/api';
import { tr } from '../i18n/tr';

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
 * Özeti" kartiyla AYNI (2026-10-19 kullanici istegi: "ayni olsun"), artik gercekten
 * ortak `QuoteItemLinesCard` bileseni uzerinden (2026-10-21, bkz. o dosyanin doc
 * comment'i): tek seferlik urun listesi secimi + "+ Yeni Ürün" (NewProductModal),
 * ProductAutocomplete'e secili listede eslesmeyen bir ad yazilinca hizli urun ekleme
 * (submit'te resolveQuickAddedProducts urunu gercekten olusturup productId'sini
 * doldurur - quote-form-page.tsx ile ayni mantik), satir tablosu (Urun/Miktar/Birim
 * Fiyat/Para Birimi/Iskonto (%)/KDV (%)/Marka + "+ Yeni Marka", Tutar), para birimi
 * bazinda ara toplam/KDV/genel toplam ozeti - bkz. backend SalesOrderItem model doc
 * comment'i (costPriceAtSale/iskonto-onay akisi HARIC, bkz. docs/VARSAYIMLAR.md V69).
 * Teklif formundan farkli olarak kur cevrimi bolumu (QuoteExchangeRatesSection) YOK -
 * satis siparisinde teklifin tersine tek bir para birimi kavrami yok. */
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
  const unitOptionsQuery = useUnitOptionsQuery();
  const createProductMutation = useCreateProductMutation();

  const [isNewProductModalOpen, setIsNewProductModalOpen] = useState(false);
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);
  // "+ Yeni Marka" hangi satirdan tetiklendi - quote-form-page.tsx'teki
  // brandTargetIndex ile ayni desen.
  const [brandTargetIndex, setBrandTargetIndex] = useState<number | null>(null);

  const {
    control,
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
  // quote-form-page.tsx'teki itemRowErrors ile ayni donusum - QuoteItemLinesCard'in
  // beklediği duz string hata sekline cevirir.
  const rawItemErrors = errors.items as
    | Array<
        | {
            productId?: { message?: string };
            quantity?: { message?: string };
            unitPrice?: { message?: string };
            discountPct?: { message?: string };
            vatPct?: { message?: string };
          }
        | undefined
      >
    | undefined;
  const itemRowErrors = (rawItemErrors ?? []).map((itemError) =>
    itemError
      ? {
          productId: itemError.productId?.message,
          quantity: itemError.quantity?.message,
          unitPrice: itemError.unitPrice?.message,
          discountPct: itemError.discountPct?.message,
          vatPct: itemError.vatPct?.message,
        }
      : undefined,
  );

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

  // Satirda gercek bir urun secilmemis ama ProductAutocomplete'e serbest metin bir ad
  // yazilmissa (hizli urun ekleme), submit oncesi o urunu secili urun listesine
  // gercekten olusturup productId'sini doldurur - quote-form-page.tsx'teki
  // resolveQuickAddedProducts ile ayni mantik.
  async function resolveQuickAddedProducts(
    items: SalesOrderCreateFormValues['items'],
  ): Promise<SalesOrderCreateFormValues['items']> {
    const defaultUnit =
      unitOptionsQuery.data?.find((option) => option.isDefault)?.label ??
      unitOptionsQuery.data?.[0]?.label ??
      'adet';
    const resolved = [...items];
    for (let index = 0; index < resolved.length; index += 1) {
      const item = resolved[index];
      if (item.productId) continue;
      const quickAddName = (item.productName ?? '').trim();
      if (!quickAddName) continue;
      const product = await createProductMutation.mutateAsync({
        productListId: selectedProductListId!,
        name: quickAddName,
        unit: defaultUnit,
        price: Number(item.unitPrice),
        currency: item.currency || 'TRY',
        brand: item.brand || undefined,
      });
      resolved[index] = { ...item, productId: product.id };
    }
    return resolved;
  }

  const onSubmit = handleSubmit(async (values) => {
    let resolvedItems: SalesOrderCreateFormValues['items'];
    try {
      resolvedItems = await resolveQuickAddedProducts(values.items);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
      return;
    }

    createMutation.mutate(
      {
        accountId: values.accountId,
        items: resolvedItems.map((item) => ({
          productId: item.productId!,
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

        <QuoteItemLinesCard
          texts={{
            title: tr.crm.salesOrders.form.summaryTitle,
            productListHint: tr.crm.salesOrders.form.productListHint,
            emptyState: tr.crm.salesOrders.form.summaryEmpty,
          }}
          productListId={selectedProductListId}
          productListOptions={productListOptions}
          productListError={errors.productListId?.message}
          onProductListChange={(value) =>
            setValue('productListId', value, { shouldValidate: true })
          }
          onRequestAddProductList={() => setIsNewProductModalOpen(true)}
          itemKeys={fields.map((field) => field.id)}
          items={watchedItems ?? []}
          itemErrors={itemRowErrors}
          itemsError={errors.items?.message}
          defaultVatPct={defaultVatPct}
          onAddItem={() => append(defaultItem(defaultVatPct))}
          onRemoveItem={remove}
          onItemChange={(index, field, value) =>
            setValue(`items.${index}.${field}` as never, value as never, {
              shouldValidate: true,
            })
          }
          onRequestAddBrand={(index) => {
            setBrandTargetIndex(index);
            setIsBrandModalOpen(true);
          }}
          onProductFreeTextChange={(index, text) => setValue(`items.${index}.productName`, text)}
        />

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
