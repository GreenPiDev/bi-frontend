import { clsx } from 'clsx';
import { HeartHandshake, Mail, Send, UserRound, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AppShell } from './app-shell';
import { PostSaleFeedbackCard } from './post-sale-feedback-card';
import {
  PostSaleOverview,
  PostSaleSurveyResponses,
  PostSaleTimeline,
  SectionCard,
} from './post-sale-case-detail-sections';
import { BackLink } from '../components/ui/back-link';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { PageHelp } from '../components/ui/page-help';
import { Select } from '../components/ui/select';
import { SettingsNavigateLink } from '../components/ui/settings-navigate-link';
import { TextField } from '../components/ui/text-field';
import { useToast } from '../components/ui/toast-context';
import { formatPostSaleDate } from '../features/crm/format-post-sale-date';
import { useActiveSurveysQuery } from '../features/crm/use-surveys';
import { useContactsQuery } from '../features/crm/use-contacts';
import { useTenantProfileQuery } from '../features/crm/use-tenant-logo';
import {
  usePostSaleCaseQuery,
  useSendPostSaleSurveyMutation,
} from '../features/crm/use-post-sale-cases';
import { ApiError, type PostSaleCaseStatus, type SurveyRecipientKind } from '../lib/api';
import { tr } from '../i18n/tr';
import { SETTINGS_TARGETS } from '../lib/settings-targets';

const STATUS_BADGE_VARIANT: Record<PostSaleCaseStatus, 'success' | 'warning' | 'neutral'> = {
  BEKLEMEDE: 'neutral',
  HATIRLATILDI: 'warning',
  GERI_BILDIRIM_ALINDI: 'success',
};

const t = tr.crm.postSaleCases.detail;

const RECIPIENT_KINDS: { kind: SurveyRecipientKind; icon: LucideIcon; label: string }[] = [
  { kind: 'CONTACT', icon: UserRound, label: t.recipientKindContact },
  { kind: 'EMAIL', icon: Mail, label: t.recipientKindEmail },
];

