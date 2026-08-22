import { GridLayout, useContainerWidth } from 'react-grid-layout';
import { useNavigate, useParams } from 'react-router-dom';
import { AppShell } from './app-shell';
import { Button } from '../components/ui/button';
import { useMeQuery } from '../features/auth/use-auth';
import { useDashboardQuery } from '../features/dashboards/use-dashboards';
import { WidgetRenderer } from '../features/dashboards/widgets/widget-renderer';
import { WidgetTile } from '../features/dashboards/widgets/widget-tile';
import { tr } from '../i18n/tr';

export function DashboardViewPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const dashboardQuery = useDashboardQuery(id);
  const meQuery = useMeQuery();
  const { width, containerRef, mounted } = useContainerWidth();

  const canEdit = meQuery.data && meQuery.data.role !== 'VIEWER';
  const widgets = dashboardQuery.data?.widgets ?? [];
  const widgetsById = new Map(widgets.map((widget) => [widget.id, widget]));
  const layout = (dashboardQuery.data?.layout ?? [])
    .filter((item) => widgetsById.has(item.widgetId))
    .map((item) => ({ i: item.widgetId, x: item.x, y: item.y, w: item.w, h: item.h }));

  return (
    <AppShell>
      <button
        type="button"
        onClick={() => navigate('/dashboards')}
        className="text-sm font-semibold text-app-muted hover:text-app-text"
      >
        {'←'} {tr.dashboards.viewer.backToList}
      </button>

      <div className="mt-4 flex items-start justify-between gap-4">
        {dashboardQuery.data && (
          <h1 className="text-xl font-bold text-app-text">{dashboardQuery.data.name}</h1>
        )}
        {canEdit && (
          <Button type="button" onClick={() => navigate(`/dashboards/${id}/edit`)}>
            {tr.dashboards.viewer.editButton}
          </Button>
        )}
      </div>

      {dashboardQuery.data && widgets.length === 0 && (
        <div className="mt-6 rounded-xl border border-dashed border-app-border bg-app-surface p-8 text-center text-sm text-app-muted">
          {tr.dashboards.viewer.empty}
        </div>
      )}

      <div ref={containerRef} className="mt-6">
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
                  <WidgetTile title={widget.title}>
                    <WidgetRenderer widget={widget} />
                  </WidgetTile>
                </div>
              );
            })}
          </GridLayout>
        )}
      </div>
    </AppShell>
  );
}
