import type { ExportFormat } from './api';

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

// Popup engelleyiciyi atlatmak için sekme, kullanıcı tıklamasıyla senkron olarak
// açılır; blob hazır olunca o sekmenin adresi güncellenir.
export function openBlobInNewTabHandle(): Window | null {
  return window.open('', '_blank');
}

export function loadBlobIntoTabHandle(tabHandle: Window | null, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  if (tabHandle) {
    tabHandle.location.href = url;
  } else {
    // Popup engellendiyse en azından indirmeye düş
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.click();
  }
}

/** Firmalar/Kisiler/Gorusmeler "Disa Aktar" menusunun ortak davranisi -
 * quote-detail-page.tsx'teki PDF onizleme deseniyle ayni: PDF secilince yeni bir
 * sekme ACILIR (popup engelleyiciyi atlatmak icin tiklamayla SENKRON), Excel
 * secilince hicbir sekme acilmaz, direkt indirilir. */
export function openExportPreviewTab(format: ExportFormat): Window | null {
  return format === 'pdf' ? openBlobInNewTabHandle() : null;
}

export function resolveExportResult(
  format: ExportFormat,
  tabHandle: Window | null,
  blob: Blob,
  fileName: string,
): void {
  if (format === 'pdf') {
    loadBlobIntoTabHandle(tabHandle, blob);
  } else {
    downloadBlob(blob, fileName);
  }
}
