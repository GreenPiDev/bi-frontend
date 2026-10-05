import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { AppShell } from './app-shell';
import { QuoteTemplatePreviewLightbox } from './quote-template-preview-lightbox';
import { BackLink } from '../components/ui/back-link';
import { Button } from '../components/ui/button';
import { FormError } from '../components/ui/form-error';
import { ImageUploadField } from '../components/ui/image-upload-field';
import { Switch } from '../components/ui/switch';
import { TextField } from '../components/ui/text-field';
import { useToast } from '../components/ui/toast-context';
import {
  useCreateQuoteTemplateMutation,
  useQuoteTemplateQuery,
  useRemoveQuoteTemplateImageMutation,
  useUpdateQuoteTemplateMutation,
  useUploadQuoteTemplateImageMutation,
} from '../features/crm/use-quote-templates';
import { useTenantProfileQuery } from '../features/crm/use-tenant-logo';
import { quoteTemplateFormSchema, type QuoteTemplateFormValues } from '../features/crm/schemas';
import { ApiError, type QuoteTemplateInput } from '../lib/api';
import { tr } from '../i18n/tr';

/** Bos metin alanlarini olusturmada "gonderme" (optional), guncellemede "temizle"
 * (null) olarak yorumlar - UpdateQuoteTemplateSchema'nin undefined="dokunma"/
 * null="temizle" semantigiyle uyumlu (bkz. quote-template.dto.ts). */
function emptyToOptional(value: string, isEdit: boolean): string | null | undefined {
  const trimmed = value.trim();
  if (trimmed) return trimmed;
  return isEdit ? null : undefined;
}

