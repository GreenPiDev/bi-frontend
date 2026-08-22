import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createDashboard,
  createWidget,
  deleteDashboard,
  deleteWidget,
  getDashboard,
  listDashboards,
  updateDashboard,
  updateWidget,
  type CreateDashboardInput,
  type CreateWidgetInput,
  type UpdateDashboardInput,
  type UpdateWidgetInput,
} from '../../lib/api';

export const DASHBOARDS_QUERY_KEY = ['dashboards'];

export function useDashboardsQuery() {
  return useQuery({
    queryKey: DASHBOARDS_QUERY_KEY,
    queryFn: () => listDashboards(),
  });
}

export function useDashboardQuery(id: string) {
  return useQuery({
    queryKey: ['dashboards', id],
    queryFn: () => getDashboard(id),
    enabled: Boolean(id),
  });
}

export function useCreateDashboardMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateDashboardInput) => createDashboard(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: DASHBOARDS_QUERY_KEY });
    },
  });
}

export function useUpdateDashboardMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateDashboardInput) => updateDashboard(id, input),
    onSuccess: (dashboard) => {
      queryClient.setQueryData(['dashboards', id], dashboard);
      void queryClient.invalidateQueries({ queryKey: DASHBOARDS_QUERY_KEY });
    },
  });
}

export function useDeleteDashboardMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteDashboard(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: DASHBOARDS_QUERY_KEY });
    },
  });
}

export function useCreateWidgetMutation(dashboardId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateWidgetInput) => createWidget(dashboardId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['dashboards', dashboardId] });
    },
  });
}

export function useUpdateWidgetMutation(dashboardId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ widgetId, input }: { widgetId: string; input: UpdateWidgetInput }) =>
      updateWidget(dashboardId, widgetId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['dashboards', dashboardId] });
    },
  });
}

export function useDeleteWidgetMutation(dashboardId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (widgetId: string) => deleteWidget(dashboardId, widgetId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['dashboards', dashboardId] });
    },
  });
}
