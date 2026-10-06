import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button } from '../../components/ui/button';
import { FormError } from '../../components/ui/form-error';
import { Modal } from '../../components/ui/modal';
import { TextField } from '../../components/ui/text-field';
import { useToast } from '../../components/ui/toast-context';
import { productListFormSchema, type ProductListFormValues } from './schemas';
import { useCreateProductListMutation } from './use-product-lists';
import { ApiError, type ProductList } from '../../lib/api';
import { tr } from '../../i18n/tr';

interface NewProductListModalProps {
  onClose: () => void;
  onCreated: (productList: ProductList) => void;
}

/** `/envanter?tab=productLists`'teki "Yeni Ürün Listesi" butonu - ayrı bir sayfaya
 * gitmeden, sadece isim girilip hemen oluşturulabilsin diye `NewProductModal` ile
 * aynı desen. */
export function NewProductListModal({ onClose, onCreated }: NewProductListModalProps) {
  const toast = useToast();
  const createMutation = useCreateProductListMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProductListFormValues>({
    resolver: zodResolver(productListFormSchema),
  });

  const onSubmit = handleSubmit((values) => {
    createMutation.mutate(
      { name: values.name },
      {
        onSuccess: (productList) => {
          toast.success(tr.crm.productLists.form.createSuccess);
          onCreated(productList);
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
    <Modal title={tr.crm.productLists.form.newTitle} onClose={onClose} width="sm">
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <FormError message={apiErrorMessage} />
        <TextField
          label={tr.crm.productLists.form.nameLabel}
          autoFocus
          error={errors.name?.message}
          {...register('name')}
        />
        <div className="flex gap-2">
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending
              ? tr.crm.productLists.form.submitting
              : tr.crm.productLists.form.submit}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            {tr.crm.productLists.form.cancel}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
