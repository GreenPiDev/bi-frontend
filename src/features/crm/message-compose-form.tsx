import { zodResolver } from '@hookform/resolvers/zod';
import { ExternalLink } from 'lucide-react';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { getRelatedEntityDetailPath } from './message-related-entity-paths';
import { messageComposeSchema, type MessageComposeFormValues } from './schemas';
import { useInteractionsQuery } from './use-interactions';
import { useAssignableMessageUsersQuery, useCreateMessageMutation } from './use-messages';
import { useProjectsQuery } from './use-projects';
import { useQuotesQuery } from './use-quotes';
import { Button } from '../../components/ui/button';
import { MultiSelect } from '../../components/ui/multi-select';
import { Select, type SelectOption } from '../../components/ui/select';
import { TextareaField } from '../../components/ui/textarea-field';
import { TextField } from '../../components/ui/text-field';
import { Tooltip } from '../../components/ui/tooltip';
import { useToast } from '../../components/ui/toast-context';
import { ApiError } from '../../lib/api';
import { tr } from '../../i18n/tr';

interface MessageComposeFormProps {
  /** 'new': her zaman yeni bir konusma baslatir (Yeni Mesaj modali).
   * 'reply': bir konusmaya yanit yazar; "Yeni konusma olarak olustur" checkbox'i
   * isaretlenmedikce ayni konusmaya (conversationId) eklenir. */
  mode: 'new' | 'reply';
  conversationId?: string;
  defaultToUserIds?: string[];
  onCancel?: () => void;
  onSuccess: () => void;
}

/** "Yeni Mesaj" modali ve `/mesajlar/:id` sayfasindaki satir-ici yanit karti icin
 * ortak form govdesi - ikisi de ayni alanlari/dogrulamayi kullanir, sadece disaridan
 * farkli bir kap (Modal vs kart) icine yerlestirilir. */
export function MessageComposeForm({
  mode,
  conversationId,
  defaultToUserIds = [],
  onCancel,
  onSuccess,
}: MessageComposeFormProps) {
  const toast = useToast();
  const assignableUsersQuery = useAssignableMessageUsersQuery();
  const createMutation = useCreateMessageMutation();

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm<MessageComposeFormValues>({
    resolver: zodResolver(messageComposeSchema),
    defaultValues: {
      subject: '',
      body: '',
      toUserIds: defaultToUserIds,
      ccUserIds: [],
      isNewConversation: false,
    },
  });

  const relatedEntity = watch('relatedEntity');
  // 'new' modda her zaman yeni konusma; 'reply' modda checkbox isaretliyse yeni konusma.
  const isNewConversation = mode === 'new' || Boolean(watch('isNewConversation'));
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

  const relatedEntityId = watch('relatedEntityId');
  const relatedEntityDetailPath = getRelatedEntityDetailPath(relatedEntity, relatedEntityId);

  function onSubmit(values: MessageComposeFormValues) {
    if (isNewConversation && !values.subject?.trim()) {
      setError('subject', { message: 'Konu gereklidir.' });
      return;
    }

    createMutation.mutate(
      {
        body: values.body,
        toUserIds: values.toUserIds,
        ccUserIds: values.ccUserIds ?? [],
        ...(isNewConversation
          ? {
              subject: values.subject,
              relatedEntity: values.relatedEntity,
              relatedEntityId: values.relatedEntity ? values.relatedEntityId : undefined,
            }
          : { conversationId }),
      },
      {
        onSuccess: () => {
          toast.success(
            mode === 'new'
              ? tr.crm.messages.form.createSuccess
              : tr.crm.messages.detail.replySuccess,
          );
          onSuccess();
        },
        onError: (error) => {
          toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
        },
      },
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
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
      {mode === 'reply' && (
        <label className="flex items-center gap-2 text-sm text-app-text">
          <input
            type="checkbox"
            className="accent-app-primary"
            {...register('isNewConversation')}
          />
          {tr.crm.messages.form.newConversationCheckbox}
        </label>
      )}
      {isNewConversation && (
        <TextField
          label={tr.crm.messages.form.subjectLabel}
          placeholder={tr.crm.messages.form.subjectPlaceholder}
          required
          error={errors.subject?.message}
          {...register('subject')}
        />
      )}
      <TextareaField
        label={tr.crm.messages.form.bodyLabel}
        placeholder={tr.crm.messages.form.bodyPlaceholder}
        required
        error={errors.body?.message}
        {...register('body')}
      />
      {isNewConversation && (
        <>
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
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Controller
                  name="relatedEntityId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      id="message-compose-related-entity-id"
                      label={tr.crm.messages.form.relatedEntityIdLabel}
                      placeholder={relatedEntityIdPlaceholder}
                      options={relatedEntityOptions}
                      error={errors.relatedEntityId?.message}
                      value={field.value ?? ''}
                      onChange={field.onChange}
                    />
                  )}
                />
              </div>
              {relatedEntityDetailPath && (
                <Tooltip content={tr.crm.messages.form.viewDetailTooltip}>
                  <a
                    href={relatedEntityDetailPath}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={tr.crm.messages.form.viewDetailTooltip}
                    className="flex h-[42px] w-[42px] items-center justify-center rounded-lg border border-app-border bg-app-surface text-app-muted hover:text-app-text"
                  >
                    <ExternalLink size={16} />
                  </a>
                </Tooltip>
              )}
            </div>
          )}
        </>
      )}
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button variant="secondary" type="button" onClick={onCancel}>
            {tr.crm.messages.form.cancel}
          </Button>
        )}
        <Button type="submit" disabled={createMutation.isPending}>
          {createMutation.isPending ? tr.crm.messages.form.submitting : tr.crm.messages.form.submit}
        </Button>
      </div>
    </form>
  );
}
