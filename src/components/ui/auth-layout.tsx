import type { ReactNode } from 'react';
import { tr } from '../../i18n/tr';

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-app-surface">
      <div className="hidden flex-[3] flex-col justify-end bg-gradient-to-br from-app-brand to-app-primary-dark p-10 text-white lg:flex">
        <p className="text-xs font-bold tracking-[0.12em] uppercase opacity-80">
          {tr.auth.eyebrow}
        </p>
        <h2 className="mt-3 max-w-sm text-2xl font-semibold text-balance">
          Excel'ini yükle, 5 dakikada dashboard'unu gör.
        </h2>
      </div>
      <div className="flex flex-1 items-center justify-center p-6 lg:flex-[2] lg:p-16">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
