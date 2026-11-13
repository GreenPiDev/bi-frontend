import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button } from '../components/ui/button';
import { Modal } from '../components/ui/modal';
import { TextField } from '../components/ui/text-field';
import { useToast } from '../components/ui/toast-context';
import { kanbanBoardRenameSchema, type KanbanBoardRenameValues } from '../features/kanban/schemas';
import { useRenameKanbanBoardMutation } from '../features/kanban/use-kanban';
import { tr } from '../i18n/tr';
import { ApiError } from '../lib/api';

interface KanbanBoardRenameModalProps {
  boardId: string;
  currentName: string;
  onClose: () => void;
}

export function KanbanBoardRenameModal({
  boardId,
  currentName,
  onClose,
}: KanbanBoardRenameModalProps) {
  const toast = useToast();
  const renameMutation = useRenameKanbanBoardMutation(boardId);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<KanbanBoardRenameValues>({
    resolver: zodResolver(kanbanBoardRenameSchema),
    defaultValues: { name: currentName },
  });

  function onSubmit(values: KanbanBoardRenameValues) {
    renameMutation.mutate(values.name, {
      onSuccess: () => {
        toast.success(tr.kanban.board.renameSuccess);
        onClose();
      },
      onError: (error) => {
        toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
      },
    });
  }

  return (
    <Modal
      title={tr.kanban.board.renameTitle}
      width="sm"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onClose}>
            {tr.kanban.card.cancel}
          </Button>
          <Button type="submit" form="kanban-rename-form" disabled={renameMutation.isPending}>
            {tr.kanban.board.save}
          </Button>
        </>
      }
    >
      <form id="kanban-rename-form" onSubmit={handleSubmit(onSubmit)}>
        <TextField
          label={tr.kanban.createModal.nameLabel}
          required
          autoFocus
          error={errors.name?.message}
          {...register('name')}
        />
      </form>
    </Modal>
  );
}
