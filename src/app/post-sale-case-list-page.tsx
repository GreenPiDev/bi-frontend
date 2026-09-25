import { clsx } from 'clsx';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from './app-shell';
import { ColumnVisibilityPicker } from '../components/ui/column-visibility-picker';
import { FilterButtonGroup } from '../components/ui/filter-button-group';
import { PageHelp } from '../components/ui/page-help';
import { Pagination, Table, type TableColumn } from '../components/ui/table';
import { useToast } from '../components/ui/toast-context';
import { useColumnVisibility } from '../features/auth/use-column-visibility';
import { useMeQuery } from '../features/auth/use-auth';
import {
  useMarkPostSaleFeedbackMutation,
  usePostSaleCaseStatusCounts,
  usePostSaleCasesQuery,
  useSendPostSaleSurveyMutation,
} from '../features/crm/use-post-sale-cases';
import { ApiError, type PostSaleCase, type PostSaleCaseStatus } from '../lib/api';
import { tr } from '../i18n/tr';

const STATUS_OPTIONS: { value: PostSaleCaseStatus; label: string }[] = (
  ['BEKLEMEDE', 'HATIRLATILDI', 'GERI_BILDIRIM_ALINDI'] as const
).map((status) => ({ value: status, label: tr.crm.postSaleCases.statusOptions[status] }));

const STATUS_TEXT_CLASS: Record<PostSaleCaseStatus, string> = {
  BEKLEMEDE: 'text-app-muted',
  HATIRLATILDI: 'text-amber-600 dark:text-amber-400',
  GERI_BILDIRIM_ALINDI: 'text-app-success',
};

/** "Durum" gercekte reminderSentAt/feedbackReceivedAt zaman damgalarindan hesaplanir
 * (bkz. post-sale-cases.service.ts computeStatus) - serbestce her degere atlanabilen bir
 * alan degil, sadece ileri yonlu iki gercek aksiyon var: anket gonder (BEKLEMEDE ->
 * HATIRLATILDI) ve geri bildirim isaretle (HATIRLATILDI -> GERI_BILDIRIM_ALINDI). Bu
 * yuzden /teklifler'deki QuoteStatusSelect'in aksine dropdown sadece bir sonraki adimi
 * secenek olarak sunar; GERI_BILDIRIM_ALINDI (geri donusu olmayan son durum) kilitli
 * duz metin olarak gosterilir. */
function PostSaleCaseStatusSelect({ postSaleCase }: { postSaleCase: PostSaleCase }) {
  const toast = useToast();
  const sendSurveyMutation = useSendPostSaleSurveyMutation(postSaleCase.id);
  const markFeedbackMutation = useMarkPostSaleFeedbackMutation(postSaleCase.id);
  const isPending = sendSurveyMutation.isPending || markFeedbackMutation.isPending;

  if (postSaleCase.status === 'GERI_BILDIRIM_ALINDI') {
    return (
      <span className={clsx('text-sm font-semibold', STATUS_TEXT_CLASS[postSaleCase.status])}>
        {tr.crm.postSaleCases.statusOptions[postSaleCase.status]}
      </span>
    );
  }

  const nextStatus: PostSaleCaseStatus =
    postSaleCase.status === 'BEKLEMEDE' ? 'HATIRLATILDI' : 'GERI_BILDIRIM_ALINDI';

  return (
    <select
      value={postSaleCase.status}
      onClick={(event) => event.stopPropagation()}
      onChange={(event) => {
        const status = event.target.value as PostSaleCaseStatus;
        if (status === postSaleCase.status) return;
        if (status === 'HATIRLATILDI') {
          sendSurveyMutation.mutate(
            {},
            {
              onSuccess: () => toast.success(tr.crm.postSaleCases.detail.sendSurveySuccess),
              onError: (error) => {
                toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
              },
            },
          );
          return;
        }
        markFeedbackMutation.mutate(
          {},
          {
            onSuccess: () => toast.success(tr.crm.postSaleCases.detail.markFeedbackSuccess),
            onError: (error) => {
              toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
            },
          },
        );
      }}
      disabled={isPending}
      className={clsx(
        'cursor-pointer rounded-md border-none bg-transparent px-2 py-1 -mx-2 -my-1 text-sm font-semibold outline-none transition-colors hover:bg-[#1a2440] hover:text-white focus:ring-2 focus:ring-app-primary disabled:cursor-not-allowed disabled:opacity-80',
        STATUS_TEXT_CLASS[postSaleCase.status],
      )}
    >
      <option value={postSaleCase.status}>
        {tr.crm.postSaleCases.statusOptions[postSaleCase.status]}
      </option>
      <option value={nextStatus}>{tr.crm.postSaleCases.statusOptions[nextStatus]}</option>
    </select>
  );
}

