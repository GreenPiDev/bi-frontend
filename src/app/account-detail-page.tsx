import { AlertTriangle } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppShell } from './app-shell';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { HorizontalTabPanel } from '../components/ui/horizontal-tab-panel';
import { useAccountQuery, useDeleteAccountMutation } from '../features/crm/use-accounts';
import { useInteractionsQuery } from '../features/crm/use-interactions';
import { useOpportunitiesQuery } from '../features/crm/use-opportunities';
import { useQuotesQuery } from '../features/crm/use-quotes';
import { tr } from '../i18n/tr';

const CRITICAL_FIELD_LABELS: Record<string, string> = tr.crm.accounts.criticalFieldLabels;

const QUOTE_STATUS_BADGE_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  DRAFT: 'neutral',
  PENDING_APPROVAL: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
};

export function AccountDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const accountQuery = useAccountQuery(id);
  const deleteMutation = useDeleteAccountMutation();
  const interactionsQuery = useInteractionsQuery({ accountId: id });
  const opportunitiesQuery = useOpportunitiesQuery({ accountId: id });
  const quotesQuery = useQuotesQuery({ accountId: id });

  if (accountQuery.isPending) {
    return (
      <AppShell>
        <p className="text-sm text-app-muted">{tr.common.loading}</p>
      </AppShell>
    );
  }

  if (!accountQuery.data) {
    return null;
  }

  const account = accountQuery.data;

  function handleDelete() {
    if (!window.confirm(tr.crm.accounts.deleteConfirm)) {
      return;
    }
    deleteMutation.mutate(id, { onSuccess: () => navigate('/firmalar') });
  }

  const fields: { label: string; value: string }[] = [
    { label: tr.crm.accounts.form.taxNumberLabel, value: account.taxNumber ?? '—' },
    { label: tr.crm.accounts.form.taxOfficeLabel, value: account.taxOffice ?? '—' },
    { label: tr.crm.accounts.form.sectorLabel, value: account.sector ?? '—' },
    { label: tr.crm.accounts.form.websiteLabel, value: account.website ?? '—' },
    { label: tr.crm.accounts.form.phoneLabel, value: account.phone ?? '—' },
    { label: tr.crm.accounts.form.emailLabel, value: account.email ?? '—' },
    { label: tr.crm.accounts.form.addressLabel, value: account.address ?? '—' },
    { label: tr.crm.accounts.form.cityLabel, value: account.city ?? '—' },
  ];

  return (
    <AppShell>
      <button
        type="button"
        onClick={() => navigate('/firmalar')}
        className="text-sm font-semibold text-app-muted hover:text-app-text"
      >
        {'←'} {tr.crm.accounts.detail.back}
      </button>

      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-app-text">{account.name}</h1>
            {account.accountTypes.map((type) => (
              <Badge key={type} variant="info">
                {tr.crm.accounts.accountTypeOptions[type]}
              </Badge>
            ))}
          </div>
          {account.missingCriticalFields.length > 0 && (
            <p className="mt-2 flex items-center gap-1.5 text-sm text-amber-600 dark:text-amber-400">
              <AlertTriangle size={14} className="shrink-0" />
              {tr.crm.accounts.missingFieldsWarning(
                account.missingCriticalFields
                  .map((field) => CRITICAL_FIELD_LABELS[field] ?? field)
                  .join(', '),
              )}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate(`/firmalar/${id}/duzenle`)}
          >
            {tr.crm.accounts.detail.editButton}
          </Button>
          <Button type="button" variant="danger" onClick={handleDelete}>
            {tr.crm.accounts.detail.deleteButton}
          </Button>
        </div>
      </div>

      <div className="mt-6">
        <HorizontalTabPanel
          queryParam="tab"
          tabs={[
            {
              key: 'general',
              label: tr.crm.accounts.detail.tabGeneral,
              content: (
                <>
                  <dl className="grid grid-cols-1 gap-4 rounded-xl border border-app-border bg-app-surface p-6 sm:grid-cols-2">
                    {fields.map((field) => (
                      <div key={field.label}>
                        <dt className="text-xs font-semibold uppercase text-app-muted">
                          {field.label}
                        </dt>
                        <dd className="mt-1 text-sm text-app-text">{field.value}</dd>
                      </div>
                    ))}
                  </dl>

                  <div className="mt-6 rounded-xl border border-app-border bg-app-surface p-6">
                    <h2 className="text-sm font-bold text-app-text">
                      {tr.crm.accounts.detail.contactsTitle}
                    </h2>
                    {account.contacts.length === 0 ? (
                      <p className="mt-2 text-sm text-app-muted">
                        {tr.crm.accounts.detail.noContacts}
                      </p>
                    ) : (
                      <ul className="mt-3 flex flex-col gap-2">
                        {account.contacts.map((contact) => (
                          <li key={contact.id}>
                            <button
                              type="button"
                              onClick={() => navigate(`/kisiler/${contact.id}`)}
                              className="text-sm font-semibold text-app-brand hover:underline"
                            >
                              {contact.firstName} {contact.lastName}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </>
              ),
            },
            {
              key: 'interactions',
              label: tr.crm.accounts.detail.tabInteractions,
              content: (
                <div className="rounded-xl border border-app-border bg-app-surface p-6">
                  {(interactionsQuery.data?.data.length ?? 0) === 0 ? (
                    <p className="text-sm text-app-muted">
                      {tr.crm.accounts.detail.noInteractions}
                    </p>
                  ) : (
                    <ul className="flex flex-col gap-3">
                      {interactionsQuery.data?.data.map((interaction) => (
                        <li key={interaction.id}>
                          <button
                            type="button"
                            onClick={() => navigate(`/gorusmeler/${interaction.id}`)}
                            className="text-sm font-semibold text-app-brand hover:underline"
                          >
                            {tr.crm.interactions.typeOptions[interaction.type]} ·{' '}
                            {new Date(interaction.occurredAt).toLocaleString('tr-TR')}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ),
            },
            {
              key: 'opportunities',
              label: tr.crm.accounts.detail.tabOpportunities,
              content: (
                <div className="rounded-xl border border-app-border bg-app-surface p-6">
                  {(opportunitiesQuery.data?.data.length ?? 0) === 0 ? (
                    <p className="text-sm text-app-muted">
                      {tr.crm.accounts.detail.noOpportunities}
                    </p>
                  ) : (
                    <ul className="flex flex-col gap-3">
                      {opportunitiesQuery.data?.data.map((opportunity) => (
                        <li key={opportunity.id}>
                          <button
                            type="button"
                            onClick={() => navigate(`/firsatlar/${opportunity.id}`)}
                            className="text-sm font-semibold text-app-brand hover:underline"
                          >
                            {opportunity.name} (
                            {tr.crm.opportunities.stageOptions[opportunity.stage]})
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ),
            },
            {
              key: 'quotes',
              label: tr.crm.accounts.detail.tabQuotes,
              content: (
                <div className="rounded-xl border border-app-border bg-app-surface p-6">
                  {(quotesQuery.data?.data.length ?? 0) === 0 ? (
                    <p className="text-sm text-app-muted">{tr.crm.accounts.detail.noQuotes}</p>
                  ) : (
                    <ul className="flex flex-col gap-3">
                      {quotesQuery.data?.data.map((quote) => (
                        <li key={quote.id} className="flex items-center justify-between gap-3">
                          <button
                            type="button"
                            onClick={() => navigate(`/teklifler/${quote.id}`)}
                            className="text-sm font-semibold text-app-brand hover:underline"
                          >
                            {quote.quoteNumber}
                          </button>
                          <Badge variant={QUOTE_STATUS_BADGE_VARIANT[quote.status]}>
                            {tr.crm.quotes.statusOptions[quote.status]}
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ),
            },
          ]}
        />
      </div>
    </AppShell>
  );
}
