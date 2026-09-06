import { useNavigate, useParams } from 'react-router-dom';
import { AppShell } from './app-shell';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
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
      <button
        type="button"
        onClick={() => navigate('/firsatlar')}
        className="text-sm font-semibold text-app-muted hover:text-app-text"
      >
        {'←'} {tr.crm.opportunities.detail.back}
      </button>

      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-app-text">{opportunity.name}</h1>
            <Badge variant="info">{tr.crm.opportunities.stageOptions[opportunity.stage]}</Badge>
          </div>
          {opportunity.estimatedValue && (
            <p className="mt-1 text-sm text-app-muted">
              {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(
                Number(opportunity.estimatedValue),
              )}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate(`/firsatlar/${id}/duzenle`)}
          >
            {tr.crm.opportunities.detail.editButton}
          </Button>
          <Button type="button" variant="danger" onClick={handleDelete}>
            {tr.crm.opportunities.detail.deleteButton}
          </Button>
        </div>
      </div>

      {opportunity.interactionId && (
        <div className="mt-6 rounded-xl border border-app-border bg-app-surface p-6">
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
