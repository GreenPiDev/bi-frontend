import { zodResolver } from '@hookform/resolvers/zod';
import { Trash2 } from 'lucide-react';
import { useForm, useFieldArray } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { AppShell } from './app-shell';
import { BackLink } from '../components/ui/back-link';
import { Button } from '../components/ui/button';
import { FormError } from '../components/ui/form-error';
import { IconActionButton } from '../components/ui/icon-action-button';
import { Select } from '../components/ui/select';
import { TextField } from '../components/ui/text-field';
import { useToast } from '../components/ui/toast-context';
import { useDrawingLibraryComponentsQuery } from '../features/crm/use-drawing-library';
import { useDrawingPanelTemplatesQuery } from '../features/crm/use-drawing-templates';
import { useCreateDrawingMutation } from '../features/crm/use-drawings';
import { useQuotesQuery } from '../features/crm/use-quotes';
import { drawingCreateFormSchema, type DrawingCreateFormValues } from '../features/crm/schemas';
import { ApiError, type CreateDrawingInput } from '../lib/api';
import { tr } from '../i18n/tr';

const BACK_TO = '/cizim-ayarlari';

function getTemplateBands(
  layout: Record<string, unknown> | undefined,
): { key: string; label: string }[] {
  const bands = layout?.bands;
  if (!Array.isArray(bands)) return [];
  return bands
    .filter(
      (band): band is { key: string; label?: string } =>
        typeof band === 'object' &&
        band !== null &&
        typeof (band as { key?: unknown }).key === 'string',
    )
    .map((band) => ({ key: band.key, label: band.label ?? band.key }));
}

