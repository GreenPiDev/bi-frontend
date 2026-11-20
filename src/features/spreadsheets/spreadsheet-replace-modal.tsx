import { useState } from 'react';
import { Button } from '../../components/ui/button';
import { FileDropzone } from '../../components/ui/file-dropzone';
import { FormError } from '../../components/ui/form-error';
import { Modal } from '../../components/ui/modal';
import { useToast } from '../../components/ui/toast-context';
import { ApiError } from '../../lib/api';
import { tr } from '../../i18n/tr';
import { useReplaceSpreadsheetMutation } from './use-spreadsheets';

const MAX_FILE_BYTES = 10 * 1024 * 1024;

interface SpreadsheetReplaceModalProps {
  spreadsheetId: string;
  spreadsheetName: string;
  onClose: () => void;
}

export function SpreadsheetReplaceModal({
  spreadsheetId,
  spreadsheetName,
  onClose,
}: SpreadsheetReplaceModalProps) {
  const toast = useToast();
  const mutation = useReplaceSpreadsheetMutation(spreadsheetId);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | undefined>(undefined);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!file) return setFileError(tr.spreadsheets.upload.fileRequired);
    if (file.size > MAX_FILE_BYTES) return setFileError(tr.spreadsheets.upload.fileTooLarge);
    setFileError(undefined);
    mutation.mutate(file, {
      onSuccess: () => {
        toast.success(tr.spreadsheets.replace.success);
        onClose();
      },
    });
  }

  const errorMessage =
    mutation.error instanceof ApiError
      ? mutation.error.message
      : mutation.error
        ? tr.spreadsheets.replace.error
        : undefined;

  return (
    <Modal
      title={tr.spreadsheets.replace.title}
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            {tr.spreadsheets.upload.cancel}
          </Button>
          <Button type="submit" form="spreadsheet-replace-form" disabled={mutation.isPending}>
            {mutation.isPending
              ? tr.spreadsheets.replace.submitting
              : tr.spreadsheets.replace.submit}
          </Button>
        </div>
      }
    >
      <form id="spreadsheet-replace-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div
          role="alert"
          className="rounded-lg border border-app-danger bg-app-danger/10 px-3.5 py-2.5 text-sm text-app-danger"
        >
          {tr.spreadsheets.replace.subtitle(spreadsheetName)}
        </div>
        <div>
          <span className="mb-1 block text-sm font-medium text-app-text">
            {tr.spreadsheets.upload.fileLabel}
          </span>
          <FileDropzone
            file={file}
            onFileSelect={setFile}
            accept=".xlsx,.csv"
            disabled={mutation.isPending}
          />
          {fileError && <p className="mt-1 text-xs text-app-danger">{fileError}</p>}
        </div>
        {errorMessage && <FormError message={errorMessage} />}
      </form>
    </Modal>
  );
}
