import type { ExportFormat } from './api';
import { tr } from '../i18n/tr';

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

// Sekme "about:blank" olarak acilip PDF hazir oluncaya kadar bos gorunup
// kullanicinin "bozuk" diye sekmeyi kapatmasina yol aciyordu - bu yuzden hemen
// kendi dongulu bir yukleniyor ekrani yaziliyor, blob hazir olunca location
// degisince bu ekranin yerini PDF alir.
const LOADING_PAGE_HTML = `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8" />
<title>${tr.common.pdfPreviewLoadingTitle}</title>
<style>
  :root { color-scheme: light dark; }
  body {
    margin: 0;
    height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    font-family: system-ui, -apple-system, sans-serif;
    background: #f8fafc;
    color: #1e293b;
  }
  @media (prefers-color-scheme: dark) {
    body { background: #0f172a; color: #e2e8f0; }
  }
  .spinner {
    width: 36px;
    height: 36px;
    border: 4px solid rgba(100, 116, 139, 0.25);
    border-top-color: #2563eb;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  p { margin: 0; font-size: 14px; }
</style>
</head>
<body>
  <div class="spinner"></div>
  <p>${tr.common.pdfPreviewLoadingMessage}</p>
</body>
</html>`;

// Popup engelleyiciyi atlatmak için sekme, kullanıcı tıklamasıyla senkron olarak
// açılır; blob hazır olunca o sekmenin adresi güncellenir.
export function openBlobInNewTabHandle(): Window | null {
  const tabHandle = window.open('', '_blank');
  if (tabHandle) {
    tabHandle.document.open();
    tabHandle.document.write(LOADING_PAGE_HTML);
    tabHandle.document.close();
  }
  return tabHandle;
}

// Teklif PDF export'lari (bkz. exports.controller.ts) artik blob: URL yerine
// dogrudan backend'in gercek GET ucuna yonlendiriyor - Chrome'un PDF
// goruntuleyicisi blob: URL'lerde "kaydet" tiklaninca dosya adini PDF'in
// Info/Title metadata'sindan DEGIL, blob'un kendi rastgele UUID'sinden
// aliyor (denendi, calismadi); gercek bir HTTP kaynagi olarak acilinca
// Content-Disposition'daki filename dogru kullaniliyor.
export function openUrlInNewTab(url: string): void {
  const tabHandle = window.open(url, '_blank');
  if (!tabHandle) {
    // Popup engellendiyse en azindan ayni sekmede ac.
    window.location.href = url;
  }
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
