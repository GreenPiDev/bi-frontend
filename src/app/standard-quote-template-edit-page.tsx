import { zodResolver } from '@hookform/resolvers/zod';
import { clsx } from 'clsx';
import { useEffect, useState } from 'react';
import { Controller, useForm, useWatch, type Control } from 'react-hook-form';
import { useLocation, useNavigate } from 'react-router-dom';
import { AppShell } from './app-shell';
import { StandardQuotePdfPreview } from './standard-quote-pdf-preview';
import { BackLink } from '../components/ui/back-link';
import { Button } from '../components/ui/button';
import { ImageUploadField } from '../components/ui/image-upload-field';
import { PageHelp } from '../components/ui/page-help';
import { TextField } from '../components/ui/text-field';
import { useToast } from '../components/ui/toast-context';
import { useMeQuery } from '../features/auth/use-auth';
import { hasPermission } from '../features/auth/permissions';
import {
  standardQuoteTemplateFormSchema,
  type StandardQuoteTemplateFormValues,
} from '../features/crm/schemas';
import { DEFAULT_STANDARD_QUOTE_PDF_THEME } from '../features/crm/standard-quote-pdf-theme';
import {
  useStandardQuoteTemplateThemeQuery,
  useUpdateStandardQuoteTemplateThemeMutation,
} from '../features/crm/use-quote-templates';
import {
  useDeleteTenantLogoMutation,
  useTenantProfileQuery,
  useUpdateCompanyInfoMutation,
  useUploadTenantLogoMutation,
} from '../features/crm/use-tenant-logo';
import { ApiError, type StandardQuotePdfTheme } from '../lib/api';
import { tr } from '../i18n/tr';

const strings = tr.crm.quoteTemplates.standard;
const imageStrings = tr.crm.quoteTemplates.form.imagesSection;

type ColorKey = keyof StandardQuotePdfTheme;

const COLOR_GROUPS: { title: string; keys: ColorKey[] }[] = [
  { title: strings.groups.texts, keys: ['titleColor', 'headingColor', 'textColor', 'accentColor'] },
  {
    title: strings.groups.table,
    keys: [
      'tableHeaderBgColor',
      'tableHeaderTextColor',
      'rowOddBgColor',
      'rowEvenBgColor',
      'groupRowBgColor',
    ],
  },
  { title: strings.groups.footer, keys: ['footerBgColor', 'footerTextColor'] },
];

const COLOR_KEYS = COLOR_GROUPS.flatMap((group) => group.keys);

function pickTheme(values: Partial<StandardQuoteTemplateFormValues>): StandardQuotePdfTheme {
  const theme = { ...DEFAULT_STANDARD_QUOTE_PDF_THEME };
  for (const key of COLOR_KEYS) {
    const value = values[key];
    if (typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value)) theme[key] = value;
  }
  return theme;
}

function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : tr.common.unexpectedError;
}

/** Renk secici (native color input) + elle hex girisi - ikisi ayni form alanina bagli. */
function ColorField({
  name,
  control,
  error,
}: {
  name: ColorKey;
  control: Control<StandardQuoteTemplateFormValues>;
  error?: string;
}) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-app-muted">{strings.colors[name]}</span>
          <div className="flex items-center gap-2">
            <input
              type="color"
              aria-label={strings.colors[name]}
              value={/^#[0-9a-fA-F]{6}$/.test(field.value ?? '') ? field.value : '#000000'}
              onChange={(event) => field.onChange(event.target.value)}
              className="h-9 w-11 shrink-0 cursor-pointer rounded border border-app-border bg-app-surface p-0.5"
            />
            <div className="min-w-0 flex-1">
              <TextField
                label={strings.colors[name]}
                hideLabel
                value={field.value ?? ''}
                onChange={(event) => field.onChange(event.target.value)}
                onBlur={field.onBlur}
                error={error}
                maxLength={7}
              />
            </div>
          </div>
        </div>
      )}
    />
  );
}

