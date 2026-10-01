import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Button } from '../../components/ui/button';
import { DateTimeField } from '../../components/ui/date-time-field';
import { FormError } from '../../components/ui/form-error';
import { Modal } from '../../components/ui/modal';
import { Select } from '../../components/ui/select';
import { TextareaField } from '../../components/ui/textarea-field';
import { TextField } from '../../components/ui/text-field';
import { useToast } from '../../components/ui/toast-context';
import { InteractionTypeSelect } from './interaction-type-select';
import { useAssignableCalendarUsersQuery } from './use-calendar-events';
import { useContactsQuery } from './use-contacts';
import { useUpdateInteractionMutation } from './use-interactions';
import { linkedInteractionEditFormSchema, type LinkedInteractionEditFormValues } from './schemas';
import { ApiError, type Interaction } from '../../lib/api';
import { tr } from '../../i18n/tr';

interface EditLinkedInteractionModalProps {
  interaction: Interaction;
  accountId: string;
  accountName: string;
  onClose: () => void;
}

/** occurredAt backend'den UTC ISO string olarak gelir - DateTimeField yerel saat bekler,
 * bkz. interaction-edit-page.tsx'teki ayni desen (toDatetimeLocal). */
function toDatetimeLocal(iso: string): string {
  const date = new Date(iso);
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

/** "Bağlı Görüşme" tablosundaki düzenle ikonuyla açılır - new-linked-interaction-modal.tsx'in
 * aksine hatırlatma bölümü yok (backend PATCH /interactions/:id hatırlatma alanlarını
 * desteklemiyor, bkz. interactions.service.ts update() ve interaction.dto.ts
 * UpdateInteractionSchema yorumu). */
export function EditLinkedInteractionModal({
  interaction,
  accountId,
  accountName,
  onClose,
}: EditLinkedInteractionModalProps) {
  const toast = useToast();
  const contactsQuery = useContactsQuery({ accountId, pageSize: 100 });
  const assignableUsersQuery = useAssignableCalendarUsersQuery();
  const updateMutation = useUpdateInteractionMutation(interaction.id);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<LinkedInteractionEditFormValues>({
    resolver: zodResolver(linkedInteractionEditFormSchema),
  });

  useEffect(() => {
    reset({
      contactId: interaction.contactId ?? '',
      performedByUserId: interaction.performedByUserId ?? '',
      type: interaction.type,
      notes: interaction.notes ?? undefined,
      occurredAt: toDatetimeLocal(interaction.occurredAt),
    });
  }, [interaction, reset]);

  const onSubmit = handleSubmit((values) => {
    updateMutation.mutate(
      {
        contactId: values.contactId || undefined,
        performedByUserId: values.performedByUserId,
        type: values.type,
        notes: values.notes?.trim() || undefined,
        occurredAt: new Date(values.occurredAt).toISOString(),
      },
      {
        onSuccess: () => {
          toast.success(tr.crm.interactions.linked.updateSuccess);
          onClose();
        },
        onError: (error) => {
          toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
        },
      },
    );
  });

  const apiErrorMessage =
    updateMutation.error instanceof ApiError ? updateMutation.error.message : undefined;

  return (
    <Modal
      title={tr.crm.interactions.linked.editTitle}
      onClose={onClose}
      width="lg"
      allowPageScroll
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <FormError message={apiErrorMessage} />

        <TextField label={tr.crm.interactions.linked.accountLabel} value={accountName} disabled />

        <Controller
          name="contactId"
          control={control}
          render={({ field }) => (
            <Select
              label={tr.crm.interactions.linked.contactLabel}
              placeholder={tr.crm.interactions.linked.contactPlaceholder}
              hint={tr.crm.interactions.linked.contactHint}
              value={field.value ?? ''}
              onChange={(event) => field.onChange(event.target.value)}
              options={(contactsQuery.data?.data ?? []).map((contact) => ({
                value: contact.id,
                label: `${contact.firstName} ${contact.lastName}`,
              }))}
              error={errors.contactId?.message}
            />
          )}
        />

        <Controller
          name="performedByUserId"
          control={control}
          render={({ field }) => (
            <Select
              label={tr.crm.interactions.linked.performedByLabel}
              placeholder={tr.crm.interactions.linked.performedByPlaceholder}
              required
              hint={tr.crm.interactions.linked.performedByHint}
              value={field.value ?? ''}
              onChange={(event) => field.onChange(event.target.value)}
              options={(assignableUsersQuery.data ?? []).map((user) => ({
                value: user.id,
                label: user.name,
              }))}
              error={errors.performedByUserId?.message}
            />
          )}
        />

        <Controller
          name="type"
          control={control}
          render={({ field }) => (
            <InteractionTypeSelect
              label={tr.crm.interactions.form.typeLabel}
              value={field.value ?? ''}
              onChange={field.onChange}
              error={errors.type?.message}
            />
          )}
        />

        <TextareaField
          label={tr.crm.interactions.form.notesLabel}
          rows={4}
          hint={tr.crm.interactions.form.notesHint}
          error={errors.notes?.message}
          {...register('notes')}
        />

        <Controller
          name="occurredAt"
          control={control}
          render={({ field }) => (
            <DateTimeField
              label={tr.crm.interactions.form.occurredAtLabel}
              required
              hint={tr.crm.interactions.form.occurredAtHint}
              error={errors.occurredAt?.message}
              value={field.value ?? ''}
              onChange={field.onChange}
              disableFutureDates
            />
          )}
        />

        <div className="mt-1 flex gap-2">
          <Button type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending
              ? tr.crm.interactions.linked.submitting
              : tr.crm.interactions.linked.submit}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            {tr.crm.interactions.linked.cancel}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
