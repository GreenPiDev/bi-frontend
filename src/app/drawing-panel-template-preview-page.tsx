import { zodResolver } from '@hookform/resolvers/zod';
import { Trash2 } from 'lucide-react';
import { useForm, useFieldArray } from 'react-hook-form';
import { useParams } from 'react-router-dom';
import { AppShell } from './app-shell';
import { BackLink } from '../components/ui/back-link';
import { Button } from '../components/ui/button';
import { FormError } from '../components/ui/form-error';
import { HorizontalTabPanel, type HorizontalTabItem } from '../components/ui/horizontal-tab-panel';
import { IconActionButton } from '../components/ui/icon-action-button';
import { Select } from '../components/ui/select';
import { TextField } from '../components/ui/text-field';
import { useDrawingLibraryComponentsQuery } from '../features/crm/use-drawing-library';
import { usePreviewDrawingMutation } from '../features/crm/use-drawing-preview';
import { useDrawingPanelTemplatesQuery } from '../features/crm/use-drawing-templates';
import { drawingPreviewFormSchema, type DrawingPreviewFormValues } from '../features/crm/schemas';
import { ApiError, type DrawingPreviewRequest } from '../lib/api';
import { tr } from '../i18n/tr';

const BACK_TO = '/cizim-ayarlari';

function getTemplateBands(layout: Record<string, unknown>): { key: string; label: string }[] {
  const bands = layout.bands;
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

export function DrawingPanelTemplatePreviewPage() {
  const { id = '' } = useParams();
  const templatesQuery = useDrawingPanelTemplatesQuery();
  const componentsQuery = useDrawingLibraryComponentsQuery();
  const previewMutation = usePreviewDrawingMutation();

  const template = templatesQuery.data?.find((t) => t.id === id);
  const components = componentsQuery.data ?? [];
  const bands = template ? getTemplateBands(template.layout) : [];

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<DrawingPreviewFormValues>({
    resolver: zodResolver(drawingPreviewFormSchema),
    defaultValues: { items: [], busbars: [] },
  });
  const itemsArray = useFieldArray({ control, name: 'items' });
  const busbarsArray = useFieldArray({ control, name: 'busbars' });

  if (templatesQuery.isPending) {
    return (
      <AppShell>
        <p className="text-sm text-app-muted">{tr.common.loading}</p>
      </AppShell>
    );
  }

  if (!template) {
    return (
      <AppShell>
        <BackLink to={BACK_TO} label={tr.crm.drawingTemplates.title} />
        <p className="mt-6 text-sm text-app-muted">{tr.crm.drawingTemplates.empty}</p>
      </AppShell>
    );
  }

  const onSubmit = handleSubmit((values) => {
    const input: DrawingPreviewRequest = {
      templateId: template.id,
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
    previewMutation.mutate(input);
  });

  const apiErrorMessage =
    previewMutation.error instanceof ApiError ? previewMutation.error.message : undefined;

  const viewTabs: HorizontalTabItem[] = previewMutation.data
    ? (['internal', 'coverPlate', 'external'] as const).map((viewKey) => ({
        key: viewKey,
        label:
          viewKey === 'internal'
            ? tr.crm.drawingTemplates.preview.viewInternal
            : viewKey === 'coverPlate'
              ? tr.crm.drawingTemplates.preview.viewCoverPlate
              : tr.crm.drawingTemplates.preview.viewExternal,
        content: (
          <div
            className="overflow-auto rounded-lg border border-app-border bg-white p-4"
            // Backend'in kendi deterministik render-svg.ts'i tarafindan uretiliyor, tum
            // serbest metin alanlari (label/category) XML-escape edilmis (bkz.
            // engine/render-svg.ts escapeXml) - kullanici girdisi dogrudan HTML olarak
            // enjekte edilmiyor.
            dangerouslySetInnerHTML={{ __html: previewMutation.data.svg[viewKey] }}
          />
        ),
      }))
    : [];

  return (
    <AppShell>
      <BackLink to={BACK_TO} label={tr.crm.drawingTemplates.title} />

      <div className="mt-6">
        <h1 className="text-lg font-bold text-app-text">
          {tr.crm.drawingTemplates.preview.title} — {template.name}
        </h1>
        <p className="mt-1 text-sm text-app-muted">{tr.crm.drawingTemplates.preview.subtitle}</p>

        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-6" noValidate>
          <FormError message={apiErrorMessage} />

          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-app-text">
                {tr.crm.drawingTemplates.preview.itemsTitle}
              </h2>
              <Button
                type="button"
                variant="secondary"
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
                onClick={() =>
                  busbarsArray.append({
                    startX: '0',
                    startY: '50',
                    endX: String(template.widthMm),
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

          <div>
            <Button type="submit" disabled={previewMutation.isPending}>
              {previewMutation.isPending
                ? tr.crm.drawingTemplates.preview.previewing
                : tr.crm.drawingTemplates.preview.previewButton}
            </Button>
          </div>
        </form>

        {previewMutation.data && (
          <div className="mt-8">
            <HorizontalTabPanel
              tabs={viewTabs}
              defaultTabKey="internal"
              key={JSON.stringify(previewMutation.data.model)}
            />
          </div>
        )}
      </div>
    </AppShell>
  );
}
