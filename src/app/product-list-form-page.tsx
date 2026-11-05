import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { AppShell } from './app-shell';
import { ProductsListContent } from './products-list-page';
import { BackLink } from '../components/ui/back-link';
import { Button } from '../components/ui/button';
import { FormError } from '../components/ui/form-error';
import { TextField } from '../components/ui/text-field';
import { useToast } from '../components/ui/toast-context';
import {
  useCreateProductListMutation,
  useProductListQuery,
} from '../features/crm/use-product-lists';
import { productListFormSchema, type ProductListFormValues } from '../features/crm/schemas';
import { ApiError, type ProductListInput } from '../lib/api';
import { tr } from '../i18n/tr';

export function ProductListFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const location = useLocation();
  const backTo = (location.state as { from?: string } | null)?.from ?? '/urun-listeleri';
  const toast = useToast();
  const productListQuery = useProductListQuery(id ?? '');
  const createMutation = useCreateProductListMutation();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProductListFormValues>({
    resolver: zodResolver(productListFormSchema),
  });

  if (isEdit && productListQuery.isPending) {
    return (
      <AppShell>
        <p className="text-sm text-app-muted">{tr.common.loading}</p>
      </AppShell>
    );
  }

  const onSubmit = handleSubmit((values) => {
    const input: ProductListInput = { name: values.name };
    createMutation.mutate(input, {
      onSuccess: () => {
        toast.success(tr.crm.productLists.form.createSuccess);
        navigate(backTo);
      },
      onError: (error) => {
        toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
      },
    });
  });

  const apiErrorMessage =
    createMutation.error instanceof ApiError ? createMutation.error.message : undefined;

  return (
    <AppShell>
      <BackLink to={backTo} label={tr.crm.productLists.title} />

      <div className="mt-6">
        {!isEdit && (
          <>
            <h1 className="text-lg font-bold text-app-text">{tr.crm.productLists.form.newTitle}</h1>
            <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-6" noValidate>
              <FormError message={apiErrorMessage} />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:items-end">
                <TextField
                  label={tr.crm.productLists.form.nameLabel}
                  error={errors.name?.message}
                  {...register('name')}
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending
                    ? tr.crm.productLists.form.submitting
                    : tr.crm.productLists.form.submit}
                </Button>
                <Button type="button" variant="secondary" onClick={() => navigate(backTo)}>
                  {tr.crm.productLists.form.cancel}
                </Button>
              </div>
            </form>
          </>
        )}

        {isEdit && (
          <ProductsListContent
            productList={{ id: id ?? '', name: productListQuery.data?.name ?? '' }}
          />
        )}
      </div>
    </AppShell>
  );
}
