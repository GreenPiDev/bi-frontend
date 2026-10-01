import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Button } from '../../components/ui/button';
import { DateTimeField } from '../../components/ui/date-time-field';
import { FormError } from '../../components/ui/form-error';
import { Modal } from '../../components/ui/modal';
import { MultiSelect } from '../../components/ui/multi-select';
import { Select } from '../../components/ui/select';
import { Switch } from '../../components/ui/switch';
import { TextareaField } from '../../components/ui/textarea-field';
import { TextField } from '../../components/ui/text-field';
import { useToast } from '../../components/ui/toast-context';
import { useMeQuery } from '../auth/use-auth';
import { InteractionTypeSelect } from './interaction-type-select';
import { useAssignableCalendarUsersQuery } from './use-calendar-events';
import { useContactsQuery } from './use-contacts';
import { useCreateInteractionMutation } from './use-interactions';
import { linkedInteractionFormSchema, type LinkedInteractionFormValues } from './schemas';
import { ApiError, type CreateInteractionInput, type Interaction } from '../../lib/api';
import { tr } from '../../i18n/tr';

interface NewLinkedInteractionModalProps {
  accountId: string;
  accountName: string;
  parentInteractionId: string;
  onClose: () => void;
  onCreated?: (interaction: Interaction) => void;
}

/** "Bağlı Görüşme Ekle" (yeşil + butonu) modalı - sadece görüşme detay sayfasında kart
 * olarak görünen, /gorusmeler ana listesinde gösterilmeyen ek bir görüşme kaydı oluşturur
 * (bkz. schema.prisma Interaction.parentInteractionId yorumu). Firma sabit geldiği ve
 * fırsat/katılımcı bölümleri olmadığı için interaction-form-page.tsx'in küçültülmüş hali. */
export function NewLinkedInteractionModal({
  accountId,
  accountName,
  parentInteractionId,
  onClose,
  onCreated,
}: NewLinkedInteractionModalProps) {
  const toast = useToast();
  // pageSize max 100'dur (bkz. ListQuerySchema) - 100'u asan bir deger backend'de 400'e
  // dusup Select'in sessizce bos kalmasina yol acar.
  const contactsQuery = useContactsQuery({ accountId, pageSize: 100 });
  const assignableUsersQuery = useAssignableCalendarUsersQuery();
  const meQuery = useMeQuery();
  const createMutation = useCreateInteractionMutation();

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<LinkedInteractionFormValues>({
    resolver: zodResolver(linkedInteractionFormSchema),
    defaultValues: { type: '', occurredAt: '', hasReminder: false, performedByUserId: '' },
  });

  const hasReminder = watch('hasReminder');
  const performedByUserId = watch('performedByUserId');

  // Gorusmeyi yapan kullanici varsayilan olarak su anki kullanicidir, ama degistirilebilir -
  // sadece henuz hic deger secilmemisse (bos string) doldurulur, kullanicinin sonradan
  // yaptigi degisikligin uzerine yazmaz.
  useEffect(() => {
    if (meQuery.data && !performedByUserId) {
      setValue('performedByUserId', meQuery.data.id);
    }
  }, [meQuery.data, performedByUserId, setValue]);

  const onSubmit = handleSubmit((values) => {
    const input: CreateInteractionInput = {
      accountId,
      parentInteractionId,
      performedByUserId: values.performedByUserId,
      ...(values.contactId ? { contactId: values.contactId } : {}),
      type: values.type,
      notes: values.notes?.trim() || undefined,
      occurredAt: new Date(values.occurredAt as string).toISOString(),
      ...(values.hasReminder && values.reminderStartAt && values.reminderTitle
        ? {
            reminder: {
              startAt: new Date(values.reminderStartAt).toISOString(),
              title: values.reminderTitle,
              description: values.reminderDescription || undefined,
              assignees: (values.reminderAssigneeUserIds ?? []).map((userId) => ({ userId })),
            },
          }
        : {}),
    };

    createMutation.mutate(input, {
      onSuccess: (result) => {
        toast.success(tr.crm.interactions.linked.createSuccess);
        for (const conflict of result.reminderConflicts) {
          toast.info(
            tr.crm.interactions.reminderConflictNotice(
              new Date(conflict.suggestedStartAt).toLocaleString('tr-TR'),
            ),
          );
        }
        onCreated?.(result.interaction);
        onClose();
      },
      onError: (error) => {
        toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
      },
    });
  });

  const apiErrorMessage =
    createMutation.error instanceof ApiError ? createMutation.error.message : undefined;

  return (
    <Modal
      title={tr.crm.interactions.linked.modalTitle}
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

        <div className="rounded-lg border border-app-border bg-app-surface p-4">
          <Controller
            name="hasReminder"
            control={control}
            render={({ field }) => (
              <div className="flex items-center gap-2">
                <Switch checked={field.value ?? false} onChange={field.onChange} />
                <span className="text-sm font-semibold text-app-text">
                  {tr.crm.interactions.form.reminderCheckboxLabel}
                </span>
              </div>
            )}
          />
          {hasReminder && (
            <div className="mt-4 flex flex-col gap-4">
              <Controller
                name="reminderStartAt"
                control={control}
                render={({ field }) => (
                  <DateTimeField
                    label={tr.crm.interactions.form.reminderDateLabel}
                    required
                    hint={tr.crm.interactions.form.reminderDateHint}
                    error={errors.reminderStartAt?.message}
                    value={field.value ?? ''}
                    onChange={field.onChange}
                  />
                )}
              />
              <Controller
                name="reminderAssigneeUserIds"
                control={control}
                render={({ field }) => (
                  <MultiSelect
                    label={tr.crm.interactions.form.reminderAssigneesLabel}
                    placeholder={tr.crm.interactions.form.reminderAssigneesPlaceholder}
                    required
                    hint={tr.crm.interactions.form.reminderAssigneesHint}
                    value={field.value ?? []}
                    onChange={field.onChange}
                    options={(assignableUsersQuery.data ?? []).map((user) => ({
                      value: user.id,
                      label: user.name,
                    }))}
                    error={errors.reminderAssigneeUserIds?.message}
                  />
                )}
              />
              <TextField
                label={tr.crm.interactions.form.reminderTitleLabel}
                required
                hint={tr.crm.interactions.form.reminderTitleHint}
                error={errors.reminderTitle?.message}
                {...register('reminderTitle')}
              />
              <TextareaField
                label={tr.crm.interactions.form.reminderDescriptionLabel}
                rows={3}
                hint={tr.crm.interactions.form.reminderDescriptionHint}
                error={errors.reminderDescription?.message}
                {...register('reminderDescription')}
              />
            </div>
          )}
        </div>

        <div className="mt-1 flex gap-2">
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending
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
