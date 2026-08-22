import type { ReactNode } from 'react';

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-app-surface">
      <div className="flex flex-1 items-center justify-center p-6 lg:flex-[2] lg:p-16">
        <div className="w-full max-w-sm">{children}</div>
      </div>
      <div className="relative hidden flex-[4] flex-col items-end justify-end overflow-hidden lg:flex">
        <img
          src="/auth-illustration.jpg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-tl from-app-primary-dark/90 via-app-brand/40 to-transparent" />
        <h2 className="relative max-w-sm p-10 text-right text-2xl font-semibold text-balance text-white">
          Excel'ini yükle, 5 dakikada dashboard'unu gör.
        </h2>
      </div>
    </div>
  );
}
