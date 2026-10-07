import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { AppShell } from './app-shell';
import { BackLink } from '../components/ui/back-link';
import { Button } from '../components/ui/button';
import { FormError } from '../components/ui/form-error';
import { useToast } from '../components/ui/toast-context';
import { AddOptionModal } from '../features/crm/add-option-modal';
import { AddProductListModal } from '../features/crm/add-product-list-modal';
import { ProductFormFields } from '../features/crm/product-form-fields';
import { useCreateBrandOptionMutation } from '../features/crm/use-brand-options';
import { useCreateProductCategoryOptionMutation } from '../features/crm/use-product-categories';
import {
  useCreateProductMutation,
  useProductQuery,
  useUpdateProductMutation,
} from '../features/crm/use-products';
import { useCreateUnitOptionMutation } from '../features/crm/use-unit-options';
import { productFormSchema, type ProductFormValues } from '../features/crm/schemas';
import { ApiError, type ProductInput } from '../lib/api';
import { tr } from '../i18n/tr';

type OptionFieldKind = 'unit' | 'category' | 'brand' | 'productList';

export function ProductFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as { from?: string; productListId?: string } | null;
  const backTo = locationState?.from ?? '/urunler';
  const preselectedProductListId = locationState?.productListId;
  const toast = useToast();
  const productQuery = useProductQuery(id ?? '');
  const createMutation = useCreateProductMutation();
  const updateMutation = useUpdateProductMutation(id ?? '');
  const mutation = isEdit ? updateMutation : createMutation;
  const createUnitOptionMutation = useCreateUnitOptionMutation();
  const createCategoryOptionMutation = useCreateProductCategoryOptionMutation();
  const createBrandOptionMutation = useCreateBrandOptionMutation();
  // Birim/Kategori/Marka icin "+ Yeni ..." modallari bilincli olarak <form>'un DISINDA
  // render edilir (asagida) - Select'lerin kendi icinde render edilselerdi modal'in
  // <form>'u disardaki urun formunun <form>'una ic ice girer, "Kaydet" native submit'e
  // dusup sayfayi yeniler ve eklenen deger hic kaydedilmez (bkz. kullanici bildirimi).
  const [activeOptionModal, setActiveOptionModal] = useState<OptionFieldKind | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      unit: '',
      currency: 'TRY',
      productListId: preselectedProductListId,
    },
  });

  useEffect(() => {
    if (productQuery.data) {
      reset({
        productListId: productQuery.data.productListId,
        name: productQuery.data.name,
        sku: productQuery.data.sku ?? undefined,
        unit: productQuery.data.unit,
        minStockLevel: productQuery.data.minStockLevel?.toString() ?? undefined,
        maxDiscountPct: productQuery.data.maxDiscountPct ?? undefined,
        price: productQuery.data.price ?? undefined,
        currency: productQuery.data.currency,
        description: productQuery.data.description ?? undefined,
        category: productQuery.data.category ?? undefined,
        brand: productQuery.data.brand ?? undefined,
        drawingWidthMm: productQuery.data.drawingSpec?.widthMm ?? undefined,
        drawingHeightMm: productQuery.data.drawingSpec?.heightMm ?? undefined,
        drawingDepthMm: productQuery.data.drawingSpec?.depthMm ?? undefined,
        drawingLibraryComponentKey: productQuery.data.drawingSpec?.libraryComponentKey ?? undefined,
        drawingBandOrder: productQuery.data.drawingSpec?.bandOrder?.toString() ?? undefined,
        drawingBandKey: productQuery.data.drawingSpec?.bandKey ?? undefined,
      });
    }
  }, [productQuery.data, reset]);

  if (isEdit && productQuery.isPending) {
    return (
      <AppShell>
        <p className="text-sm text-app-muted">{tr.common.loading}</p>
      </AppShell>
    );
  }

  const onSubmit = handleSubmit(async (values) => {
    // Olusturma seması (`CreateProductSchema`) bu alanlarda `null` kabul etmiyor, sadece
    // `undefined` - guncelleme semasi (`UpdateProductSchema`) ise `null`'ı alanı temizlemek
    // icin kullanıyor. Bos deger bu yuzden moda gore farkli temsil edilir (bkz. kullanici
    // bildirimi, /urunler/yeni'de bos opsiyonel alanla submit engelleniyordu).
    const emptyValue = isEdit ? null : undefined;
    const input: ProductInput = {
      productListId: values.productListId,
      name: values.name,
      sku: values.sku || undefined,
      unit: values.unit,
      minStockLevel: values.minStockLevel ? Number(values.minStockLevel) : undefined,
      maxDiscountPct:
        values.maxDiscountPct === undefined || values.maxDiscountPct === ''
          ? emptyValue
          : Number(values.maxDiscountPct),
      price: Number(values.price),
      currency: values.currency,
      description: values.description || emptyValue,
      category: values.category || emptyValue,
      brand: values.brand || emptyValue,
      drawingSpec: {
        widthMm: values.drawingWidthMm ? Number(values.drawingWidthMm) : emptyValue,
        heightMm: values.drawingHeightMm ? Number(values.drawingHeightMm) : emptyValue,
        depthMm: values.drawingDepthMm ? Number(values.drawingDepthMm) : emptyValue,
        libraryComponentKey: values.drawingLibraryComponentKey || emptyValue,
        bandOrder: values.drawingBandOrder ? Number(values.drawingBandOrder) : emptyValue,
        bandKey: values.drawingBandKey || emptyValue,
      },
    };

    try {
      await mutation.mutateAsync(input);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
      return;
    }

    toast.success(isEdit ? tr.crm.products.form.updateSuccess : tr.crm.products.form.createSuccess);
    navigate(backTo);
  });

  const apiErrorMessage = mutation.error instanceof ApiError ? mutation.error.message : undefined;
  const isSaving = mutation.isPending;

  return (
    <AppShell>
      <BackLink to={backTo} label={tr.crm.products.title} />

      <div className="mt-6">
        <h1 className="text-lg font-bold text-app-text">
          {isEdit ? tr.crm.products.form.editTitle : tr.crm.products.form.newTitle}
        </h1>

        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4" noValidate>
          <FormError message={apiErrorMessage} />
          <ProductFormFields
            register={register}
            control={control}
            errors={errors}
            onRequestAddUnit={() => setActiveOptionModal('unit')}
            onRequestAddCategory={() => setActiveOptionModal('category')}
            onRequestAddBrand={() => setActiveOptionModal('brand')}
            onRequestAddProductList={() => setActiveOptionModal('productList')}
          />
          <div className="mt-1 flex gap-2">
            <Button type="submit" disabled={isSaving}>
              {isSaving ? tr.crm.products.form.submitting : tr.crm.products.form.submit}
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate(backTo)}>
              {tr.crm.products.form.cancel}
            </Button>
          </div>
        </form>
      </div>

      {activeOptionModal === 'unit' && (
        <AddOptionModal
          title={tr.crm.products.form.unitNewModalTitle}
          fieldLabel={tr.crm.products.form.unitNewFieldLabel}
          placeholder={tr.crm.products.form.unitNewPlaceholder}
          successMessage={tr.crm.products.form.unitNewSuccess}
          createMutation={createUnitOptionMutation}
          onClose={() => setActiveOptionModal(null)}
          onCreated={(label) => {
            setValue('unit', label, { shouldValidate: true });
            setActiveOptionModal(null);
          }}
        />
      )}
      {activeOptionModal === 'category' && (
        <AddOptionModal
          title={tr.crm.products.form.categoryNewModalTitle}
          fieldLabel={tr.crm.products.form.categoryNewFieldLabel}
          placeholder={tr.crm.products.form.categoryNewPlaceholder}
          successMessage={tr.crm.products.form.categoryNewSuccess}
          createMutation={createCategoryOptionMutation}
          onClose={() => setActiveOptionModal(null)}
          onCreated={(label) => {
            setValue('category', label, { shouldValidate: true });
            setActiveOptionModal(null);
          }}
        />
      )}
      {activeOptionModal === 'brand' && (
        <AddOptionModal
          title={tr.crm.products.form.brandNewModalTitle}
          fieldLabel={tr.crm.products.form.brandNewFieldLabel}
          placeholder={tr.crm.products.form.brandNewPlaceholder}
          successMessage={tr.crm.products.form.brandNewSuccess}
          createMutation={createBrandOptionMutation}
          onClose={() => setActiveOptionModal(null)}
          onCreated={(label) => {
            setValue('brand', label, { shouldValidate: true });
            setActiveOptionModal(null);
          }}
        />
      )}
      {activeOptionModal === 'productList' && (
        <AddProductListModal
          onClose={() => setActiveOptionModal(null)}
          onCreated={(productList) => {
            setValue('productListId', productList.id, { shouldValidate: true });
            setActiveOptionModal(null);
          }}
        />
      )}
    </AppShell>
  );
}
