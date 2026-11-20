import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '../../components/ui/button';
import { FileDropzone } from '../../components/ui/file-dropzone';
import { FormError } from '../../components/ui/form-error';
import { Modal } from '../../components/ui/modal';
import { TextField } from '../../components/ui/text-field';
import { useToast } from '../../components/ui/toast-context';
import { ApiError, type SpreadsheetDetail } from '../../lib/api';
import { tr } from '../../i18n/tr';
import { useUploadSpreadsheetMutation } from './use-spreadsheets';

const MAX_FILE_BYTES = 10 * 1024 * 1024;

const uploadFormSchema = z.object({
  name: z.string().trim().max(200),
  file: z
    .instanceof(File, { message: tr.spreadsheets.upload.fileRequired })
    .nullable()
    .refine((file) => file !== null, tr.spreadsheets.upload.fileRequired)
    .refine((file) => !file || file.size <= MAX_FILE_BYTES, tr.spreadsheets.upload.fileTooLarge),
});
type UploadFormInput = z.input<typeof uploadFormSchema>;
type UploadFormValues = z.output<typeof uploadFormSchema>;

interface SpreadsheetUploadModalProps {
  onClose: () => void;
  onUploaded: (spreadsheet: SpreadsheetDetail) => void;
}

export function SpreadsheetUploadModal({ onClose, onUploaded }: SpreadsheetUploadModalProps) {
  const toast = useToast();
  const uploadMutation = useUploadSpreadsheetMutation();
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<UploadFormInput, unknown, UploadFormValues>({
    resolver: zodResolver(uploadFormSchema),
    defaultValues: { name: '', file: null },
  });

  const onSubmit = handleSubmit((values) => {
    if (!values.file) return;
    uploadMutation.mutate(
      { file: values.file, name: values.name || undefined },
      {
        onSuccess: (spreadsheet) => {
          toast.success(tr.spreadsheets.upload.success);
          onUploaded(spreadsheet);
        },
      },
    );
  });

  const errorMessage =
    uploadMutation.error instanceof ApiError
      ? uploadMutation.error.message
      : uploadMutation.error
        ? tr.spreadsheets.upload.error
        : undefined;

  return (
    <Modal
      title={tr.spreadsheets.upload.title}
      subtitle={tr.spreadsheets.upload.subtitle}
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            {tr.spreadsheets.upload.cancel}
          </Button>
          <Button type="submit" form="spreadsheet-upload-form" disabled={uploadMutation.isPending}>
            {uploadMutation.isPending
              ? tr.spreadsheets.upload.submitting
              : tr.spreadsheets.upload.submit}
          </Button>
        </div>
      }
    >
      <form id="spreadsheet-upload-form" onSubmit={onSubmit} className="flex flex-col gap-4">
        <div>
          <span className="mb-1 block text-sm font-medium text-app-text">
            {tr.spreadsheets.upload.fileLabel}
          </span>
          <Controller
            control={control}
            name="file"
            render={({ field }) => (
              <FileDropzone
                file={field.value}
                onFileSelect={field.onChange}
                accept=".xlsx,.csv"
                disabled={uploadMutation.isPending}
              />
            )}
          />
          {errors.file?.message && (
            <p className="mt-1 text-xs text-app-danger">{errors.file.message}</p>
          )}
        </div>
        <TextField
          label={tr.spreadsheets.upload.nameLabel}
          placeholder={tr.spreadsheets.upload.namePlaceholder}
          error={errors.name?.message}
          {...register('name')}
        />
        {errorMessage && <FormError message={errorMessage} />}
      </form>
    </Modal>
  );
}
