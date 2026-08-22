import { useQueries } from '@tanstack/react-query';
import { getDashboard } from '../../lib/api';
import { useDashboardsQuery } from '../dashboards/use-dashboards';

export interface WidgetLookupEntry {
  widgetTitle: string;
  dashboardName: string;
}

/** Alarm listesinde widgetId'yi okunabilir "pano / widget" ciftine cevirmek icin -
 * her panonun widget'larini ayri ayri cekip birlestirir (F12'de Alert modeli sadece
 * widgetId tasidigindan, gosterim icin tum panolarin detayina ihtiyac var). */
export function useWidgetLookup(): Map<string, WidgetLookupEntry> {
  const dashboardsQuery = useDashboardsQuery();
  const dashboardIds = dashboardsQuery.data?.map((d) => d.id) ?? [];
  const detailQueries = useQueries({
    queries: dashboardIds.map((id) => ({
      queryKey: ['dashboards', id],
      queryFn: () => getDashboard(id),
    })),
  });

  const lookup = new Map<string, WidgetLookupEntry>();
  for (const query of detailQueries) {
    if (!query.data) continue;
    for (const widget of query.data.widgets) {
      lookup.set(widget.id, { widgetTitle: widget.title, dashboardName: query.data.name });
    }
  }
  return lookup;
}
