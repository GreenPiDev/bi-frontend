import { useNavigate, useParams } from 'react-router-dom';
import { AppShell } from './app-shell';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { useContactQuery, useDeleteContactMutation } from '../features/crm/use-contacts';
import { tr } from '../i18n/tr';

const dateFormatter = new Intl.DateTimeFormat('tr-TR', { dateStyle: 'short' });

export function ContactDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const contactQuery = useContactQuery(id);
  const deleteMutation = useDeleteContactMutation();

  if (contactQuery.isPending) {
    return (
      <AppShell>
        <p className="text-sm text-app-muted">{tr.common.loading}</p>
      </AppShell>
    );
  }

  if (!contactQuery.data) {
    return null;
  }

  const contact = contactQuery.data;

  function handleDelete() {
    if (!window.confirm(tr.crm.contacts.deleteConfirm)) {
      return;
    }
    deleteMutation.mutate(id, { onSuccess: () => navigate('/kisiler') });
  }

  const fields: { label: string; value: string }[] = [
    { label: tr.crm.contacts.form.titleLabel, value: contact.title ?? '—' },
    { label: tr.crm.contacts.form.emailLabel, value: contact.email ?? '—' },
    { label: tr.crm.contacts.form.phoneLabel, value: contact.phone ?? '—' },
    {
      label: tr.crm.contacts.form.lastContactedAtLabel,
      value: contact.lastContactedAt
        ? dateFormatter.format(new Date(contact.lastContactedAt))
        : '—',
    },
  ];

  return (
    <AppShell>
      <button
        type="button"
        onClick={() => navigate('/kisiler')}
        className="text-sm font-semibold text-app-muted hover:text-app-text"
      >
        {'←'} {tr.crm.accounts.detail.back}
      </button>

      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-app-text">
              {contact.firstName} {contact.lastName}
            </h1>
            <Badge variant={contact.status === 'ACTIVE' ? 'success' : 'neutral'}>
              {contact.status === 'ACTIVE'
                ? tr.crm.contacts.statusActive
                : tr.crm.contacts.statusInactive}
            </Badge>
          </div>
          {contact.account && (
            <button
              type="button"
              onClick={() => navigate(`/firmalar/${contact.account?.id}`)}
              className="mt-1 text-sm font-semibold text-app-brand hover:underline"
            >
              {contact.account.name}
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate(`/kisiler/${id}/duzenle`)}
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
    </AppShell>
  );
}
