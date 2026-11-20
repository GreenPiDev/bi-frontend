import { zodResolver } from '@hookform/resolvers/zod';
import { clsx } from 'clsx';
import { Link2, Pencil } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useParams } from 'react-router-dom';
import { z } from 'zod';
import { AppShell } from './app-shell';
import { Button } from '../components/ui/button';
import { ConfirmModal } from '../components/ui/confirm-modal';
import { FormError } from '../components/ui/form-error';
import { IconActionButton } from '../components/ui/icon-action-button';
import { Modal } from '../components/ui/modal';
import { PageHelp } from '../components/ui/page-help';
import { TextField } from '../components/ui/text-field';
import { useToast } from '../components/ui/toast-context';
import { hasPermission } from '../features/auth/permissions';
import { useMeQuery } from '../features/auth/use-auth';
import { SpreadsheetSheetEditor } from '../features/spreadsheets/spreadsheet-sheet-editor';
import { useUnsavedChangesGuard } from '../features/spreadsheets/use-unsaved-changes-guard';
import {
  useRenameSpreadsheetMutation,
  useSpreadsheetColumnsRealtimeSync,
  useSpreadsheetReplacedRealtimeSync,
  useSpreadsheetQuery,
} from '../features/spreadsheets/use-spreadsheets';
import { ApiError, type SpreadsheetDetail } from '../lib/api';
import { copyToClipboard } from '../lib/copy-to-clipboard';
import { usePageTitle } from '../lib/document-title';
import { tr } from '../i18n/tr';

const LIST_PATH = '/datasets?tab=spreadsheets';

const renameSchema = z.object({
  name: z.string().trim().min(1, tr.spreadsheets.detail.renameRequired).max(200),
});
type RenameValues = z.infer<typeof renameSchema>;

function RenameSpreadsheetModal({
  spreadsheet,
  onClose,
}: {
  spreadsheet: SpreadsheetDetail;
  onClose: () => void;
}) {
  const toast = useToast();
  const renameMutation = useRenameSpreadsheetMutation(spreadsheet.id);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RenameValues>({
    resolver: zodResolver(renameSchema),
    defaultValues: { name: spreadsheet.name },
  });
  const onSubmit = handleSubmit((values) =>
    renameMutation.mutate(values.name, {
      onSuccess: () => {
        toast.success(tr.spreadsheets.detail.renameSuccess);
        onClose();
      },
    }),
  );
  return (
    <Modal
      title={tr.spreadsheets.detail.renameTitle}
      onClose={onClose}
      width="sm"
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            {tr.spreadsheets.upload.cancel}
          </Button>
          <Button type="submit" form="spreadsheet-rename-form" disabled={renameMutation.isPending}>
            {tr.spreadsheets.detail.renameSave}
          </Button>
        </div>
      }
    >
      <form id="spreadsheet-rename-form" onSubmit={onSubmit} className="flex flex-col gap-3">
        <TextField
          label={tr.spreadsheets.detail.renameLabel}
          error={errors.name?.message}
          {...register('name')}
        />
        {renameMutation.error instanceof ApiError && (
          <FormError message={renameMutation.error.message} />
        )}
      </form>
    </Modal>
  );
}

