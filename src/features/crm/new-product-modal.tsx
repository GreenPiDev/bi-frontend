import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '../../components/ui/button';
import { FormError } from '../../components/ui/form-error';
import { Modal } from '../../components/ui/modal';
import { useToast } from '../../components/ui/toast-context';
import { AddOptionModal } from './add-option-modal';
import { ProductFormFields } from './product-form-fields';
import { cleanEmptyStrings, productFormSchema, type ProductFormValues } from './schemas';
import { useCreateBrandOptionMutation } from './use-brand-options';
import { useCreateProductCategoryOptionMutation } from './use-product-categories';
import { useCreateProductMutation } from './use-products';
import { useCreateUnitOptionMutation } from './use-unit-options';
import { ApiError, type Product, type ProductInput } from '../../lib/api';
import { tr } from '../../i18n/tr';

type OptionFieldKind = 'unit' | 'category' | 'brand';

interface NewProductModalProps {
  defaultProductListId?: string;
  onClose: () => void;
  onCreated: (product: Product) => void;
}

/** `NewContactModal` ile aynı desen: sisteme kayıtlı olmayan bir ürünü, teklif/ürün
 * listesi ekranından ayrılmadan, "+ Yeni Ürün" ile hemen oluşturup çağırana geri verir
 * (bkz. `quote-form-page.tsx`). Birim/Kategori/Marka "+ Yeni ..." modalları -
 * `product-form-page.tsx`'teki aynı sebeple - bu bileşenin kendi `<form>`'unun DIŞINDA
 * render edilir. */
export function NewProductModal({
  defaultProductListId,
  onClose,
  onCreated,
}: NewProductModalProps) {
  const toast = useToast();
  const createMutation = useCreateProductMutation();
  const createUnitOptionMutation = useCreateUnitOptionMutation();
  const createCategoryOptionMutation = useCreateProductCategoryOptionMutation();
  const createBrandOptionMutation = useCreateBrandOptionMutation();
  const [activeOptionModal, setActiveOptionModal] = useState<OptionFieldKind | null>(null);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      unit: '',
      currency: 'TRY',
      productListId: defaultProductListId,
    },
  });

  const onSubmit = handleSubmit((values) => {
    const cleaned = cleanEmptyStrings(values);
    const input: ProductInput = {
      productListId: cleaned.productListId,
      name: cleaned.name,
      sku: cleaned.sku,
      unit: cleaned.unit,
      minStockLevel: cleaned.minStockLevel ? Number(cleaned.minStockLevel) : undefined,
      maxDiscountPct: cleaned.maxDiscountPct ? Number(cleaned.maxDiscountPct) : undefined,
      price: Number(cleaned.price),
      currency: cleaned.currency,
      description: cleaned.description ?? undefined,
      category: cleaned.category ?? undefined,
      brand: cleaned.brand ?? undefined,
    };

    createMutation.mutate(input, {
      onSuccess: (product) => {
        toast.success(tr.crm.quotes.form.newProductCreatedAndAdded);
        onCreated(product);
      },
      onError: (error) => {
        toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
      },
    });
  });

  const apiErrorMessage =
    createMutation.error instanceof ApiError ? createMutation.error.message : undefined;

  return (
    <>
      <Modal title={tr.crm.products.form.newTitle} onClose={onClose} width="lg">
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <FormError message={apiErrorMessage} />
          <ProductFormFields
            register={register}
            control={control}
            errors={errors}
            onRequestAddUnit={() => setActiveOptionModal('unit')}
            onRequestAddCategory={() => setActiveOptionModal('category')}
            onRequestAddBrand={() => setActiveOptionModal('brand')}
          />
          <div className="mt-1 flex gap-2">
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending
                ? tr.crm.products.form.submitting
                : tr.crm.products.form.submit}
            </Button>
            <Button type="button" variant="secondary" onClick={onClose}>
              {tr.crm.products.form.cancel}
            </Button>
          </div>
        </form>
      </Modal>

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
    </>
  );
}
