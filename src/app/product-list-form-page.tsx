import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { AppShell } from './app-shell';
import { BackLink } from '../components/ui/back-link';
import { Button } from '../components/ui/button';
import { FormError } from '../components/ui/form-error';
import { Switch } from '../components/ui/switch';
import { Table, type TableColumn } from '../components/ui/table';
import { TextField } from '../components/ui/text-field';
import { useToast } from '../components/ui/toast-context';
import {
  useCreateProductListMutation,
  useProductListQuery,
  useUpdateProductListMutation,
} from '../features/crm/use-product-lists';
import { useProductsQuery } from '../features/crm/use-products';
import { productListFormSchema, type ProductListFormValues } from '../features/crm/schemas';
import { ApiError, type Product, type ProductListInput } from '../lib/api';
import { tr } from '../i18n/tr';

const productColumns: TableColumn<Product>[] = [
  {
    key: 'name',
    header: tr.crm.products.nameColumn,
    render: (p) => <span className="font-semibold text-app-text">{p.name}</span>,
  },
  {
    key: 'sku',
    header: tr.crm.products.skuColumn,
    className: 'text-app-muted',
    render: (p) => p.sku ?? '—',
  },
  {
    key: 'unit',
    header: tr.crm.products.unitColumn,
    className: 'text-app-muted',
    render: (p) => p.unit,
  },
];

export function ProductListFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const toast = useToast();
  const productListQuery = useProductListQuery(id ?? '');
  const createMutation = useCreateProductListMutation();
  const updateMutation = useUpdateProductListMutation(id ?? '');
  const mutation = isEdit ? updateMutation : createMutation;
  const productsQuery = useProductsQuery({ productListId: id, pageSize: 100 }, { enabled: isEdit });

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

        {isEdit && (
          <div className="mt-6 border-t border-app-border pt-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="text-base font-bold text-app-text">
                {tr.crm.productLists.productsSection.title}
              </h2>
              <Button type="button" variant="secondary" onClick={() => navigate('/urunler/yeni')}>
                {tr.crm.productLists.productsSection.addButton}
              </Button>
            </div>
            <div className="mt-3">
              <Table
                columns={productColumns}
                data={productsQuery.data?.data ?? []}
                keyField={(product) => product.id}
                onRowClick={(product) => navigate(`/urunler/${product.id}`)}
                isLoading={productsQuery.isPending}
                loadingMessage={tr.crm.productLists.productsSection.loading}
                emptyMessage={tr.crm.productLists.productsSection.empty}
              />
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
