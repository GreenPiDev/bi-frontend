import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button } from '../components/ui/button';
import { Modal } from '../components/ui/modal';
import { Select } from '../components/ui/select';
import { TextareaField } from '../components/ui/textarea-field';
import { TextField } from '../components/ui/text-field';
import { useToast } from '../components/ui/toast-context';
import {
  drawingPanelTemplateFormSchema,
  type DrawingPanelTemplateFormValues,
} from '../features/crm/schemas';
import { useUpdateDrawingPanelTemplateMutation } from '../features/crm/use-drawing-templates';
import { ApiError, type DrawingPanelTemplate, type DrawingPanelTemplateInput } from '../lib/api';
import { tr } from '../i18n/tr';

interface DrawingPanelTemplateEditModalProps {
  template: DrawingPanelTemplate;
  onClose: () => void;
}

export function DrawingPanelTemplateEditModal({
  template,
  onClose,
}: DrawingPanelTemplateEditModalProps) {
  const toast = useToast();
  const mutation = useUpdateDrawingPanelTemplateMutation(template.id);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DrawingPanelTemplateFormValues>({
    resolver: zodResolver(drawingPanelTemplateFormSchema),
    defaultValues: {
      name: template.name,
      type: template.type,
      widthMm: template.widthMm,
      heightMm: template.heightMm,
      layoutJson: JSON.stringify(template.layout, null, 2),
    },
  });

  function onSubmit(values: DrawingPanelTemplateFormValues) {
    const input: Partial<DrawingPanelTemplateInput> = {
      name: values.name,
      type: values.type,
      widthMm: Number(values.widthMm),
      heightMm: Number(values.heightMm),
      layout: JSON.parse(values.layoutJson) as Record<string, unknown>,
    };
    mutation.mutate(input, {
      onSuccess: () => {
        toast.success(tr.crm.drawingTemplates.form.updateSuccess);
        onClose();
      },
      onError: (error) => {
        toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
      },
    });
  }

  return (
    <Modal
      title={tr.crm.drawingTemplates.form.editTitle}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onClose}>
            {tr.crm.drawingTemplates.form.cancel}
          </Button>
          <Button
            type="submit"
            form="drawing-panel-template-edit-form"
            disabled={mutation.isPending}
          >
            {mutation.isPending
              ? tr.crm.drawingTemplates.form.submitting
              : tr.crm.drawingTemplates.form.submit}
          </Button>
        </>
      }
    >
      <form
        id="drawing-panel-template-edit-form"
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
      >
        <TextField
          label={tr.crm.drawingTemplates.form.nameLabel}
          error={errors.name?.message}
          required
          autoFocus
          {...register('name')}
        />
        <Select
          label={tr.crm.drawingTemplates.form.typeLabel}
          error={errors.type?.message}
          required
          options={[
            { value: 'AG_BACKPLATE', label: tr.crm.drawingTemplates.typeLabels.AG_BACKPLATE },
            { value: 'OG_CELL', label: tr.crm.drawingTemplates.typeLabels.OG_CELL },
          ]}
          {...register('type')}
        />
        <div className="grid grid-cols-2 gap-4">
          <TextField
            type="text"
            inputMode="decimal"
            label={tr.crm.drawingTemplates.form.widthMmLabel}
            error={errors.widthMm?.message}
            required
            {...register('widthMm')}
          />
          <TextField
            type="text"
            inputMode="decimal"
            label={tr.crm.drawingTemplates.form.heightMmLabel}
            error={errors.heightMm?.message}
            required
            {...register('heightMm')}
          />
        </div>
        <TextareaField
          label={tr.crm.drawingTemplates.form.layoutLabel}
          hint={tr.crm.drawingTemplates.form.layoutHint}
          error={errors.layoutJson?.message}
          rows={10}
          className="font-mono text-xs"
          required
          {...register('layoutJson')}
        />
      </form>
    </Modal>
  );
}
