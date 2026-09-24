import { clsx } from 'clsx';
import { UploadCloud, X } from 'lucide-react';
import { useId, useRef, useState } from 'react';
import type { DragEvent } from 'react';
import { tr } from '../../i18n/tr';

interface FileDropzoneProps {
  file: File | null;
  onFileSelect: (file: File | null) => void;
  accept?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export function FileDropzone({
  file,
  onFileSelect,
  accept,
  disabled,
  className,
  id,
}: FileDropzoneProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  function openPicker() {
    if (!disabled) {
      inputRef.current?.click();
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragOver(false);
    if (disabled) {
      return;
    }
    const dropped = event.dataTransfer.files?.[0];
    if (dropped) {
      onFileSelect(dropped);
    }
  }

  return (
    <div className={className}>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={accept}
        disabled={disabled}
        onChange={(event) => onFileSelect(event.target.files?.[0] ?? null)}
        className="hidden"
      />
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        onClick={openPicker}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openPicker();
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) {
            setIsDragOver(true);
          }
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={clsx(
          'flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors',
          disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
          isDragOver
            ? 'border-app-brand bg-app-brand/5'
            : 'border-app-border bg-app-surface hover:border-app-brand/60',
        )}
      >
        <UploadCloud className="h-8 w-8 text-app-muted" />
        <p className="text-sm font-medium text-app-text">{tr.common.fileDropzone.instructions}</p>
        {file && (
          <div className="mt-2 flex items-center gap-2 rounded-full bg-app-brand/10 px-3 py-1 text-xs font-semibold text-app-brand">
            <span>{tr.common.fileDropzone.selectedFile(file.name)}</span>
            <button
              type="button"
              aria-label={tr.common.fileDropzone.removeAria}
              onClick={(event) => {
                event.stopPropagation();
                onFileSelect(null);
              }}
              className="cursor-pointer rounded-full hover:opacity-70"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
