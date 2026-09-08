import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { Button } from '../components/ui/button';
import { Modal } from '../components/ui/modal';
import { MultiSelect } from '../components/ui/multi-select';
import { Select } from '../components/ui/select';
import { TextField } from '../components/ui/text-field';
import { TextareaField } from '../components/ui/textarea-field';
import { useToast } from '../components/ui/toast-context';
import { messageFormSchema, type MessageFormValues } from '../features/crm/schemas';
import {
  useAssignableMessageUsersQuery,
  useCreateMessageMutation,
} from '../features/crm/use-messages';
import { ApiError } from '../lib/api';
import { tr } from '../i18n/tr';

interface NewMessageModalProps {
  onClose: () => void;
}

export function NewMessageModal({ onClose }: NewMessageModalProps) {
  const toast = useToast();
  const assignableUsersQuery = useAssignableMessageUsersQuery();
  const createMutation = useCreateMessageMutation();

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<MessageFormValues>({
    resolver: zodResolver(messageFormSchema),
    defaultValues: { body: '', toUserIds: [], ccUserIds: [] },
  });

  const relatedEntity = watch('relatedEntity');
  const userOptions = (assignableUsersQuery.data ?? []).map((user) => ({
    value: user.id,
    label: user.name,
  }));

  function onSubmit(values: MessageFormValues) {
    createMutation.mutate(
      {
        body: values.body,
        toUserIds: values.toUserIds,
        ccUserIds: values.ccUserIds ?? [],
        relatedEntity: values.relatedEntity,
        relatedEntityId: values.relatedEntity ? values.relatedEntityId : undefined,
      },
      {
        onSuccess: () => {
          toast.success(tr.crm.messages.form.createSuccess);
          onClose();
        },
        onError: (error) => {
          toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
        },
      },
    );
  }

  return (
    <Modal
      title={tr.crm.messages.newButton}
      onClose={onClose}
      width="lg"
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onClose}>
            {tr.crm.messages.form.cancel}
          </Button>
          <Button type="submit" form="new-message-form" disabled={createMutation.isPending}>
            {createMutation.isPending
              ? tr.crm.messages.form.submitting
              : tr.crm.messages.form.submit}
          </Button>
        </>
      }
    >
      <form id="new-message-form" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Controller
          name="toUserIds"
          control={control}
          render={({ field }) => (
            <MultiSelect
              label={tr.crm.messages.form.toLabel}
              value={field.value}
              onChange={field.onChange}
              options={userOptions}
              required
              error={errors.toUserIds?.message}
            />
          )}
        />
        <Controller
          name="ccUserIds"
          control={control}
          render={({ field }) => (
            <MultiSelect
              label={tr.crm.messages.form.ccLabel}
              value={field.value ?? []}
              onChange={field.onChange}
              options={userOptions}
            />
          )}
        />
        <TextareaField
          label={tr.crm.messages.form.bodyLabel}
          placeholder={tr.crm.messages.form.bodyPlaceholder}
          required
          error={errors.body?.message}
          {...register('body')}
        />
        <Select
          label={tr.crm.messages.form.relatedEntityTypeLabel}
          placeholder={tr.crm.messages.filterDrawer.relatedEntityAllOption}
          options={Object.entries(tr.crm.messages.relatedEntityOptions).map(([value, label]) => ({
            value,
            label,
          }))}
          {...register('relatedEntity')}
        />
        {relatedEntity && (
          <TextField
            label={tr.crm.messages.form.relatedEntityIdLabel}
            hint={tr.crm.messages.form.relatedEntityIdHint}
            error={errors.relatedEntityId?.message}
            {...register('relatedEntityId')}
          />
        )}
      </form>
    </Modal>
  );
}
