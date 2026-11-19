import { useQuery } from '@tanstack/react-query';
import { CircleAlert, Download, FileText, ExternalLink } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { PublicPageShell } from '../components/public-page-shell';
import { tr } from '../i18n/tr';
import { ApiError, getPublicShare, publicShareFileUrl } from '../lib/api';

const dateFormatter = new Intl.DateTimeFormat('tr-TR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'SHARE_REVOKED') return tr.publicShare.revokedMessage;
    if (error.code === 'SHARE_EXPIRED') return tr.publicShare.expiredMessage;
  }
  return tr.publicShare.notFoundMessage;
}

const LINK_BUTTON_BASE =
  'inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors';

/** Kimlik dogrulamasiz paylasim linki sayfasi (bkz. docs/VARSAYIMLAR.md V87) -
 * sistemin kullanicisi olmayan kisi buradan paylasilan PDF'i acar/indirir. */
export function PublicSharePage() {
  const { token = '' } = useParams();
  const shareQuery = useQuery({
    queryKey: ['public-share', token],
    queryFn: () => getPublicShare(token),
    enabled: Boolean(token),
    retry: false,
  });

  if (shareQuery.isPending) {
    return (
      <PublicPageShell footerText={tr.publicShare.poweredByFooter}>
        <p className="text-center text-sm text-app-muted">{tr.common.loading}</p>
      </PublicPageShell>
    );
  }

  if (shareQuery.isError) {
    return (
      <PublicPageShell footerText={tr.publicShare.poweredByFooter}>
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <CircleAlert className="h-10 w-10 text-app-danger" />
          <p className="text-sm text-app-muted">{errorMessage(shareQuery.error)}</p>
        </div>
      </PublicPageShell>
    );
  }

  const share = shareQuery.data;
  return (
    <PublicPageShell
      footerText={tr.publicShare.poweredByFooter}
      logoUrl={share.tenantLogoDataUrl}
      tenantName={share.tenantName}
    >
      <div className="flex flex-col items-center gap-4 text-center">
        <FileText className="h-12 w-12 text-app-brand" />
        <p className="text-sm text-app-muted">
          {tr.publicShare.sharedBy(share.tenantName, share.sharedByName)}
        </p>
        <h1 className="text-lg font-bold break-words text-app-text">{share.title}</h1>
        <p className="text-xs break-all text-app-muted">{share.fileName}</p>
        <div className="mt-2 flex w-full flex-col gap-3 sm:flex-row">
          <a
            href={publicShareFileUrl(token, false)}
            target="_blank"
            rel="noreferrer"
            className={`${LINK_BUTTON_BASE} bg-app-brand text-white hover:bg-app-brand-dark`}
          >
            <ExternalLink className="h-4 w-4" />
            {tr.publicShare.viewButton}
          </a>
          <a
            href={publicShareFileUrl(token, true)}
            className={`${LINK_BUTTON_BASE} border border-app-brand text-app-brand hover:bg-app-brand/10`}
          >
            <Download className="h-4 w-4" />
            {tr.publicShare.downloadButton}
          </a>
        </div>
        {share.expiresAt && (
          <p className="text-xs text-app-muted">
            {tr.publicShare.expiresAt(dateFormatter.format(new Date(share.expiresAt)))}
          </p>
        )}
      </div>
    </PublicPageShell>
  );
}
