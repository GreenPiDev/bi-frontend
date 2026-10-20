import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { AppShell } from './app-shell';
import { BackLink } from '../components/ui/back-link';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { PageHelp } from '../components/ui/page-help';
import { Select } from '../components/ui/select';
import { SettingsNavigateLink } from '../components/ui/settings-navigate-link';
import { TextField } from '../components/ui/text-field';
import { useToast } from '../components/ui/toast-context';
import { useActiveSurveysQuery } from '../features/crm/use-surveys';
import { useContactsQuery } from '../features/crm/use-contacts';
import { useTenantProfileQuery } from '../features/crm/use-tenant-logo';
import {
  useMarkPostSaleFeedbackMutation,
  usePostSaleCaseQuery,
  useSendPostSaleSurveyMutation,
} from '../features/crm/use-post-sale-cases';
import { ApiError, type PostSaleCaseStatus, type SurveyRecipientKind } from '../lib/api';
import { tr } from '../i18n/tr';

const STATUS_BADGE_VARIANT: Record<PostSaleCaseStatus, 'success' | 'warning' | 'neutral'> = {
  BEKLEMEDE: 'neutral',
  HATIRLATILDI: 'warning',
  GERI_BILDIRIM_ALINDI: 'success',
};

const dateFormat = new Intl.DateTimeFormat('tr-TR', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function formatDate(value: string | null): string {
  return value ? dateFormat.format(new Date(value)) : '—';
}

export function PostSaleCaseDetailPage() {
  const { id = '' } = useParams();
  const toast = useToast();
  const caseQuery = usePostSaleCaseQuery(id);
  const contactsQuery = useContactsQuery();
  const activeSurveysQuery = useActiveSurveysQuery();
  const tenantProfileQuery = useTenantProfileQuery();
  const sendSurveyMutation = useSendPostSaleSurveyMutation(id);
  const markFeedbackMutation = useMarkPostSaleFeedbackMutation(id);

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
  const [responseNote, setResponseNote] = useState('');

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
        onSuccess: () => toast.success(tr.crm.postSaleCases.detail.sendSurveySuccess),
        onError: (error) => {
          toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
        },
      },
    );
  }

  function handleMarkFeedback() {
    markFeedbackMutation.mutate(
      { responseNote: responseNote || undefined },
      {
        onSuccess: () => toast.success(tr.crm.postSaleCases.detail.markFeedbackSuccess),
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

  const canSendSurvey = Boolean(
    selectedSurveyId &&
    recipientName &&
    recipientEmail &&
    (recipientKind === 'EMAIL' || selectedContactId),
  );

  const feedbackSurvey = postSaleCase.feedbackSurvey;

  return (
    <AppShell>
      <BackLink to={'/satis-sonrasi'} label={tr.crm.postSaleCases.detail.back} />

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-bold text-app-text">{postSaleCase.salesOrder.orderNumber}</h1>
        <PageHelp text={tr.help.postSaleCaseDetail} />
        <Badge variant={STATUS_BADGE_VARIANT[postSaleCase.status]}>
          {tr.crm.postSaleCases.statusOptions[postSaleCase.status]}
        </Badge>
      </div>
      <p className="mt-1 text-sm text-app-muted">
        {postSaleCase.account.name}
        {postSaleCase.contact &&
          ` · ${postSaleCase.contact.firstName} ${postSaleCase.contact.lastName}`}
        {postSaleCase.quote &&
          ` · ${tr.crm.postSaleCases.quoteColumn}: ${postSaleCase.quote.quoteNumber}`}
      </p>

      <div className="mt-6 flex flex-col gap-6">
        <section className="rounded-lg border border-app-border p-5">
          <h2 className="text-sm font-bold text-app-text">
            {tr.crm.postSaleCases.detail.reminderAtLabel}
          </h2>
          <p className="mt-2 text-sm text-app-muted">{formatDate(postSaleCase.reminderAt)}</p>
          <p className="mt-1 text-sm text-app-muted">
            {postSaleCase.reminderSentAt
              ? `${tr.crm.postSaleCases.detail.reminderSentLabel}: ${formatDate(postSaleCase.reminderSentAt)}`
              : tr.crm.postSaleCases.detail.reminderPendingLabel}
          </p>
        </section>

        <section className="rounded-lg border border-app-border p-5">
          <h2 className="text-sm font-bold text-app-text">
            {tr.crm.postSaleCases.detail.surveyTitle}
          </h2>
          <p className="mt-2 text-sm text-app-muted">
            {feedbackSurvey
              ? `${tr.crm.postSaleCases.detail.surveySentAt}: ${formatDate(feedbackSurvey.sentAt)}` +
                (feedbackSurvey.respondedAt
                  ? ` · ${tr.crm.postSaleCases.detail.surveyRespondedAt}: ${formatDate(feedbackSurvey.respondedAt)}`
                  : '')
              : tr.crm.postSaleCases.detail.surveyNotSent}
          </p>

          <div className="mt-4 grid max-w-xl grid-cols-1 gap-4">
            <Select
              label={tr.crm.postSaleCases.detail.surveySelectLabel}
              placeholder={tr.crm.postSaleCases.detail.surveySelectPlaceholder}
              options={surveyOptions}
              value={selectedSurveyId}
              onChange={(event) => setSelectedSurveyId(event.target.value)}
            />

            <div>
              <TextField
                label={tr.crm.postSaleCases.detail.fromEmailLabel}
                hint={tr.crm.postSaleCases.detail.fromEmailHint}
                type="email"
                value={fromEmail}
                onChange={(event) => setFromEmailOverride(event.target.value)}
              />
              <p className="mt-1 text-xs text-app-muted">
                <SettingsNavigateLink tab="crm" highlightKey="companyInfo">
                  {tr.crm.postSaleCases.detail.fromEmailSettingsLink}
                </SettingsNavigateLink>
              </p>
            </div>

            <div>
              <span className="text-sm font-semibold text-app-muted">
                {tr.crm.postSaleCases.detail.recipientKindLabel}
              </span>
              <div className="mt-1.5 flex gap-2">
                <Button
                  type="button"
                  variant={recipientKind === 'CONTACT' ? 'primary' : 'secondary'}
                  onClick={() => {
                    setRecipientKind('CONTACT');
                    setRecipientName('');
                    setRecipientEmail('');
                    setSelectedContactId('');
                  }}
                >
                  {tr.crm.postSaleCases.detail.recipientKindContact}
                </Button>
                <Button
                  type="button"
                  variant={recipientKind === 'EMAIL' ? 'primary' : 'secondary'}
                  onClick={() => {
                    setRecipientKind('EMAIL');
                    setRecipientName('');
                    setRecipientEmail('');
                    setSelectedContactId('');
                  }}
                >
                  {tr.crm.postSaleCases.detail.recipientKindEmail}
                </Button>
              </div>
            </div>

            {recipientKind === 'CONTACT' && (
              <Select
                label={tr.crm.postSaleCases.detail.contactRequiredLabel}
                placeholder={tr.crm.postSaleCases.detail.recipientContactPlaceholder}
                options={contactOptions}
                value={selectedContactId}
                onChange={(event) => handleContactSelect(event.target.value)}
              />
            )}

            <TextField
              label={tr.crm.postSaleCases.detail.recipientNameLabel}
              value={recipientName}
              onChange={(event) => setRecipientName(event.target.value)}
            />
            <TextField
              label={tr.crm.postSaleCases.detail.recipientEmailLabel}
              type="email"
              value={recipientEmail}
              onChange={(event) => setRecipientEmail(event.target.value)}
            />

            <Button
              type="button"
              variant="secondary"
              disabled={!canSendSurvey || sendSurveyMutation.isPending}
              onClick={handleSendSurvey}
            >
              {feedbackSurvey
                ? tr.crm.postSaleCases.detail.resendSurveyButton
                : tr.crm.postSaleCases.detail.sendSurveyButton}
            </Button>
          </div>
        </section>

        <section className="rounded-lg border border-app-border p-5">
          <h2 className="text-sm font-bold text-app-text">
            {tr.crm.postSaleCases.detail.feedbackTitle}
          </h2>
          {postSaleCase.feedbackReceivedAt && (
            <p className="mt-2 text-sm text-app-muted">
              {tr.crm.postSaleCases.detail.alreadyReceivedLabel} (
              {formatDate(postSaleCase.feedbackReceivedAt)})
            </p>
          )}
          <div className="mt-3 max-w-lg">
            <TextField
              label={tr.crm.postSaleCases.detail.feedbackNoteLabel}
              value={responseNote || postSaleCase.feedbackNote || ''}
              onChange={(event) => setResponseNote(event.target.value)}
            />
          </div>
          <Button
            type="button"
            className="mt-3"
            disabled={markFeedbackMutation.isPending}
            onClick={handleMarkFeedback}
          >
            {tr.crm.postSaleCases.detail.markFeedbackButton}
          </Button>
        </section>

        {feedbackSurvey && feedbackSurvey.responses.length > 0 && (
          <section className="rounded-lg border border-app-border p-5">
            <h2 className="text-sm font-bold text-app-text">
              {tr.crm.postSaleCases.detail.surveyResponsesTitle}
            </h2>
            <div className="mt-4 flex flex-col gap-4">
              {feedbackSurvey.responses.map((response) => (
                <div key={response.id}>
                  <p className="text-sm font-semibold text-app-text">{response.question.text}</p>
                  <p className="mt-0.5 text-sm text-app-muted">
                    {response.question.type === 'LIKERT' &&
                      response.answerLikertValue != null &&
                      `${response.answerLikertValue} / 5`}
                    {response.question.type === 'MULTIPLE_CHOICE' &&
                      (response.answerOption?.label ?? '—')}
                    {response.question.type === 'OPEN_ENDED' && (response.answerText || '—')}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}