const ALL_COLUMNS: TableColumn<PostSaleCase>[] = [
  {
    key: 'quote',
    header: tr.crm.postSaleCases.quoteColumn,
    required: true,
    render: (c) => <span className="font-semibold text-app-text">{c.quote.quoteNumber}</span>,
  },
  {
    key: 'account',
    header: tr.crm.postSaleCases.accountColumn,
    required: true,
    render: (c) => c.account.name,
  },
  {
    key: 'contact',
    header: tr.crm.postSaleCases.contactColumn,
    render: (c) =>
      c.contact ? `${c.contact.firstName} ${c.contact.lastName}` : tr.crm.postSaleCases.noContact,
  },
  {
    key: 'status',
    header: tr.crm.postSaleCases.statusColumn,
    render: (c) => <PostSaleCaseStatusSelect postSaleCase={c} />,
  },
];

export function PostSaleCaseListPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<PostSaleCaseStatus | ''>('');
  const meQuery = useMeQuery();
  const pageSize = meQuery.data?.defaultPageSize ?? 25;
  const casesQuery = usePostSaleCasesQuery({ page, pageSize, status: status || undefined });
  const statusCounts = usePostSaleCaseStatusCounts(STATUS_OPTIONS.map((option) => option.value));
  const filterCounts: Partial<Record<PostSaleCaseStatus | '', number>> = {
    '': statusCounts.all,
    ...statusCounts.counts,
  };
  const { isColumnVisible, optionalColumns, visibleOptionalKeys, setVisibleOptionalKeys } =
    useColumnVisibility(
      'post-sale-cases',
      ALL_COLUMNS.map((c) => ({ key: c.key, label: c.header, required: c.required })),
    );
  const columns = ALL_COLUMNS.filter((c) => isColumnVisible(c.key));

  return (
    <AppShell>
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-app-text">{tr.crm.postSaleCases.title}</h1>
          <PageHelp text={tr.help.postSaleCases} />
        </div>
        <p className="mt-1 text-sm text-app-muted">{tr.crm.postSaleCases.subtitle}</p>
      </div>

      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <FilterButtonGroup
          label={tr.crm.postSaleCases.statusFilterLabel}
          value={status}
          onChange={(next) => {
            setPage(1);
            setStatus(next);
          }}
          allLabel={tr.crm.postSaleCases.allStatuses}
          options={STATUS_OPTIONS}
          counts={filterCounts}
        />
        <ColumnVisibilityPicker
          columns={optionalColumns}
          value={visibleOptionalKeys}
          onChange={setVisibleOptionalKeys}
        />
      </div>

      <Table
        columns={columns}
        data={casesQuery.data?.data ?? []}
        keyField={(c) => c.id}
        onRowClick={(c) => navigate(`/satis-sonrasi/${c.id}`)}
        isLoading={casesQuery.isPending}
        loadingMessage={tr.crm.postSaleCases.loading}
        emptyMessage={tr.crm.postSaleCases.empty}
      />

      {casesQuery.data && casesQuery.data.data.length > 0 && (
        <Pagination
          page={casesQuery.data.meta.page}
          totalPages={casesQuery.data.meta.totalPages}
          onPrevious={() => setPage((p) => p - 1)}
          onNext={() => setPage((p) => p + 1)}
        />
      )}
    </AppShell>
  );
}
