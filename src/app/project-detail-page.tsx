import { clsx } from 'clsx';
import { Mail, Paperclip, Pencil, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppShell } from './app-shell';
import { NewMessageModal } from './new-message-modal';
import { BackLink } from '../components/ui/back-link';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { CircleIconButton } from '../components/ui/circle-icon-button';
import { ConfirmModal } from '../components/ui/confirm-modal';
import { FormError } from '../components/ui/form-error';
import { IconActionButton } from '../components/ui/icon-action-button';
import { Modal } from '../components/ui/modal';
import { PageHelp } from '../components/ui/page-help';
import { Table, type TableColumn } from '../components/ui/table';
import { TextField } from '../components/ui/text-field';
import { useToast } from '../components/ui/toast-context';
import { formatFileSize } from '../features/crm/format-file-size';
import {
  useDeleteProjectMutation,
  useProjectQuery,
  useRenameProjectAttachmentMutation,
} from '../features/crm/use-projects';
import { ApiError, type ProjectAttachment, type Quote } from '../lib/api';
import { quoteGrandTotalDisplay } from '../lib/quote-totals';
import { tr } from '../i18n/tr';

function formatCurrency(value: string | null): string {
  if (!value) return '—';
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(
    Number(value),
  );
}

const QUOTE_STATUS_TEXT_CLASS: Record<string, string> = {
  DRAFT: 'text-app-muted',
  PENDING_APPROVAL: 'text-amber-600 dark:text-amber-400',
  APPROVED: 'text-app-success',
  REJECTED: 'text-app-danger',
  REVIZE: 'text-orange-600 dark:text-orange-400',
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
    key: 'title',
    header: tr.crm.quotes.titleColumn,
    className: 'text-app-muted',
    render: (q) => q.title ?? '—',
  },
  {
    key: 'quoteNumber',
    header: tr.crm.quotes.numberColumn,
    render: (q) => <span className="font-semibold text-app-text">{q.quoteNumber}</span>,
  },
  {
    key: 'total',
    header: tr.crm.quotes.totalColumn,
    render: (q) => <span className="font-semibold text-app-text">{quoteGrandTotalDisplay(q)}</span>,
  },
  {
    key: 'status',
    header: tr.crm.quotes.statusColumn,
    render: (q) => (
      <span className={clsx('font-semibold', QUOTE_STATUS_TEXT_CLASS[q.status])}>
        {tr.crm.quotes.statusOptions[q.status]}
      </span>
    ),
  },
];

function buildAttachmentColumns(
  onRename: (attachment: ProjectAttachment) => void,
): TableColumn<ProjectAttachment>[] {
  return [
    {
      key: 'fileName',
      header: tr.crm.projects.detail.attachmentNameColumn,
      render: (attachment) => (
        <a
          href={attachment.url ?? undefined}
          target="_blank"
          rel="noreferrer"
          aria-label={tr.crm.projects.detail.downloadAttachmentAria}
          className="inline-flex items-center gap-1.5 text-app-primary hover:underline"
        >
          <Paperclip size={14} />
          {attachment.fileName} ({formatFileSize(attachment.sizeBytes)})
        </a>
      ),
    },
    {
      key: 'createdAt',
      header: tr.crm.projects.detail.attachmentUploadedAtColumn,
      render: (attachment) => (
        <span className="text-app-muted">
          {new Date(attachment.createdAt).toLocaleString('tr-TR')}
        </span>
      ),
    },
    {
      key: 'actions',
      header: tr.crm.projects.detail.attachmentActionsColumn,
      className: 'w-px',
      render: (attachment) => (
        <IconActionButton
          icon={Pencil}
          tooltip={tr.crm.projects.detail.renameAttachmentTooltip}
          onClick={() => onRename(attachment)}
        />
      ),
    },
  ];
}

interface RenameAttachmentModalProps {
  projectId: string;
  attachment: ProjectAttachment;
  onClose: () => void;
}

/** Zaten yuklu bir dosyanin goruntulenen adini duzenlemek icin - AddOptionModal ile
 * ayni "kucuk form modali" deseni. */
function RenameAttachmentModal({ projectId, attachment, onClose }: RenameAttachmentModalProps) {
  const toast = useToast();
  const renameMutation = useRenameProjectAttachmentMutation();
  const [fileName, setFileName] = useState(attachment.fileName);
  const [apiErrorMessage, setApiErrorMessage] = useState<string | undefined>();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = fileName.trim();
    if (!trimmed) return;
    renameMutation.mutate(
      { projectId, attachmentId: attachment.id, fileName: trimmed },
      {
        onSuccess: () => {
          toast.success(tr.crm.projects.detail.renameAttachmentSuccess);
          onClose();
        },
        onError: (error) => {
          setApiErrorMessage(error instanceof ApiError ? error.message : tr.common.unexpectedError);
        },
      },
    );
  }

  return (
    <Modal title={tr.crm.projects.detail.renameAttachmentTitle} onClose={onClose} width="sm">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <FormError message={apiErrorMessage} />
        <TextField
          label={tr.crm.projects.detail.attachmentNameColumn}
          autoFocus
          value={fileName}
          onChange={(event) => setFileName(event.target.value)}
        />
        <div className="flex gap-2">
          <Button type="submit" disabled={renameMutation.isPending}>
            {tr.common.save}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            {tr.common.cancel}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function ProjectDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const projectQuery = useProjectQuery(id);
  const deleteMutation = useDeleteProjectMutation();
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [renamingAttachment, setRenamingAttachment] = useState<ProjectAttachment | null>(null);

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
  const sortedAttachments = [...project.attachments].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

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
            onClick={() => navigate(`/projeler/duzenle/${project.projectNumber}`)}
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
            <div className="sm:col-span-2">
              <dt className="text-[11px] font-semibold tracking-wide text-app-muted uppercase">
                {tr.crm.projects.detail.responsibleLabel}
              </dt>
              <dd className="mt-1.5 flex flex-wrap gap-1">
                {project.responsibleUsers.length > 0 ? (
                  project.responsibleUsers.map((user) => <Badge key={user.id}>{user.name}</Badge>)
                ) : (
                  <span className="text-sm font-medium text-app-text">
                    {tr.crm.projects.detail.noResponsibles}
                  </span>
                )}
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

        <div className="rounded-xl border border-app-border bg-white p-5">
          <SectionHeader>{tr.crm.projects.detail.attachmentsTitle}</SectionHeader>
          <Table<ProjectAttachment>
            columns={buildAttachmentColumns(setRenamingAttachment)}
            data={sortedAttachments}
            keyField={(attachment) => attachment.id}
            emptyMessage={tr.crm.projects.detail.noAttachments}
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

      {renamingAttachment && (
        <RenameAttachmentModal
          projectId={project.id}
          attachment={renamingAttachment}
          onClose={() => setRenamingAttachment(null)}
        />
      )}
    </AppShell>
  );
}
