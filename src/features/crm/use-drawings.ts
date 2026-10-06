import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createDrawing,
  deleteDrawing,
  exportDrawingDxf,
  exportDrawingPdf,
  exportDrawingSvg,
  getDrawing,
  listDrawings,
  updateDrawing,
  type CreateDrawingInput,
  type DrawingViewKey,
  type UpdateDrawingInput,
} from '../../lib/api';

export const DRAWINGS_QUERY_KEY = ['drawings'];

export function useDrawingsQuery(params: { quoteId?: string } = {}) {
  return useQuery({
    queryKey: [...DRAWINGS_QUERY_KEY, params],
    queryFn: () => listDrawings(params),
  });
}

export function useDrawingQuery(id: string) {
  return useQuery({
    queryKey: [...DRAWINGS_QUERY_KEY, id],
    queryFn: () => getDrawing(id),
    enabled: Boolean(id),
  });
}

export function useCreateDrawingMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateDrawingInput) => createDrawing(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: DRAWINGS_QUERY_KEY });
    },
  });
}

export function useUpdateDrawingMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateDrawingInput) => updateDrawing(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: DRAWINGS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: [...DRAWINGS_QUERY_KEY, id] });
    },
  });
}

export function useDeleteDrawingMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteDrawing(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: DRAWINGS_QUERY_KEY });
    },
  });
}

export function useExportDrawingSvgMutation() {
  return useMutation({
    mutationFn: ({ id, view }: { id: string; view: DrawingViewKey }) => exportDrawingSvg(id, view),
  });
}

export function useExportDrawingDxfMutation() {
  return useMutation({
    mutationFn: (id: string) => exportDrawingDxf(id),
  });
}

export function useExportDrawingPdfMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => exportDrawingPdf(id),
    onSuccess: (drawing) => {
      void queryClient.invalidateQueries({ queryKey: DRAWINGS_QUERY_KEY });
      void queryClient.invalidateQueries({
        queryKey: [...DRAWINGS_QUERY_KEY, drawing.id],
      });
    },
  });
}
