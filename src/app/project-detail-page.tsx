import { Mail, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppShell } from './app-shell';
import { NewMessageModal } from './new-message-modal';
import { BackLink } from '../components/ui/back-link';
import { PageHelp } from '../components/ui/page-help';
import { Tooltip } from '../components/ui/tooltip';
import { useDeleteProjectMutation, useProjectQuery } from '../features/crm/use-projects';
import { tr } from '../i18n/tr';

function formatCurrency(value: string | null): string {
  if (!value) return '—';
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(
    Number(value),
  );
}

export function ProjectDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const projectQuery = useProjectQuery(id);
  const deleteMutation = useDeleteProjectMutation();
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);

  if (projectQuery.isPending) {
    return (
      <AppShell>
        <p className="text-sm text-app-muted">{tr.common.loading}</p>
      </AppShell>
    );
  }

  if (!projectQuery.data) {
    return null;
  }

  const project = projectQuery.data;

  function handleDelete() {
    if (!window.confirm(tr.crm.projects.deleteConfirm)) {
      return;
    }
    deleteMutation.mutate(id, { onSuccess: () => navigate('/projeler') });
  }

  return (
    <AppShell>
      <BackLink to={'/projeler'} label={tr.crm.projects.detail.back} />

      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-app-text">{project.name}</h1>
            <PageHelp text={tr.help.projectDetail} />
            <span className="text-sm font-semibold text-app-muted">{project.projectNumber}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <Tooltip content={tr.crm.projects.detail.createMessageTooltip}>
            <button
              type="button"
              onClick={() => setIsMessageModalOpen(true)}
              aria-label={tr.crm.projects.detail.createMessageTooltip}
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1a2440] text-white transition-colors hover:bg-[#141c33]"
            >
              <Mail size={18} />
            </button>
          </Tooltip>
          <Tooltip content={tr.crm.projects.detail.editButton}>
            <button
              type="button"
              onClick={() => navigate(`/projeler/${id}/duzenle`)}
              aria-label={tr.crm.projects.detail.editButton}
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1a2440] text-white transition-colors hover:bg-[#141c33]"
            >
              <Pencil size={18} />
            </button>
          </Tooltip>
          <Tooltip content={tr.crm.projects.detail.deleteButton}>
            <button
              type="button"
              onClick={handleDelete}
              aria-label={tr.crm.projects.detail.deleteButton}
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1a2440] text-[#ff5c5c] transition-colors hover:bg-[#141c33]"
            >
              <Trash2 size={18} />
            </button>
          </Tooltip>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <dl className="grid grid-cols-1 gap-4 border-t border-app-border p-6 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase text-app-muted">
              {tr.crm.projects.detail.estimatedBudgetLabel}
            </dt>
            <dd className="mt-1 text-sm text-app-text">
              {formatCurrency(project.estimatedBudget)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-app-muted">
              {tr.crm.projects.detail.actualCostLabel}
            </dt>
            <dd className="mt-1 text-sm text-app-text">{formatCurrency(project.actualCost)}</dd>
          </div>
        </dl>

        {project.quoteId && (
          <div className="border-t border-app-border p-6">
            <button
              type="button"
              onClick={() => navigate(`/teklifler/${project.quoteId}`)}
              className="text-sm font-semibold text-app-brand hover:underline"
            >
              {tr.crm.projects.detail.relatedQuoteLink}
            </button>
          </div>
        )}
      </div>

      {isMessageModalOpen && (
        <NewMessageModal
          onClose={() => setIsMessageModalOpen(false)}
          defaultToUserIds={project.createdById ? [project.createdById] : []}
          defaultRelatedEntity="PROJECT"
          defaultRelatedEntityId={id}
        />
      )}
    </AppShell>
  );
}
