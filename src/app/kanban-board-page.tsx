import { Pencil, Users } from 'lucide-react';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { AppShell } from './app-shell';
import { KanbanBoardRenameModal } from './kanban-board-rename-modal';
import { KanbanCardDetailModal } from './kanban-card-detail-modal';
import { KanbanCardFormModal } from './kanban-card-form-modal';
import { KanbanMoveNoteModal, type KanbanMoveNoteKind } from './kanban-move-note-modal';
import { BackLink } from '../components/ui/back-link';
import { ConfirmModal } from '../components/ui/confirm-modal';
import { IconActionButton } from '../components/ui/icon-action-button';
import { PageHelp } from '../components/ui/page-help';
import { Switch } from '../components/ui/switch';
import { useToast } from '../components/ui/toast-context';
import { hasPermission } from '../features/auth/permissions';
import { useMeQuery } from '../features/auth/use-auth';
import {
  KANBAN_COLUMNS,
  cardMatchesSearch,
  cardsInColumn,
  toFullIndex,
} from '../features/kanban/kanban-board-utils';
import { KanbanColumn, type DropTarget } from '../features/kanban/kanban-column';
import {
  useDeleteKanbanCardMutation,
  useKanbanBoardQuery,
  useKanbanRealtimeSync,
  useMoveKanbanCardMutation,
} from '../features/kanban/use-kanban';
import { tr } from '../i18n/tr';
import { ApiError, type KanbanCard, type KanbanColumn as KanbanColumnKey } from '../lib/api';

const t = tr.kanban;

interface PendingMove {
  card: KanbanCard;
  column: KanbanColumnKey;
  index: number;
  revisionNote?: string;
  progressNote?: string;
}

type ModalState =
  | { kind: 'create' }
  | { kind: 'edit'; card: KanbanCard }
  | { kind: 'detail'; card: KanbanCard }
  | { kind: 'delete'; card: KanbanCard }
  | { kind: 'rename' }
  | null;