export function DrawingCreatePage() {
  const navigate = useNavigate();
  const toast = useToast();
  const quotesQuery = useQuotesQuery({ pageSize: 50 });
  const templatesQuery = useDrawingPanelTemplatesQuery();
  const componentsQuery = useDrawingLibraryComponentsQuery();
  const createMutation = useCreateDrawingMutation();
  const components = componentsQuery.data ?? [];

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<DrawingCreateFormValues>({
    resolver: zodResolver(drawingCreateFormSchema),
    defaultValues: { items: [], busbars: [] },
  });
  const itemsArray = useFieldArray({ control, name: 'items' });
  const busbarsArray = useFieldArray({ control, name: 'busbars' });
  const selectedTemplateId = watch('templateId');
  const selectedTemplate = templatesQuery.data?.find((t) => t.id === selectedTemplateId);
  const bands = getTemplateBands(selectedTemplate?.layout);

  const onSubmit = handleSubmit((values) => {
    const input: CreateDrawingInput = {
      quoteId: values.quoteId,
      templateId: values.templateId,
      name: values.name,
      panelGroupLabel: values.panelGroupLabel || undefined,
      items: values.items.map((item) => {
        const component = components.find((c) => c.key === item.libraryComponentKey);
        return {
          libraryComponentKey: item.libraryComponentKey,
          label: component?.name ?? item.libraryComponentKey,
          category: component?.category ?? 'OTHER',
          widthMm: Number(component?.defaultWidthMm ?? 0),
          heightMm: Number(component?.defaultHeightMm ?? 0),
          bandKey: item.bandKey,
          quantity: Number(item.quantity),
        };
      }),
      busbars: values.busbars.map((bar) => ({
        startX: Number(bar.startX),
        startY: Number(bar.startY),
        endX: Number(bar.endX),
        endY: Number(bar.endY),
        thicknessMm: Number(bar.thicknessMm),
        phaseCount: 3,
      })),
    };
    createMutation.mutate(input, {
      onSuccess: (drawing) => {
        toast.success(tr.crm.drawings.create.createSuccess);
        navigate(`/cizimler/${drawing.id}`);
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
      <BackLink to={BACK_TO} label={tr.crm.drawingTemplates.title} />

      <div className="mt-6">
        <h1 className="text-lg font-bold text-app-text">{tr.crm.drawings.create.title}</h1>
        <p className="mt-1 text-sm text-app-muted">{tr.crm.drawings.create.subtitle}</p>

        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-6" noValidate>
          <FormError message={apiErrorMessage} />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label={tr.crm.drawings.create.quoteLabel}
              placeholder={tr.crm.drawings.create.quotePlaceholder}
              options={(quotesQuery.data?.data ?? []).map((q) => ({
                value: q.id,
                label: `${q.quoteNumber} — ${q.account.name}`,
              }))}
              error={errors.quoteId?.message}
              required
              {...register('quoteId')}
            />
            <Select
              label={tr.crm.drawings.create.templateLabel}
              placeholder={tr.crm.drawings.create.templatePlaceholder}
              options={(templatesQuery.data ?? []).map((t) => ({ value: t.id, label: t.name }))}
              error={errors.templateId?.message}
              required
              {...register('templateId')}
            />
            <TextField
              label={tr.crm.drawings.create.nameLabel}
              error={errors.name?.message}
              required
              {...register('name')}
            />
            <TextField
              label={tr.crm.drawings.create.panelGroupLabelLabel}
              hint={tr.crm.drawings.create.panelGroupLabelHint}
              error={errors.panelGroupLabel?.message}
              {...register('panelGroupLabel')}
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-app-text">
                {tr.crm.drawingTemplates.preview.itemsTitle}
              </h2>
              <Button
                type="button"
                variant="secondary"
                disabled={!selectedTemplateId}
                onClick={() =>
                  itemsArray.append({ libraryComponentKey: '', bandKey: '', quantity: '1' })
                }
              >
                {tr.crm.drawingTemplates.preview.addItemButton}
              </Button>
            </div>

            <div className="mt-3 flex flex-col gap-3">
              {itemsArray.fields.map((field, index) => (
                <div key={field.id} className="flex items-end gap-2">
                  <div className="flex-1">
                    <Select
                      label={tr.crm.drawingTemplates.preview.componentLabel}
                      placeholder={tr.crm.drawingTemplates.preview.componentPlaceholder}
                      options={components.map((c) => ({ value: c.key, label: c.name }))}
                      error={errors.items?.[index]?.libraryComponentKey?.message}
                      {...register(`items.${index}.libraryComponentKey` as const)}
                    />
                  </div>
                  <div className="w-48">
                    <Select
                      label={tr.crm.drawingTemplates.preview.bandLabel}
                      placeholder={tr.crm.drawingTemplates.preview.bandPlaceholder}
                      options={bands.map((b) => ({ value: b.key, label: b.label }))}
                      error={errors.items?.[index]?.bandKey?.message}
                      {...register(`items.${index}.bandKey` as const)}
                    />
                  </div>
                  <div className="w-24">
                    <TextField
                      type="text"
                      inputMode="numeric"
                      label={tr.crm.drawingTemplates.preview.quantityLabel}
                      error={errors.items?.[index]?.quantity?.message}
                      {...register(`items.${index}.quantity` as const)}
                    />
                  </div>
                  <div className="pb-2.5">
                    <IconActionButton
                      icon={Trash2}
                      tooltip={tr.crm.drawingTemplates.preview.removeItemTooltip}
                      variant="danger"
                      onClick={() => itemsArray.remove(index)}
                    />
                  </div>
                </div>
              ))}
              {itemsArray.fields.length === 0 && (
                <p className="text-xs text-app-muted">
                  {tr.crm.drawingTemplates.preview.noComponentsHint}
                </p>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-app-text">
                {tr.crm.drawingTemplates.preview.busbarsTitle}
              </h2>
              <Button
                type="button"
                variant="secondary"
                disabled={!selectedTemplate}
                onClick={() =>
                  busbarsArray.append({
                    startX: '0',
                    startY: '50',
                    endX: String(selectedTemplate?.widthMm ?? '1000'),
                    endY: '50',
                    thicknessMm: '10',
                  })
                }
              >
                {tr.crm.drawingTemplates.preview.addBusbarButton}
              </Button>
            </div>

            <div className="mt-3 flex flex-col gap-3">
              {busbarsArray.fields.map((field, index) => (
                <div key={field.id} className="flex items-end gap-2">
                  <TextField
                    type="text"
                    inputMode="decimal"
                    label={tr.crm.drawingTemplates.preview.busbarStartXLabel}
                    error={errors.busbars?.[index]?.startX?.message}
                    {...register(`busbars.${index}.startX` as const)}
                  />
                  <TextField
                    type="text"
                    inputMode="decimal"
                    label={tr.crm.drawingTemplates.preview.busbarStartYLabel}
                    error={errors.busbars?.[index]?.startY?.message}
                    {...register(`busbars.${index}.startY` as const)}
                  />
                  <TextField
                    type="text"
                    inputMode="decimal"
                    label={tr.crm.drawingTemplates.preview.busbarEndXLabel}
                    error={errors.busbars?.[index]?.endX?.message}
                    {...register(`busbars.${index}.endX` as const)}
                  />
                  <TextField
                    type="text"
                    inputMode="decimal"
                    label={tr.crm.drawingTemplates.preview.busbarEndYLabel}
                    error={errors.busbars?.[index]?.endY?.message}
                    {...register(`busbars.${index}.endY` as const)}
                  />
                  <TextField
                    type="text"
                    inputMode="decimal"
                    label={tr.crm.drawingTemplates.preview.busbarThicknessLabel}
                    error={errors.busbars?.[index]?.thicknessMm?.message}
                    {...register(`busbars.${index}.thicknessMm` as const)}
                  />
                  <div className="pb-2.5">
                    <IconActionButton
                      icon={Trash2}
                      tooltip={tr.crm.drawingTemplates.preview.removeBusbarTooltip}
                      variant="danger"
                      onClick={() => busbarsArray.remove(index)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending
                ? tr.crm.drawings.create.submitting
                : tr.crm.drawings.create.submit}
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
