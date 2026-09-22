import { clsx } from 'clsx';
import {
  Building2,
  CheckCircle2,
  ChevronRight,
  Mail,
  MapPin,
  MoreHorizontal,
  Pencil,
  Phone,
  RotateCcw,
  Trash2,
  User,
  Video,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppShell } from './app-shell';
import { BackLink } from '../components/ui/back-link';
import { ConfirmModal } from '../components/ui/confirm-modal';
import { PageHelp } from '../components/ui/page-help';
import { Tooltip } from '../components/ui/tooltip';
import { useToast } from '../components/ui/toast-context';
import { useAssignableCalendarUsersQuery } from '../features/crm/use-calendar-events';
import {
  useDeleteInteractionMutation,
  useInteractionQuery,
  useUpdateInteractionMutation,
} from '../features/crm/use-interactions';
import { ApiError, type InteractionParticipant, type InteractionType } from '../lib/api';
import { tr } from '../i18n/tr';

const TYPE_ICONS: Record<InteractionType, typeof Phone> = {
  CALL: Phone,
  VISIT: MapPin,
  MEETING: Video,
  EMAIL: Mail,
  OTHER: MoreHorizontal,
};

function MetaCell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-semibold tracking-wide text-app-muted uppercase">{label}</p>
      <div className="mt-1.5 text-sm font-medium text-app-text">{children}</div>
    </div>
  );
}

function SectionHeader({ children }: { children: ReactNode }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span className="shrink-0 text-[11px] font-bold tracking-wide text-app-muted uppercase">
        {children}
      </span>
      <span className="h-px flex-1 bg-app-border" />
    </div>
  );
}

function InfoLinkRow({
  label,
  value,
  suffix,
  onClick,
}: {
  label: string;
  value: string;
  suffix?: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-start justify-between gap-2 rounded-lg text-left transition-transform duration-150 hover:translate-x-1"
    >
      <span className="min-w-0">
        <span className="block text-[11px] font-semibold tracking-wide text-app-muted uppercase">
          {label}
        </span>
        <span className="mt-1 block truncate text-lg font-semibold text-app-text group-hover:text-app-brand">
          {value}
          {suffix && <span className="ml-1 text-sm font-normal text-app-muted">({suffix})</span>}
        </span>
      </span>
      <ChevronRight
        size={16}
        className="mt-1 shrink-0 text-app-muted transition-colors group-hover:text-app-brand"
      />
    </button>
  );
}

function ParticipantAvatar({ avatarUrl }: { avatarUrl: string | null | undefined }) {
  if (avatarUrl) {
    return (
      <img src={avatarUrl} alt="" className="h-[34px] w-[34px] shrink-0 rounded-lg object-cover" />
    );
  }
  return (
    <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-lg bg-app-bg-muted text-app-muted">
      <User size={16} />
    </span>
  );
}

