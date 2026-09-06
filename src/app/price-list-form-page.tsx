import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { AppShell } from './app-shell';
import { Button } from '../components/ui/button';
import { FormError } from '../components/ui/form-error';
import { Select } from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import { TextField } from '../components/ui/text-field';
import { useToast } from '../components/ui/toast-context';
import { useProductsQuery } from '../features/crm/use-products';
import {
  useCreatePriceListMutation,
  usePriceListQuery,
  useUpdatePriceListMutation,
} from '../features/crm/use-price-lists';
import { priceListFormSchema, type PriceListFormValues } from '../features/crm/schemas';
import { ApiError, type PriceListInput } from '../lib/api';
import { tr } from '../i18n/tr';

export function PriceListFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const toast = useToast();
  const productsQuery = useProductsQuery();
  const priceListQuery = usePriceListQuery(id ?? '');
  const createMutation = useCreatePriceListMutation();
  const updateMutation = useUpdatePriceListMutation(id ?? '');
  const mutation = isEdit ? updateMutation : createMutation;

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PriceListFormValues>({
    resolver: zodResolver(priceListFormSchema),
    defaultValues: { items: [{ productId: '', unitPrice: '' }] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  useEffect(() => {
    if (priceListQuery.data) {
      reset({
        name: priceListQuery.data.name,
        isDefault: priceListQuery.data.isDefault,
        items: priceListQuery.data.items.map((item) => ({
          productId: item.productId,
          unitPrice: item.unitPrice,
        })),
      });
    }
  }, [priceListQuery.data, reset]);

  if (isEdit && priceListQuery.isPending) {
    return (
      <AppShell>
        <p className="text-sm text-app-muted">{tr.common.loading}</p>
      </AppShell>
    );
  }

  const productOptions = (productsQuery.data?.data ?? []).map((product) => ({
    value: product.id,
    label: product.name,
  }));

  const onSubmit = handleSubmit((values) => {
    const input: PriceListInput = {
      name: values.name,
      isDefault: values.isDefault,
      items: values.items.map((item) => ({
        productId: item.productId,
        unitPrice: Number(item.unitPrice),
      })),
    };
    mutation.mutate(input, {
      onSuccess: () => {
        toast.success(
          isEdit ? tr.crm.priceLists.form.updateSuccess : tr.crm.priceLists.form.createSuccess,
        );
        navigate('/fiyat-listeleri');
      },
      onError: (error) => {
        toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
      },
    });
  });

  const apiErrorMessage = mutation.error instanceof ApiError ? mutation.error.message : undefined;

  return (
    <AppShell>
      <button
        type="button"
        onClick={() => navigate('/fiyat-listeleri')}
        className="text-sm font-semibold text-app-muted hover:text-app-text"
      >
        {'←'} {tr.crm.priceLists.title}
      </button>

      <div className="mx-auto mt-6 max-w-2xl rounded-xl border border-app-border bg-app-surface p-8">
        <h1 className="text-lg font-bold text-app-text">
          {isEdit ? tr.crm.priceLists.form.editTitle : tr.crm.priceLists.form.newTitle}
        </h1>

        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-6" noValidate>
          <FormError message={apiErrorMessage} />

          <div className="flex flex-col gap-4">
            <TextField
              label={tr.crm.priceLists.form.nameLabel}
              error={errors.name?.message}
              {...register('name')}
            />
            <Controller
              name="isDefault"
              control={control}
              render={({ field }) => (
                <div className="flex items-center gap-2">
                  <Switch checked={field.value ?? false} onChange={field.onChange} />
                  <span className="text-sm font-semibold text-app-text">
                    {tr.crm.priceLists.form.isDefaultLabel}
                  </span>
                </div>
              )}
            />
          </div>

          <div className="rounded-lg border border-app-border p-4">
            <span className="text-sm font-semibold text-app-text">
              {tr.crm.priceLists.form.itemsSectionTitle}
            </span>
            <FormError message={errors.items?.message} />
            <div className="mt-3 flex flex-col gap-3">
              {fields.map((field, index) => (
                <div key={field.id} className="flex items-end gap-2">
                  <div className="flex-1">
                    <Select
                      label={tr.crm.priceLists.form.productLabel}
                      options={productOptions}
                      error={errors.items?.[index]?.productId?.message}
                      {...register(`items.${index}.productId` as const)}
                    />
                  </div>
                  <div className="flex-1">
                    <TextField
                      type="number"
                      step="0.01"
                      label={tr.crm.priceLists.form.unitPriceLabel}
                      error={errors.items?.[index]?.unitPrice?.message}
                      {...register(`items.${index}.unitPrice` as const)}
                    />
                  </div>
                  <Button type="button" variant="secondary" onClick={() => remove(index)}>
                    {tr.crm.priceLists.form.removeItem}
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="secondary"
                onClick={() => append({ productId: '', unitPrice: '' })}
              >
                {tr.crm.priceLists.form.addItem}
              </Button>
            </div>
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending
                ? tr.crm.priceLists.form.submitting
                : tr.crm.priceLists.form.submit}
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate('/fiyat-listeleri')}>
              {tr.crm.priceLists.form.cancel}
            </Button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
