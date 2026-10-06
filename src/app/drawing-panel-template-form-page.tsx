import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { AppShell } from './app-shell';
import { BackLink } from '../components/ui/back-link';
import { Button } from '../components/ui/button';
import { FormError } from '../components/ui/form-error';
import { Select } from '../components/ui/select';
import { TextareaField } from '../components/ui/textarea-field';
import { TextField } from '../components/ui/text-field';
import { useToast } from '../components/ui/toast-context';
import {
  drawingPanelTemplateFormSchema,
  type DrawingPanelTemplateFormValues,
} from '../features/crm/schemas';
import { useCreateDrawingPanelTemplateMutation } from '../features/crm/use-drawing-templates';
import { ApiError, type DrawingPanelTemplateInput } from '../lib/api';
import { tr } from '../i18n/tr';

const BACK_TO = '/cizim-ayarlari';

export function DrawingPanelTemplateFormPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const mutation = useCreateDrawingPanelTemplateMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DrawingPanelTemplateFormValues>({
    resolver: zodResolver(drawingPanelTemplateFormSchema),
    defaultValues: {
      type: 'AG_BACKPLATE',
      layoutJson: '{\n  "bands": []\n}',
    },
  });

  const onSubmit = handleSubmit((values) => {
    const input: DrawingPanelTemplateInput = {
      name: values.name,
      type: values.type,
      widthMm: Number(values.widthMm),
      heightMm: Number(values.heightMm),
      layout: JSON.parse(values.layoutJson) as Record<string, unknown>,
    };
    mutation.mutate(input, {
      onSuccess: () => {
        toast.success(tr.crm.drawingTemplates.form.createSuccess);
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
      <BackLink to={BACK_TO} label={tr.crm.drawingTemplates.title} />

      <div className="mt-6">
        <h1 className="text-lg font-bold text-app-text">{tr.crm.drawingTemplates.form.newTitle}</h1>

        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4" noValidate>
          <FormError message={apiErrorMessage} />

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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

          <div className="mt-1 flex gap-2">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending
                ? tr.crm.drawingTemplates.form.submitting
                : tr.crm.drawingTemplates.form.submit}
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate(BACK_TO)}>
              {tr.crm.drawingTemplates.form.cancel}
            </Button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
