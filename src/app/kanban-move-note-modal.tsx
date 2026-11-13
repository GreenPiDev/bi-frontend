import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button } from '../components/ui/button';
import { Modal } from '../components/ui/modal';
import { TextareaField } from '../components/ui/textarea-field';
import {
  kanbanOptionalNoteSchema,
  kanbanRequiredNoteSchema,
  type KanbanMoveNoteValues,
} from '../features/kanban/schemas';
import { tr } from '../i18n/tr';

/** revision: Incelemede -> Devam Ediyor, not ZORUNLU.
 *  progress: Devam Ediyor -> Incelemede, not OPSIYONEL. */
export type KanbanMoveNoteKind = 'revision' | 'progress';

interface KanbanMoveNoteModalProps {
  kind: KanbanMoveNoteKind;
  cardTitle: string;
  /** Opsiyonel notta bos birakilirsa '' gelir (backend bos notu yok sayar). */
  onConfirm: (note: string) => void;
  onCancel: () => void;
}

/** Kolonlar arasi tasimada not alan modal; vazgecilirse kart yerinde kalir (tasima
 * hic gonderilmez). */
export function KanbanMoveNoteModal({
  kind,
  cardTitle,
  onConfirm,
  onCancel,
}: KanbanMoveNoteModalProps) {
  const t = kind === 'revision' ? tr.kanban.revision : tr.kanban.progress;
  const isRequired = kind === 'revision';
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<KanbanMoveNoteValues>({
    resolver: zodResolver(isRequired ? kanbanRequiredNoteSchema : kanbanOptionalNoteSchema),
    defaultValues: { note: '' },
  });

  return (
    <Modal
      title={t.title}
      onClose={onCancel}
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onCancel}>
            {t.cancel}
          </Button>
          <Button type="submit" form="kanban-move-note-form">
            {t.submit}
          </Button>
        </>
      }
    >
      <form
        id="kanban-move-note-form"
        onSubmit={handleSubmit((values) => onConfirm(values.note.trim()))}
        className="flex flex-col gap-4"
      >
        <p className="text-sm text-app-muted">{t.message(cardTitle)}</p>
        <TextareaField
          label={t.noteLabel}
          required={isRequired}
          rows={5}
          autoFocus
          error={errors.note?.message}
          {...register('note')}
        />
      </form>
    </Modal>
  );
}
