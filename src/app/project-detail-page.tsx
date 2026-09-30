import { Mail, Pencil, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppShell } from './app-shell';
import { NewMessageModal } from './new-message-modal';
import { BackLink } from '../components/ui/back-link';
import { Badge } from '../components/ui/badge';
import { CircleIconButton } from '../components/ui/circle-icon-button';
import { ConfirmModal } from '../components/ui/confirm-modal';
import { PageHelp } from '../components/ui/page-help';
import { Table, type TableColumn } from '../components/ui/table';
import { useToast } from '../components/ui/toast-context';
import { useDeleteProjectMutation, useProjectQuery } from '../features/crm/use-projects';
import { ApiError, type Quote } from '../lib/api';
import { tr } from '../i18n/tr';

function formatCurrency(value: string | null): string {
  if (!value) return '—';
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(
    Number(value),
  );
}

const QUOTE_STATUS_BADGE_VARIANT: Record<
  string,
  'success' | 'warning' | 'danger' | 'neutral' | 'orange'
> = {
  DRAFT: 'neutral',
  PENDING_APPROVAL: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
  REVIZE: 'orange',
};

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

const RELATED_QUOTE_COLUMNS: TableColumn<Quote>[] = [
  {
    key: 'quoteNumber',
    header: tr.crm.quotes.numberColumn,
    render: (q) => <span className="font-semibold text-app-text">{q.quoteNumber}</span>,
  },
  {
    key: 'status',
    header: tr.crm.quotes.statusColumn,
    render: (q) => (
      <Badge variant={QUOTE_STATUS_BADGE_VARIANT[q.status]}>
        {tr.crm.quotes.statusOptions[q.status]}
      </Badge>
    ),
  },
];

export function ProjectDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const projectQuery = useProjectQuery(id);
  const deleteMutation = useDeleteProjectMutation();
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

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
    deleteMutation.mutate(project.id, {
      onSuccess: () => {
        toast.success(tr.crm.projects.deleteSuccess);
        navigate('/projeler');
      },
      onError: (error) => {
        toast.error(error instanceof ApiError ? error.message : tr.crm.projects.deleteError);
        setIsDeleteConfirmOpen(false);
      },
    });
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
          <CircleIconButton
            icon={Mail}
            tooltip={tr.crm.projects.detail.createMessageTooltip}
            onClick={() => setIsMessageModalOpen(true)}
          />
          <CircleIconButton
            icon={Pencil}
            tooltip={tr.crm.projects.detail.editButton}
            onClick={() => navigate(`/projeler/${project.id}/duzenle`)}
          />
          <CircleIconButton
            icon={Trash2}
            tooltip={tr.crm.projects.detail.deleteButton}
            variant="danger"
            onClick={() => setIsDeleteConfirmOpen(true)}
          />
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-6">
        <div className="rounded-xl border border-app-border bg-white p-5">
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-[11px] font-semibold tracking-wide text-app-muted uppercase">
                {tr.crm.projects.detail.estimatedBudgetLabel}
              </dt>
              <dd className="mt-1.5 text-sm font-medium text-app-text">
                {formatCurrency(project.estimatedBudget)}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold tracking-wide text-app-muted uppercase">
                {tr.crm.projects.detail.actualCostLabel}
              </dt>
              <dd className="mt-1.5 text-sm font-medium text-app-text">
                {formatCurrency(project.actualCost)}
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-xl border border-app-border bg-white p-5">
          <SectionHeader>{tr.crm.projects.detail.relatedQuotesTitle}</SectionHeader>
          <Table<Quote>
            columns={RELATED_QUOTE_COLUMNS}
            data={project.quotes}
            keyField={(quote) => quote.id}
            onRowClick={(quote) => navigate(`/teklifler/${quote.id}`)}
            getRowHref={(quote) => `/teklifler/${quote.id}`}
            emptyMessage={tr.crm.projects.detail.noRelatedQuotes}
          />
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

      {isDeleteConfirmOpen && (
        <ConfirmModal
          title={tr.crm.projects.deleteConfirmTitle}
          message={tr.crm.projects.deleteConfirm}
          confirmLabel={tr.crm.projects.detail.deleteButton}
          isPending={deleteMutation.isPending}
          onConfirm={handleDelete}
          onCancel={() => setIsDeleteConfirmOpen(false)}
        />
      )}
    </AppShell>
  );
}
