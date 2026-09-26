import { Pencil, Trash2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppShell } from './app-shell';
import { BackLink } from '../components/ui/back-link';
import { Badge } from '../components/ui/badge';
import { PageHelp } from '../components/ui/page-help';
import { CircleIconButton } from '../components/ui/circle-icon-button';
import {
  useDeleteOpportunityMutation,
  useOpportunityQuery,
} from '../features/crm/use-opportunities';
import { tr } from '../i18n/tr';

export function OpportunityDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const opportunityQuery = useOpportunityQuery(id);
  const deleteMutation = useDeleteOpportunityMutation();

  if (opportunityQuery.isPending) {
    return (
      <AppShell>
        <p className="text-sm text-app-muted">{tr.common.loading}</p>
      </AppShell>
    );
  }

  if (!opportunityQuery.data) {
    return null;
  }

  const opportunity = opportunityQuery.data;

  function handleDelete() {
    if (!window.confirm(tr.crm.opportunities.deleteConfirm)) {
      return;
    }
    deleteMutation.mutate(id, { onSuccess: () => navigate('/firsatlar') });
  }

  return (
    <AppShell>
      <BackLink to={'/firsatlar'} label={tr.crm.opportunities.detail.back} />

      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-app-text">{opportunity.name}</h1>
            <PageHelp text={tr.help.opportunityDetail} />
            <Badge variant="info">{tr.crm.opportunities.stageOptions[opportunity.stage]}</Badge>
          </div>
          {opportunity.estimatedValue && (
            <p className="mt-1 text-sm text-app-muted">
              {new Intl.NumberFormat('tr-TR', {
                style: 'currency',
                currency: opportunity.estimatedValueCurrency,
              }).format(Number(opportunity.estimatedValue))}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 pt-1">
          <CircleIconButton
            icon={Pencil}
            tooltip={tr.crm.opportunities.detail.editButton}
            onClick={() => navigate(`/firsatlar/${id}/duzenle`)}
          />
          <CircleIconButton
            icon={Trash2}
            tooltip={tr.crm.opportunities.detail.deleteButton}
            variant="danger"
            onClick={handleDelete}
          />
        </div>
      </div>

      {opportunity.description && (
        <div className="mt-6 border-t border-app-border pt-6">
          <h2 className="text-sm font-semibold text-app-text">
            {tr.crm.opportunities.form.descriptionLabel}
          </h2>
          <p className="mt-1 text-sm whitespace-pre-wrap text-app-muted">
            {opportunity.description}
          </p>
        </div>
      )}

      {opportunity.interactionId && (
        <div className="mt-6 border-t border-app-border p-6">
          <button
            type="button"
            onClick={() => navigate(`/gorusmeler/${opportunity.interactionId}`)}
            className="text-sm font-semibold text-app-brand hover:underline"
          >
            {tr.crm.opportunities.detail.relatedInteractionLink}
          </button>
        </div>
      )}
    </AppShell>
  );
}
