import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { AppShell } from './app-shell';
import { BackLink } from '../components/ui/back-link';
import { Button } from '../components/ui/button';
import { FormError } from '../components/ui/form-error';
import { TextField } from '../components/ui/text-field';
import { useToast } from '../components/ui/toast-context';
import {
  drawingLibraryComponentFormSchema,
  type DrawingLibraryComponentFormValues,
} from '../features/crm/schemas';
import { useCreateDrawingLibraryComponentMutation } from '../features/crm/use-drawing-library';
import { ApiError, type DrawingLibraryComponentInput } from '../lib/api';
import { tr } from '../i18n/tr';

const BACK_TO = '/cizim-ayarlari';

export function DrawingLibraryComponentFormPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const mutation = useCreateDrawingLibraryComponentMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DrawingLibraryComponentFormValues>({
    resolver: zodResolver(drawingLibraryComponentFormSchema),
  });

  const onSubmit = handleSubmit((values) => {
    const input: DrawingLibraryComponentInput = {
      key: values.key,
      name: values.name,
      category: values.category,
      defaultWidthMm: Number(values.defaultWidthMm),
      defaultHeightMm: Number(values.defaultHeightMm),
    };
    mutation.mutate(input, {
      onSuccess: () => {
        toast.success(tr.crm.drawingLibrary.form.createSuccess);
        navigate(BACK_TO);
      },
      onError: (error) => {
        toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
      },
    });
  });

  const apiErrorMessage = mutation.error instanceof ApiError ? mutation.error.message : undefined;

  return (
    <AppShell>
      <BackLink to={BACK_TO} label={tr.crm.drawingLibrary.title} />

      <div className="mt-6">
        <h1 className="text-lg font-bold text-app-text">{tr.crm.drawingLibrary.form.newTitle}</h1>

        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4" noValidate>
          <FormError message={apiErrorMessage} />

          <TextField
            label={tr.crm.drawingLibrary.form.keyLabel}
            hint={tr.crm.drawingLibrary.form.keyHint}
            error={errors.key?.message}
            required
            autoFocus
            {...register('key')}
          />
          <TextField
            label={tr.crm.drawingLibrary.form.nameLabel}
            error={errors.name?.message}
            required
            {...register('name')}
          />
          <TextField
            label={tr.crm.drawingLibrary.form.categoryLabel}
            hint={tr.crm.drawingLibrary.form.categoryHint}
            error={errors.category?.message}
            required
            {...register('category')}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField
              type="text"
              inputMode="decimal"
              label={tr.crm.drawingLibrary.form.defaultWidthMmLabel}
              error={errors.defaultWidthMm?.message}
              required
              {...register('defaultWidthMm')}
            />
            <TextField
              type="text"
              inputMode="decimal"
              label={tr.crm.drawingLibrary.form.defaultHeightMmLabel}
              error={errors.defaultHeightMm?.message}
              required
              {...register('defaultHeightMm')}
            />
          </div>

          <div className="mt-1 flex gap-2">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending
                ? tr.crm.drawingLibrary.form.submitting
                : tr.crm.drawingLibrary.form.submit}
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate(BACK_TO)}>
              {tr.crm.drawingLibrary.form.cancel}
            </Button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
