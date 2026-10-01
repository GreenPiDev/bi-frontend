import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { Button } from '../components/ui/button';
import { Modal } from '../components/ui/modal';
import { Switch } from '../components/ui/switch';
import { TextField } from '../components/ui/text-field';
import { useToast } from '../components/ui/toast-context';
import { warehouseFormSchema, type WarehouseFormValues } from '../features/crm/schemas';
import { useUpdateWarehouseMutation } from '../features/crm/use-warehouses';
import { ApiError, type Warehouse, type WarehouseInput } from '../lib/api';
import { tr } from '../i18n/tr';

interface WarehouseEditModalProps {
  warehouse: Warehouse;
  onClose: () => void;
}

export function WarehouseEditModal({ warehouse, onClose }: WarehouseEditModalProps) {
  const toast = useToast();
  const mutation = useUpdateWarehouseMutation(warehouse.id);
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<WarehouseFormValues>({
    resolver: zodResolver(warehouseFormSchema),
    defaultValues: {
      name: warehouse.name,
      address: warehouse.address ?? '',
      isDefault: warehouse.isDefault,
    },
  });

  function onSubmit(values: WarehouseFormValues) {
    const input: Partial<WarehouseInput> = {
      name: values.name,
      address: values.address,
      isDefault: values.isDefault,
    };
    mutation.mutate(input, {
      onSuccess: () => {
        toast.success(tr.crm.warehouses.form.updateSuccess);
        onClose();
      },
      onError: (error) => {
        toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
      },
    });
  }

  return (
    <Modal
      title={tr.crm.warehouses.form.editTitle}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onClose}>
            {tr.crm.warehouses.form.cancel}
          </Button>
          <Button type="submit" form="warehouse-edit-form" disabled={mutation.isPending}>
            {mutation.isPending ? tr.crm.warehouses.form.submitting : tr.crm.warehouses.form.submit}
          </Button>
        </>
      }
    >
      <form
        id="warehouse-edit-form"
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
      >
        <TextField
          label={tr.crm.warehouses.form.nameLabel}
          error={errors.name?.message}
          required
          autoFocus
          {...register('name')}
        />
        <TextField
          label={tr.crm.warehouses.form.addressLabel}
          error={errors.address?.message}
          {...register('address')}
        />
        <Controller
          name="isDefault"
          control={control}
          render={({ field }) => (
            <div className="flex items-center gap-2">
              <Switch checked={field.value ?? false} onChange={field.onChange} />
              <span className="text-sm font-semibold text-app-text">
                {tr.crm.warehouses.form.isDefaultLabel}
              </span>
            </div>
          )}
        />
      </form>
    </Modal>
  );
}
