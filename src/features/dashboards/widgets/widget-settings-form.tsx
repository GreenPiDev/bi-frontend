import { useState } from 'react';
import { Button } from '../../../components/ui/button';
import { TextField } from '../../../components/ui/text-field';
import type { Widget, WidgetType } from '../../../lib/api';
import { tr } from '../../../i18n/tr';

const WIDGET_TYPES: WidgetType[] = ['kpi', 'line', 'bar', 'bar_horizontal', 'pie', 'table'];

interface WidgetSettingsFormProps {
  widget: Widget;
  onSave: (input: { title: string; type: WidgetType; vizOptions: Record<string, unknown> }) => void;
  onDelete: () => void;
  isSaving: boolean;
}

export function WidgetSettingsForm({
  widget,
  onSave,
  onDelete,
  isSaving,
}: WidgetSettingsFormProps) {
  const [title, setTitle] = useState(widget.title);
  const [type, setType] = useState<WidgetType>(widget.type);
  const [isCurrency, setIsCurrency] = useState(widget.vizOptions.format === 'currency');

  return (
    <div className="flex flex-col gap-4">
      <TextField
        name="widget-title"
        label={tr.dashboards.editor.widgetTitleLabel}
        value={title}
        onChange={(event) => setTitle(event.target.value)}
      />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="widget-type" className="text-sm font-semibold text-app-muted">
          {tr.dashboards.editor.widgetTypeLabel}
        </label>
        <select
          id="widget-type"
          value={type}
          onChange={(event) => setType(event.target.value as WidgetType)}
          className="rounded-lg border border-app-border bg-app-surface px-3.5 py-2.5 text-sm text-app-text outline-none focus:ring-2 focus:ring-app-primary"
        >
          {WIDGET_TYPES.map((widgetType) => (
            <option key={widgetType} value={widgetType}>
              {tr.dashboards.widget.types[widgetType]}
            </option>
          ))}
        </select>
      </div>

      {type === 'kpi' && (
        <label className="flex items-center gap-2 text-sm text-app-text">
          <input
            type="checkbox"
            checked={isCurrency}
            onChange={(event) => setIsCurrency(event.target.checked)}
          />
          {tr.dashboards.editor.currencyFormatLabel}
        </label>
      )}

      <div className="flex items-center gap-3">
        <Button
          type="button"
          disabled={isSaving}
          onClick={() =>
            onSave({
              title,
              type,
              vizOptions: isCurrency ? { format: 'currency' } : {},
            })
          }
        >
          {isSaving ? tr.dashboards.editor.saving : tr.dashboards.editor.save}
        </Button>
        <Button type="button" variant="danger" onClick={onDelete}>
          {tr.dashboards.editor.deleteWidget}
        </Button>
      </div>
    </div>
  );
}
