import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { AppShell } from './app-shell';
import { Button } from '../components/ui/button';
import { ConfirmModal } from '../components/ui/confirm-modal';
import { FormError } from '../components/ui/form-error';
import { TextField } from '../components/ui/text-field';
import { TextareaField } from '../components/ui/textarea-field';
import { useToast } from '../components/ui/toast-context';
import {
  useCreateProductMutation,
  useDeleteProductImageMutation,
  useProductQuery,
  useUpdateProductMutation,
  useUploadProductImageMutation,
} from '../features/crm/use-products';
import { productFormSchema, type ProductFormValues } from '../features/crm/schemas';
import { ApiError, type ProductInput } from '../lib/api';
import { tr } from '../i18n/tr';

const MAX_IMAGE_SIZE_BYTES = 1.5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function ProductFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [removingImage, setRemovingImage] = useState(false);
  const productQuery = useProductQuery(id ?? '');
  const createMutation = useCreateProductMutation();
  const updateMutation = useUpdateProductMutation(id ?? '');
  const uploadImageMutation = useUploadProductImageMutation(id ?? '');
  const deleteImageMutation = useDeleteProductImageMutation(id ?? '');
  const mutation = isEdit ? updateMutation : createMutation;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: { unit: 'adet' },
  });

  const minStockLevelField = register('minStockLevel');
  const maxDiscountPctField = register('maxDiscountPct');
  const costPriceField = register('costPrice');

  useEffect(() => {
    if (productQuery.data) {
      reset({
        name: productQuery.data.name,
        sku: productQuery.data.sku ?? undefined,
        unit: productQuery.data.unit,
        minStockLevel: productQuery.data.minStockLevel?.toString() ?? undefined,
        maxDiscountPct: productQuery.data.maxDiscountPct ?? undefined,
        description: productQuery.data.description ?? undefined,
        category: productQuery.data.category ?? undefined,
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

  const onSubmit = handleSubmit((values) => {
    const input: ProductInput = {
      name: values.name,
      sku: values.sku || undefined,
      unit: values.unit,
      minStockLevel: values.minStockLevel ? Number(values.minStockLevel) : undefined,
      maxDiscountPct:
        values.maxDiscountPct === undefined || values.maxDiscountPct === ''
          ? null
          : Number(values.maxDiscountPct),
      description: values.description || null,
      category: values.category || null,
      costPrice:
        values.costPrice === undefined || values.costPrice === '' ? null : Number(values.costPrice),
    };
    mutation.mutate(input, {
      onSuccess: (product) => {
        toast.success(
          isEdit ? tr.crm.products.form.updateSuccess : tr.crm.products.form.createSuccess,
        );
        if (isEdit) {
          return;
        }
        navigate(`/urunler/duzenle/${product.id}`);
      },
      onError: (error) => {
        toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
      },
    });
  });

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      toast.error(tr.crm.products.detail.imageUnsupportedType);
      return;
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      toast.error(tr.crm.products.detail.imageTooLarge);
      return;
    }
    uploadImageMutation.mutate(file, {
      onSuccess: () => toast.success(tr.crm.products.detail.imageUploadSuccess),
      onError: (error) =>
        toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError),
    });
  }

  function handleConfirmRemoveImage() {
    deleteImageMutation.mutate(undefined, {
      onSuccess: () => {
        toast.success(tr.crm.products.detail.imageRemoveSuccess);
        setRemovingImage(false);
      },
      onError: (error) => {
        toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
      },
    });
  }

  const apiErrorMessage = mutation.error instanceof ApiError ? mutation.error.message : undefined;

  return (
    <AppShell>
      <button
        type="button"
        onClick={() => navigate('/urunler')}
        className="text-sm font-semibold text-app-muted hover:text-app-text"
      >
        {'←'} {tr.crm.products.title}
      </button>

      <div className="mx-auto mt-6 max-w-xl rounded-xl border border-app-border bg-app-surface p-8">
        <h1 className="text-lg font-bold text-app-text">
          {isEdit ? tr.crm.products.form.editTitle : tr.crm.products.form.newTitle}
        </h1>

        {isEdit && (
          <div className="mt-6 flex items-center gap-4">
            {productQuery.data?.imageUrl ? (
              <img
                src={productQuery.data.imageUrl}
                alt={tr.crm.products.detail.imageAlt}
                className="h-24 w-24 rounded-lg border border-app-border object-cover"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-lg border border-dashed border-app-border text-center text-xs text-app-muted">
                {tr.crm.products.detail.noImage}
              </div>
            )}
            <div className="flex flex-col gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleImageChange}
              />
              <Button
                type="button"
                variant="secondary"
                disabled={uploadImageMutation.isPending}
                onClick={() => fileInputRef.current?.click()}
              >
                {productQuery.data?.imageUrl
                  ? tr.crm.products.detail.replaceImageButton
                  : tr.crm.products.detail.uploadImageButton}
              </Button>
              {productQuery.data?.imageUrl && (
                <Button type="button" variant="danger" onClick={() => setRemovingImage(true)}>
                  {tr.crm.products.detail.removeImageButton}
                </Button>
              )}
            </div>
          </div>
        )}

        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4" noValidate>
          <FormError message={apiErrorMessage} />
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
            {...register('sku')}
          />
          <TextField
            label={tr.crm.products.form.unitLabel}
            required
            hint={tr.crm.products.form.unitHint}
            error={errors.unit?.message}
            {...register('unit')}
          />
          <TextField
            label={tr.crm.products.form.categoryLabel}
            hint={tr.crm.products.form.categoryHint}
            {...register('category')}
          />
          <TextareaField
            label={tr.crm.products.form.descriptionLabel}
            hint={tr.crm.products.form.descriptionHint}
            {...register('description')}
          />
          <TextField
            type="text"
            inputMode="decimal"
            label={tr.crm.products.form.costPriceLabel}
            hint={tr.crm.products.form.costPriceHint}
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
          <div className="mt-1 flex gap-2">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? tr.crm.products.form.submitting : tr.crm.products.form.submit}
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate('/urunler')}>
              {tr.crm.products.form.cancel}
            </Button>
          </div>
        </form>
      </div>

      {removingImage && (
        <ConfirmModal
          title={tr.crm.products.detail.removeImageConfirmTitle}
          message={tr.crm.products.detail.removeImageConfirm}
          confirmLabel={tr.crm.products.detail.removeImageButton}
          isPending={deleteImageMutation.isPending}
          onConfirm={handleConfirmRemoveImage}
          onCancel={() => setRemovingImage(false)}
        />
      )}
    </AppShell>
  );
}
