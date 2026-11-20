import { Download, RefreshCw, Search, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { ConfirmModal } from '../components/ui/confirm-modal';
import { IconActionButton } from '../components/ui/icon-action-button';
import { Pagination, Table, type TableColumn } from '../components/ui/table';
import { useToast } from '../components/ui/toast-context';
import { hasPermission } from '../features/auth/permissions';
import { useMeQuery } from '../features/auth/use-auth';
import { SpreadsheetReplaceModal } from '../features/spreadsheets/spreadsheet-replace-modal';
import { SpreadsheetUploadModal } from '../features/spreadsheets/spreadsheet-upload-modal';
import {
  useDeleteSpreadsheetMutation,
  useSpreadsheetsQuery,
} from '../features/spreadsheets/use-spreadsheets';
import { ApiError, exportSpreadsheet, type SpreadsheetSummary } from '../lib/api';
import { downloadBlob } from '../lib/download';
import { useDebouncedValue } from '../lib/use-debounced-value';
import { tr } from '../i18n/tr';

const dateFormatter = new Intl.DateTimeFormat('tr-TR', {
  dateStyle: 'short',
  timeStyle: 'short',
});

const PAGE_SIZE = 25;

/** /datasets?tab=spreadsheets sekmesinin icerigi - ortak duzenlenen Excel listesi. */
export function SpreadsheetsListContent() {
  const navigate = useNavigate();
  const toast = useToast();
  const permissions = useMeQuery().data?.permissions;
  const canCreate = hasPermission(permissions, 'spreadsheets', 'CREATE');
  const canUpdate = hasPermission(permissions, 'spreadsheets', 'UPDATE');
  const canDelete = hasPermission(permissions, 'spreadsheets', 'DELETE');
  const [page, setPage] = useState(1);
  const [qInput, setQInput] = useState('');
  const q = useDebouncedValue(qInput.trim());
  const spreadsheetsQuery = useSpreadsheetsQuery({
    page,
    pageSize: PAGE_SIZE,
    q: q || undefined,
  });
  const deleteMutation = useDeleteSpreadsheetMutation();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [replacing, setReplacing] = useState<SpreadsheetSummary | undefined>(undefined);
  const [deleting, setDeleting] = useState<SpreadsheetSummary | undefined>(undefined);

  async function handleDownload(s: SpreadsheetSummary) {
    try {
      const blob = await exportSpreadsheet(s.id);
      downloadBlob(blob, `${s.name.replace(/[\\/:*?"<>|]/g, '_')}.xlsx`);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : tr.spreadsheets.downloadError);
    }
  }

  function handleConfirmDelete() {
    if (!deleting) return;
    deleteMutation.mutate(deleting.id, {
      onSuccess: () => toast.success(tr.spreadsheets.deleteSuccess),
      onError: (error) =>
        toast.error(error instanceof ApiError ? error.message : tr.spreadsheets.deleteError),
      onSettled: () => setDeleting(undefined),
    });
  }

  const columns: TableColumn<SpreadsheetSummary>[] = [
    {
      key: 'name',
      header: tr.spreadsheets.nameColumn,
      render: (s) => <span className="font-semibold text-app-text">{s.name}</span>,
    },
    {
      key: 'file',
      header: tr.spreadsheets.fileColumn,
      className: 'text-app-muted',
      render: (s) => s.originalFileName,
    },
    {
      key: 'sheetCount',
      header: tr.spreadsheets.sheetCountColumn,
      className: 'text-app-muted',
      render: (s) => s.sheetCount,
    },
    {
      key: 'createdBy',
      header: tr.spreadsheets.createdByColumn,
      className: 'text-app-muted whitespace-nowrap',
      render: (s) => s.createdByName,
    },
    {
      key: 'updatedAt',
      header: tr.spreadsheets.updatedColumn,
      className: 'text-app-muted whitespace-nowrap',
      render: (s) => (
        <>
          {dateFormatter.format(new Date(s.updatedAt))}
          {s.updatedByName && (
            <span className="block text-xs">{tr.spreadsheets.updatedBy(s.updatedByName)}</span>
          )}
        </>
      ),
    },
    {
      key: 'actions',
      header: tr.spreadsheets.actionsColumn,
      className: 'w-px',
      required: true,
      render: (s: SpreadsheetSummary) => (
        <div className="flex items-center gap-1">
          <IconActionButton
            icon={Download}
            tooltip={tr.spreadsheets.downloadTooltip}
            onClick={() => void handleDownload(s)}
          />
          {canUpdate && (
            <IconActionButton
              icon={RefreshCw}
              tooltip={tr.spreadsheets.replaceTooltip}
              onClick={() => setReplacing(s)}
            />
          )}
          {canDelete && (
            <IconActionButton
              icon={Trash2}
              variant="danger"
              tooltip={tr.spreadsheets.deleteTooltip}
              onClick={() => setDeleting(s)}
            />
          )}
        </div>
      ),
    },
  ];

  const data = spreadsheetsQuery.data;

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-60 flex-1">
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
            placeholder={tr.spreadsheets.searchPlaceholder}
            className="w-full rounded-lg border border-app-border bg-app-surface py-2.5 pr-3 pl-9 text-sm text-app-text outline-none focus:border-app-primary"
          />
        </div>
        {canCreate && (
          <Button type="button" onClick={() => setUploadOpen(true)}>
            {tr.spreadsheets.uploadButton}
          </Button>
        )}
      </div>

      <Table
        columns={columns}
        data={data?.data ?? []}
        keyField={(s) => s.id}
        onRowClick={(s) => navigate(`/datasets/e-tablolar/${s.id}`)}
        getRowHref={(s) => `/datasets/e-tablolar/${s.id}`}
        isLoading={spreadsheetsQuery.isPending}
        loadingMessage={tr.spreadsheets.loading}
        emptyMessage={tr.spreadsheets.empty}
      />

      {data && data.data.length > 0 && (
        <Pagination
          page={data.meta.page}
          totalPages={data.meta.totalPages}
          total={data.meta.total}
          onPageChange={setPage}
          onPrevious={() => setPage((p) => p - 1)}
          onNext={() => setPage((p) => p + 1)}
        />
      )}

      {uploadOpen && (
        <SpreadsheetUploadModal
          onClose={() => setUploadOpen(false)}
          onUploaded={(spreadsheet) => navigate(`/datasets/e-tablolar/${spreadsheet.id}`)}
        />
      )}

      {replacing && (
        <SpreadsheetReplaceModal
          spreadsheetId={replacing.id}
          spreadsheetName={replacing.name}
          onClose={() => setReplacing(undefined)}
        />
      )}

      {deleting && (
        <ConfirmModal
          title={tr.spreadsheets.deleteConfirmTitle}
          message={tr.spreadsheets.deleteConfirm(deleting.name)}
          confirmLabel={tr.spreadsheets.deleteTooltip}
          isPending={deleteMutation.isPending}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleting(undefined)}
        />
      )}
    </>
  );
}
