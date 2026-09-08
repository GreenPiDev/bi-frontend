import { useState } from 'react';
import { GridLayout, useContainerWidth, type Layout } from 'react-grid-layout';
import { useNavigate, useParams } from 'react-router-dom';
import { AppShell } from './app-shell';
import { Button } from '../components/ui/button';
import { FormError } from '../components/ui/form-error';
import { PageHelp } from '../components/ui/page-help';
import {
  useDashboardQuery,
  useDeleteWidgetMutation,
  useUpdateDashboardMutation,
  useUpdateWidgetMutation,
} from '../features/dashboards/use-dashboards';
import { WidgetPickerPanel } from '../features/dashboards/widgets/widget-picker-panel';
import { WidgetRenderer } from '../features/dashboards/widgets/widget-renderer';
import { WidgetSettingsForm } from '../features/dashboards/widgets/widget-settings-form';
import { WidgetTile } from '../features/dashboards/widgets/widget-tile';
import { useToast } from '../components/ui/toast-context';
import type { LayoutItem, Widget } from '../lib/api';
import { ApiError } from '../lib/api';
import { tr } from '../i18n/tr';

function isSameLayout(a: LayoutItem[], b: LayoutItem[]): boolean {
  if (a.length !== b.length) return false;
  const byWidgetId = new Map(a.map((item) => [item.widgetId, item]));
  return b.every((item) => {
    const prev = byWidgetId.get(item.widgetId);
    return (
      prev !== undefined &&
      prev.x === item.x &&
      prev.y === item.y &&
      prev.w === item.w &&
      prev.h === item.h
    );
  });
}