export function SpreadsheetDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const toast = useToast();
  const spreadsheetQuery = useSpreadsheetQuery(id);
  useSpreadsheetColumnsRealtimeSync(id);
  useSpreadsheetReplacedRealtimeSync(id, (by) =>
    toast.info(tr.spreadsheets.replace.remoteReplaced(by)),
  );
  const permissions = useMeQuery().data?.permissions;
  const canEdit = hasPermission(permissions, 'spreadsheets', 'UPDATE');
  const spreadsheet = spreadsheetQuery.data;
  usePageTitle(spreadsheet?.name ?? tr.spreadsheets.listTitle);

  const [activeSheetId, setActiveSheetId] = useState<string | null>(null);
  const [pendingSheetId, setPendingSheetId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const guard = useUnsavedChangesGuard(dirty);
  const handleDirtyChange = useCallback((value: boolean) => setDirty(value), []);

  const sheets = spreadsheet?.sheets ?? [];
  const activeSheet = sheets.find((s) => s.id === activeSheetId) ?? sheets[0];

  async function copyLink() {
    const url = `${window.location.origin}/datasets/e-tablolar/${id}`;
    if (await copyToClipboard(url)) toast.success(tr.spreadsheets.detail.linkCopied);
    else toast.error(tr.spreadsheets.detail.linkCopyFailed);
  }

  function selectSheet(sheetId: string) {
    if (sheetId === activeSheet?.id) return;
    if (dirty) setPendingSheetId(sheetId);
    else setActiveSheetId(sheetId);
  }

  return (
    <AppShell>
      <button
        type="button"
        onClick={() => guard.requestNavigation(LIST_PATH)}
        className="cursor-pointer text-sm font-semibold text-app-muted hover:text-app-text hover:underline"
      >
        {'←'} {tr.spreadsheets.detail.back}
      </button>

      {spreadsheetQuery.isPending ? (
        <p className="mt-6 text-sm text-app-muted">{tr.spreadsheets.detail.loading}</p>
      ) : !spreadsheet ? (
        <p className="mt-6 text-sm text-app-danger">
          {spreadsheetQuery.error instanceof ApiError && spreadsheetQuery.error.status === 404
            ? tr.spreadsheets.detail.notFound
            : tr.spreadsheets.detail.loadError}
        </p>
      ) : (
        <>
          <div className="mt-3 flex items-center gap-2">
            <h1 className="text-xl font-bold text-app-text">{spreadsheet.name}</h1>
            {canEdit && (
              <IconActionButton
                icon={Pencil}
                tooltip={tr.spreadsheets.detail.renameTooltip}
                onClick={() => setRenameOpen(true)}
              />
            )}
            <IconActionButton
              icon={Link2}
              tooltip={tr.spreadsheets.detail.copyLinkTooltip}
              onClick={() => void copyLink()}
            />
            <PageHelp text={tr.help.spreadsheetDetail} />
          </div>
          <p className="mb-4 text-sm text-app-muted">
            {tr.spreadsheets.detail.meta(spreadsheet.originalFileName, spreadsheet.createdByName)}
            {!canEdit && ` · ${tr.spreadsheets.detail.readOnly}`}
          </p>

          {activeSheet && (
            <SpreadsheetSheetEditor
              key={activeSheet.id}
              spreadsheetId={spreadsheet.id}
              sheet={activeSheet}
              canEdit={canEdit}
              onDirtyChange={handleDirtyChange}
            />
          )}

          {sheets.length > 1 && (
            <div className="mt-2 flex flex-wrap gap-1 border-t border-app-border pt-2">
              {sheets.map((sheet) => (
                <button
                  key={sheet.id}
                  type="button"
                  onClick={() => selectSheet(sheet.id)}
                  className={clsx(
                    'rounded-b-lg px-3 py-1.5 text-sm font-medium',
                    sheet.id === activeSheet?.id
                      ? 'bg-app-surface text-app-brand shadow-sm ring-1 ring-app-border'
                      : 'text-app-muted hover:bg-app-bg hover:text-app-text',
                  )}
                >
                  {sheet.name}
                </button>
              ))}
            </div>
          )}

          {renameOpen && (
            <RenameSpreadsheetModal
              spreadsheet={spreadsheet}
              onClose={() => setRenameOpen(false)}
            />
          )}
        </>
      )}

      {pendingSheetId && (
        <ConfirmModal
          title={tr.spreadsheets.toolbar.discardConfirmTitle}
          message={tr.spreadsheets.unsavedSheetConfirm}
          confirmLabel={tr.spreadsheets.toolbar.discard}
          variant="danger"
          onConfirm={() => {
            setActiveSheetId(pendingSheetId);
            setPendingSheetId(null);
            setDirty(false);
          }}
          onCancel={() => setPendingSheetId(null)}
        />
      )}

      {guard.pendingPath && (
        <ConfirmModal
          title={tr.spreadsheets.toolbar.discardConfirmTitle}
          message={tr.spreadsheets.unsavedLeaveConfirm}
          confirmLabel={tr.spreadsheets.toolbar.discard}
          variant="danger"
          onConfirm={guard.confirmNavigation}
          onCancel={guard.cancelNavigation}
        />
      )}
    </AppShell>
  );
}
