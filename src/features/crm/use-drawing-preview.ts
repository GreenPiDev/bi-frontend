import { useMutation } from '@tanstack/react-query';
import { previewDrawing, type DrawingPreviewRequest } from '../../lib/api';

export function usePreviewDrawingMutation() {
  return useMutation({
    mutationFn: (input: DrawingPreviewRequest) => previewDrawing(input),
  });
}
