import { useState } from 'react';
import { Modal } from './modal';

interface TruncatedTextProps {
  text: string;
  /** stock-history-page.tsx'teki "Açıklama" kolonuyla ayni varsayilan (40 karakter). */
  limit?: number;
  /** Sinir asilinca acilan modalin basligi. */
  modalTitle: string;
}

/** Uzun metinleri tabloda kisaltip tiklaninca tam metni bir modalda gosteren genel
 * bilesen - stock-history-page.tsx'teki NoteCell deseninin (sayfaya ozel, tekrar
 * kullanilamiyordu) tekrar kullanilabilir hali. */
export function TruncatedText({ text, limit = 40, modalTitle }: TruncatedTextProps) {
  const [open, setOpen] = useState(false);
  if (text.length <= limit) {
    return <>{text}</>;
  }
  return (
    <>
      <button
        type="button"
        className="cursor-pointer text-left text-app-text hover:text-app-brand"
        onClick={() => setOpen(true)}
      >
        {`${text.slice(0, limit)}...`}
      </button>
      {open && (
        <Modal title={modalTitle} onClose={() => setOpen(false)} width="sm">
          <p className="text-sm whitespace-pre-wrap text-app-text">{text}</p>
        </Modal>
      )}
    </>
  );
}
