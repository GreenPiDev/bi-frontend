import { zodResolver } from '@hookform/resolvers/zod';
import { ExternalLink, Paperclip, X } from 'lucide-react';
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { formatFileSize } from './format-file-size';
import { getRelatedEntityDetailPath } from './message-related-entity-paths';
import { messageComposeSchema, type MessageComposeFormValues } from './schemas';
import { useInteractionQuery, useInteractionsQuery } from './use-interactions';
import {
  useAssignableMessageUsersQuery,
  useCreateMessageMutation,
  useDeleteUnattachedMessageFileMutation,
  useUploadMessageAttachmentMutation,
} from './use-messages';
import { useProjectQuery, useProjectsQuery } from './use-projects';
import { useQuoteQuery, useQuotesQuery } from './use-quotes';
import { Button } from '../../components/ui/button';
import { MultiSelect } from '../../components/ui/multi-select';
import { Select, type SelectOption } from '../../components/ui/select';
import { TextareaField } from '../../components/ui/textarea-field';
import { TextField } from '../../components/ui/text-field';
import { Tooltip } from '../../components/ui/tooltip';
import { useToast } from '../../components/ui/toast-context';
import { ApiError, type UploadedMessageAttachment } from '../../lib/api';
import { tr } from '../../i18n/tr';

const ACCEPTED_ATTACHMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
  'image/webp',
];
const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_ATTACHMENTS = 5;

