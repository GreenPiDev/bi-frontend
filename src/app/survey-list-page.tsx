import { Pencil, Search, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from './app-shell';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { ConfirmModal } from '../components/ui/confirm-modal';
import { IconActionButton } from '../components/ui/icon-action-button';
import { PageHelp } from '../components/ui/page-help';
import { Pagination, Table, type TableColumn } from '../components/ui/table';
import { useToast } from '../components/ui/toast-context';
import { useMeQuery } from '../features/auth/use-auth';
import { useDeleteSurveyMutation, useSurveysQuery } from '../features/crm/use-surveys';
import { ApiError, type Survey } from '../lib/api';
import { useDebouncedValue } from '../lib/use-debounced-value';
import { tr } from '../i18n/tr';

/** AppShell'siz icerik - /satis-sonrasi yonetim sayfasinda sekme olarak gomulur
 * (bkz. orders-management-page.tsx'teki *ListContent deseni). */
export function SurveysListContent() {
  const navigate = useNavigate();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [qInput, setQInput] = useState('');
  const q = useDebouncedValue(qInput.trim());
  const [deletingSurvey, setDeletingSurvey] = useState<Survey | undefined>(undefined);
  const meQuery = useMeQuery();
  const pageSize = meQuery.data?.defaultPageSize ?? 25;
  const surveysQuery = useSurveysQuery({ page, pageSize, q: q || undefined });
  const deleteMutation = useDeleteSurveyMutation();

  function handleConfirmDelete() {
    if (!deletingSurvey) return;
    deleteMutation.mutate(deletingSurvey.id, {
      onSuccess: () => {
        toast.success(tr.crm.surveys.deleteSuccess);
        setDeletingSurvey(undefined);
      },
      onError: (error) => {
        toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
      },
    });
  }

  const columns: TableColumn<Survey>[] = [
    {
      key: 'name',
      header: tr.crm.surveys.nameColumn,
      required: true,
      render: (survey) => <span className="font-semibold text-app-text">{survey.name}</span>,
    },
    {
      key: 'questionCount',
      header: tr.crm.surveys.questionCountColumn,
      render: (survey) => survey.questions.length,
    },
    {
      key: 'status',
      header: tr.crm.surveys.statusColumn,
      render: (survey) => (
        <Badge variant={survey.isActive ? 'success' : 'neutral'}>
          {survey.isActive ? tr.crm.surveys.activeLabel : tr.crm.surveys.inactiveLabel}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: tr.crm.surveys.actionsColumn,
      className: 'w-px',
      required: true,
      render: (survey) => (
        <div className="flex items-center gap-1">
          <IconActionButton
            icon={Pencil}
            tooltip={tr.crm.surveys.editTooltip}
            onClick={() => navigate(`/anketler/duzenle/${survey.id}`)}
          />
          <IconActionButton
            icon={Trash2}
            tooltip={tr.crm.surveys.deleteTooltip}
            variant="danger"
            onClick={() => setDeletingSurvey(survey)}
          />
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-start justify-end gap-4">
        <Button type="button" onClick={() => navigate('/anketler/yeni')}>
          {tr.crm.surveys.newButton}
        </Button>
      </div>

      <div className="relative mt-4 w-full">
        <Search
          size={16}
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-app-muted"
        />
        <input
          type="search"
          value={qInput}
          onChange={(event) => {
            setPage(1);
            setQInput(event.target.value);
          }}
          placeholder={tr.crm.surveys.searchPlaceholder}
          className="w-full rounded-lg border border-app-border bg-app-surface py-2.5 pr-3 pl-9 text-sm text-app-text outline-none focus:border-app-primary"
        />
      </div>

      <Table
        columns={columns}
        data={surveysQuery.data?.data ?? []}
        keyField={(survey) => survey.id}
        onRowClick={(survey) => navigate(`/anketler/duzenle/${survey.id}`)}
        getRowHref={(survey) => `/anketler/duzenle/${survey.id}`}
        isLoading={surveysQuery.isPending}
        loadingMessage={tr.crm.surveys.loading}
        emptyMessage={tr.crm.surveys.empty}
      />

      {surveysQuery.data && surveysQuery.data.data.length > 0 && (
        <Pagination
          page={surveysQuery.data.meta.page}
          totalPages={surveysQuery.data.meta.totalPages}
          total={surveysQuery.data.meta.total}
          onPageChange={setPage}
          onPrevious={() => setPage((p) => p - 1)}
          onNext={() => setPage((p) => p + 1)}
        />
      )}

      {deletingSurvey && (
        <ConfirmModal
          title={tr.crm.surveys.deleteConfirmTitle}
          message={tr.crm.surveys.deleteConfirm}
          confirmLabel={tr.crm.surveys.deleteTooltip}
          isPending={deleteMutation.isPending}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeletingSurvey(undefined)}
        />
      )}
    </div>
  );
}

export function SurveysListPage() {
  return (
    <AppShell>
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-bold text-app-text">{tr.crm.surveys.title}</h1>
        <PageHelp text={tr.help.surveys} />
      </div>
      <p className="mt-1 text-sm text-app-muted">{tr.crm.surveys.subtitle}</p>
      <div className="mt-6">
        <SurveysListContent />
      </div>
    </AppShell>
  );
}
