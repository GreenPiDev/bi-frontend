import { Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppShell } from './app-shell';
import { BackLink } from '../components/ui/back-link';
import { Badge } from '../components/ui/badge';
import { CircleIconButton } from '../components/ui/circle-icon-button';
import { ConfirmModal } from '../components/ui/confirm-modal';
import { PageHelp } from '../components/ui/page-help';
import { useToast } from '../components/ui/toast-context';
import {
  useDeleteOpportunityMutation,
  useOpportunityQuery,
} from '../features/crm/use-opportunities';
import { ApiError } from '../lib/api';
import { tr } from '../i18n/tr';

export function OpportunityDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const opportunityQuery = useOpportunityQuery(id);
  const deleteMutation = useDeleteOpportunityMutation();
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

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
    deleteMutation.mutate(opportunity.id, {
      onSuccess: () => {
        toast.success(tr.crm.opportunities.deleteSuccess);
        navigate('/firsatlar');
      },
      onError: (error) => {
        toast.error(error instanceof ApiError ? error.message : tr.crm.opportunities.deleteError);
        setIsDeleteConfirmOpen(false);
      },
    });
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
            onClick={() => navigate(`/firsatlar/${opportunity.id}/duzenle`)}
          />
          <CircleIconButton
            icon={Trash2}
            tooltip={tr.crm.opportunities.detail.deleteButton}
            variant="danger"
            onClick={() => setIsDeleteConfirmOpen(true)}
          />
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-6">
        {opportunity.description && (
          <div className="rounded-xl border border-app-border bg-white p-5">
            <p className="text-[11px] font-semibold tracking-wide text-app-muted uppercase">
              {tr.crm.opportunities.form.descriptionLabel}
            </p>
            <p className="mt-1.5 text-sm whitespace-pre-wrap text-app-text">
              {opportunity.description}
            </p>
          </div>
        )}

        {opportunity.interactionId && (
          <div className="rounded-xl border border-app-border bg-white p-5">
            <button
              type="button"
              onClick={() => navigate(`/gorusmeler/${opportunity.interactionId}`)}
              className="text-sm font-semibold text-app-brand hover:underline"
            >
              {tr.crm.opportunities.detail.relatedInteractionLink}
            </button>
          </div>
        )}
      </div>

      {isDeleteConfirmOpen && (
        <ConfirmModal
          title={tr.crm.opportunities.deleteConfirmTitle}
          message={tr.crm.opportunities.deleteConfirm}
          confirmLabel={tr.crm.opportunities.detail.deleteButton}
          isPending={deleteMutation.isPending}
          onConfirm={handleDelete}
          onCancel={() => setIsDeleteConfirmOpen(false)}
        />
      )}
    </AppShell>
  );
}
