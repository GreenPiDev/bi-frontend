import { zodResolver } from '@hookform/resolvers/zod';
import { Paperclip, X } from 'lucide-react';
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AppShell } from './app-shell';
import { AccountAutocomplete } from '../features/crm/account-autocomplete';
import { formatFileSize } from '../features/crm/format-file-size';
import { BackLink } from '../components/ui/back-link';
import { Button } from '../components/ui/button';
import { FormError } from '../components/ui/form-error';
import { MultiSelect } from '../components/ui/multi-select';
import { TextField } from '../components/ui/text-field';
import { useToast } from '../components/ui/toast-context';
import { useQuotesQuery } from '../features/crm/use-quotes';
import {
  useAddProjectAttachmentMutation,
  useCreateProjectMutation,
  useProjectAssignableUsersQuery,
  useProjectQuery,
  useUpdateProjectMutation,
} from '../features/crm/use-projects';
import { projectFormSchema, type ProjectFormValues } from '../features/crm/schemas';
import { ApiError } from '../lib/api';
import { tr } from '../i18n/tr';

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
const MAX_ATTACHMENTS = 10;

export function ProjectFormPage() {
  const { projectNumber } = useParams();
  const isEdit = Boolean(projectNumber);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prefillAccountId = searchParams.get('accountId') ?? undefined;
  const toast = useToast();
  // getById backend tarafinda hem id hem projectNumber'i kabul ediyor (bkz.
  // ProjectsService.getById) - duzenleme rotasi artik id degil slug tasiyor.
  const projectQuery = useProjectQuery(projectNumber ?? '');
  const createMutation = useCreateProjectMutation();
  const updateMutation = useUpdateProjectMutation(projectQuery.data?.id ?? '');
  const mutation = isEdit ? updateMutation : createMutation;

  // Dosyalar secildigi anda degil, form "Kaydet"ine basilinca yuklenir - kullanici
  // yanlis dosya secip Kaydet'ten once vazgecebilsin diye. Secilen ama henuz
  // yuklenmemis dosyalar (File nesneleri) sadece lokal state'te tutulur; duzenleme
  // modunda zaten yuklu olan dosyalar projectQuery.data.attachments'tan gelir ve bu
  // listede X ile kaldirilamaz (sadece goruntulenir).
  const addAttachmentMutation = useAddProjectAttachmentMutation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [isSavingAttachments, setIsSavingAttachments] = useState(false);

  const persistedAttachments = projectQuery.data?.attachments ?? [];
  const attachmentCount = persistedAttachments.length + stagedFiles.length;

  function handleFilesSelected(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (files.length === 0) return;
    if (attachmentCount + files.length > MAX_ATTACHMENTS) {
      toast.error(tr.crm.projects.form.tooMany);
      return;
    }
    const validFiles: File[] = [];
    for (const file of files) {
      if (!ACCEPTED_ATTACHMENT_TYPES.includes(file.type)) {
        toast.error(tr.crm.projects.form.unsupportedType);
        continue;
      }
      if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
        toast.error(tr.crm.projects.form.tooLarge);
        continue;
      }
      validFiles.push(file);
    }
    setStagedFiles((prev) => [...prev, ...validFiles]);
  }

  function handleRemoveStagedFile(index: number) {
    setStagedFiles((prev) => prev.filter((_, i) => i !== index));
  }

  /** mutation basarili olduktan sonra (proje artik gercek bir id'ye sahip) staged
   * dosyalari sirayla yukler - biri basarisiz olsa bile digerlerine devam eder. */
  async function uploadStagedFiles(projectId: string) {
    if (stagedFiles.length === 0) return;
    setIsSavingAttachments(true);
    for (const file of stagedFiles) {
      try {
        await addAttachmentMutation.mutateAsync({ projectId, file });
      } catch (error) {
        toast.error(error instanceof ApiError ? error.message : tr.crm.projects.form.uploadFailed);
      }
    }
    setIsSavingAttachments(false);
  }

  const {
    register,
    handleSubmit,
    reset,
    watch,
    control,
    formState: { errors },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: { accountId: prefillAccountId },
  });

  const estimatedBudgetField = register('estimatedBudget');
  const actualCostField = register('actualCost');

  const selectedAccountId = watch('accountId');
  const quotesQuery = useQuotesQuery(
    { accountId: selectedAccountId || undefined, pageSize: 100 },
    { enabled: isEdit },
  );
  const quoteOptions = (quotesQuery.data?.data ?? []).map((quote) => ({
    value: quote.id,
    label: quote.quoteNumber,
  }));

  const assignableUsersQuery = useProjectAssignableUsersQuery();
  const responsibleOptions = (assignableUsersQuery.data ?? []).map((user) => ({
    value: user.id,
    label: user.name,
  }));

  useEffect(() => {
    if (projectQuery.data) {
      reset({
        accountId: projectQuery.data.accountId,
        quoteIds: projectQuery.data.quotes.map((quote) => quote.id),
        responsibleUserIds: projectQuery.data.responsibleUsers.map((user) => user.id),
        name: projectQuery.data.name,
        estimatedBudget: projectQuery.data.estimatedBudget,
        actualCost: projectQuery.data.actualCost ?? undefined,
      });
    }
  }, [projectQuery.data, reset]);

  if (isEdit && projectQuery.isPending) {
    return (
      <AppShell>
        <p className="text-sm text-app-muted">{tr.common.loading}</p>
      </AppShell>
    );
  }

  const onSubmit = handleSubmit((values) => {
    const input = {
      accountId: values.accountId,
      name: values.name,
      estimatedBudget: Number(values.estimatedBudget),
      actualCost: values.actualCost ? Number(values.actualCost) : undefined,
      responsibleUserIds: values.responsibleUserIds ?? [],
      ...(isEdit ? { quoteIds: values.quoteIds ?? [] } : {}),
    };
    mutation.mutate(input, {
      onSuccess: async (project) => {
        await uploadStagedFiles(project.id);
        toast.success(
          isEdit ? tr.crm.projects.form.updateSuccess : tr.crm.projects.form.createSuccess,
        );
        navigate(`/projeler/${project.projectNumber}`);
      },
      onError: (error) => {
        toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
      },
    });
  });

  const apiErrorMessage = mutation.error instanceof ApiError ? mutation.error.message : undefined;

  return (
    <AppShell>
      <BackLink to={'/projeler'} label={tr.crm.projects.title} />

      <div className="mt-6">
        <h1 className="text-lg font-bold text-app-text">
          {isEdit ? tr.crm.projects.form.editTitle : tr.crm.projects.form.newTitle}
        </h1>

        <form
          onSubmit={onSubmit}
          className="mt-6 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2"
          noValidate
        >
          <div className="sm:col-span-2">
            <FormError message={apiErrorMessage} />
          </div>
          <Controller
            name="accountId"
            control={control}
            render={({ field }) => (
              <AccountAutocomplete
                label={tr.crm.projects.form.accountLabel}
                required
                hint={tr.crm.projects.form.accountHint}
                error={errors.accountId?.message}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
          <Controller
            name="responsibleUserIds"
            control={control}
            defaultValue={[]}
            render={({ field }) => (
              <MultiSelect
                label={tr.crm.projects.form.responsibleLabel}
                placeholder={tr.crm.projects.form.responsiblePlaceholder}
                hint={tr.crm.projects.form.responsibleHint}
                options={responsibleOptions}
                error={errors.responsibleUserIds?.message}
                value={field.value ?? []}
                onChange={field.onChange}
                showChips
                searchable
              />
            )}
          />
          {isEdit && (
            <Controller
              name="quoteIds"
              control={control}
              defaultValue={[]}
              render={({ field }) => (
                <MultiSelect
                  label={tr.crm.projects.form.quoteLabel}
                  placeholder={tr.crm.projects.form.quotePlaceholder}
                  hint={tr.crm.projects.form.quoteHint}
                  options={quoteOptions}
                  error={errors.quoteIds?.message}
                  value={field.value ?? []}
                  onChange={field.onChange}
                  showChips
                  chipVariant="solid"
                />
              )}
            />
          )}
          <TextField
            label={tr.crm.projects.form.nameLabel}
            required
            hint={tr.crm.projects.form.nameHint}
            error={errors.name?.message}
            {...register('name')}
          />
          <TextField
            label={tr.crm.projects.form.estimatedBudgetLabel}
            required
            type="text"
            inputMode="decimal"
            hint={tr.crm.projects.form.estimatedBudgetHint}
            error={errors.estimatedBudget?.message}
            {...estimatedBudgetField}
            onChange={(event) => {
              event.target.value = event.target.value.replace(/[^0-9.]/g, '');
              estimatedBudgetField.onChange(event);
            }}
          />
          <TextField
            label={tr.crm.projects.form.actualCostLabel}
            type="text"
            inputMode="decimal"
            hint={tr.crm.projects.form.actualCostHint}
            error={errors.actualCost?.message}
            {...actualCostField}
            onChange={(event) => {
              event.target.value = event.target.value.replace(/[^0-9.]/g, '');
              actualCostField.onChange(event);
            }}
          />
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-app-text">
              {tr.crm.projects.form.attachmentsLabel}
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
              disabled={attachmentCount >= MAX_ATTACHMENTS}
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip size={16} className="mr-1.5 inline" />
              {tr.crm.projects.form.attachButton}
            </Button>
            {attachmentCount > 0 && (
              <ul className="mt-2 flex flex-col gap-1">
                {persistedAttachments.map((attachment) => (
                  <li
                    key={attachment.id}
                    className="flex items-center gap-2 rounded-lg border border-app-border bg-app-surface px-3 py-1.5 text-sm text-app-text"
                  >
                    <a
                      href={attachment.url ?? undefined}
                      target="_blank"
                      rel="noreferrer"
                      className="truncate text-app-primary hover:underline"
                    >
                      {attachment.fileName} ({formatFileSize(attachment.sizeBytes)})
                    </a>
                  </li>
                ))}
                {stagedFiles.map((file, index) => (
                  <li
                    key={`${file.name}-${index}`}
                    className="flex items-center gap-2 rounded-lg border border-app-border bg-app-surface px-3 py-1.5 text-sm text-app-text"
                  >
                    <button
                      type="button"
                      aria-label={tr.crm.projects.form.removeAttachmentAria}
                      disabled={isSavingAttachments}
                      onClick={() => handleRemoveStagedFile(index)}
                      className="cursor-pointer text-app-muted hover:text-app-text"
                    >
                      <X size={14} />
                    </button>
                    <span className="truncate">
                      {file.name} ({formatFileSize(file.size)})
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="mt-1 flex gap-2 sm:col-span-2">
            <Button type="submit" disabled={mutation.isPending || isSavingAttachments}>
              {isSavingAttachments
                ? tr.crm.projects.form.uploadingLabel
                : mutation.isPending
                  ? tr.crm.projects.form.submitting
                  : tr.crm.projects.form.submit}
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate('/projeler')}>
              {tr.crm.projects.form.cancel}
            </Button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
