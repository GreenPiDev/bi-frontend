import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { AppShell } from './app-shell';
import { BackLink } from '../components/ui/back-link';
import { Button } from '../components/ui/button';
import { FormError } from '../components/ui/form-error';
import { Switch } from '../components/ui/switch';
import { TextField } from '../components/ui/text-field';
import { useToast } from '../components/ui/toast-context';
import {
  useCreateProductListMutation,
  useProductListQuery,
  useUpdateProductListMutation,
} from '../features/crm/use-product-lists';
import { productListFormSchema, type ProductListFormValues } from '../features/crm/schemas';
import { ApiError, type ProductListInput } from '../lib/api';
import { tr } from '../i18n/tr';

export function ProductListFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const toast = useToast();
  const productListQuery = useProductListQuery(id ?? '');
  const createMutation = useCreateProductListMutation();
  const updateMutation = useUpdateProductListMutation(id ?? '');
  const mutation = isEdit ? updateMutation : createMutation;

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProductListFormValues>({
    resolver: zodResolver(productListFormSchema),
  });

  useEffect(() => {
    if (productListQuery.data) {
      reset({
        name: productListQuery.data.name,
        isDefault: productListQuery.data.isDefault,
      });
    }
  }, [productListQuery.data, reset]);

  if (isEdit && productListQuery.isPending) {
    return (
      <AppShell>
        <p className="text-sm text-app-muted">{tr.common.loading}</p>
      </AppShell>
    );
  }

  const onSubmit = handleSubmit((values) => {
    const input: ProductListInput = { name: values.name, isDefault: values.isDefault };
    mutation.mutate(input, {
      onSuccess: () => {
        toast.success(
          isEdit ? tr.crm.productLists.form.updateSuccess : tr.crm.productLists.form.createSuccess,
        );
        navigate('/urun-listeleri');
      },
      onError: (error) => {
        toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
      },
    });
  });

  const apiErrorMessage = mutation.error instanceof ApiError ? mutation.error.message : undefined;

  return (
    <AppShell>
      <BackLink to={'/urun-listeleri'} label={tr.crm.productLists.title} />

      <div className="mt-6">
        <h1 className="text-lg font-bold text-app-text">
          {isEdit ? tr.crm.productLists.form.editTitle : tr.crm.productLists.form.newTitle}
        </h1>

        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-6" noValidate>
          <FormError message={apiErrorMessage} />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:items-end">
            <TextField
              label={tr.crm.productLists.form.nameLabel}
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
                    {tr.crm.productLists.form.isDefaultLabel}
                  </span>
                </div>
              )}
            />
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending
                ? tr.crm.productLists.form.submitting
                : tr.crm.productLists.form.submit}
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate('/urun-listeleri')}>
              {tr.crm.productLists.form.cancel}
            </Button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