export function QuoteTemplateFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const location = useLocation();
  const backTo = (location.state as { from?: string } | null)?.from ?? '/teklif-sablonlari';
  const toast = useToast();
  const strings = tr.crm.quoteTemplates.form;

  const templateQuery = useQuoteTemplateQuery(id ?? '');
  const createMutation = useCreateQuoteTemplateMutation();
  const updateMutation = useUpdateQuoteTemplateMutation(id ?? '');
  const mutation = isEdit ? updateMutation : createMutation;
  const uploadImageMutation = useUploadQuoteTemplateImageMutation(id ?? '');
  const removeImageMutation = useRemoveQuoteTemplateImageMutation(id ?? '');
  const tenantProfileQuery = useTenantProfileQuery();

  const {
    register,
    control,
    handleSubmit,
    reset,
    getValues,
    setValue,
    formState: { errors, dirtyFields },
  } = useForm<QuoteTemplateFormValues>({
    resolver: zodResolver(quoteTemplateFormSchema),
  });

  const [previewValues, setPreviewValues] = useState<QuoteTemplateFormValues | null>(null);

  useEffect(() => {
    if (templateQuery.data) {
      const template = templateQuery.data;
      reset({
        name: template.name,
        isDefault: template.isDefault,
        companyDisplayName: template.companyDisplayName,
        companyTagline: template.companyTagline ?? '',
      });
    }
  }, [templateQuery.data, reset]);

  // Yeni sablon olustururken "Sirket Adi" alani varsayilan olarak tenant'in
  // adiyla (Tenant.name, /settings?tab=crm "Sirket Bilgileri"nde ayni alan)
  // onceden doldurulur - kullanici dilerse degistirebilir (bkz. kullanici istegi).
  useEffect(() => {
    if (!isEdit && tenantProfileQuery.data && !dirtyFields.companyDisplayName) {
      setValue('companyDisplayName', tenantProfileQuery.data.name);
    }
  }, [isEdit, tenantProfileQuery.data, dirtyFields.companyDisplayName, setValue]);

  if (isEdit && templateQuery.isPending) {
    return (
      <AppShell>
        <p className="text-sm text-app-muted">{tr.common.loading}</p>
      </AppShell>
    );
  }

  function handleImageError(message: string) {
    toast.error(message);
  }

  async function handleUseCompanyLogo() {
    const companyLogoUrl = tenantProfileQuery.data?.logoUrl;
    if (!companyLogoUrl) return;
    try {
      const response = await fetch(companyLogoUrl, { credentials: 'include' });
      if (!response.ok) throw new Error('logo-fetch-failed');
      const blob = await response.blob();
      const file = new File([blob], 'sirket-logo', { type: blob.type });
      uploadImageMutation.mutate(
        { slot: 'logo', file },
        {
          onSuccess: () => toast.success(imagesStrings.uploadSuccess),
          onError: (error) =>
            toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError),
        },
      );
    } catch {
      toast.error(tr.common.unexpectedError);
    }
  }

  const onSubmit = handleSubmit((values) => {
    const input: QuoteTemplateInput = {
      name: values.name,
      isDefault: values.isDefault,
      companyDisplayName: values.companyDisplayName,
      companyTagline: emptyToOptional(values.companyTagline ?? '', isEdit),
    };
    mutation.mutate(input, {
      onSuccess: (template) => {
        toast.success(isEdit ? strings.updateSuccess : strings.createSuccess);
        if (isEdit) return;
        navigate(`/teklif-sablonlari/duzenle/${template.id}`, { state: { from: backTo } });
      },
      onError: (error) => {
        toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
      },
    });
  });

  const apiErrorMessage = mutation.error instanceof ApiError ? mutation.error.message : undefined;
  const imagesStrings = strings.imagesSection;

  return (
    <AppShell>
      <BackLink to={backTo} label={tr.crm.quoteTemplates.title} />

      <div className="mt-6">
        <h1 className="text-lg font-bold text-app-text">
          {isEdit ? strings.editTitle : strings.newTitle}
        </h1>

        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-6" noValidate>
          <FormError message={apiErrorMessage} />

          <div className="grid grid-cols-1 gap-4 rounded-lg border border-app-border bg-app-surface p-4 sm:grid-cols-2 sm:items-end">
            <TextField
              label={strings.nameLabel}
              error={errors.name?.message}
              {...register('name')}
            />
            <Controller
              name="isDefault"
              control={control}
              render={({ field }) => (
                <div className="flex items-center gap-2">
                  <Switch checked={field.value ?? false} onChange={field.onChange} />
                  <span className="text-sm font-semibold text-app-text">
                    {strings.isDefaultLabel}
                  </span>
                </div>
              )}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {isEdit ? (
              <div className="flex flex-col gap-4 rounded-lg border border-app-border bg-app-surface p-4 lg:col-span-2">
                <h2 className="text-sm font-bold text-app-text">{imagesStrings.title}</h2>
                <ImageUploadField
                  label={imagesStrings.logoLabel}
                  imageUrl={templateQuery.data?.logoUrl ?? null}
                  fit="contain"
                  uploadLabel={imagesStrings.uploadButton}
                  replaceLabel={imagesStrings.replaceButton}
                  removeLabel={imagesStrings.removeButton}
                  uploadingLabel={imagesStrings.uploading}
                  noImageLabel={imagesStrings.noImage}
                  unsupportedTypeMessage={imagesStrings.unsupportedType}
                  tooLargeMessage={imagesStrings.tooLarge}
                  removeConfirmTitle={imagesStrings.removeConfirmTitle}
                  removeConfirmMessage={imagesStrings.removeConfirmMessage}
                  isUploading={uploadImageMutation.isPending}
                  isRemoving={removeImageMutation.isPending}
                  onUpload={(file) =>
                    uploadImageMutation.mutate(
                      { slot: 'logo', file },
                      {
                        onSuccess: () => toast.success(imagesStrings.uploadSuccess),
                        onError: (error) =>
                          toast.error(
                            error instanceof ApiError ? error.message : tr.common.unexpectedError,
                          ),
                      },
                    )
                  }
                  onRemove={() =>
                    removeImageMutation.mutate('logo', {
                      onSuccess: () => toast.success(imagesStrings.removeSuccess),
                    })
                  }
                  onError={handleImageError}
                />
                {tenantProfileQuery.data?.logoUrl && (
                  <Button
                    type="button"
                    variant="secondary"
                    className="self-start"
                    disabled={uploadImageMutation.isPending}
                    onClick={handleUseCompanyLogo}
                  >
                    {imagesStrings.useCompanyLogoButton}
                  </Button>
                )}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <ImageUploadField
                    label={imagesStrings.coverImageLabel}
                    imageUrl={templateQuery.data?.coverImageUrl ?? null}
                    fit="contain"
                    uploadLabel={imagesStrings.uploadButton}
                    replaceLabel={imagesStrings.replaceButton}
                    removeLabel={imagesStrings.removeButton}
                    uploadingLabel={imagesStrings.uploading}
                    noImageLabel={imagesStrings.noImage}
                    unsupportedTypeMessage={imagesStrings.unsupportedType}
                    tooLargeMessage={imagesStrings.tooLarge}
                    removeConfirmTitle={imagesStrings.removeConfirmTitle}
                    removeConfirmMessage={imagesStrings.removeConfirmMessage}
                    isUploading={uploadImageMutation.isPending}
                    isRemoving={removeImageMutation.isPending}
                    onUpload={(file) =>
                      uploadImageMutation.mutate(
                        { slot: 'cover-image', file },
                        {
                          onSuccess: () => toast.success(imagesStrings.uploadSuccess),
                          onError: (error) =>
                            toast.error(
                              error instanceof ApiError ? error.message : tr.common.unexpectedError,
                            ),
                        },
                      )
                    }
                    onRemove={() =>
                      removeImageMutation.mutate('cover-image', {
                        onSuccess: () => toast.success(imagesStrings.removeSuccess),
                      })
                    }
                    onError={handleImageError}
                  />
                  <ImageUploadField
                    label={imagesStrings.closingImageLabel}
                    imageUrl={templateQuery.data?.closingImageUrl ?? null}
                    fit="contain"
                    uploadLabel={imagesStrings.uploadButton}
                    replaceLabel={imagesStrings.replaceButton}
                    removeLabel={imagesStrings.removeButton}
                    uploadingLabel={imagesStrings.uploading}
                    noImageLabel={imagesStrings.noImage}
                    unsupportedTypeMessage={imagesStrings.unsupportedType}
                    tooLargeMessage={imagesStrings.tooLarge}
                    removeConfirmTitle={imagesStrings.removeConfirmTitle}
                    removeConfirmMessage={imagesStrings.removeConfirmMessage}
                    isUploading={uploadImageMutation.isPending}
                    isRemoving={removeImageMutation.isPending}
                    onUpload={(file) =>
                      uploadImageMutation.mutate(
                        { slot: 'closing-image', file },
                        {
                          onSuccess: () => toast.success(imagesStrings.uploadSuccess),
                          onError: (error) =>
                            toast.error(
                              error instanceof ApiError ? error.message : tr.common.unexpectedError,
                            ),
                        },
                      )
                    }
                    onRemove={() =>
                      removeImageMutation.mutate('closing-image', {
                        onSuccess: () => toast.success(imagesStrings.removeSuccess),
                      })
                    }
                    onError={handleImageError}
                  />
                </div>
              </div>
            ) : (
              <p className="text-xs text-app-muted lg:col-span-2">
                {imagesStrings.title} — {strings.createSuccess}
              </p>
            )}

            <div className="flex flex-col gap-4 rounded-lg border border-app-border bg-app-surface p-4">
              <h2 className="text-sm font-bold text-app-text">{strings.companySection.title}</h2>
              <TextField
                label={strings.companySection.displayNameLabel}
                error={errors.companyDisplayName?.message}
                {...register('companyDisplayName')}
              />
              <TextField
                label={strings.companySection.taglineLabel}
                error={errors.companyTagline?.message}
                {...register('companyTagline')}
              />
              <p className="text-xs text-app-muted">{strings.companySection.movedToSettingsHint}</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={() => setPreviewValues(getValues())}>
              {strings.preview.button}
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? strings.submitting : strings.submit}
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate(backTo)}>
              {strings.cancel}
            </Button>
          </div>
        </form>
      </div>

      {previewValues && (
        <QuoteTemplatePreviewLightbox
          values={previewValues}
          images={{
            logoUrl: templateQuery.data?.logoUrl ?? null,
            coverImageUrl: templateQuery.data?.coverImageUrl ?? null,
            closingImageUrl: templateQuery.data?.closingImageUrl ?? null,
          }}
          onClose={() => setPreviewValues(null)}
        />
      )}
    </AppShell>
  );
}
