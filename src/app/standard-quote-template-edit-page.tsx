import { zodResolver } from '@hookform/resolvers/zod';
import { clsx } from 'clsx';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Controller, useForm, useWatch, type Control } from 'react-hook-form';
import { useLocation, useNavigate } from 'react-router-dom';
import { AppShell } from './app-shell';
import { StandardQuotePdfPreview } from './standard-quote-pdf-preview';
import { BackLink } from '../components/ui/back-link';
import { ColorPickerField } from '../components/ui/color-picker-field';
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
import {
  DEFAULT_STANDARD_QUOTE_PDF_THEME,
  FOOTER_HEIGHT_INITIAL_MM,
  FOOTER_HEIGHT_MAX_MM,
  FOOTER_HEIGHT_MIN_MM,
  FOOTER_LOGO_HEIGHT_MAX_MM,
  FOOTER_LOGO_HEIGHT_MIN_MM,
} from '../features/crm/standard-quote-pdf-theme';
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

type FooterVisibilityKey = 'footerShowAddress' | 'footerShowPhone' | 'footerShowEmail';
type ColorKey = Exclude<
  keyof StandardQuotePdfTheme,
  FooterVisibilityKey | 'footerHeightMm' | 'footerShowLogo' | 'footerLogoHeightMm'
>;

const FOOTER_VISIBILITY_KEYS: FooterVisibilityKey[] = [
  'footerShowAddress',
  'footerShowPhone',
  'footerShowEmail',
];

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
  { title: strings.groups.header, keys: ['headerBgColor'] },
  { title: strings.groups.footer, keys: ['footerBgColor', 'footerTextColor'] },
];

const COLOR_KEYS = COLOR_GROUPS.flatMap((group) => group.keys);

/** Onizlemede oklarla gezilen ornekler - her biri tek sayfalik ornek teklif. */
const PREVIEW_SAMPLES = [
  { key: 'ungrouped', label: strings.preview.ungrouped, grouped: false },
  { key: 'grouped', label: strings.preview.grouped, grouped: true },
] as const;

function pickTheme(values: Partial<StandardQuoteTemplateFormValues>): StandardQuotePdfTheme {
  const theme = { ...DEFAULT_STANDARD_QUOTE_PDF_THEME };
  for (const key of COLOR_KEYS) {
    const value = values[key];
    if (typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value)) theme[key] = value;
  }
  for (const key of FOOTER_VISIBILITY_KEYS) {
    const value = values[key];
    if (typeof value === 'boolean') theme[key] = value;
  }
  if (typeof values.footerShowLogo === 'boolean') theme.footerShowLogo = values.footerShowLogo;
  const logoHeight = values.footerLogoHeightMm;
  if (
    typeof logoHeight === 'number' &&
    logoHeight >= FOOTER_LOGO_HEIGHT_MIN_MM &&
    logoHeight <= FOOTER_LOGO_HEIGHT_MAX_MM
  ) {
    theme.footerLogoHeightMm = logoHeight;
  }
  const height = values.footerHeightMm;
  theme.footerHeightMm =
    typeof height === 'number' && height >= FOOTER_HEIGHT_MIN_MM && height <= FOOTER_HEIGHT_MAX_MM
      ? height
      : null;
  return theme;
}

function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : tr.common.unexpectedError;
}

/** Renk alani - tiklaninca hex girisi + hazir renkler paneli acilir. */
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
        <ColorPickerField
          label={strings.colors[name]}
          value={field.value ?? ''}
          onChange={field.onChange}
          onBlur={field.onBlur}
          error={error}
        />
      )}
    />
  );
}

/** Alt bilgi alaninin PDF footer'inda gosterilip gosterilmeyecegi (varsayilan
 * isaretli) - bkz. StandardQuotePdfTheme.footerShow*. */
