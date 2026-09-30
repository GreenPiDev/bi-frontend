import { clsx } from 'clsx';
import { useRef, useState, type ChangeEvent } from 'react';
import { Button } from './button';
import { ConfirmModal } from './confirm-modal';

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_SIZE_BYTES = 1.5 * 1024 * 1024;

interface ImageUploadFieldProps {
  label: string;
  imageUrl: string | null;
  uploadLabel: string;
  replaceLabel: string;
  removeLabel: string;
  uploadingLabel: string;
  noImageLabel: string;
  unsupportedTypeMessage: string;
  tooLargeMessage: string;
  removeConfirmTitle: string;
  removeConfirmMessage: string;
  isUploading: boolean;
  isRemoving?: boolean;
  onUpload: (file: File) => void;
  onRemove: () => void;
  onError: (message: string) => void;
  /** 'cover' (varsayilan) kapak/kapanis gibi tam kare/dikdortgen fotograflar icin
   * kutuyu kirparak doldurur; 'contain' logo gibi kendi oran/beyaz alanini koruyup
   * kutuya sigdirilmesi gereken gorseller icin - kirpma olmaz. */
  fit?: 'cover' | 'contain';
}

/** 3 sablon gorseli (logo/kapak/kapanis) icin genellestirilmis yukleme alani -
 * profile-page.tsx#AvatarSection ile ayni desen (secilince aninda yukler, tip/boyut
 * dogrulamasi client'ta), ama daire yerine dikdortgen onizleme (kapak/kapanis gorseli
 * portre oranli oldugu icin). Mevcut avatar/sirket-logosu bilesenlerine dokunulmadi. */
export function ImageUploadField({
  label,
  imageUrl,
  uploadLabel,
  replaceLabel,
  removeLabel,
  uploadingLabel,
  noImageLabel,
  unsupportedTypeMessage,
  tooLargeMessage,
  removeConfirmTitle,
  removeConfirmMessage,
  isUploading,
  isRemoving,
  onUpload,
  onRemove,
  onError,
  fit = 'cover',
}: ImageUploadFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [removing, setRemoving] = useState(false);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      onError(unsupportedTypeMessage);
      return;
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      onError(tooLargeMessage);
      return;
    }
    onUpload(file);
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-semibold text-app-muted">{label}</span>
      <div className="flex items-center gap-4">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={label}
            className={clsx(
              'h-24 w-40 rounded-lg border border-app-border',
              fit === 'contain' ? 'bg-white object-contain p-2' : 'object-cover',
            )}
          />
        ) : (
          <div className="flex h-24 w-40 items-center justify-center rounded-lg border border-dashed border-app-border text-xs text-app-muted">
            {noImageLabel}
          </div>
        )}
        <div className="flex flex-col gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {isUploading ? uploadingLabel : imageUrl ? replaceLabel : uploadLabel}
            </Button>
            {imageUrl && (
              <Button type="button" variant="danger" onClick={() => setRemoving(true)}>
                {removeLabel}
              </Button>
            )}
          </div>
        </div>
      </div>
      {removing && (
        <ConfirmModal
          title={removeConfirmTitle}
          message={removeConfirmMessage}
          confirmLabel={removeLabel}
          isPending={Boolean(isRemoving)}
          onConfirm={() => {
            onRemove();
            setRemoving(false);
          }}
          onCancel={() => setRemoving(false)}
        />
      )}
    </div>
  );
}
