import { Pencil, Star, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AppShell } from './app-shell';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { ConfirmModal } from '../components/ui/confirm-modal';
import { IconActionButton } from '../components/ui/icon-action-button';
import { PageHelp } from '../components/ui/page-help';
import { Pagination, Table, type TableColumn } from '../components/ui/table';
import { useToast } from '../components/ui/toast-context';
import { useMeQuery } from '../features/auth/use-auth';
import {
  useDeleteQuoteTemplateMutation,
  useQuoteTemplatesQuery,
  useSetDefaultQuoteTemplateMutation,
} from '../features/crm/use-quote-templates';
import { STANDARD_QUOTE_TEMPLATE_ID } from '../features/crm/standard-quote-pdf-theme';
import { ApiError, type QuoteTemplate } from '../lib/api';
import { tr } from '../i18n/tr';

export function QuoteTemplateListContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const backState = { from: `${location.pathname}${location.search}` };
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [deletingTemplate, setDeletingTemplate] = useState<QuoteTemplate | undefined>(undefined);
  const meQuery = useMeQuery();
  const pageSize = meQuery.data?.defaultPageSize ?? 25;
  const templatesQuery = useQuoteTemplatesQuery({ page, pageSize });
  const deleteMutation = useDeleteQuoteTemplateMutation();
  const setDefaultMutation = useSetDefaultQuoteTemplateMutation();

  function handleConfirmDelete() {
    if (!deletingTemplate) return;
    deleteMutation.mutate(deletingTemplate.id, {
      onSuccess: () => {
        toast.success(tr.crm.quoteTemplates.deleteSuccess);
        setDeletingTemplate(undefined);
      },
      onError: (error) => {
        toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
      },
    });
  }

  function handleSetDefault(template: QuoteTemplate) {
    setDefaultMutation.mutate(template.id, {
      onSuccess: () => toast.success(tr.crm.quoteTemplates.setDefaultSuccess),
      onError: (error) => {
        toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
      },
    });
  }

  const isStandard = (template: QuoteTemplate) => template.id === STANDARD_QUOTE_TEMPLATE_ID;

  const columns: TableColumn<QuoteTemplate>[] = [
    {
      key: 'name',
      header: tr.crm.quoteTemplates.nameColumn,
      required: true,
      render: (template) => (
        <span className="flex items-center gap-2 font-semibold text-app-text">
          {template.name}
          {isStandard(template) && (
            <>
              <Badge variant="neutral">{tr.crm.quoteTemplates.standard.rowBadge}</Badge>
              <span className="text-xs font-normal text-app-muted">
                {tr.crm.quoteTemplates.standard.rowHint}
              </span>
            </>
          )}
          {template.isDefault && <Badge variant="info">{tr.crm.quoteTemplates.defaultBadge}</Badge>}
        </span>
      ),
    },
    {
      key: 'actions',
      header: tr.crm.quoteTemplates.actionsColumn,
      className: 'w-px',
      required: true,
      render: (template) =>
        isStandard(template) ? (
          <div className="flex items-center gap-1">
            <IconActionButton
              icon={Pencil}
              tooltip={tr.crm.quoteTemplates.standard.title}
              onClick={() =>
                navigate(`/teklif-sablonlari/duzenle/${STANDARD_QUOTE_TEMPLATE_ID}`, {
                  state: backState,
                })
              }
            />
          </div>
        ) : (
          <div className="flex items-center gap-1">
            {!template.isDefault && (
              <IconActionButton
                icon={Star}
                tooltip={tr.crm.quoteTemplates.setDefaultTooltip}
                onClick={() => handleSetDefault(template)}
              />
            )}
            <IconActionButton
              icon={Trash2}
              tooltip={tr.crm.quoteTemplates.deleteTooltip}
              variant="danger"
              onClick={() => setDeletingTemplate(template)}
            />
          </div>
        ),
    },
  ];

  // Standart (sablonsuz) PDF tasarimi DB'de bir QuoteTemplate degil - listenin
  // ilk sayfasinin basina sabit, silinemez bir satir olarak eklenir (bkz.
  // docs/VARSAYIMLAR.md V89).
  const standardRow: QuoteTemplate = {
    id: STANDARD_QUOTE_TEMPLATE_ID,
    name: tr.crm.quoteTemplates.standard.rowName,
    isDefault: false,
    logoKey: null,
    coverImageKey: null,
    closingImageKey: null,
    logoUrl: null,
    coverImageUrl: null,
    closingImageUrl: null,
    companyDisplayName: '',
    companyTagline: null,
    createdById: '',
    createdAt: '',
    updatedAt: '',
  };
  const rows = [
    ...(page === 1 && !templatesQuery.isPending ? [standardRow] : []),
    ...(templatesQuery.data?.data ?? []),
  ];

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-app-text">{tr.crm.quoteTemplates.title}</h1>
            <PageHelp text={tr.help.quoteTemplates} />
          </div>
          <p className="mt-1 text-sm text-app-muted">{tr.crm.quoteTemplates.subtitle}</p>
        </div>
        <Button
          type="button"
          onClick={() => navigate('/teklif-sablonlari/yeni', { state: backState })}
        >
          {tr.crm.quoteTemplates.newButton}
        </Button>
      </div>

      <Table
        columns={columns}
        data={rows}
        keyField={(template) => template.id}
        onRowClick={(template) =>
          navigate(`/teklif-sablonlari/duzenle/${template.id}`, { state: backState })
        }
        getRowHref={(template) => `/teklif-sablonlari/duzenle/${template.id}`}
        isLoading={templatesQuery.isPending}
        loadingMessage={tr.crm.quoteTemplates.loading}
        emptyMessage={tr.crm.quoteTemplates.empty}
      />

      {templatesQuery.data && templatesQuery.data.meta.totalPages > 1 && (
        <Pagination
          page={templatesQuery.data.meta.page}
          totalPages={templatesQuery.data.meta.totalPages}
          total={templatesQuery.data.meta.total}
          onPageChange={setPage}
          onPrevious={() => setPage((p) => p - 1)}
          onNext={() => setPage((p) => p + 1)}
        />
      )}

      {deletingTemplate && (
        <ConfirmModal
          title={tr.crm.quoteTemplates.deleteConfirmTitle}
          message={tr.crm.quoteTemplates.deleteConfirm}
          confirmLabel={tr.crm.quoteTemplates.deleteTooltip}
          isPending={deleteMutation.isPending}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeletingTemplate(undefined)}
        />
      )}
    </>
  );
}

export function QuoteTemplateListPage() {
  return (
    <AppShell>
      <QuoteTemplateListContent />
    </AppShell>
  );
}
