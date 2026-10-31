import { tr } from '../../i18n/tr';

export function SiteFooter() {
  const { footer } = tr.landing;
  return (
    <footer className="py-10">
      <div className="mx-auto flex max-w-[96rem] flex-col items-center gap-4 px-6 lg:px-12 text-center sm:flex-row sm:justify-between sm:text-left">
        <div className="flex items-center gap-2">
          <img src="/minik-logo.png" alt="" className="h-7 w-auto" />
          <span className="landing-display text-lg font-semibold text-white">
            {tr.common.appName}
          </span>
        </div>
        <p className="text-xs text-zinc-500">{footer.rights(new Date().getFullYear())}</p>
      </div>
    </footer>
  );
}
