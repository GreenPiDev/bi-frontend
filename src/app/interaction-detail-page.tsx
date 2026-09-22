import {
  Building2,
  Calendar,
  FileText,
  Mail,
  MapPin,
  MoreHorizontal,
  Pencil,
  Phone,
  Trash2,
  TrendingUp,
  User,
  Users,
  Video,
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppShell } from './app-shell';
import { BackLink } from '../components/ui/back-link';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { ConfirmModal } from '../components/ui/confirm-modal';
import { PageHelp } from '../components/ui/page-help';
import { useToast } from '../components/ui/toast-context';
import {
  useDeleteInteractionMutation,
  useInteractionQuery,
  useUpdateInteractionMutation,
} from '../features/crm/use-interactions';
import { ApiError, type InteractionType } from '../lib/api';
import { tr } from '../i18n/tr';

const TYPE_ICONS: Record<InteractionType, typeof Phone> = {
  CALL: Phone,
  VISIT: MapPin,
  MEETING: Video,
  EMAIL: Mail,
  OTHER: MoreHorizontal,
};

function Card({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Phone;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-app-border bg-app-surface p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <Icon size={16} className="text-app-muted" />
        <h2 className="text-sm font-bold text-app-text">{title}</h2>
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

export function InteractionDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const interactionQuery = useInteractionQuery(id);
  const updateMutation = useUpdateInteractionMutation(id);
  const deleteMutation = useDeleteInteractionMutation();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  if (interactionQuery.isPending) {
    return (
      <AppShell>
        <p className="text-sm text-app-muted">{tr.common.loading}</p>
      </AppShell>
    );
  }

  if (!interactionQuery.data) {
    return null;
  }

  const interaction = interactionQuery.data;
  const TypeIcon = TYPE_ICONS[interaction.type];

  function handleDelete() {
    deleteMutation.mutate(id, { onSuccess: () => navigate('/gorusmeler') });
  }

  function handleToggleStatus() {
    updateMutation.mutate(
      { status: interaction.status === 'OPEN' ? 'CLOSED' : 'OPEN' },
      {
        onError: (error) => {
          toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
        },
      },
    );
  }

  return (
    <AppShell>
      <BackLink to={'/gorusmeler'} label={tr.crm.interactions.detail.back} />

      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-app-text">
              {interaction.account
                ? interaction.account.name
                : interaction.contact
                  ? `${interaction.contact.firstName} ${interaction.contact.lastName}`
                  : tr.crm.interactions.detail.noAccountFallback}
            </h1>
            <PageHelp text={tr.help.interactionDetail} />
            <Badge variant={interaction.status === 'OPEN' ? 'success' : 'neutral'}>
              {tr.crm.interactions.statusOptions[interaction.status]}
            </Badge>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-app-muted">
            <span className="inline-flex items-center gap-1.5">
              <TypeIcon size={14} />
              {tr.crm.interactions.typeOptions[interaction.type]}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Calendar size={14} />
              {new Date(interaction.occurredAt).toLocaleString('tr-TR')}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate(`/gorusmeler/duzenle/${id}`)}
          >
            <Pencil size={16} />
            {tr.crm.interactions.editTooltip}
          </Button>
          <Button type="button" variant="secondary" onClick={handleToggleStatus}>
            {interaction.status === 'OPEN'
              ? tr.crm.interactions.detail.closeButton
              : tr.crm.interactions.detail.reopenButton}
          </Button>
          <Button type="button" variant="danger" onClick={() => setIsDeleteModalOpen(true)}>
            <Trash2 size={16} />
            {tr.crm.interactions.detail.deleteButton}
          </Button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card icon={FileText} title={tr.crm.interactions.detail.notesTitle}>
            <p className="text-sm whitespace-pre-wrap text-app-text">{interaction.notes}</p>
          </Card>

          <Card icon={Users} title={tr.crm.interactions.detail.participantsTitle}>
            {interaction.participants.length === 0 ? (
              <p className="text-sm text-app-muted">{tr.crm.interactions.detail.noParticipants}</p>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {interaction.participants.map((participant) => (
                  <li
                    key={participant.id}
                    className="flex flex-wrap items-center gap-2 text-sm text-app-text"
                  >
                    <span className="font-medium">{participant.name}</span>
                    <Badge variant={participant.isInternal ? 'info' : 'neutral'}>
                      {participant.isInternal
                        ? tr.crm.interactions.form.participantInternalLabel
                        : '—'}
                    </Badge>
                    {participant.note && <span className="text-app-muted">{participant.note}</span>}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card icon={Building2} title={tr.crm.interactions.detail.relatedTitle}>
            <div className="flex flex-col gap-3">
              {interaction.account ? (
                <button
                  type="button"
                  onClick={() => navigate(`/firmalar/${interaction.account?.id}`)}
                  className="flex items-center gap-2 text-sm font-semibold text-app-brand hover:underline"
                >
                  <Building2 size={14} />
                  {interaction.account.name}
                </button>
              ) : (
                <span className="flex items-center gap-2 text-sm text-app-muted">
                  <Building2 size={14} />
                  {tr.crm.interactions.detail.noAccountFallback}
                </span>
              )}
              {interaction.contact && (
                <span className="flex items-center gap-2 text-sm text-app-text">
                  <User size={14} className="text-app-muted" />
                  {interaction.contact.firstName} {interaction.contact.lastName}
                </span>
              )}
            </div>
          </Card>

          {interaction.opportunity && (
            <Card icon={TrendingUp} title={tr.crm.interactions.detail.opportunityTitle}>
              <button
                type="button"
                onClick={() => navigate(`/firsatlar/${interaction.opportunity?.id}`)}
                className="flex items-center gap-2 text-sm font-semibold text-app-brand hover:underline"
              >
                {interaction.opportunity.name}
              </button>
              <div className="mt-2">
                <Badge variant="info">
                  {tr.crm.opportunities.stageOptions[interaction.opportunity.stage]}
                </Badge>
              </div>
            </Card>
          )}
        </div>
      </div>

      {isDeleteModalOpen && (
        <ConfirmModal
          title={tr.crm.interactions.deleteConfirmTitle}
          message={tr.crm.interactions.deleteConfirm}
          confirmLabel={tr.crm.interactions.deleteTooltip}
          isPending={deleteMutation.isPending}
          onConfirm={handleDelete}
          onCancel={() => setIsDeleteModalOpen(false)}
        />
      )}
    </AppShell>
  );
}
