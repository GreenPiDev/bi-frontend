import { Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from './app-shell';
import { KanbanBoardCreateModal } from './kanban-board-create-modal';
import { KanbanBoardRenameModal } from './kanban-board-rename-modal';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { ConfirmModal } from '../components/ui/confirm-modal';
import { IconActionButton } from '../components/ui/icon-action-button';
import { PageHelp } from '../components/ui/page-help';
import { Table, type TableColumn } from '../components/ui/table';
import { useToast } from '../components/ui/toast-context';
import { hasPermission } from '../features/auth/permissions';
import { useMeQuery } from '../features/auth/use-auth';
import {
  useDeleteKanbanBoardMutation,
  useKanbanBoardsQuery,
  useKanbanRealtimeSync,
} from '../features/kanban/use-kanban';
import { tr } from '../i18n/tr';
import { ApiError, type KanbanBoardSummary } from '../lib/api';

const t = tr.kanban;

function BoardProgress({ board }: { board: KanbanBoardSummary }) {
  const counts = board.cardCounts;
  const total = counts.TODO + counts.IN_PROGRESS + counts.IN_REVIEW + counts.DONE;
  const percent = total === 0 ? 0 : Math.round((counts.DONE / total) * 100);
  return (
    <div className="flex min-w-[140px] flex-col gap-1">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-app-bg-muted">
        <div className="h-full rounded-full bg-app-success" style={{ width: `${percent}%` }} />
      </div>
      <span className="text-xs text-app-muted">{t.list.progressLabel(counts.DONE, total)}</span>
    </div>
  );
}

export function KanbanBoardsPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const meQuery = useMeQuery();
  const boardsQuery = useKanbanBoardsQuery();
  const deleteMutation = useDeleteKanbanBoardMutation();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleting, setDeleting] = useState<KanbanBoardSummary | undefined>(undefined);
  const [renaming, setRenaming] = useState<KanbanBoardSummary | undefined>(undefined);
  useKanbanRealtimeSync();

  const permissions = meQuery.data?.permissions;
  const canCreate = hasPermission(permissions, 'kanban', 'CREATE');
  const canUpdate = hasPermission(permissions, 'kanban', 'UPDATE');
  const canDelete = hasPermission(permissions, 'kanban', 'DELETE');

  function handleConfirmDelete() {
    if (!deleting) return;
    deleteMutation.mutate(deleting.id, {
      onSuccess: () => {
        toast.success(t.list.deleteSuccess);
        setDeleting(undefined);
      },
      onError: (error) => {
        toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
      },
    });
  }

  const columns: TableColumn<KanbanBoardSummary>[] = [
    {
      key: 'name',
      header: t.list.nameColumn,
      required: true,
      render: (board) => (
        <span className="flex items-center gap-2 font-semibold text-app-text">
          {board.name}
          {board.partnerTenant && <Badge variant="info">{t.list.sharedBadge}</Badge>}
        </span>
      ),
    },
    {
      key: 'partner',
      header: t.list.partnerColumn,
      className: 'text-app-muted',
      render: (board) => {
        if (!board.partnerTenant) return t.list.noPartner;
        return board.isOwner ? board.partnerTenant.name : board.ownerTenant.name;
      },
    },
    {
      key: 'progress',
      header: t.list.progressColumn,
      render: (board) => <BoardProgress board={board} />,
    },
    {
      key: 'createdAt',
      header: t.list.createdAtColumn,
      className: 'text-app-muted',
      render: (board) => new Date(board.createdAt).toLocaleDateString('tr-TR'),
    },
    ...(canUpdate || canDelete
      ? [
          {
            key: 'actions',
            header: t.list.actionsColumn,
            className: 'w-px',
            required: true,
            // Ortak sirket degistirilemez; isim her iki sirkette duzenlenebilir,
            // silme yalnizca panoyu olusturan sirkette (backend: KANBAN_BOARD_OWNER_ONLY).
            render: (board: KanbanBoardSummary) => (
              <div className="flex items-center gap-1">
                {canUpdate && (
                  <IconActionButton
                    icon={Pencil}
                    tooltip={t.list.editTooltip}
                    onClick={() => setRenaming(board)}
                  />
                )}
                {canDelete && board.isOwner && (
                  <IconActionButton
                    icon={Trash2}
                    tooltip={t.list.deleteTooltip}
                    variant="danger"
                    onClick={() => setDeleting(board)}
                  />
                )}
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <AppShell>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-app-text">{t.title}</h1>
            <PageHelp text={tr.help.kanban} />
          </div>
          <p className="mt-1 text-sm text-app-muted">{t.subtitle}</p>
        </div>
        {canCreate && (
          <Button type="button" onClick={() => setIsCreateOpen(true)}>
            {t.newBoardButton}
          </Button>
        )}
      </div>

      <Table
        columns={columns}
        data={boardsQuery.data ?? []}
        keyField={(board) => board.id}
        onRowClick={(board) => navigate(`/kanban/${board.id}`)}
        getRowHref={(board) => `/kanban/${board.id}`}
        isLoading={boardsQuery.isPending}
        loadingMessage={t.loading}
        emptyMessage={t.empty}
      />

      {isCreateOpen && <KanbanBoardCreateModal onClose={() => setIsCreateOpen(false)} />}

      {renaming && (
        <KanbanBoardRenameModal
          boardId={renaming.id}
          currentName={renaming.name}
          onClose={() => setRenaming(undefined)}
        />
      )}

      {deleting && (
        <ConfirmModal
          title={t.list.deleteConfirmTitle}
          message={t.list.deleteConfirm}
          confirmLabel={t.list.deleteTooltip}
          variant="danger"
          isPending={deleteMutation.isPending}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleting(undefined)}
        />
      )}
    </AppShell>
  );
}
