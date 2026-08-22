import { useState } from 'react';
import { Button } from '../../../components/ui/button';
import { useDatasetQuery, useDatasetsQuery } from '../../datasets/use-datasets';
import type { LayoutItem, Widget } from '../../../lib/api';
import { tr } from '../../../i18n/tr';
import { useCreateWidgetMutation } from '../use-dashboards';

interface WidgetPickerPanelProps {
  dashboardId: string;
  layout: LayoutItem[];
  onCreated: (widget: Widget) => void;
}

export function WidgetPickerPanel({ dashboardId, layout, onCreated }: WidgetPickerPanelProps) {
  const datasetsQuery = useDatasetsQuery();
  const [datasetId, setDatasetId] = useState('');
  const datasetQuery = useDatasetQuery(datasetId);
  const [measureFieldId, setMeasureFieldId] = useState('');
  const [dimensionFieldId, setDimensionFieldId] = useState('');
  const createWidgetMutation = useCreateWidgetMutation(dashboardId);

  const measures = datasetQuery.data?.fields.filter((field) => field.role === 'MEASURE') ?? [];
  const dimensions =
    datasetQuery.data?.fields.filter(
      (field) => field.role === 'DIMENSION' || field.role === 'DATE',
    ) ?? [];

  function selectDataset(nextDatasetId: string) {
    setDatasetId(nextDatasetId);
    setMeasureFieldId('');
    setDimensionFieldId('');
  }

  function handleAdd() {
    const measure = measures.find((field) => field.id === measureFieldId);
    if (!datasetId || !measure) return;
    const dimension = dimensions.find((field) => field.id === dimensionFieldId);
    const nextY = layout.length > 0 ? Math.max(...layout.map((item) => item.y + item.h)) : 0;
    const position = { x: 0, y: nextY, w: 4, h: dimension ? 3 : 2 };

    createWidgetMutation.mutate(
      {
        type: dimension ? 'bar' : 'kpi',
        title: measure.label,
        querySpec: {
          datasetId,
          measures: [{ field: measure.name, agg: 'sum', alias: 'toplam' }],
          dimensions: dimension ? [{ field: dimension.name }] : [],
          filters: [],
          orderBy: [],
        },
        position,
      },
      { onSuccess: (widget) => onCreated(widget) },
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="widget-dataset" className="text-sm font-semibold text-app-muted">
          {tr.dashboards.editor.datasetLabel}
        </label>
        <select
          id="widget-dataset"
          value={datasetId}
          onChange={(event) => selectDataset(event.target.value)}
          className="rounded-lg border border-app-border bg-app-surface px-3.5 py-2.5 text-sm text-app-text outline-none focus:ring-2 focus:ring-app-primary"
        >
          <option value="">{tr.dashboards.editor.datasetPlaceholder}</option>
          {datasetsQuery.data?.map((dataset) => (
            <option key={dataset.id} value={dataset.id}>
              {dataset.name}
            </option>
          ))}
        </select>
      </div>

      {datasetId && (
        <>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="widget-measure" className="text-sm font-semibold text-app-muted">
              {tr.dashboards.editor.fieldsTitle}
            </label>
            <select
              id="widget-measure"
              value={measureFieldId}
              onChange={(event) => setMeasureFieldId(event.target.value)}
              className="rounded-lg border border-app-border bg-app-surface px-3.5 py-2.5 text-sm text-app-text outline-none focus:ring-2 focus:ring-app-primary"
            >
              <option value="">—</option>
              {measures.map((field) => (
                <option key={field.id} value={field.id}>
                  {field.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="widget-dimension" className="text-sm font-semibold text-app-muted">
              {tr.dashboards.editor.dimensionsTitle}
            </label>
            <select
              id="widget-dimension"
              value={dimensionFieldId}
              onChange={(event) => setDimensionFieldId(event.target.value)}
              className="rounded-lg border border-app-border bg-app-surface px-3.5 py-2.5 text-sm text-app-text outline-none focus:ring-2 focus:ring-app-primary"
            >
              <option value="">{tr.dashboards.editor.dimensionNone}</option>
              {dimensions.map((field) => (
                <option key={field.id} value={field.id}>
                  {field.label}
                </option>
              ))}
            </select>
          </div>

          <Button
            type="button"
            disabled={!measureFieldId || createWidgetMutation.isPending}
            onClick={handleAdd}
          >
            {tr.dashboards.editor.addWidget}
          </Button>
        </>
      )}
    </div>
  );
}
