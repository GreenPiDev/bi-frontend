import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createKanbanBoard,
  createKanbanCard,
  deleteKanbanBoard,
  deleteKanbanCard,
  getKanbanBoard,
  listKanbanAssignableUsers,
  listKanbanBoards,
  moveKanbanCard,
  renameKanbanBoard,
  updateKanbanCard,
  type CreateKanbanBoardInput,
  type KanbanBoardDetail,
  type KanbanCardInput,
  type KanbanColumn,
} from '../../lib/api';
import { useRealtimeEvent } from '../../lib/realtime';
import { applyCardMove } from './kanban-board-utils';

export const KANBAN_BOARDS_QUERY_KEY = ['kanban', 'boards'];
const boardKey = (id: string) => ['kanban', 'board', id];

export function useKanbanBoardsQuery() {
  return useQuery({ queryKey: KANBAN_BOARDS_QUERY_KEY, queryFn: listKanbanBoards });
}

export function useKanbanBoardQuery(id: string) {
  return useQuery({ queryKey: boardKey(id), queryFn: () => getKanbanBoard(id) });
}

export function useKanbanAssignableUsersQuery() {
  return useQuery({
    queryKey: ['kanban', 'assignable-users'],
    queryFn: listKanbanAssignableUsers,
  });
}

/**
 * Ortak panoda diger sirketin (veya ayni sirketten baska bir kullanicinin) yaptigi
 * degisiklikler backend'den `kanban.board.changed` ile gelir - ilgili cache'ler
 * sayfa yenilenmeden tazelenir.
 */
export function useKanbanRealtimeSync() {
  const queryClient = useQueryClient();
  useRealtimeEvent<{ boardId: string }>('kanban.board.changed', ({ boardId }) => {
    void queryClient.invalidateQueries({ queryKey: KANBAN_BOARDS_QUERY_KEY });
    void queryClient.invalidateQueries({ queryKey: boardKey(boardId) });
  });
}

function useInvalidateKanban() {
  const queryClient = useQueryClient();
  return (boardId?: string) => {
    void queryClient.invalidateQueries({ queryKey: KANBAN_BOARDS_QUERY_KEY });
    if (boardId) void queryClient.invalidateQueries({ queryKey: boardKey(boardId) });
  };
}

export function useCreateKanbanBoardMutation() {
  const invalidate = useInvalidateKanban();
  return useMutation({
    mutationFn: (input: CreateKanbanBoardInput) => createKanbanBoard(input),
    onSuccess: () => invalidate(),
  });
}

export function useRenameKanbanBoardMutation(boardId: string) {
  const invalidate = useInvalidateKanban();
  return useMutation({
    mutationFn: (name: string) => renameKanbanBoard(boardId, name),
    onSuccess: () => invalidate(boardId),
  });
}

export function useDeleteKanbanBoardMutation() {
  const invalidate = useInvalidateKanban();
  return useMutation({
    mutationFn: (id: string) => deleteKanbanBoard(id),
    onSuccess: () => invalidate(),
  });
}

export function useCreateKanbanCardMutation(boardId: string) {
  const invalidate = useInvalidateKanban();
  return useMutation({
    mutationFn: (input: KanbanCardInput) => createKanbanCard(boardId, input),
    onSuccess: () => invalidate(boardId),
  });
}

export function useUpdateKanbanCardMutation(boardId: string) {
  const invalidate = useInvalidateKanban();
  return useMutation({
    mutationFn: ({ cardId, input }: { cardId: string; input: Partial<KanbanCardInput> }) =>
      updateKanbanCard(boardId, cardId, input),
    onSuccess: () => invalidate(boardId),
  });
}

export function useDeleteKanbanCardMutation(boardId: string) {
  const invalidate = useInvalidateKanban();
  return useMutation({
    mutationFn: (cardId: string) => deleteKanbanCard(boardId, cardId),
    onSuccess: () => invalidate(boardId),
  });
}

interface MoveVariables {
  cardId: string;
  column: KanbanColumn;
  index: number;
  revisionNote?: string;
  progressNote?: string;
}

/** Surukle-birak aninda karti iyimser (optimistic) olarak yeni yerine koyar; sunucu
 * reddederse (orn. baska biri karti zaten Done'a tasidiysa) eski hale doner. */
export function useMoveKanbanCardMutation(boardId: string) {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateKanban();
  return useMutation({
    mutationFn: ({ cardId, column, index, revisionNote, progressNote }: MoveVariables) =>
      moveKanbanCard(boardId, cardId, { column, index, revisionNote, progressNote }),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: boardKey(boardId) });
      const previous = queryClient.getQueryData<KanbanBoardDetail>(boardKey(boardId));
      if (previous) {
        queryClient.setQueryData<KanbanBoardDetail>(boardKey(boardId), {
          ...previous,
          cards: applyCardMove(previous.cards, variables.cardId, variables.column, variables.index),
        });
      }
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(boardKey(boardId), context.previous);
    },
    onSettled: () => invalidate(boardId),
  });
}
