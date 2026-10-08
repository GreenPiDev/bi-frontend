import { Download } from 'lucide-react';
import { tr } from '../../i18n/tr';

interface SampleTemplateNoteProps {
  href: string;
  fileName: string;
}

/** Tum Excel ice aktarma ekranlarinda (firma/kisi/gorusme/urun/teklif) ayni
 * resmi bilgi notu + ornek sablon indirme linki - tek yerden yonetilir. */
export function SampleTemplateNote({ href, fileName }: SampleTemplateNoteProps) {
  return (
    <div className="mt-3 flex flex-col gap-2 rounded-lg border border-app-border bg-app-surface px-4 py-3">
      <p className="text-sm text-app-muted text-justify">{tr.crm.sampleTemplate.description}</p>
      <a
        href={href}
        download={fileName}
        className="flex w-fit items-center gap-1.5 text-sm font-semibold text-app-primary hover:underline"
      >
        <Download className="h-4 w-4" aria-hidden="true" />
        {tr.crm.sampleTemplate.downloadButton}
      </a>
    </div>
  );
}