function FooterVisibilityCheckbox({
  name,
  control,
  disabled,
}: {
  name: FooterVisibilityKey;
  control: Control<StandardQuoteTemplateFormValues>;
  disabled: boolean;
}) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-app-muted">
          <input
            type="checkbox"
            className="accent-app-primary"
            checked={field.value ?? true}
            disabled={disabled}
            onChange={(event) => field.onChange(event.target.checked)}
            onBlur={field.onBlur}
          />
          {strings.showInFooter}
        </label>
      )}
    />
  );
}

/** Alt bilgi arka plan yuksekligi (otomatik ya da sabit mm) + ortada logo. */
function FooterLayoutControls({
  control,
  disabled,
  hasLogo,
  heightError,
  logoHeightError,
}: {
  control: Control<StandardQuoteTemplateFormValues>;
  disabled: boolean;
  hasLogo: boolean;
  heightError?: string;
  logoHeightError?: string;
}) {
  const showLogo = useWatch({ control, name: 'footerShowLogo' });
  return (
    <div className="flex flex-col gap-3 border-t border-app-border pt-3">
      <h3 className="text-xs font-bold tracking-wide text-app-muted uppercase">
        {strings.footerLayoutTitle}
      </h3>
      <Controller
        name="footerShowLogo"
        control={control}
        render={({ field }) => (
          <label className="flex cursor-pointer items-center gap-2 text-sm text-app-text">
            <input
              type="checkbox"
              className="accent-app-primary"
              checked={field.value ?? false}
              disabled={disabled}
              onChange={(event) => field.onChange(event.target.checked)}
              onBlur={field.onBlur}
            />
            {strings.footerShowLogo}
            {field.value && !hasLogo && (
              <span className="text-xs text-app-danger">{strings.footerShowLogoNoLogo}</span>
            )}
          </label>
        )}
      />
      <Controller
        name="footerHeightMm"
        control={control}
        render={({ field }) => {
          const isAuto = field.value === null || field.value === undefined;
          return (
            <div className="flex flex-col gap-2">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-app-text">
                <input
                  type="checkbox"
                  className="accent-app-primary"
                  checked={isAuto}
                  disabled={disabled}
                  onChange={(event) =>
                    field.onChange(event.target.checked ? null : FOOTER_HEIGHT_INITIAL_MM)
                  }
                />
                {strings.footerHeightAuto}
              </label>
              {!isAuto && (
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold text-app-muted">
                    {strings.footerHeightLabel}
                  </span>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={FOOTER_HEIGHT_MIN_MM}
                      max={FOOTER_HEIGHT_MAX_MM}
                      step={1}
                      value={field.value ?? FOOTER_HEIGHT_INITIAL_MM}
                      disabled={disabled}
                      aria-label={strings.footerHeightLabel}
                      onChange={(event) => field.onChange(Number(event.target.value))}
                      className="flex-1 accent-app-primary"
                    />
                    <span className="w-14 text-right text-sm font-semibold text-app-text">
                      {field.value} {strings.footerHeightUnit}
                    </span>
                  </div>
                  <p className="text-xs text-app-muted">{strings.footerHeightHint}</p>
                  {heightError && <p className="text-xs text-app-danger">{heightError}</p>}
                </div>
              )}
            </div>
          );
        }}
      />
      {showLogo && (
        <Controller
          name="footerLogoHeightMm"
          control={control}
          render={({ field }) => (
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-app-muted">
                {strings.footerLogoHeightLabel}
              </span>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={FOOTER_LOGO_HEIGHT_MIN_MM}
                  max={FOOTER_LOGO_HEIGHT_MAX_MM}
                  step={1}
                  value={field.value ?? DEFAULT_STANDARD_QUOTE_PDF_THEME.footerLogoHeightMm}
                  disabled={disabled}
                  aria-label={strings.footerLogoHeightLabel}
                  onChange={(event) => field.onChange(Number(event.target.value))}
                  className="flex-1 accent-app-primary"
                />
                <span className="w-14 text-right text-sm font-semibold text-app-text">
                  {field.value} {strings.footerHeightUnit}
                </span>
              </div>
              {logoHeightError && <p className="text-xs text-app-danger">{logoHeightError}</p>}
            </div>
          )}
        />
      )}
    </div>
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
  const [sampleIndex, setSampleIndex] = useState(0);
  const currentSample = PREVIEW_SAMPLES[sampleIndex];
  function goToSample(step: number) {
    setSampleIndex((index) => (index + step + PREVIEW_SAMPLES.length) % PREVIEW_SAMPLES.length);
  }

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
            <div className="flex flex-col gap-1.5">
              <TextField
                label={strings.addressLabel}
                disabled={!canEditCompany}
                error={errors.address?.message}
                {...register('address')}
              />
              <FooterVisibilityCheckbox
                name="footerShowAddress"
                control={control}
                disabled={!canEditTheme}
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <TextField
                  label={strings.phoneLabel}
                  disabled={!canEditCompany}
                  error={errors.phone?.message}
                  {...register('phone')}
                />
                <FooterVisibilityCheckbox
                  name="footerShowPhone"
                  control={control}
                  disabled={!canEditTheme}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <TextField
                  label={strings.emailLabel}
                  type="email"
                  disabled={!canEditCompany}
                  error={errors.email?.message}
                  {...register('email')}
                />
                <FooterVisibilityCheckbox
                  name="footerShowEmail"
                  control={control}
                  disabled={!canEditTheme}
                />
              </div>
            </div>
            <p className="text-xs text-app-muted">{strings.footerVisibilityHint}</p>
            <FooterLayoutControls
              control={control}
              disabled={!canEditTheme}
              hasLogo={Boolean(profileQuery.data.logoUrl)}
              heightError={errors.footerHeightMm?.message}
              logoHeightError={errors.footerLogoHeightMm?.message}
            />
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
                <h3 className="border-b border-app-border pb-1 text-xs font-bold tracking-wide text-app-text uppercase">
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
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-app-text">{currentSample.label}</span>
              <span className="text-xs text-app-muted">
                {sampleIndex + 1} / {PREVIEW_SAMPLES.length}
              </span>
            </div>
          </div>
          <p className="text-xs text-app-muted">{strings.preview.hint}</p>
          <div className="relative">
            <div className="max-h-[calc(100vh-12rem)] overflow-y-auto rounded-lg bg-app-bg px-12 py-3">
              <StandardQuotePdfPreview
                theme={pickTheme(watched)}
                grouped={currentSample.grouped}
                logoUrl={profileQuery.data.logoUrl}
                company={{
                  address: watched.footerShowAddress === false ? '' : (watched.address ?? ''),
                  phone: watched.footerShowPhone === false ? '' : (watched.phone ?? ''),
                  email: watched.footerShowEmail === false ? '' : (watched.email ?? ''),
                }}
              />
            </div>
            <button
              type="button"
              aria-label={strings.preview.previous}
              onClick={() => goToSample(-1)}
              className="absolute top-1/2 left-1.5 flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-app-border bg-app-surface text-app-text shadow-md transition-colors hover:bg-app-bg"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              aria-label={strings.preview.next}
              onClick={() => goToSample(1)}
              className="absolute top-1/2 right-1.5 flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-app-border bg-app-surface text-app-text shadow-md transition-colors hover:bg-app-bg"
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <div className="flex justify-center gap-2">
            {PREVIEW_SAMPLES.map((sample, index) => (
              <button
                key={sample.key}
                type="button"
                aria-label={sample.label}
                onClick={() => setSampleIndex(index)}
                className={clsx(
                  'h-2 cursor-pointer rounded-full transition-all',
                  index === sampleIndex
                    ? 'w-6 bg-app-brand'
                    : 'w-2 bg-app-border hover:bg-app-muted',
                )}
              />
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