export function KanbanBoardPage() {
  const { id = '' } = useParams<{ id: string }>();
  const toast = useToast();
  const meQuery = useMeQuery();
  const boardQuery = useKanbanBoardQuery(id);
  const moveMutation = useMoveKanbanCardMutation(id);
  const deleteMutation = useDeleteKanbanCardMutation(id);
  useKanbanRealtimeSync();

  const [onlyMine, setOnlyMine] = useState(false);
  const [searchByColumn, setSearchByColumn] = useState<Partial<Record<KanbanColumnKey, string>>>(
    {},
  );
  const [dragging, setDragging] = useState<KanbanCard | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const [pendingDone, setPendingDone] = useState<PendingMove | null>(null);
  // Not isteyen tasima: revize (zorunlu not) veya ilerleme (opsiyonel not).
  const [pendingNote, setPendingNote] = useState<
    (PendingMove & { kind: KanbanMoveNoteKind }) | null
  >(null);
  const [modal, setModal] = useState<ModalState>(null);

  const permissions = meQuery.data?.permissions;
  const canCreate = hasPermission(permissions, 'kanban', 'CREATE');
  const canUpdate = hasPermission(permissions, 'kanban', 'UPDATE');
  const canDelete = hasPermission(permissions, 'kanban', 'DELETE');

  const board = boardQuery.data;
  const allCards = board?.cards ?? [];
  const visibleCards = onlyMine
    ? allCards.filter((card) => card.assignee?.id === meQuery.data?.id)
    : allCards;
  // Kolonda gorunen kartlar: "sadece benim" + o kolonun arama kutusu. Surukle-birak
  // indeksi de ayni listeye gore cevrilir (toFullIndex), gizli kartlar sirayi bozmaz.
  const visibleInColumn = (column: KanbanColumnKey) =>
    cardsInColumn(visibleCards, column).filter((card) =>
      cardMatchesSearch(card, searchByColumn[column] ?? ''),
    );

  function resetDrag() {
    setDragging(null);
    setDropTarget(null);
  }

  function commitMove({ card, column, index, revisionNote, progressNote }: PendingMove) {
    moveMutation.mutate(
      { cardId: card.id, column, index, revisionNote, progressNote },
      {
        onError: (error) => {
          toast.error(error instanceof ApiError ? error.message : t.board.moveError);
        },
      },
    );
  }

  function handleDrop() {
    if (!dragging || !dropTarget) return resetDrag();
    const index = toFullIndex(
      allCards,
      visibleInColumn(dropTarget.column),
      dropTarget.column,
      dragging.id,
      dropTarget.index,
    );
    const move = { card: dragging, column: dropTarget.column, index };
    resetDrag();
    if (move.column === move.card.column) {
      const currentIndex = cardsInColumn(allCards, move.column).findIndex(
        (card) => card.id === move.card.id,
      );
      if (currentIndex === index) return;
    }
    if (move.column === 'DONE' && move.card.column !== 'DONE') {
      setPendingDone(move);
      return;
    }
    // Incelemeden geri cekilen kart icin revize notu zorunlu (backend de dogrular).
    if (move.card.column === 'IN_REVIEW' && move.column === 'IN_PROGRESS') {
      setPendingNote({ ...move, kind: 'revision' });
      return;
    }
    // Incelemeye gonderilen kart icin ilerleme notu sorulur (opsiyonel).
    if (move.card.column === 'IN_PROGRESS' && move.column === 'IN_REVIEW') {
      setPendingNote({ ...move, kind: 'progress' });
      return;
    }
    commitMove(move);
  }

  function handleConfirmDelete(card: KanbanCard) {
    deleteMutation.mutate(card.id, {
      onSuccess: () => {
        toast.success(t.card.deleteSuccess);
        setModal(null);
      },
      onError: (error) => {
        toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
      },
    });
  }

  if (boardQuery.isPending || !board) {
    return (
      <AppShell>
        <BackLink to="/kanban" label={t.board.backToList} />
        <p className="mt-6 text-sm text-app-muted">
          {boardQuery.isError ? tr.common.unexpectedError : t.board.loading}
        </p>
      </AppShell>
    );
  }

  const partnerName = board.isOwner ? board.partnerTenant?.name : board.ownerTenant.name;

  return (
    <AppShell>
      <BackLink to="/kanban" label={t.board.backToList} />
      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-app-text">{board.name}</h1>
            <PageHelp text={tr.help.kanbanBoard} />
            {canUpdate && (
              <IconActionButton
                icon={Pencil}
                tooltip={t.board.rename}
                onClick={() => setModal({ kind: 'rename' })}
              />
            )}
          </div>
          {partnerName && (
            <p className="mt-2 flex items-center gap-1.5 text-sm text-app-muted">
              <Users size={14} />
              {board.isOwner ? t.board.sharedWith(partnerName) : t.board.sharedBy(partnerName)}
            </p>
          )}
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-app-text">
          <Switch checked={onlyMine} onChange={setOnlyMine} label={t.board.onlyMine} />
          {t.board.onlyMine}
        </label>
      </div>

      <div className="mt-6 flex gap-3 overflow-x-auto pb-2">
        {KANBAN_COLUMNS.map((column) => {
          const columnCards = visibleInColumn(column);
          return (
            <KanbanColumn
              key={column}
              column={column}
              cards={columnCards}
              totalCount={columnCards.length}
              draggingCardId={dragging?.id ?? null}
              dropTarget={dropTarget}
              canDrag={canUpdate}
              // Done'daki kart kilitli (zaten suruklenemez), diger her kart her kolona gidebilir.
              acceptsDrop={!!dragging && dragging.column !== 'DONE'}
              onAddCard={
                column === 'TODO' && canCreate ? () => setModal({ kind: 'create' }) : undefined
              }
              onOpenCard={(card) => setModal({ kind: 'detail', card })}
              onEditCard={canUpdate ? (card) => setModal({ kind: 'edit', card }) : undefined}
              onDeleteCard={canDelete ? (card) => setModal({ kind: 'delete', card }) : undefined}
              onDragStartCard={setDragging}
              onDragEnd={resetDrag}
              onDragOverTarget={setDropTarget}
              onDrop={handleDrop}
              isSearching={!!searchByColumn[column]?.trim()}
              searchValue={searchByColumn[column] ?? ''}
              onSearchChange={(query) =>
                setSearchByColumn((previous) => ({ ...previous, [column]: query }))
              }
            />
          );
        })}
      </div>

      {modal?.kind === 'create' && (
        <KanbanCardFormModal
          boardId={board.id}
          isShared={!!board.partnerTenant}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.kind === 'edit' && (
        <KanbanCardFormModal
          boardId={board.id}
          isShared={!!board.partnerTenant}
          card={modal.card}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.kind === 'detail' && (
        <KanbanCardDetailModal card={modal.card} onClose={() => setModal(null)} />
      )}
      {modal?.kind === 'delete' && (
        <ConfirmModal
          title={t.card.deleteConfirmTitle}
          message={t.card.deleteConfirm}
          confirmLabel={t.card.delete}
          variant="danger"
          isPending={deleteMutation.isPending}
          onConfirm={() => handleConfirmDelete(modal.card)}
          onCancel={() => setModal(null)}
        />
      )}
      {modal?.kind === 'rename' && (
        <KanbanBoardRenameModal
          boardId={board.id}
          currentName={board.name}
          onClose={() => setModal(null)}
        />
      )}
      {pendingDone && (
        <ConfirmModal
          title={t.board.doneConfirmTitle}
          message={t.board.doneConfirm(pendingDone.card.title)}
          confirmLabel={t.board.doneConfirmButton}
          onConfirm={() => {
            commitMove(pendingDone);
            setPendingDone(null);
          }}
          onCancel={() => setPendingDone(null)}
        />
      )}
      {pendingNote && (
        <KanbanMoveNoteModal
          kind={pendingNote.kind}
          cardTitle={pendingNote.card.title}
          onConfirm={(note) => {
            commitMove(
              pendingNote.kind === 'revision'
                ? { ...pendingNote, revisionNote: note }
                : { ...pendingNote, progressNote: note || undefined },
            );
            setPendingNote(null);
          }}
          onCancel={() => setPendingNote(null)}
        />
      )}
    </AppShell>
  );
}
