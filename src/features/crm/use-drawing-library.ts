import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createDrawingLibraryComponent,
  deleteDrawingLibraryComponent,
  listDrawingLibraryComponents,
  updateDrawingLibraryComponent,
  type DrawingLibraryComponentInput,
} from '../../lib/api';

export const DRAWING_LIBRARY_QUERY_KEY = ['drawing-library'];

export function useDrawingLibraryComponentsQuery() {
  return useQuery({
    queryKey: DRAWING_LIBRARY_QUERY_KEY,
    queryFn: listDrawingLibraryComponents,
  });
}

export function useCreateDrawingLibraryComponentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: DrawingLibraryComponentInput) => createDrawingLibraryComponent(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: DRAWING_LIBRARY_QUERY_KEY });
    },
  });
}

export function useUpdateDrawingLibraryComponentMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<DrawingLibraryComponentInput>) =>
      updateDrawingLibraryComponent(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: DRAWING_LIBRARY_QUERY_KEY });
    },
  });
}

export function useDeleteDrawingLibraryComponentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteDrawingLibraryComponent(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: DRAWING_LIBRARY_QUERY_KEY });
    },
  });
}