/**
 * /teklif-sablonlari/duzenle/standart - standart (sablonsuz) teklif PDF'inin
 * duzenlenebilir kisimlari (bkz. docs/VARSAYIMLAR.md V89): logo + footer sirket
 * bilgisi (Tenant'ta tutulur, Ayarlar > Sirket Bilgileri ile ayni kayit) ve renk
 * temasi (TenantSetting). Sagda ornek veriyle canli onizleme.
 */
export function StandardQuoteTemplateEditPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const backTo = (location.state as { from?: string } | null)?.from ?? '/teklifler?tab=templates';
  const toast = useToast();
  const meQuery = useMeQuery();
  const canEditCompany = hasPermission(meQuery.data?.permissions, 'settings', 'UPDATE');
  const canEditTheme = hasPermission(meQuery.data?.permissions, 'quote-templates', 'UPDATE');

  const themeQuery = useStandardQuoteTemplateThemeQuery();
  const profileQuery = useTenantProfileQuery();
  const updateThemeMutation = useUpdateStandardQuoteTemplateThemeMutation();
  const updateCompanyMutation = useUpdateCompanyInfoMutation();
  const uploadLogoMutation = useUploadTenantLogoMutation();
  const deleteLogoMutation = useDeleteTenantLogoMutation();
  const [grouped, setGrouped] = useState(false);

  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, dirtyFields },
  } = useForm<StandardQuoteTemplateFormValues>({
    resolver: zodResolver(standardQuoteTemplateFormSchema),
  });
  const watched = useWatch({ control });

  useEffect(() => {
    if (themeQuery.data && profileQuery.data) {
      reset({
        ...themeQuery.data,
        address: profileQuery.data.address ?? '',
        phone: profileQuery.data.phone ?? '',
        email: profileQuery.data.email ?? '',
      });
    }
  }, [themeQuery.data, profileQuery.data, reset]);

  if (themeQuery.isPending || profileQuery.isPending) {
    return (
      <AppShell>
        <p className="text-sm text-app-muted">{tr.common.loading}</p>
      </AppShell>
    );
  }
  if (themeQuery.isError || profileQuery.isError) {
    return (
      <AppShell>
        <BackLink to={backTo} label={tr.crm.quoteTemplates.title} />
        <p className="mt-6 text-sm text-app-danger">{strings.loadError}</p>
      </AppShell>
    );
  }

  const isSaving = updateThemeMutation.isPending || updateCompanyMutation.isPending;
  const companyDirty = Boolean(dirtyFields.address || dirtyFields.phone || dirtyFields.email);

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (canEditTheme) {
        await updateThemeMutation.mutateAsync(pickTheme(values));
      }
      if (canEditCompany && companyDirty) {
        await updateCompanyMutation.mutateAsync({
          address: values.address.trim() || null,
          phone: values.phone.trim() || null,
          email: values.email.trim() || null,
        });
      }
      toast.success(strings.saveSuccess);
      reset(values);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  });

  function handleResetColors() {
    for (const key of COLOR_KEYS) {
      setValue(key, DEFAULT_STANDARD_QUOTE_PDF_THEME[key], { shouldDirty: true });
    }
  }

  return (
    <AppShell>
      <BackLink to={backTo} label={tr.crm.quoteTemplates.title} />

      <div className="mt-6 flex items-center gap-2">
        <h1 className="text-lg font-bold text-app-text">{strings.title}</h1>
        <PageHelp text={tr.help.standardQuoteTemplate} />
      </div>
      <p className="mt-1 text-sm text-app-muted">{strings.subtitle}</p>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <form onSubmit={onSubmit} className="flex flex-col gap-6" noValidate>
          <section className="flex flex-col gap-3 rounded-lg border border-app-border bg-app-surface p-4">
            <h2 className="text-sm font-bold text-app-text">{strings.logoSection}</h2>
            {canEditCompany ? (
              <ImageUploadField
                label={imageStrings.logoLabel}
                imageUrl={profileQuery.data.logoUrl}
                fit="contain"
                uploadLabel={imageStrings.uploadButton}
                replaceLabel={imageStrings.replaceButton}
                removeLabel={imageStrings.removeButton}
                uploadingLabel={imageStrings.uploading}
                noImageLabel={imageStrings.noImage}
                unsupportedTypeMessage={imageStrings.unsupportedType}
                tooLargeMessage={imageStrings.tooLarge}
                removeConfirmTitle={imageStrings.removeConfirmTitle}
                removeConfirmMessage={imageStrings.removeConfirmMessage}
                isUploading={uploadLogoMutation.isPending}
                isRemoving={deleteLogoMutation.isPending}
                onUpload={(file) =>
                  uploadLogoMutation.mutate(file, {
                    onSuccess: () => toast.success(imageStrings.uploadSuccess),
                    onError: (error) => toast.error(errorMessage(error)),
                  })
                }
                onRemove={() =>
                  deleteLogoMutation.mutate(undefined, {
                    onSuccess: () => toast.success(imageStrings.removeSuccess),
                    onError: (error) => toast.error(errorMessage(error)),
                  })
                }
                onError={(message) => toast.error(message)}
              />
            ) : (
              <p className="text-xs text-app-muted">{strings.noSettingsPermission}</p>
            )}
            <p className="text-xs text-app-muted">{strings.logoHint}</p>
          </section>

          <section className="flex flex-col gap-3 rounded-lg border border-app-border bg-app-surface p-4">
            <h2 className="text-sm font-bold text-app-text">{strings.footerSection}</h2>
            <TextField
              label={strings.addressLabel}
              disabled={!canEditCompany}
              error={errors.address?.message}
              {...register('address')}
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <TextField
                label={strings.phoneLabel}
                disabled={!canEditCompany}
                error={errors.phone?.message}
                {...register('phone')}
              />
              <TextField
                label={strings.emailLabel}
                type="email"
                disabled={!canEditCompany}
                error={errors.email?.message}
                {...register('email')}
              />
            </div>
          </section>

          <section className="flex flex-col gap-4 rounded-lg border border-app-border bg-app-surface p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-app-text">{strings.colorsSection}</h2>
              {canEditTheme && (
                <Button type="button" variant="secondary" onClick={handleResetColors}>
                  {strings.resetColors}
                </Button>
              )}
            </div>
            {COLOR_GROUPS.map((group) => (
              <div key={group.title} className="flex flex-col gap-2">
                <h3 className="text-xs font-bold tracking-wide text-app-muted uppercase">
                  {group.title}
                </h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {group.keys.map((key) => (
                    <ColorField
                      key={key}
                      name={key}
                      control={control}
                      error={errors[key]?.message}
                    />
                  ))}
                </div>
              </div>
            ))}
          </section>

          <div className="flex gap-2">
            <Button type="submit" disabled={isSaving || (!canEditTheme && !canEditCompany)}>
              {isSaving ? strings.saving : strings.save}
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate(backTo)}>
              {strings.cancel}
            </Button>
          </div>
        </form>

        <section className="flex flex-col gap-3 xl:sticky xl:top-20 xl:self-start">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-app-text">{strings.preview.title}</h2>
            <div className="flex gap-1 rounded-lg border border-app-border p-0.5">
              {[false, true].map((value) => (
                <button
                  key={String(value)}
                  type="button"
                  onClick={() => setGrouped(value)}
                  className={clsx(
                    'rounded-md px-3 py-1 text-xs font-semibold transition-colors',
                    grouped === value
                      ? 'bg-app-brand text-white'
                      : 'text-app-muted hover:bg-app-bg hover:text-app-text',
                  )}
                >
                  {value ? strings.preview.grouped : strings.preview.ungrouped}
                </button>
              ))}
            </div>
          </div>
          <p className="text-xs text-app-muted">{strings.preview.hint}</p>
          <div className="max-h-[calc(100vh-10rem)] overflow-y-auto rounded-lg bg-app-bg p-3">
            <StandardQuotePdfPreview
              theme={pickTheme(watched)}
              grouped={grouped}
              logoUrl={profileQuery.data.logoUrl}
              company={{
                address: watched.address ?? '',
                phone: watched.phone ?? '',
                email: watched.email ?? '',
              }}
            />
          </div>
        </section>
      </div>
    </AppShell>
  );
}
