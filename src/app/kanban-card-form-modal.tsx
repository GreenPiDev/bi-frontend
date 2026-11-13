import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { Button } from '../components/ui/button';
import { DateField } from '../components/ui/date-field';
import { Modal } from '../components/ui/modal';
import { Select, type SelectOption } from '../components/ui/select';
import { TextField } from '../components/ui/text-field';
import { TextareaField } from '../components/ui/textarea-field';
import { useToast } from '../components/ui/toast-context';
import { kanbanCardFormSchema, type KanbanCardFormValues } from '../features/kanban/schemas';
import {
  useCreateKanbanCardMutation,
  useKanbanAssignableUsersQuery,
  useUpdateKanbanCardMutation,
} from '../features/kanban/use-kanban';
import { tr } from '../i18n/tr';
import { ApiError, type KanbanCard, type KanbanCardInput } from '../lib/api';

const t = tr.kanban.card;

interface KanbanCardFormModalProps {
  boardId: string;
  isShared: boolean;
  /** Verilirse duzenleme modu. */
  card?: KanbanCard;
  onClose: () => void;
}

export function KanbanCardFormModal({
  boardId,
  isShared,
  card,
  onClose,
}: KanbanCardFormModalProps) {
  const toast = useToast();
  const usersQuery = useKanbanAssignableUsersQuery();
  const createMutation = useCreateKanbanCardMutation(boardId);
  const updateMutation = useUpdateKanbanCardMutation(boardId);
  const isPending = createMutation.isPending || updateMutation.isPending;

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<KanbanCardFormValues>({
    resolver: zodResolver(kanbanCardFormSchema),
    defaultValues: {
      title: card?.title ?? '',
      description: card?.description ?? '',
      assigneeUserId: card?.assignee?.id ?? '',
      priority: card?.priority ?? 'MEDIUM',
      dueDate: card?.dueDate ?? '',
    },
  });

  // Atanabilir kisiler sadece kendi sirketimiz; ortak sirketin kullanicisina atanmis
  // bir karti duzenlerken mevcut kisi de secenek olarak korunur.
  const userOptions: SelectOption[] = (usersQuery.data ?? []).map((user) => ({
    value: user.id,
    label: user.name,
  }));
  if (card?.assignee?.isExternal) {
    userOptions.unshift({
      value: card.assignee.id,
      label: `${card.assignee.name} (${tr.kanban.board.externalAssignee})`,
    });
  }

  const priorityOptions: SelectOption[] = (['LOW', 'MEDIUM', 'HIGH'] as const).map((value) => ({
    value,
    label: tr.kanban.priorities[value],
  }));

  function handleError(error: unknown) {
    toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
  }

  function onSubmit(values: KanbanCardFormValues) {
    const input: KanbanCardInput = {
      title: values.title,
      description: values.description.trim() || null,
      assigneeUserId: values.assigneeUserId || null,
      priority: values.priority,
      dueDate: values.dueDate || null,
    };
    if (card) {
      updateMutation.mutate(
        { cardId: card.id, input },
        {
          onSuccess: () => {
            toast.success(t.updateSuccess);
            onClose();
          },
          onError: handleError,
        },
      );
      return;
    }
    createMutation.mutate(input, {
      onSuccess: () => {
        toast.success(t.createSuccess);
        onClose();
      },
      onError: handleError,
    });
  }

  return (
    <Modal
      title={card ? t.editTitle : t.createTitle}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onClose}>
            {t.cancel}
          </Button>
          <Button type="submit" form="kanban-card-form" disabled={isPending}>
            {t.save}
          </Button>
        </>
      }
    >
      <form id="kanban-card-form" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <TextField
          label={t.titleLabel}
          required
          autoFocus
          error={errors.title?.message}
          {...register('title')}
        />
        <TextareaField
          label={t.descriptionLabel}
          rows={5}
          error={errors.description?.message}
          {...register('description')}
        />
        <Select
          label={t.assigneeFieldLabel}
          placeholder={t.assigneePlaceholder}
          hint={isShared ? t.assigneeHintShared : undefined}
          error={errors.assigneeUserId?.message}
          options={userOptions}
          {...register('assigneeUserId')}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            label={t.priorityLabel}
            required
            error={errors.priority?.message}
            options={priorityOptions}
            {...register('priority')}
          />
          <Controller
            control={control}
            name="dueDate"
            render={({ field }) => (
              <DateField
                label={t.dueDateFieldLabel}
                value={field.value}
                onChange={field.onChange}
                clearable
                onClear={() => field.onChange('')}
                error={errors.dueDate?.message}
              />
            )}
          />
        </div>
      </form>
    </Modal>
  );
}
