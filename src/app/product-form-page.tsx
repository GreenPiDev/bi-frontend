import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { AppShell } from './app-shell';
import { BackLink } from '../components/ui/back-link';
import { Button } from '../components/ui/button';
import { FormError } from '../components/ui/form-error';
import { Select } from '../components/ui/select';
import { TextField } from '../components/ui/text-field';
import { TextareaField } from '../components/ui/textarea-field';
import { useToast } from '../components/ui/toast-context';
import { BrandSelect } from '../features/crm/brand-select';
import { CategorySelect } from '../features/crm/category-select';
import { ProductListSelect } from '../features/crm/product-list-select';
import { UnitSelect } from '../features/crm/unit-select';
import {
  useCreateProductMutation,
  useProductQuery,
  useUpdateProductMutation,
} from '../features/crm/use-products';
import { productFormSchema, type ProductFormValues } from '../features/crm/schemas';
import { ApiError, type ProductInput } from '../lib/api';
import { tr } from '../i18n/tr';

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

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      unit: '',
      currency: 'TRY',
      productListId: preselectedProductListId,
    },
  });

  const minStockLevelField = register('minStockLevel');
  const maxDiscountPctField = register('maxDiscountPct');
  const costPriceField = register('costPrice');
  const priceField = register('price');

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
        costPrice: productQuery.data.costPrice ?? undefined,
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
    const input: ProductInput = {
      productListId: values.productListId,
      name: values.name,
      sku: values.sku || undefined,
      unit: values.unit,
      minStockLevel: values.minStockLevel ? Number(values.minStockLevel) : undefined,
      maxDiscountPct:
        values.maxDiscountPct === undefined || values.maxDiscountPct === ''
          ? null
          : Number(values.maxDiscountPct),
      price: values.price === undefined || values.price === '' ? null : Number(values.price),
      currency: values.currency,
      description: values.description || null,
      category: values.category || null,
      brand: values.brand || null,
      costPrice:
        values.costPrice === undefined || values.costPrice === '' ? null : Number(values.costPrice),
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

        <form
          onSubmit={onSubmit}
          className="mt-6 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2"
          noValidate
        >
          <div className="sm:col-span-2">
            <FormError message={apiErrorMessage} />
          </div>
          <Controller
            name="productListId"
            control={control}
            render={({ field }) => (
              <ProductListSelect
                value={field.value ?? ''}
                onChange={field.onChange}
                error={errors.productListId?.message}
              />
            )}
          />
          <TextField
            label={tr.crm.products.form.nameLabel}
            required
            hint={tr.crm.products.form.nameHint}
            error={errors.name?.message}
            {...register('name')}
          />
          <TextField
            label={tr.crm.products.form.skuLabel}
            hint={tr.crm.products.form.skuHint}
            error={errors.sku?.message}
            {...register('sku')}
          />
          <Controller
            name="unit"
            control={control}
            render={({ field }) => (
              <UnitSelect
                value={field.value ?? ''}
                onChange={field.onChange}
                error={errors.unit?.message}
              />
            )}
          />
          <Controller
            name="category"
            control={control}
            render={({ field }) => (
              <CategorySelect
                value={field.value ?? ''}
                onChange={field.onChange}
                error={errors.category?.message}
              />
            )}
          />
          <Controller
            name="brand"
            control={control}
            render={({ field }) => (
              <BrandSelect
                value={field.value ?? ''}
                onChange={field.onChange}
                error={errors.brand?.message}
              />
            )}
          />
          <div className="sm:col-span-2">
            <TextareaField
              label={tr.crm.products.form.descriptionLabel}
              hint={tr.crm.products.form.descriptionHint}
              error={errors.description?.message}
              {...register('description')}
            />
          </div>
          <TextField
            type="text"
            inputMode="decimal"
            label={tr.crm.products.form.priceLabel}
            hint={tr.crm.products.form.priceHint}
            error={errors.price?.message}
            {...priceField}
            onChange={(event) => {
              event.target.value = event.target.value.replace(/[^0-9.]/g, '');
              priceField.onChange(event);
            }}
          />
          <Select
            label={tr.crm.products.form.currencyLabel}
            required
            error={errors.currency?.message}
            options={[
              { value: 'TRY', label: 'TRY' },
              { value: 'EUR', label: 'EUR' },
              { value: 'USD', label: 'USD' },
            ]}
            {...register('currency')}
          />
          <TextField
            type="text"
            inputMode="decimal"
            label={tr.crm.products.form.costPriceLabel}
            hint={tr.crm.products.form.costPriceHint}
            error={errors.costPrice?.message}
            {...costPriceField}
            onChange={(event) => {
              event.target.value = event.target.value.replace(/[^0-9.]/g, '');
              costPriceField.onChange(event);
            }}
          />
          <TextField
            type="text"
            inputMode="numeric"
            label={tr.crm.products.form.minStockLevelLabel}
            hint={tr.crm.products.form.minStockLevelHint}
            error={errors.minStockLevel?.message}
            {...minStockLevelField}
            onChange={(event) => {
              event.target.value = event.target.value.replace(/[^0-9]/g, '');
              minStockLevelField.onChange(event);
            }}
          />
          <TextField
            type="text"
            inputMode="decimal"
            label={tr.crm.products.form.maxDiscountPctLabel}
            hint={tr.crm.products.form.maxDiscountPctHint}
            error={errors.maxDiscountPct?.message}
            {...maxDiscountPctField}
            onChange={(event) => {
              event.target.value = event.target.value.replace(/[^0-9.]/g, '');
              maxDiscountPctField.onChange(event);
            }}
          />
          <div className="mt-1 flex gap-2 sm:col-span-2">
            <Button type="submit" disabled={isSaving}>
              {isSaving ? tr.crm.products.form.submitting : tr.crm.products.form.submit}
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate(backTo)}>
              {tr.crm.products.form.cancel}
            </Button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
