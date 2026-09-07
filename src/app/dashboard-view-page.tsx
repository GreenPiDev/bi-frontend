import { useMutation } from '@tanstack/react-query';
import { clsx } from 'clsx';
import { useState } from 'react';
import { GridLayout, useContainerWidth } from 'react-grid-layout';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AppShell } from './app-shell';
import { Button } from '../components/ui/button';
import { ConfirmModal } from '../components/ui/confirm-modal';
import { useToast } from '../components/ui/toast-context';
import { useMeQuery } from '../features/auth/use-auth';
import { hasPermission } from '../features/auth/permissions';
import { DashboardFilterBar } from '../features/dashboards/dashboard-filter-bar';
import type { DashboardFilter } from '../features/dashboards/dashboard-filters';
import {
  useDashboardQuery,
  useDeleteDashboardMutation,
} from '../features/dashboards/use-dashboards';
import { DrillDownModal } from '../features/dashboards/widgets/drill-down-modal';
import { WidgetCsvExportButton } from '../features/dashboards/widgets/widget-csv-export-button';
import { WidgetRenderer } from '../features/dashboards/widgets/widget-renderer';
import { WidgetTile } from '../features/dashboards/widgets/widget-tile';
import { ApiError, exportDashboardPdf, type FilterSpec } from '../lib/api';
import { downloadBlob } from '../lib/download';
import { tr } from '../i18n/tr';

export function DashboardViewPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const isPrintMode = searchParams.get('print') === '1';
  const dashboardQuery = useDashboardQuery(id);
  const meQuery = useMeQuery();
  const { width, containerRef, mounted } = useContainerWidth();
  const [filters, setFilters] = useState<DashboardFilter[]>([]);
  const [drillDown, setDrillDown] = useState<{ datasetId: string; filters: FilterSpec[] }>();
  const exportPdfMutation = useMutation({
    mutationFn: () => exportDashboardPdf(id),
    onSuccess: (blob) => downloadBlob(blob, `${dashboardQuery.data?.name ?? 'pano'}.pdf`),
  });
  const deleteMutation = useDeleteDashboardMutation();
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const canEdit = hasPermission(meQuery.data?.permissions, 'dashboards', 'UPDATE');
  const canDelete = hasPermission(meQuery.data?.permissions, 'dashboards', 'DELETE');

  function handleDelete() {
    deleteMutation.mutate(id, {
      onSuccess: () => navigate('/dashboards'),
      onError: (error) => {
        setConfirmDeleteOpen(false);
        toast.error(error instanceof ApiError ? error.message : tr.dashboards.viewer.deleteError);
      },
    });
  }
  const widgets = dashboardQuery.data?.widgets ?? [];
  const widgetsById = new Map(widgets.map((widget) => [widget.id, widget]));
  const layout = (dashboardQuery.data?.layout ?? [])
    .filter((item) => widgetsById.has(item.widgetId))
    .map((item) => ({ i: item.widgetId, x: item.x, y: item.y, w: item.w, h: item.h }));
  const datasetIds = [...new Set(widgets.map((widget) => widget.querySpec.datasetId))];

  return (
    <AppShell print={isPrintMode}>
      {!isPrintMode && (
        <button
          type="button"
          onClick={() => navigate('/dashboards')}
          className="text-sm font-semibold text-app-muted hover:text-app-text"
        >
          {'←'} {tr.dashboards.viewer.backToList}
        </button>
      )}

      <div className={clsx('flex items-start justify-between gap-4', !isPrintMode && 'mt-4')}>
        {dashboardQuery.data && (
          <h1 className="text-xl font-bold text-app-text">{dashboardQuery.data.name}</h1>
        )}
        {!isPrintMode && (
          <div className="flex items-center gap-3">
            {widgets.length > 0 && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => exportPdfMutation.mutate()}
                disabled={exportPdfMutation.isPending}
              >
                {exportPdfMutation.isPending
                  ? tr.dashboards.viewer.exportPdfBusy
                  : tr.dashboards.viewer.exportPdf}
              </Button>
            )}
            {canEdit && (
              <Button type="button" onClick={() => navigate(`/dashboards/edit/${id}`)}>
                {tr.dashboards.viewer.editButton}
              </Button>
            )}
            {canDelete && (
              <Button
                type="button"
                variant="danger"
                onClick={() => setConfirmDeleteOpen(true)}
                disabled={deleteMutation.isPending}
              >
                {tr.dashboards.viewer.deleteButton}
              </Button>
            )}
          </div>
        )}
      </div>

      {!isPrintMode && exportPdfMutation.error && (
        <p className="mt-2 text-sm text-app-danger">
          {exportPdfMutation.error instanceof ApiError
            ? exportPdfMutation.error.message
            : tr.dashboards.viewer.exportPdfError}
        </p>
      )}

      {dashboardQuery.data && widgets.length === 0 && (
        <div className="mt-6 rounded-xl border border-dashed border-app-border bg-app-surface p-8 text-center text-sm text-app-muted">
          {tr.dashboards.viewer.empty}
        </div>
      )}

      {!isPrintMode && widgets.length > 0 && (
        <div className="mt-6">
          <DashboardFilterBar datasetIds={datasetIds} filters={filters} onChange={setFilters} />
        </div>
      )}

      <div ref={containerRef} className="mt-2">
        {mounted && widgets.length > 0 && (
          <GridLayout
            width={width}
            layout={layout}
            gridConfig={{ rowHeight: 60, margin: [16, 16] }}
            dragConfig={{ enabled: false }}
            resizeConfig={{ enabled: false }}
          >
            {layout.map((item) => {
              const widget = widgetsById.get(item.i);
              if (!widget) return null;
              return (
                <div key={item.i}>
                  <WidgetTile
                    title={widget.title}
                    actions={<WidgetCsvExportButton widgetId={widget.id} title={widget.title} />}
                  >
                    <WidgetRenderer
                      widget={widget}
                      dashboardFilters={filters}
                      onDrillDown={(datasetId, drillFilters) =>
                        setDrillDown({ datasetId, filters: drillFilters })
                      }
                    />
                  </WidgetTile>
                </div>
              );
            })}
          </GridLayout>
        )}
      </div>

      {drillDown && (
        <DrillDownModal
          datasetId={drillDown.datasetId}
          filters={drillDown.filters}
          onClose={() => setDrillDown(undefined)}
        />
      )}

      {confirmDeleteOpen && (
        <ConfirmModal
          title={tr.dashboards.viewer.deleteConfirmTitle}
          message={tr.dashboards.viewer.deleteConfirm}
          confirmLabel={tr.dashboards.viewer.deleteButton}
          isPending={deleteMutation.isPending}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDeleteOpen(false)}
        />
      )}
    </AppShell>
  );
}
