import { Briefcase, Building2, Calendar, Hash, Mail, Pencil, Phone, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppShell } from './app-shell';
import { BackLink } from '../components/ui/back-link';
import { ConfirmModal } from '../components/ui/confirm-modal';
import { Table, type TableColumn } from '../components/ui/table';
import { Tooltip } from '../components/ui/tooltip';
import { useToast } from '../components/ui/toast-context';
import { Badge } from '../components/ui/badge';
import { PageHelp } from '../components/ui/page-help';
import { useMeQuery } from '../features/auth/use-auth';
import { useContactQuery, useDeleteContactMutation } from '../features/crm/use-contacts';
import { InteractionStatusSelect } from '../features/crm/interaction-status-select';
import {
  useDeleteInteractionMutation,
  useInteractionsQuery,
} from '../features/crm/use-interactions';
import { ApiError, type Interaction } from '../lib/api';
import { tr } from '../i18n/tr';

const dateFormatter = new Intl.DateTimeFormat('tr-TR', { dateStyle: 'short' });

export function ContactDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const contactQuery = useContactQuery(id);
  const deleteMutation = useDeleteContactMutation();
  const meQuery = useMeQuery();
  const interactionsQuery = useInteractionsQuery({ contactId: id }, { enabled: Boolean(id) });
  const deleteInteractionMutation = useDeleteInteractionMutation();
  const [deletingInteraction, setDeletingInteraction] = useState<Interaction | undefined>(
    undefined,
  );

  function handleConfirmDeleteInteraction() {
    if (!deletingInteraction) return;
    deleteInteractionMutation.mutate(deletingInteraction.id, {
      onSuccess: () => {
        toast.success(tr.crm.interactions.deleteSuccess);
        setDeletingInteraction(undefined);
      },
      onError: (error) => {
        toast.error(error instanceof ApiError ? error.message : tr.crm.interactions.deleteError);
      },
    });
  }

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
  const initials = `${contact.firstName.charAt(0)}${contact.lastName.charAt(0)}`.toUpperCase();

  function handleDelete() {
    if (!window.confirm(tr.crm.contacts.deleteConfirm)) {
      return;
    }
    deleteMutation.mutate(id, { onSuccess: () => navigate('/kisiler') });
  }

  const fields: { label: string; value: string; icon: typeof Mail }[] = [
    {
      label: tr.crm.contacts.form.departmentLabel,
      value: contact.department ?? '—',
      icon: Building2,
    },
    { label: tr.crm.contacts.form.titleLabel, value: contact.title ?? '—', icon: Briefcase },
    { label: tr.crm.contacts.form.emailLabel, value: contact.email ?? '—', icon: Mail },
    { label: tr.crm.contacts.form.phoneLabel, value: contact.phone ?? '—', icon: Phone },
    { label: tr.crm.contacts.form.extensionLabel, value: contact.extension ?? '—', icon: Hash },
    {
      label: tr.crm.contacts.form.lastContactedAtLabel,
      value: contact.lastContactedAt
        ? dateFormatter.format(new Date(contact.lastContactedAt))
        : tr.crm.contacts.never,
      icon: Calendar,
    },
  ];

  const interactionColumns: TableColumn<Interaction>[] = [
    {
      key: 'occurredAt',
      header: tr.crm.interactions.dateColumn,
      className: 'text-app-muted',
      render: (interaction) => new Date(interaction.occurredAt).toLocaleDateString('tr-TR'),
    },
    {
      key: 'account',
      header: tr.crm.interactions.accountColumn,
      render: (interaction) => (
        <span className="font-semibold text-app-text">
          {interaction.account ? interaction.account.name : '—'}
        </span>
      ),
    },
    {
      key: 'contact',
      header: tr.crm.interactions.contactColumn,
      className: 'text-app-muted',
      render: (interaction) =>
        interaction.contact
          ? `${interaction.contact.firstName} ${interaction.contact.lastName}`
          : '—',
    },
    {
      key: 'type',
      header: tr.crm.interactions.typeColumn,
      render: (interaction) => tr.crm.interactions.typeOptions[interaction.type],
    },
    {
      key: 'status',
      header: tr.crm.interactions.statusColumn,
      render: (interaction) => <InteractionStatusSelect interaction={interaction} />,
    },
    {
      key: 'createdByName',
      header: tr.crm.interactions.createdByColumn,
      className: 'text-app-muted',
      render: (interaction) => interaction.createdByName ?? '—',
    },
    {
      key: 'actions',
      header: tr.crm.interactions.actionsColumn,
      className: 'w-px',
      render: (interaction) =>
        interaction.createdById === meQuery.data?.id ? (
          <div className="flex items-center gap-1">
            <Tooltip content={tr.crm.interactions.editTooltip}>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  navigate(`/gorusmeler/duzenle/${interaction.id}`);
                }}
                className="rounded-lg p-2 text-app-muted hover:bg-app-bg hover:text-app-text"
              >
                <Pencil size={16} />
              </button>
            </Tooltip>
            <Tooltip content={tr.crm.interactions.deleteTooltip}>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setDeletingInteraction(interaction);
                }}
                className="rounded-lg p-2 text-app-muted hover:bg-app-bg hover:text-red-600"
              >
                <Trash2 size={16} />
              </button>
            </Tooltip>
          </div>
        ) : null,
    },
  ];

  return (
    <AppShell>
      <BackLink to={'/kisiler'} label={tr.crm.contacts.back} />

      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-app-primary/15 text-lg font-bold text-app-primary">
            {initials}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-app-text">
                {contact.firstName} {contact.lastName}
              </h1>
              <PageHelp text={tr.help.contactDetail} />
              <Badge variant={contact.status === 'ACTIVE' ? 'success' : 'neutral'}>
                {contact.status === 'ACTIVE'
                  ? tr.crm.contacts.statusActive
                  : tr.crm.contacts.statusInactive}
              </Badge>
            </div>
            {contact.account ? (
              <button
                type="button"
                onClick={() => navigate(`/firmalar/${contact.account?.id}`)}
                className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-app-brand hover:underline"
              >
                <Building2 size={14} />
                {contact.account.name}
              </button>
            ) : (
              <p className="mt-1 flex items-center gap-1.5 text-sm text-app-muted">
                <Building2 size={14} />
                {tr.crm.contacts.noAccount}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <Tooltip content={tr.crm.contacts.editButton}>
            <button
              type="button"
              onClick={() => navigate(`/kisiler/duzenle/${id}`)}
              aria-label={tr.crm.contacts.editButton}
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1a2440] text-white transition-colors hover:bg-[#141c33]"
            >
              <Pencil size={18} />
            </button>
          </Tooltip>
          <Tooltip content={tr.crm.contacts.deleteButton}>
            <button
              type="button"
              onClick={handleDelete}
              aria-label={tr.crm.contacts.deleteButton}
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1a2440] text-[#ff5c5c] transition-colors hover:bg-[#141c33]"
            >
              <Trash2 size={18} />
            </button>
          </Tooltip>
        </div>
      </div>

      <dl className="mt-6 grid grid-cols-1 gap-4 border-t border-app-border pt-6 sm:grid-cols-2 lg:grid-cols-3">
        {fields.map((field) => (
          <div
            key={field.label}
            className="flex items-start gap-3 rounded-xl border border-app-border bg-white p-4"
          >
            <field.icon size={16} className="mt-0.5 shrink-0 text-neutral-400" />
            <div>
              <dt className="text-xs font-semibold uppercase text-neutral-400">{field.label}</dt>
              <dd className="mt-1 text-sm font-medium text-neutral-900">{field.value}</dd>
            </div>
          </div>
        ))}
      </dl>

      <div className="mt-8 border-t border-app-border pt-6">
        <h2 className="text-sm font-bold text-app-text">{tr.crm.contacts.interactionsTitle}</h2>
        <Table
          columns={interactionColumns}
          data={interactionsQuery.data?.data ?? []}
          keyField={(interaction) => interaction.id}
          onRowClick={(interaction) => navigate(`/gorusmeler/${interaction.id}`)}
          isLoading={interactionsQuery.isPending}
          loadingMessage={tr.crm.interactions.loading}
          emptyMessage={tr.crm.contacts.noInteractions}
        />
      </div>

      {deletingInteraction && (
        <ConfirmModal
          title={tr.crm.interactions.deleteConfirmTitle}
          message={tr.crm.interactions.deleteConfirm}
          confirmLabel={tr.crm.interactions.deleteTooltip}
          isPending={deleteInteractionMutation.isPending}
          onConfirm={handleConfirmDeleteInteraction}
          onCancel={() => setDeletingInteraction(undefined)}
        />
      )}
    </AppShell>
  );
}
