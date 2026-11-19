import type { ReactNode } from 'react';

/** Kimlik dogrulamasiz public sayfalar (anket yanitlama, paylasim linki) icin
 * bagimsiz, markasiz kabuk - AuthLayout'un login ekranina ait pazarlama gorseli
 * burada uygun degil. Tenant logo setlediyse logosu, yoksa "PiLens" yazisi
 * gosterilir. */
export function PublicPageShell({
  children,
  footerText,
  logoUrl,
  tenantName,
}: {
  children: ReactNode;
  footerText: string;
  logoUrl?: string | null;
  tenantName?: string | null;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center bg-app-bg-muted px-4 py-10 sm:py-16">
      <div className="mb-6 flex items-center justify-center">
        {logoUrl ? (
          <img src={logoUrl} alt={tenantName ?? ''} className="h-10 max-w-[220px] object-contain" />
        ) : (
          <span className="text-lg font-bold tracking-tight text-app-brand">PiLens</span>
        )}
      </div>
      <div className="w-full max-w-xl rounded-2xl border border-app-border bg-app-surface p-6 shadow-sm sm:p-10">
        {children}
      </div>
      <p className="mt-6 text-center text-xs text-app-muted">
        {footerText}{' '}
        <a
          href="https://www.pilens.com.tr"
          target="_blank"
          rel="noreferrer"
          className="underline hover:text-app-brand"
        >
          www.pilens.com.tr
        </a>
      </p>
    </div>
  );
}
