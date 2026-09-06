import { useNavigate, useParams } from 'react-router-dom';
import { AppShell } from './app-shell';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { useToast } from '../components/ui/toast-context';
import {
  useDeleteInteractionMutation,
  useInteractionQuery,
  useUpdateInteractionMutation,
} from '../features/crm/use-interactions';
import { ApiError } from '../lib/api';
import { tr } from '../i18n/tr';

export function InteractionDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const interactionQuery = useInteractionQuery(id);
  const updateMutation = useUpdateInteractionMutation(id);
  const deleteMutation = useDeleteInteractionMutation();

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

  function handleDelete() {
    if (!window.confirm(tr.crm.interactions.deleteConfirm)) {
      return;
    }
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
      <button
        type="button"
        onClick={() => navigate('/gorusmeler')}
        className="text-sm font-semibold text-app-muted hover:text-app-text"
      >
        {'←'} {tr.crm.interactions.detail.back}
      </button>

      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-app-text">{interaction.account.name}</h1>
            <Badge variant={interaction.status === 'OPEN' ? 'success' : 'neutral'}>
              {tr.crm.interactions.statusOptions[interaction.status]}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-app-muted">
            {tr.crm.interactions.typeOptions[interaction.type]} ·{' '}
            {new Date(interaction.occurredAt).toLocaleString('tr-TR')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={handleToggleStatus}>
            {interaction.status === 'OPEN'
              ? tr.crm.interactions.detail.closeButton
              : tr.crm.interactions.detail.reopenButton}
          </Button>
          <Button type="button" variant="danger" onClick={handleDelete}>
            {tr.crm.interactions.detail.deleteButton}
          </Button>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-app-border bg-app-surface p-6">
        <h2 className="text-sm font-bold text-app-text">{tr.crm.interactions.detail.notesTitle}</h2>
        <p className="mt-2 whitespace-pre-wrap text-sm text-app-text">{interaction.notes}</p>
        {interaction.contact && (
          <p className="mt-4 text-sm text-app-muted">
            {tr.crm.interactions.contactColumn}: {interaction.contact.firstName}{' '}
            {interaction.contact.lastName}
          </p>
        )}
      </div>

      {interaction.opportunity && (
        <div className="mt-6 rounded-xl border border-app-border bg-app-surface p-6">
          <h2 className="text-sm font-bold text-app-text">
            {tr.crm.interactions.detail.opportunityTitle}
          </h2>
          <button
            type="button"
            onClick={() => navigate(`/firsatlar/${interaction.opportunity?.id}`)}
            className="mt-2 text-sm font-semibold text-app-brand hover:underline"
          >
            {interaction.opportunity.name} (
            {tr.crm.opportunities.stageOptions[interaction.opportunity.stage]})
          </button>
        </div>
      )}

      <div className="mt-6 rounded-xl border border-app-border bg-app-surface p-6">
        <h2 className="text-sm font-bold text-app-text">
          {tr.crm.interactions.detail.participantsTitle}
        </h2>
        {interaction.participants.length === 0 ? (
          <p className="mt-2 text-sm text-app-muted">{tr.crm.interactions.detail.noParticipants}</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {interaction.participants.map((participant) => (
              <li key={participant.id} className="text-sm text-app-text">
                {participant.name}{' '}
                <span className="text-app-muted">
                  (
                  {participant.isInternal ? tr.crm.interactions.form.participantInternalLabel : '—'}
                  )
                </span>
                {participant.note && <span className="text-app-muted"> — {participant.note}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