function ParticipantColumn({
  title,
  participants,
  avatarByName,
}: {
  title: string;
  participants: InteractionParticipant[];
  avatarByName: Map<string, string | null>;
}) {
  return (
    <div className="min-w-0 flex-1">
      <h3 className="mb-3 text-xs text-app-muted italic">{title}</h3>
      {participants.length === 0 ? (
        <p className="text-xs text-app-muted">—</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {participants.map((participant) => (
            <li key={participant.id} className="flex items-center gap-3">
              <ParticipantAvatar avatarUrl={avatarByName.get(participant.name)} />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-app-text">{participant.name}</p>
                {participant.note && (
                  <p className="truncate text-xs text-app-muted">{participant.note}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
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
  const assignableUsersQuery = useAssignableCalendarUsersQuery();
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
  const occurredAt = new Date(interaction.occurredAt);
  const title = interaction.account
    ? interaction.account.name
    : interaction.contact
      ? `${interaction.contact.firstName} ${interaction.contact.lastName}`
      : tr.crm.interactions.detail.noAccountFallback;
  const externalParticipants = interaction.participants.filter((p) => !p.isInternal);
  const internalParticipants = interaction.participants.filter((p) => p.isInternal);
  const avatarByName = new Map(
    (assignableUsersQuery.data ?? []).map((user) => [user.name, user.avatarUrl] as const),
  );

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

      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-app-muted uppercase">
            {tr.crm.interactions.detail.recordLabel}
          </span>
          <div className="mt-1.5 flex flex-wrap items-center gap-2.5">
            <h1 className="text-4xl leading-tight font-bold text-app-text">{title}</h1>
            <PageHelp text={tr.help.interactionDetail} />
          </div>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <Tooltip content={tr.crm.interactions.editTooltip}>
            <button
              type="button"
              onClick={() => navigate(`/gorusmeler/duzenle/${id}`)}
              aria-label={tr.crm.interactions.editTooltip}
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1a2440] text-white transition-colors hover:bg-[#141c33]"
            >
              <Pencil size={18} />
            </button>
          </Tooltip>
          <Tooltip content={tr.crm.interactions.deleteTooltip}>
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(true)}
              aria-label={tr.crm.interactions.deleteTooltip}
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1a2440] text-[#ff5c5c] transition-colors hover:bg-[#141c33]"
            >
              <Trash2 size={18} />
            </button>
          </Tooltip>
          <Tooltip
            content={
              interaction.status === 'OPEN'
                ? tr.crm.interactions.detail.closeButton
                : tr.crm.interactions.detail.reopenButton
            }
          >
            <button
              type="button"
              onClick={handleToggleStatus}
              aria-label={
                interaction.status === 'OPEN'
                  ? tr.crm.interactions.detail.closeButton
                  : tr.crm.interactions.detail.reopenButton
              }
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1a2440] text-[#2ee06a] transition-colors hover:bg-[#141c33]"
            >
              {interaction.status === 'OPEN' ? <CheckCircle2 size={18} /> : <RotateCcw size={18} />}
            </button>
          </Tooltip>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 border-y border-app-border py-4 sm:grid-cols-4 sm:divide-x sm:divide-app-border">
        <MetaCell label={tr.crm.interactions.statusColumn}>
          <span className="inline-flex items-center gap-1.5">
            <span
              className={clsx(
                'h-2 w-2 rounded-full',
                interaction.status === 'OPEN' ? 'bg-app-success' : 'bg-app-muted',
              )}
            />
            {tr.crm.interactions.statusOptions[interaction.status]}
          </span>
        </MetaCell>
        <MetaCell label={tr.crm.interactions.typeColumn}>
          <span className="inline-flex items-center gap-1.5">
            <TypeIcon size={14} className="text-app-muted" />
            {tr.crm.interactions.typeOptions[interaction.type]}
          </span>
        </MetaCell>
        <MetaCell label={tr.crm.interactions.dateColumn}>
          {occurredAt.toLocaleDateString('tr-TR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </MetaCell>
        <MetaCell label={tr.crm.interactions.timeColumn}>
          {occurredAt.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
        </MetaCell>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[3fr_2fr] lg:divide-x lg:divide-app-border">
        <div className="min-w-0 lg:pr-8">
          <SectionHeader>{tr.crm.interactions.detail.notesTitle}</SectionHeader>
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-app-text">
            {interaction.notes}
          </p>
        </div>

        <div className="flex min-w-0 flex-col gap-6 lg:pl-8">
          <div>
            <SectionHeader>{tr.crm.interactions.detail.participantsTitle}</SectionHeader>
            {interaction.participants.length === 0 ? (
              <p className="text-sm text-app-muted">{tr.crm.interactions.detail.noParticipants}</p>
            ) : (
              <div className="flex gap-6 divide-x divide-app-border">
                <ParticipantColumn
                  title={tr.crm.interactions.form.participantExternalLabel}
                  participants={externalParticipants}
                  avatarByName={avatarByName}
                />
                <div className="pl-6">
                  <ParticipantColumn
                    title={tr.crm.interactions.form.participantInternalLabel}
                    participants={internalParticipants}
                    avatarByName={avatarByName}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-5 border-t border-app-border pt-5">
            {interaction.account ? (
              <InfoLinkRow
                label={tr.crm.interactions.accountColumn}
                value={interaction.account.name}
                onClick={() => navigate(`/firmalar/${interaction.account?.id}`)}
              />
            ) : (
              <span className="flex items-center gap-2 text-sm text-app-muted">
                <Building2 size={14} />
                {tr.crm.interactions.detail.noAccountFallback}
              </span>
            )}
            {interaction.contact && (
              <InfoLinkRow
                label={tr.crm.interactions.contactColumn}
                value={`${interaction.contact.firstName} ${interaction.contact.lastName}`}
                onClick={() => navigate(`/kisiler/${interaction.contact?.id}`)}
              />
            )}
            {interaction.opportunity && (
              <InfoLinkRow
                label={tr.crm.interactions.detail.opportunityTitle}
                value={interaction.opportunity.name}
                suffix={tr.crm.opportunities.stageOptions[interaction.opportunity.stage]}
                onClick={() => navigate(`/firsatlar/${interaction.opportunity?.id}`)}
              />
            )}
          </div>
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
