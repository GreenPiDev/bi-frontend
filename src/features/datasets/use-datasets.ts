import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getDataset,
  getDatasourceStatus,
  listDatasets,
  previewDataset,
  updateDatasetFields,
  uploadDatasource,
  type UpdateDatasetFieldInput,
} from '../../lib/api';

export const DATASETS_QUERY_KEY = ['datasets'];

export function useDatasetsQuery() {
  return useQuery({
    queryKey: DATASETS_QUERY_KEY,
    queryFn: () => listDatasets(),
  });
}

export function useDatasetQuery(id: string) {
  return useQuery({
    queryKey: ['datasets', id],
    queryFn: () => getDataset(id),
    enabled: Boolean(id),
  });
}

export function useDatasetPreviewQuery(id: string) {
  return useQuery({
    queryKey: ['datasets', id, 'preview'],
    queryFn: () => previewDataset(id),
    enabled: Boolean(id),
  });
}

export function useUploadDatasourceMutation() {
  return useMutation({
    mutationFn: ({ file, name }: { file: File; name?: string }) => uploadDatasource(file, name),
  });
}

const ACTIVE_STATUSES = new Set(['PENDING', 'PROCESSING']);

export function useDatasourceStatusQuery(id: string) {
  return useQuery({
    queryKey: ['datasources', id, 'status'],
    queryFn: () => getDatasourceStatus(id),
    enabled: Boolean(id),
    refetchInterval: (query) =>
      query.state.data && ACTIVE_STATUSES.has(query.state.data.status) ? 1500 : false,
  });
}

export function useUpdateDatasetFieldsMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (fields: UpdateDatasetFieldInput[]) => updateDatasetFields(id, fields),
    onSuccess: (dataset) => {
      queryClient.setQueryData(['datasets', id], dataset);
      void queryClient.invalidateQueries({ queryKey: DATASETS_QUERY_KEY });
    },
  });
}
