import { AlertTriangle } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppShell } from './app-shell';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { useAccountQuery, useDeleteAccountMutation } from '../features/crm/use-accounts';
import { tr } from '../i18n/tr';

const CRITICAL_FIELD_LABELS: Record<string, string> = tr.crm.accounts.criticalFieldLabels;

export function AccountDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const accountQuery = useAccountQuery(id);
  const deleteMutation = useDeleteAccountMutation();

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

      <dl className="mt-6 grid grid-cols-1 gap-4 rounded-xl border border-app-border bg-app-surface p-6 sm:grid-cols-2">
        {fields.map((field) => (
          <div key={field.label}>
            <dt className="text-xs font-semibold uppercase text-app-muted">{field.label}</dt>
            <dd className="mt-1 text-sm text-app-text">{field.value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-6 rounded-xl border border-app-border bg-app-surface p-6">
        <h2 className="text-sm font-bold text-app-text">{tr.crm.accounts.detail.contactsTitle}</h2>
        {account.contacts.length === 0 ? (
          <p className="mt-2 text-sm text-app-muted">{tr.crm.accounts.detail.noContacts}</p>
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
    </AppShell>
  );
}
