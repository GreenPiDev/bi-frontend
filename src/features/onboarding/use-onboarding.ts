import { useMutation } from '@tanstack/react-query';
import { createStarterDashboard, seedDemoDataset } from '../../lib/api';

export function useSeedDemoDatasetMutation() {
  return useMutation({
    mutationFn: () => seedDemoDataset(),
  });
}

export function useCreateStarterDashboardMutation() {
  return useMutation({
    mutationFn: (datasetId: string) => createStarterDashboard(datasetId),
  });
}
