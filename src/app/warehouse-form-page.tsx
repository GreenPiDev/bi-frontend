import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { useLocation, useNavigate } from 'react-router-dom';
import { AppShell } from './app-shell';
import { BackLink } from '../components/ui/back-link';
import { Button } from '../components/ui/button';
import { FormError } from '../components/ui/form-error';
import { Switch } from '../components/ui/switch';
import { TextField } from '../components/ui/text-field';
import { useToast } from '../components/ui/toast-context';
import { useCreateWarehouseMutation } from '../features/crm/use-warehouses';
import { warehouseFormSchema, type WarehouseFormValues } from '../features/crm/schemas';
import { ApiError, type WarehouseInput } from '../lib/api';
import { tr } from '../i18n/tr';

export function WarehouseFormPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const backTo = (location.state as { from?: string } | null)?.from ?? '/depolar';
  const toast = useToast();
  const mutation = useCreateWarehouseMutation();

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<WarehouseFormValues>({
    resolver: zodResolver(warehouseFormSchema),
  });

  const onSubmit = handleSubmit((values) => {
    const input: WarehouseInput = {
      name: values.name,
      address: values.address,
      isDefault: values.isDefault,
    };
    mutation.mutate(input, {
      onSuccess: () => {
        toast.success(tr.crm.warehouses.form.createSuccess);
        navigate(backTo);
      },
      onError: (error) => {
        toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
      },
    });
  });

  const apiErrorMessage = mutation.error instanceof ApiError ? mutation.error.message : undefined;

  return (
    <AppShell>
      <BackLink to={backTo} label={tr.crm.warehouses.title} />

      <div className="mt-6">
        <h1 className="text-lg font-bold text-app-text">{tr.crm.warehouses.form.newTitle}</h1>

        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-6" noValidate>
          <FormError message={apiErrorMessage} />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
          </div>

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

          <div className="flex gap-2">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending
                ? tr.crm.warehouses.form.submitting
                : tr.crm.warehouses.form.submit}
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate(backTo)}>
              {tr.crm.warehouses.form.cancel}
            </Button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
