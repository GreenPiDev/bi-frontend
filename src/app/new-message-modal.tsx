import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Button } from '../components/ui/button';
import { Modal } from '../components/ui/modal';
import { MultiSelect } from '../components/ui/multi-select';
import { Select, type SelectOption } from '../components/ui/select';
import { TextareaField } from '../components/ui/textarea-field';
import { useToast } from '../components/ui/toast-context';
import { messageFormSchema, type MessageFormValues } from '../features/crm/schemas';
import { useInteractionsQuery } from '../features/crm/use-interactions';
import {
  useAssignableMessageUsersQuery,
  useCreateMessageMutation,
} from '../features/crm/use-messages';
import { useProjectsQuery } from '../features/crm/use-projects';
import { useQuotesQuery } from '../features/crm/use-quotes';
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
    setValue,
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

  // Kayit turu degistiginde onceki secimin (baska bir turdeki bir kayda ait
  // olabilecek) ID'sini elde tutmuyoruz - bkz. asagidaki kayit-secimi dropdown'u.
  useEffect(() => {
    setValue('relatedEntityId', '');
  }, [relatedEntity, setValue]);

  const projectsQuery = useProjectsQuery({}, { enabled: relatedEntity === 'PROJECT' });
  const quotesQuery = useQuotesQuery({}, { enabled: relatedEntity === 'QUOTE' });
  const interactionsQuery = useInteractionsQuery({}, { enabled: relatedEntity === 'INTERACTION' });

  let relatedEntityOptions: SelectOption[] = [];
  let relatedEntityOptionsLoading = false;
  if (relatedEntity === 'PROJECT') {
    relatedEntityOptionsLoading = projectsQuery.isPending;
    relatedEntityOptions = (projectsQuery.data?.data ?? []).map((project) => ({
      value: project.id,
      label: `${project.projectNumber} — ${project.name}`,
    }));
  } else if (relatedEntity === 'QUOTE') {
    relatedEntityOptionsLoading = quotesQuery.isPending;
    relatedEntityOptions = (quotesQuery.data?.data ?? []).map((quote) => ({
      value: quote.id,
      label: `${quote.quoteNumber} — ${quote.account.name}`,
    }));
  } else if (relatedEntity === 'INTERACTION') {
    relatedEntityOptionsLoading = interactionsQuery.isPending;
    relatedEntityOptions = (interactionsQuery.data?.data ?? []).map((interaction) => ({
      value: interaction.id,
      label: `${interaction.account?.name ?? tr.crm.interactions.detail.noAccountFallback} — ${tr.crm.interactions.typeOptions[interaction.type]} (${new Date(interaction.occurredAt).toLocaleDateString('tr-TR')})`,
    }));
  }
  const relatedEntityIdPlaceholder =
    !relatedEntityOptionsLoading && relatedEntityOptions.length === 0
      ? tr.crm.messages.form.relatedEntityIdEmptyOption
      : tr.crm.messages.form.relatedEntityIdPlaceholder;

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
          error={errors.relatedEntity?.message}
          {...register('relatedEntity', {
            setValueAs: (value) => (value === '' ? undefined : value),
          })}
        />
        {relatedEntity && (
          <Controller
            name="relatedEntityId"
            control={control}
            render={({ field }) => (
              <Select
                label={tr.crm.messages.form.relatedEntityIdLabel}
                placeholder={relatedEntityIdPlaceholder}
                options={relatedEntityOptions}
                error={errors.relatedEntityId?.message}
                value={field.value ?? ''}
                onChange={field.onChange}
              />
            )}
          />
        )}
      </form>
    </Modal>
  );
}