export function PostSaleCaseDetailPage() {
  const { id = '' } = useParams();
  const toast = useToast();
  const caseQuery = usePostSaleCaseQuery(id);
  const contactsQuery = useContactsQuery();
  const activeSurveysQuery = useActiveSurveysQuery();
  const tenantProfileQuery = useTenantProfileQuery();
  const sendSurveyMutation = useSendPostSaleSurveyMutation(id);

  const [selectedSurveyId, setSelectedSurveyId] = useState('');
  // Sistemde kayitli sirket maili (Tenant.email) varsayilan deger olarak gosterilir,
  // kullanici bu gonderime ozel degistirebilir (kullanici talebi, 2026-10-20) - setState'i
  // bir useEffect icinde tetiklemek yerine "kullanici henuz elle degistirmedi" durumunu
  // ayri bir bayrakla tutup varsayilani render sirasinda hesapliyoruz.
  const [fromEmailOverride, setFromEmailOverride] = useState<string | null>(null);
  const [recipientKind, setRecipientKind] = useState<SurveyRecipientKind>('CONTACT');
  const [selectedContactId, setSelectedContactId] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');

  if (caseQuery.isPending) {
    return (
      <AppShell>
        <p className="text-sm text-app-muted">{tr.common.loading}</p>
      </AppShell>
    );
  }

  if (!caseQuery.data) {
    return null;
  }

  const postSaleCase = caseQuery.data;
  const contacts = contactsQuery.data?.data ?? [];
  const contactOptions = contacts
    .filter((contact) => contact.accountId === postSaleCase.accountId)
    .map((contact) => ({ value: contact.id, label: `${contact.firstName} ${contact.lastName}` }));
  const surveyOptions = (activeSurveysQuery.data ?? []).map((survey) => ({
    value: survey.id,
    label: survey.name,
  }));
  const fromEmail = fromEmailOverride ?? tenantProfileQuery.data?.email ?? '';

  function handleSendSurvey() {
    sendSurveyMutation.mutate(
      {
        surveyId: selectedSurveyId,
        fromEmail: fromEmail || undefined,
        recipientKind,
        contactId: recipientKind === 'CONTACT' ? selectedContactId : undefined,
        recipientName,
        recipientEmail,
      },
      {
        onSuccess: () => toast.success(t.sendSurveySuccess),
        onError: (error) => {
          toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
        },
      },
    );
  }

  function handleContactSelect(contactId: string) {
    setSelectedContactId(contactId);
    const contact = contacts.find((c) => c.id === contactId);
    if (contact) {
      setRecipientName(`${contact.firstName} ${contact.lastName}`);
      setRecipientEmail(contact.email ?? '');
    }
  }

  function handleRecipientKindChange(kind: SurveyRecipientKind) {
    setRecipientKind(kind);
    setRecipientName('');
    setRecipientEmail('');
    setSelectedContactId('');
  }

  const canSendSurvey = Boolean(
    selectedSurveyId &&
    recipientName &&
    recipientEmail &&
    (recipientKind === 'EMAIL' || selectedContactId),
  );

  const feedbackSurvey = postSaleCase.feedbackSurvey;

  return (
    <AppShell>
      <BackLink to={'/satis-sonrasi'} label={t.back} />

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center text-app-primary">
          <HeartHandshake className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-app-text">
              {postSaleCase.salesOrder.orderNumber}
            </h1>
            <PageHelp text={tr.help.postSaleCaseDetail} />
            <Badge variant={STATUS_BADGE_VARIANT[postSaleCase.status]}>
              {tr.crm.postSaleCases.statusOptions[postSaleCase.status]}
            </Badge>
          </div>
          <p className="mt-0.5 text-sm text-app-muted">{postSaleCase.account.name}</p>
        </div>
      </div>

      <PostSaleOverview postSaleCase={postSaleCase} />

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <SectionCard
            icon={Send}
            title={t.surveyTitle}
            description={
              feedbackSurvey
                ? `${t.surveySentAt}: ${formatPostSaleDate(feedbackSurvey.sentAt)}` +
                  (feedbackSurvey.respondedAt
                    ? ` · ${t.surveyRespondedAt}: ${formatPostSaleDate(feedbackSurvey.respondedAt)}`
                    : '')
                : t.surveyNotSent
            }
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                {activeSurveysQuery.isSuccess && surveyOptions.length === 0 ? (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-sm font-semibold text-app-muted">
                      {t.surveySelectLabel}
                    </span>
                    <div className="rounded-lg border border-dashed border-app-border bg-app-surface px-3.5 py-2.5 text-sm text-app-muted">
                      {t.surveyEmptyMessage}{' '}
                      <Link
                        to="/anketler/yeni"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-app-brand hover:underline"
                      >
                        {t.surveyEmptyLink}
                      </Link>
                    </div>
                  </div>
                ) : (
                  <Select
                    label={t.surveySelectLabel}
                    placeholder={t.surveySelectPlaceholder}
                    options={surveyOptions}
                    value={selectedSurveyId}
                    onChange={(event) => setSelectedSurveyId(event.target.value)}
                  />
                )}
              </div>

              <div className="md:col-span-2">
                <TextField
                  label={t.fromEmailLabel}
                  hint={t.fromEmailHint}
                  type="email"
                  value={fromEmail}
                  onChange={(event) => setFromEmailOverride(event.target.value)}
                />
                <p className="mt-1 text-xs text-app-muted">
                  <SettingsNavigateLink target={SETTINGS_TARGETS.companyInfo}>
                    {t.fromEmailSettingsLink}
                  </SettingsNavigateLink>
                </p>
              </div>

              <div className="md:col-span-2">
                <span className="text-sm font-semibold text-app-muted">{t.recipientKindLabel}</span>
                <div
                  role="radiogroup"
                  aria-label={t.recipientKindLabel}
                  className="mt-1.5 flex flex-wrap gap-2"
                >
                  {RECIPIENT_KINDS.map(({ kind, icon: Icon, label }) => (
                    <button
                      key={kind}
                      type="button"
                      role="radio"
                      aria-checked={recipientKind === kind}
                      onClick={() => handleRecipientKindChange(kind)}
                      className={clsx(
                        'flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors',
                        recipientKind === kind
                          ? 'border-app-brand bg-app-brand text-white'
                          : 'border-app-border text-app-muted hover:bg-app-bg hover:text-app-text',
                      )}
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {recipientKind === 'CONTACT' && (
                <div className="md:col-span-2">
                  <Select
                    label={t.contactRequiredLabel}
                    placeholder={t.recipientContactPlaceholder}
                    options={contactOptions}
                    value={selectedContactId}
                    onChange={(event) => handleContactSelect(event.target.value)}
                  />
                </div>
              )}

              <TextField
                label={t.recipientNameLabel}
                value={recipientName}
                onChange={(event) => setRecipientName(event.target.value)}
              />
              <TextField
                label={t.recipientEmailLabel}
                type="email"
                value={recipientEmail}
                onChange={(event) => setRecipientEmail(event.target.value)}
              />
            </div>

            <div className="mt-5 flex justify-end border-t border-app-border pt-4">
              <Button
                type="button"
                disabled={!canSendSurvey || sendSurveyMutation.isPending}
                onClick={handleSendSurvey}
              >
                {feedbackSurvey ? t.resendSurveyButton : t.sendSurveyButton}
              </Button>
            </div>
          </SectionCard>

          <PostSaleSurveyResponses postSaleCase={postSaleCase} />
        </div>

        <div className="flex flex-col gap-6">
          <PostSaleTimeline postSaleCase={postSaleCase} />

          <PostSaleFeedbackCard postSaleCase={postSaleCase} />
        </div>
      </div>
    </AppShell>
  );
}
