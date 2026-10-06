import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button } from '../components/ui/button';
import { Modal } from '../components/ui/modal';
import { TextField } from '../components/ui/text-field';
import { useToast } from '../components/ui/toast-context';
import {
  drawingLibraryComponentFormSchema,
  type DrawingLibraryComponentFormValues,
} from '../features/crm/schemas';
import { useUpdateDrawingLibraryComponentMutation } from '../features/crm/use-drawing-library';
import {
  ApiError,
  type DrawingLibraryComponent,
  type DrawingLibraryComponentInput,
} from '../lib/api';
import { tr } from '../i18n/tr';

interface DrawingLibraryComponentEditModalProps {
  component: DrawingLibraryComponent;
  onClose: () => void;
}

export function DrawingLibraryComponentEditModal({
  component,
  onClose,
}: DrawingLibraryComponentEditModalProps) {
  const toast = useToast();
  const mutation = useUpdateDrawingLibraryComponentMutation(component.id);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DrawingLibraryComponentFormValues>({
    resolver: zodResolver(drawingLibraryComponentFormSchema),
    defaultValues: {
      key: component.key,
      name: component.name,
      category: component.category,
      defaultWidthMm: component.defaultWidthMm,
      defaultHeightMm: component.defaultHeightMm,
    },
  });

  function onSubmit(values: DrawingLibraryComponentFormValues) {
    const input: Partial<DrawingLibraryComponentInput> = {
      key: values.key,
      name: values.name,
      category: values.category,
      defaultWidthMm: Number(values.defaultWidthMm),
      defaultHeightMm: Number(values.defaultHeightMm),
    };
    mutation.mutate(input, {
      onSuccess: () => {
        toast.success(tr.crm.drawingLibrary.form.updateSuccess);
        onClose();
      },
      onError: (error) => {
        toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
      },
    });
  }

  return (
    <Modal
      title={tr.crm.drawingLibrary.form.editTitle}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onClose}>
            {tr.crm.drawingLibrary.form.cancel}
          </Button>
          <Button
            type="submit"
            form="drawing-library-component-edit-form"
            disabled={mutation.isPending}
          >
            {mutation.isPending
              ? tr.crm.drawingLibrary.form.submitting
              : tr.crm.drawingLibrary.form.submit}
          </Button>
        </>
      }
    >
      <form
        id="drawing-library-component-edit-form"
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
      >
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
        <div className="grid grid-cols-2 gap-4">
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
      </form>
    </Modal>
  );
}