export function DashboardEditPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const dashboardQuery = useDashboardQuery(id);
  const updateDashboardMutation = useUpdateDashboardMutation(id);
  const updateWidgetMutation = useUpdateWidgetMutation(id);
  const deleteWidgetMutation = useDeleteWidgetMutation(id);
  const { width, containerRef, mounted } = useContainerWidth();

  const [layout, setLayout] = useState<LayoutItem[]>([]);
  const [syncedAt, setSyncedAt] = useState<number>();
  const [selectedWidgetId, setSelectedWidgetId] = useState<string>();
  const [isDirty, setIsDirty] = useState(false);

  const widgets = dashboardQuery.data?.widgets ?? [];

  if (
    dashboardQuery.dataUpdatedAt &&
    dashboardQuery.dataUpdatedAt !== syncedAt &&
    dashboardQuery.data
  ) {
    const prevById = new Map(layout.map((item) => [item.widgetId, item]));
    const serverById = new Map(dashboardQuery.data.layout.map((item) => [item.widgetId, item]));
    const merged = dashboardQuery.data.widgets.map(
      (widget) =>
        prevById.get(widget.id) ??
        serverById.get(widget.id) ?? { widgetId: widget.id, ...widget.position },
    );
    setLayout(merged);
    setSyncedAt(dashboardQuery.dataUpdatedAt);
  }

  const rglLayout: Layout = layout.map((item) => ({
    i: item.widgetId,
    x: item.x,
    y: item.y,
    w: item.w,
    h: item.h,
  }));
  const widgetsById = new Map(widgets.map((widget) => [widget.id, widget]));
  const selectedWidget: Widget | undefined = widgetsById.get(selectedWidgetId ?? '');

  function handleWidgetCreated(widget: Widget) {
    setLayout((prev) => [...prev, { widgetId: widget.id, ...widget.position }]);
    setSelectedWidgetId(widget.id);
    setIsDirty(true);
  }

  function handleLayoutChange(nextLayout: Layout) {
    const next = nextLayout.map((item) => ({
      widgetId: item.i,
      x: item.x,
      y: item.y,
      w: item.w,
      h: item.h,
    }));
    setLayout(next);
    // react-grid-layout, ilk mount'ta kendi ic normalizasyonu (compaction, eksik alan
    // doldurma) propsLayout'tan en ufak farklıysa onLayoutChange'i kendiliginden bir kez
    // tetikliyor - kullanici hicbir sey degistirmemis olsa bile. Gercekten x/y/w/h degeri
    // degismedigi surece "kaydedilmemis degisiklik" gostermemek icin deger bazli kiyaslama
    // yapiyoruz.
    if (!isSameLayout(layout, next)) {
      setIsDirty(true);
    }
  }

  function handleSaveLayout() {
    updateDashboardMutation.mutate(
      { layout },
      {
        onSuccess: () => {
          setIsDirty(false);
          toast.success(tr.dashboards.editor.saveSuccess);
        },
        onError: (error) => {
          toast.error(error instanceof ApiError ? error.message : tr.dashboards.editor.saveError);
        },
      },
    );
  }

  function handleDeleteWidget(widgetId: string) {
    deleteWidgetMutation.mutate(widgetId, {
      onSuccess: () => {
        setLayout((prev) => prev.filter((item) => item.widgetId !== widgetId));
        setSelectedWidgetId(undefined);
        setIsDirty(true);
      },
    });
  }

  const saveErrorMessage =
    updateDashboardMutation.error instanceof ApiError
      ? updateDashboardMutation.error.message
      : undefined;

  return (
    <AppShell>
      <div className="flex items-start justify-between gap-4">
        <button
          type="button"
          onClick={() => navigate(`/dashboards/${id}`)}
          className="text-sm font-semibold text-app-muted hover:text-app-text"
        >
          {'←'} {tr.dashboards.editor.backToView}
        </button>
        <div className="flex items-center gap-3">
          {isDirty && (
            <span className="text-sm text-app-muted">{tr.dashboards.editor.unsavedChanges}</span>
          )}
          <Button type="button" onClick={handleSaveLayout}>
            {tr.dashboards.editor.save}
          </Button>
        </div>
      </div>
      <FormError message={saveErrorMessage} />

      {dashboardQuery.data && (
        <div className="mt-4 flex items-center gap-2">
          <h1 className="text-xl font-bold text-app-text">{dashboardQuery.data.name}</h1>
          <PageHelp text={tr.help.dashboardEdit} />
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr_280px]">
        <section className="rounded-xl border border-app-border bg-app-surface p-4">
          <h2 className="mb-4 text-base font-bold text-app-text">
            {tr.dashboards.editor.fieldsTitle}
          </h2>
          <WidgetPickerPanel dashboardId={id} layout={layout} onCreated={handleWidgetCreated} />
        </section>

        <section ref={containerRef} className="min-h-[400px]">
          {mounted && rglLayout.length > 0 && (
            <GridLayout
              width={width}
              layout={rglLayout}
              gridConfig={{ rowHeight: 60, margin: [16, 16] }}
              onLayoutChange={handleLayoutChange}
            >
              {rglLayout.map((item) => {
                const widget = widgetsById.get(item.i);
                if (!widget) return null;
                return (
                  <div key={item.i} onClick={() => setSelectedWidgetId(widget.id)}>
                    <WidgetTile title={widget.title} selected={widget.id === selectedWidgetId}>
                      <WidgetRenderer widget={widget} />
                    </WidgetTile>
                  </div>
                );
              })}
            </GridLayout>
          )}
          {rglLayout.length === 0 && (
            <div className="rounded-xl border border-dashed border-app-border bg-app-surface p-8 text-center text-sm text-app-muted">
              {tr.dashboards.viewer.empty}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-app-border bg-app-surface p-4">
          <h2 className="mb-4 text-base font-bold text-app-text">
            {tr.dashboards.editor.settingsTitle}
          </h2>
          {selectedWidget ? (
            <WidgetSettingsForm
              key={selectedWidget.id}
              widget={selectedWidget}
              isSaving={updateWidgetMutation.isPending}
              onSave={(input) =>
                updateWidgetMutation.mutate({ widgetId: selectedWidget.id, input })
              }
              onDelete={() => handleDeleteWidget(selectedWidget.id)}
            />
          ) : (
            <p className="text-sm text-app-muted">{tr.dashboards.editor.selectWidgetHint}</p>
          )}
        </section>
      </div>
    </AppShell>
  );
}
