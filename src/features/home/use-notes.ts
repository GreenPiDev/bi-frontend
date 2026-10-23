import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createNote,
  deleteNote,
  listNotes,
  updateNote,
  type CreateNoteInput,
  type UpdateNoteInput,
} from '../../lib/api';

const NOTES_QUERY_KEY = ['notes'];

export function useNotesQuery() {
  return useQuery({
    queryKey: NOTES_QUERY_KEY,
    queryFn: () => listNotes(),
  });
}

export function useCreateNoteMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateNoteInput) => createNote(input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: NOTES_QUERY_KEY }),
  });
}

export function useUpdateNoteMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateNoteInput }) => updateNote(id, input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: NOTES_QUERY_KEY }),
  });
}

export function useDeleteNoteMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteNote(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: NOTES_QUERY_KEY }),
  });
}
