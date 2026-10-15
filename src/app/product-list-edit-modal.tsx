import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button } from '../components/ui/button';
import { Modal } from '../components/ui/modal';
import { TextField } from '../components/ui/text-field';
import { useToast } from '../components/ui/toast-context';
import { productListFormSchema, type ProductListFormValues } from '../features/crm/schemas';
import { useUpdateProductListMutation } from '../features/crm/use-product-lists';
import { ApiError, type ProductListWithCount } from '../lib/api';
import { tr } from '../i18n/tr';

interface ProductListEditModalProps {
  productList: ProductListWithCount;
  onClose: () => void;
}

export function ProductListEditModal({ productList, onClose }: ProductListEditModalProps) {
  const toast = useToast();
  const mutation = useUpdateProductListMutation(productList.id);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProductListFormValues>({
    resolver: zodResolver(productListFormSchema),
    defaultValues: { name: productList.name },
  });

  function onSubmit(values: ProductListFormValues) {
    mutation.mutate(
      { name: values.name },
      {
        onSuccess: () => {
          toast.success(tr.crm.productLists.form.updateSuccess);
          onClose();
        },
        onError: (error) => {
          toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
        },
      },
    );
  }

  return (
    <Modal
      title={tr.crm.productLists.form.editTitle}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onClose}>
            {tr.crm.productLists.form.cancel}
          </Button>
          <Button type="submit" form="product-list-edit-form" disabled={mutation.isPending}>
            {mutation.isPending
              ? tr.crm.productLists.form.submitting
              : tr.crm.productLists.form.submit}
          </Button>
        </>
      }
    >
      <form
        id="product-list-edit-form"
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
      >
        <TextField
          label={tr.crm.productLists.form.nameLabel}
          error={errors.name?.message}
          required
          autoFocus
          {...register('name')}
        />
      </form>
    </Modal>
  );
}