interface MessageComposeFormProps {
  /** 'new': her zaman yeni bir konusma baslatir (Yeni Mesaj modali).
   * 'reply': bir konusmaya yanit yazar; "Yeni konusma olarak olustur" checkbox'i
   * isaretlenmedikce ayni konusmaya (conversationId) eklenir. */
  mode: 'new' | 'reply';
  conversationId?: string;
  defaultToUserIds?: string[];
  defaultRelatedEntity?: MessageComposeFormValues['relatedEntity'];
  defaultRelatedEntityId?: string;
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
  defaultRelatedEntity,
  defaultRelatedEntityId,
  onCancel,
  onSuccess,
}: MessageComposeFormProps) {
  const toast = useToast();
  const assignableUsersQuery = useAssignableMessageUsersQuery();
  const createMutation = useCreateMessageMutation();
  const uploadAttachmentMutation = useUploadMessageAttachmentMutation();
  const deleteAttachmentMutation = useDeleteUnattachedMessageFileMutation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachments, setAttachments] = useState<UploadedMessageAttachment[]>([]);
  const [uploadingNames, setUploadingNames] = useState<string[]>([]);

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
      relatedEntity: defaultRelatedEntity,
      relatedEntityId: defaultRelatedEntityId ?? '',
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
  // Sadece relatedEntity GERCEKTEN degistiginde sifirlanir (onceki deger ile
  // karsilastirarak) - "ilk render'i atla" seklindeki bir ref bayragi, React
  // StrictMode'un effect'leri mount'ta iki kez calistirmasi yuzunden yaniltici
  // olurdu (ikinci calisirken bayrak zaten false'a dustugu icin defaultRelatedEntityId
  // ile gelen on-dolu deger silinirdi).
  const previousRelatedEntityRef = useRef(relatedEntity);
  useEffect(() => {
    if (previousRelatedEntityRef.current !== relatedEntity) {
      setValue('relatedEntityId', '');
    }
    previousRelatedEntityRef.current = relatedEntity;
  }, [relatedEntity, setValue]);

  const projectsQuery = useProjectsQuery({}, { enabled: relatedEntity === 'PROJECT' });
  const quotesQuery = useQuotesQuery({}, { enabled: relatedEntity === 'QUOTE' });
  const interactionsQuery = useInteractionsQuery({}, { enabled: relatedEntity === 'INTERACTION' });

  // Ust kaptan (ör. gorusme detay sayfasi) gelen on-secili kayit, liste sorgusunun
  // ilk sayfasinda yer almayabilir (varsayilan siralama/sayfalama) - o zaman Select'in
  // value'su hicbir <option>'a eslesmez ve secili gorunmez. Bu yuzden secilen kaydi
  // tekil ucla ayrica cekip listede yoksa basa ekliyoruz.
  const isDefaultProject = relatedEntity === 'PROJECT' && defaultRelatedEntity === 'PROJECT';
  const isDefaultQuote = relatedEntity === 'QUOTE' && defaultRelatedEntity === 'QUOTE';
  const isDefaultInteraction =
    relatedEntity === 'INTERACTION' && defaultRelatedEntity === 'INTERACTION';
  const defaultProjectQuery = useProjectQuery(
    isDefaultProject ? (defaultRelatedEntityId ?? '') : '',
  );
  const defaultQuoteQuery = useQuoteQuery(isDefaultQuote ? (defaultRelatedEntityId ?? '') : '');
  const defaultInteractionQuery = useInteractionQuery(
    isDefaultInteraction ? (defaultRelatedEntityId ?? '') : '',
  );

  let relatedEntityOptions: SelectOption[] = [];
  let relatedEntityOptionsLoading = false;
  if (relatedEntity === 'PROJECT') {
    relatedEntityOptionsLoading = projectsQuery.isPending;
    relatedEntityOptions = (projectsQuery.data?.data ?? []).map((project) => ({
      value: project.id,
      label: `${project.projectNumber} — ${project.name}`,
    }));
    const defaultProject = defaultProjectQuery.data;
    if (
      defaultProject &&
      !relatedEntityOptions.some((option) => option.value === defaultProject.id)
    ) {
      relatedEntityOptions = [
        {
          value: defaultProject.id,
          label: `${defaultProject.projectNumber} — ${defaultProject.name}`,
        },
        ...relatedEntityOptions,
      ];
    }
  } else if (relatedEntity === 'QUOTE') {
    relatedEntityOptionsLoading = quotesQuery.isPending;
    relatedEntityOptions = (quotesQuery.data?.data ?? []).map((quote) => ({
      value: quote.id,
      label: `${quote.quoteNumber} — ${quote.account.name}`,
    }));
    const defaultQuote = defaultQuoteQuery.data;
    if (defaultQuote && !relatedEntityOptions.some((option) => option.value === defaultQuote.id)) {
      relatedEntityOptions = [
        {
          value: defaultQuote.id,
          label: `${defaultQuote.quoteNumber} — ${defaultQuote.account.name}`,
        },
        ...relatedEntityOptions,
      ];
    }
  } else if (relatedEntity === 'INTERACTION') {
    relatedEntityOptionsLoading = interactionsQuery.isPending;
    relatedEntityOptions = (interactionsQuery.data?.data ?? []).map((interaction) => ({
      value: interaction.id,
      label: `${interaction.account?.name ?? tr.crm.interactions.detail.noAccountFallback} — ${tr.crm.interactions.typeOptions[interaction.type]} (${new Date(interaction.occurredAt).toLocaleDateString('tr-TR')})`,
    }));
    const defaultInteraction = defaultInteractionQuery.data;
    if (
      defaultInteraction &&
      !relatedEntityOptions.some((option) => option.value === defaultInteraction.id)
    ) {
      relatedEntityOptions = [
        {
          value: defaultInteraction.id,
          label: `${defaultInteraction.account?.name ?? tr.crm.interactions.detail.noAccountFallback} — ${tr.crm.interactions.typeOptions[defaultInteraction.type]} (${new Date(defaultInteraction.occurredAt).toLocaleDateString('tr-TR')})`,
        },
        ...relatedEntityOptions,
      ];
    }
  }
  const relatedEntityIdPlaceholder =
    !relatedEntityOptionsLoading && relatedEntityOptions.length === 0
      ? tr.crm.messages.form.relatedEntityIdEmptyOption
      : tr.crm.messages.form.relatedEntityIdPlaceholder;

  const relatedEntityId = watch('relatedEntityId');
  const relatedEntityDetailPath = getRelatedEntityDetailPath(relatedEntity, relatedEntityId);

  async function handleFilesSelected(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (files.length === 0) return;
    if (attachments.length + uploadingNames.length + files.length > MAX_ATTACHMENTS) {
      toast.error(tr.crm.messages.form.tooMany);
      return;
    }
    for (const file of files) {
      if (!ACCEPTED_ATTACHMENT_TYPES.includes(file.type)) {
        toast.error(tr.crm.messages.form.unsupportedType);
        continue;
      }
      if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
        toast.error(tr.crm.messages.form.tooLarge);
        continue;
      }
      setUploadingNames((prev) => [...prev, file.name]);
      try {
        const uploaded = await uploadAttachmentMutation.mutateAsync(file);
        setAttachments((prev) => [...prev, uploaded]);
      } catch (error) {
        toast.error(error instanceof ApiError ? error.message : tr.crm.messages.form.uploadFailed);
      } finally {
        setUploadingNames((prev) => {
          const index = prev.indexOf(file.name);
          if (index === -1) return prev;
          return [...prev.slice(0, index), ...prev.slice(index + 1)];
        });
      }
    }
  }

  function handleRemoveAttachment(attachment: UploadedMessageAttachment) {
    setAttachments((prev) => prev.filter((a) => a.fileKey !== attachment.fileKey));
    deleteAttachmentMutation.mutate(attachment.fileKey);
  }

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
        attachments: attachments.length > 0 ? attachments : undefined,
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
      <div>
        <label className="mb-1 block text-sm font-medium text-app-text">
          {tr.crm.messages.form.attachmentsLabel}
        </label>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPTED_ATTACHMENT_TYPES.join(',')}
          className="hidden"
          onChange={handleFilesSelected}
        />
        <Button
          type="button"
          variant="secondary"
          disabled={attachments.length + uploadingNames.length >= MAX_ATTACHMENTS}
          onClick={() => fileInputRef.current?.click()}
        >
          <Paperclip size={16} className="mr-1.5 inline" />
          {tr.crm.messages.form.attachButton}
        </Button>
        {(attachments.length > 0 || uploadingNames.length > 0) && (
          <ul className="mt-2 flex flex-col gap-1">
            {attachments.map((attachment) => (
              <li
                key={attachment.fileKey}
                className="flex items-center justify-between gap-2 rounded-lg border border-app-border bg-app-surface px-3 py-1.5 text-sm text-app-text"
              >
                <span className="truncate">
                  {attachment.fileName} ({formatFileSize(attachment.sizeBytes)})
                </span>
                <button
                  type="button"
                  aria-label={tr.crm.messages.form.removeAttachmentAria}
                  onClick={() => handleRemoveAttachment(attachment)}
                  className="text-app-muted hover:text-app-text"
                >
                  <X size={14} />
                </button>
              </li>
            ))}
            {uploadingNames.map((name) => (
              <li
                key={name}
                className="flex items-center gap-2 rounded-lg border border-app-border bg-app-bg-muted px-3 py-1.5 text-sm text-app-muted"
              >
                <span className="truncate">{name}</span>
                <span>— {tr.crm.messages.form.uploadingLabel}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
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
        <Button type="submit" disabled={createMutation.isPending || uploadingNames.length > 0}>
          {createMutation.isPending ? tr.crm.messages.form.submitting : tr.crm.messages.form.submit}
        </Button>
      </div>
    </form>
  );
}
