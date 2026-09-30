import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createQuoteTemplate,
  deleteQuoteTemplate,
  getQuoteTemplate,
  listQuoteTemplates,
  removeQuoteTemplateImage,
  setDefaultQuoteTemplate,
  updateQuoteTemplate,
  uploadQuoteTemplateImage,
  type QuoteTemplateImageSlot,
  type QuoteTemplateInput,
} from '../../lib/api';

export const QUOTE_TEMPLATES_QUERY_KEY = ['quote-templates'];

export function useQuoteTemplatesQuery(
  params: { page?: number; pageSize?: number; q?: string } = {},
) {
  return useQuery({
    queryKey: [...QUOTE_TEMPLATES_QUERY_KEY, params],
    queryFn: () => listQuoteTemplates(params),
  });
}

export function useQuoteTemplateQuery(id: string) {
  return useQuery({
    queryKey: ['quote-templates', id],
    queryFn: () => getQuoteTemplate(id),
    enabled: Boolean(id),
  });
}

export function useCreateQuoteTemplateMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: QuoteTemplateInput) => createQuoteTemplate(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUOTE_TEMPLATES_QUERY_KEY });
    },
  });
}

export function useUpdateQuoteTemplateMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<QuoteTemplateInput>) => updateQuoteTemplate(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUOTE_TEMPLATES_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ['quote-templates', id] });
    },
  });
}

export function useDeleteQuoteTemplateMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteQuoteTemplate(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUOTE_TEMPLATES_QUERY_KEY });
    },
  });
}

export function useSetDefaultQuoteTemplateMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => setDefaultQuoteTemplate(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUOTE_TEMPLATES_QUERY_KEY });
    },
  });
}

export function useUploadQuoteTemplateImageMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ slot, file }: { slot: QuoteTemplateImageSlot; file: File }) =>
      uploadQuoteTemplateImage(id, slot, file),
    onSuccess: (template) => {
      queryClient.setQueryData(['quote-templates', id], template);
      void queryClient.invalidateQueries({ queryKey: QUOTE_TEMPLATES_QUERY_KEY });
    },
  });
}

export function useRemoveQuoteTemplateImageMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (slot: QuoteTemplateImageSlot) => removeQuoteTemplateImage(id, slot),
    onSuccess: (template) => {
      queryClient.setQueryData(['quote-templates', id], template);
      void queryClient.invalidateQueries({ queryKey: QUOTE_TEMPLATES_QUERY_KEY });
    },
  });
}
