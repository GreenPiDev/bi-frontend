import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { ExternalLink } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Modal } from '../components/ui/modal';
import { TextField } from '../components/ui/text-field';
import { useToast } from '../components/ui/toast-context';
import { kanbanBoardFormSchema, type KanbanBoardFormValues } from '../features/kanban/schemas';
import { useCreateKanbanBoardMutation } from '../features/kanban/use-kanban';
import { tr } from '../i18n/tr';
import { ApiError } from '../lib/api';

const t = tr.kanban.createModal;

export function KanbanBoardCreateModal({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const navigate = useNavigate();
  const createMutation = useCreateKanbanBoardMutation();
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<KanbanBoardFormValues>({
    resolver: zodResolver(kanbanBoardFormSchema),
    defaultValues: { name: '', isShared: false, partnerTenantId: '' },
  });
  const isShared = useWatch({ control, name: 'isShared' });

  function onSubmit(values: KanbanBoardFormValues) {
    createMutation.mutate(
      {
        name: values.name,
        ...(values.isShared && values.partnerTenantId
          ? { partnerTenantId: values.partnerTenantId }
          : {}),
      },
      {
        onSuccess: (board) => {
          toast.success(t.success);
          onClose();
          navigate(`/kanban/${board.id}`);
        },
        onError: (error) => {
          if (error instanceof ApiError && error.code.startsWith('KANBAN_PARTNER')) {
            setError('partnerTenantId', { message: error.message });
            return;
          }
          toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
        },
      },
    );
  }

  return (
    <Modal
      title={t.title}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onClose}>
            {t.cancel}
          </Button>
          <Button type="submit" form="kanban-board-form" disabled={createMutation.isPending}>
            {t.submit}
          </Button>
        </>
      }
    >
      <form
        id="kanban-board-form"
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
      >
        <TextField
          label={t.nameLabel}
          required
          autoFocus
          error={errors.name?.message}
          {...register('name')}
        />
        {/* Aralik kurali: elemanlar arasi 16px (form gap-4); her aciklama (hint) kendi
            elemanina 6px - TextField'in icindeki label/input/hint araligiyla (gap-1.5) ayni. */}
        <div className="flex flex-col gap-1.5">
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              className="h-4 w-4 shrink-0 cursor-pointer accent-app-primary"
              {...register('isShared')}
            />
            <span className="text-sm font-semibold text-app-text">{t.sharedLabel}</span>
          </label>
          {/* Aciklama checkbox'in sol kenarindan baslar (kullanici istegi). */}
          <p className="text-xs text-app-muted">{t.sharedHint}</p>
        </div>
        <div className={isShared ? undefined : 'opacity-50'}>
          <TextField
            label={t.partnerLabel}
            required={isShared}
            hint={t.partnerHint}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            error={isShared ? errors.partnerTenantId?.message : undefined}
            {...register('partnerTenantId', { disabled: !isShared })}
          />
        </div>
        {/* Soluk/pasif blogun disinda: kendi kodunu karsi tarafa iletmek isteyen,
            "Ortak proje"yi isaretlemeden de profiline ulasabilsin. */}
        <Link
          to="/profile?tab=general"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-app-brand hover:underline"
        >
          {t.ownCodeLink}
          <ExternalLink size={14} />
        </Link>
      </form>
    </Modal>
  );
}
