import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppShell } from './app-shell';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { PageHelp } from '../components/ui/page-help';
import { Select } from '../components/ui/select';
import { TextField } from '../components/ui/text-field';
import { useToast } from '../components/ui/toast-context';
import { useContactsQuery } from '../features/crm/use-contacts';
import {
  useMarkPostSaleFeedbackMutation,
  usePostSaleCaseQuery,
  useSendPostSaleSurveyMutation,
} from '../features/crm/use-post-sale-cases';
import { ApiError, type PostSaleCaseStatus } from '../lib/api';
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
  const navigate = useNavigate();
  const toast = useToast();
  const caseQuery = usePostSaleCaseQuery(id);
  const contactsQuery = useContactsQuery();
  const sendSurveyMutation = useSendPostSaleSurveyMutation(id);
  const markFeedbackMutation = useMarkPostSaleFeedbackMutation(id);

  const [selectedContactId, setSelectedContactId] = useState('');
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
  const contactOptions = (contactsQuery.data?.data ?? [])
    .filter((contact) => contact.accountId === postSaleCase.accountId)
    .map((contact) => ({ value: contact.id, label: `${contact.firstName} ${contact.lastName}` }));

  function handleSendSurvey() {
    sendSurveyMutation.mutate(postSaleCase.contactId ? {} : { contactId: selectedContactId }, {
      onSuccess: () => toast.success(tr.crm.postSaleCases.detail.sendSurveySuccess),
      onError: (error) => {
        toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
      },
    });
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

  const canSendSurvey = Boolean(postSaleCase.contactId || selectedContactId);

  return (
    <AppShell>
      <button
        type="button"
        onClick={() => navigate('/satis-sonrasi')}
        className="text-sm font-semibold text-app-muted hover:text-app-text"
      >
        {'←'} {tr.crm.postSaleCases.detail.back}
      </button>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-bold text-app-text">{postSaleCase.quote.quoteNumber}</h1>
        <PageHelp text={tr.help.postSaleCaseDetail} />
        <Badge variant={STATUS_BADGE_VARIANT[postSaleCase.status]}>
          {tr.crm.postSaleCases.statusOptions[postSaleCase.status]}
        </Badge>
      </div>
      <p className="mt-1 text-sm text-app-muted">
        {postSaleCase.account.name}
        {postSaleCase.contact &&
          ` · ${postSaleCase.contact.firstName} ${postSaleCase.contact.lastName}`}
      </p>

      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="rounded-xl border border-app-border bg-app-surface p-6">
          <h2 className="text-sm font-bold text-app-text">
            {tr.crm.postSaleCases.detail.reminderAtLabel}
          </h2>
          <p className="mt-2 text-sm text-app-muted">{formatDate(postSaleCase.reminderAt)}</p>
          <p className="mt-1 text-sm text-app-muted">
            {postSaleCase.reminderSentAt
              ? `${tr.crm.postSaleCases.detail.reminderSentLabel}: ${formatDate(postSaleCase.reminderSentAt)}`
              : tr.crm.postSaleCases.detail.reminderPendingLabel}
          </p>
        </div>

        <div className="rounded-xl border border-app-border bg-app-surface p-6">
          <h2 className="text-sm font-bold text-app-text">
            {tr.crm.postSaleCases.detail.surveyTitle}
          </h2>
          {postSaleCase.feedbackSurvey ? (
            <div className="mt-2 text-sm text-app-muted">
              <p>
                {tr.crm.postSaleCases.detail.surveySentAt}:{' '}
                {formatDate(postSaleCase.feedbackSurvey.sentAt)}
              </p>
              {postSaleCase.feedbackSurvey.respondedAt && (
                <p>
                  {tr.crm.postSaleCases.detail.surveyRespondedAt}:{' '}
                  {formatDate(postSaleCase.feedbackSurvey.respondedAt)}
                </p>
              )}
            </div>
          ) : (
            <p className="mt-2 text-sm text-app-muted">
              {tr.crm.postSaleCases.detail.surveyNotSent}
            </p>
          )}

          {!postSaleCase.contactId && (
            <div className="mt-3">
              <Select
                label={tr.crm.postSaleCases.detail.contactRequiredLabel}
                placeholder={tr.crm.postSaleCases.detail.contactPlaceholder}
                options={contactOptions}
                value={selectedContactId}
                onChange={(event) => setSelectedContactId(event.target.value)}
              />
            </div>
          )}

          <Button
            type="button"
            className="mt-3"
            variant="secondary"
            disabled={!canSendSurvey || sendSurveyMutation.isPending}
            onClick={handleSendSurvey}
          >
            {postSaleCase.feedbackSurvey
              ? tr.crm.postSaleCases.detail.resendSurveyButton
              : tr.crm.postSaleCases.detail.sendSurveyButton}
          </Button>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-app-border bg-app-surface p-6">
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
      </div>
    </AppShell>
  );
}
