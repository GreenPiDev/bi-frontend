import { Mail } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppShell } from './app-shell';
import { NewMessageModal } from './new-message-modal';
import { BackLink } from '../components/ui/back-link';
import { CircleIconButton } from '../components/ui/circle-icon-button';
import { PageHelp } from '../components/ui/page-help';
import { useProjectQuery } from '../features/crm/use-projects';
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
          <CircleIconButton
            icon={Mail}
            tooltip={tr.crm.projects.detail.createMessageTooltip}
            onClick={() => setIsMessageModalOpen(true)}
          />
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

        <div className="border-t border-app-border p-6">
          <h2 className="text-xs font-semibold uppercase text-app-muted">
            {tr.crm.projects.detail.relatedQuotesTitle}
          </h2>
          {project.quotes.length === 0 ? (
            <p className="mt-2 text-sm text-app-muted">{tr.crm.projects.detail.noRelatedQuotes}</p>
          ) : (
            <ul className="mt-2 flex flex-col gap-1.5">
              {project.quotes.map((quote) => (
                <li key={quote.id}>
                  <button
                    type="button"
                    onClick={() => navigate(`/teklifler/${quote.id}`)}
                    className="text-sm font-semibold text-app-brand hover:underline"
                  >
                    {quote.quoteNumber}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
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
