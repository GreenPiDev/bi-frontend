import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createDrawingPanelTemplate,
  deleteDrawingPanelTemplate,
  listDrawingPanelTemplates,
  updateDrawingPanelTemplate,
  type DrawingPanelTemplateInput,
} from '../../lib/api';

export const DRAWING_TEMPLATES_QUERY_KEY = ['drawing-templates'];

export function useDrawingPanelTemplatesQuery() {
  return useQuery({
    queryKey: DRAWING_TEMPLATES_QUERY_KEY,
    queryFn: listDrawingPanelTemplates,
  });
}

export function useCreateDrawingPanelTemplateMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: DrawingPanelTemplateInput) => createDrawingPanelTemplate(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: DRAWING_TEMPLATES_QUERY_KEY });
    },
  });
}

export function useUpdateDrawingPanelTemplateMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<DrawingPanelTemplateInput>) =>
      updateDrawingPanelTemplate(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: DRAWING_TEMPLATES_QUERY_KEY });
    },
  });
}

export function useDeleteDrawingPanelTemplateMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteDrawingPanelTemplate(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: DRAWING_TEMPLATES_QUERY_KEY });
    },
  });
}
