import { useNavigate, useParams } from 'react-router-dom';
import { AppShell } from './app-shell';
import { Button } from '../components/ui/button';
import { PageHelp } from '../components/ui/page-help';
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
      <button
        type="button"
        onClick={() => navigate('/projeler')}
        className="text-sm font-semibold text-app-muted hover:text-app-text"
      >
        {'←'} {tr.crm.projects.detail.back}
      </button>

      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-app-text">{project.name}</h1>
            <PageHelp text={tr.help.projectDetail} />
            <span className="text-sm font-semibold text-app-muted">{project.projectNumber}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate(`/projeler/${id}/duzenle`)}
          >
            {tr.crm.projects.detail.editButton}
          </Button>
          <Button type="button" variant="danger" onClick={handleDelete}>
            {tr.crm.projects.detail.deleteButton}
          </Button>
        </div>
      </div>

      <dl className="mt-6 grid grid-cols-1 gap-4 rounded-xl border border-app-border bg-app-surface p-6 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-semibold uppercase text-app-muted">
            {tr.crm.projects.detail.estimatedBudgetLabel}
          </dt>
          <dd className="mt-1 text-sm text-app-text">{formatCurrency(project.estimatedBudget)}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase text-app-muted">
            {tr.crm.projects.detail.actualCostLabel}
          </dt>
          <dd className="mt-1 text-sm text-app-text">{formatCurrency(project.actualCost)}</dd>
        </div>
      </dl>

      {project.quoteId && (
        <div className="mt-6 rounded-xl border border-app-border bg-app-surface p-6">
          <button
            type="button"
            onClick={() => navigate(`/teklifler/${project.quoteId}`)}
            className="text-sm font-semibold text-app-brand hover:underline"
          >
            {tr.crm.projects.detail.relatedQuoteLink}
          </button>
        </div>
      )}
    </AppShell>
  );
}
