import { PageHelp } from '../components/ui/page-help';
import { tr } from '../i18n/tr';
import { AppShell } from './app-shell';
import { PlatformAdminPageModules } from './platform-admin-page-modules';

export function PlatformAdminPageModulesPage() {
  return (
    <AppShell>
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-bold text-app-text">{tr.platformAdmin.pageModulesTitle}</h1>
        <PageHelp text={tr.help.platformAdminPageModules} />
      </div>
      <p className="mt-1 text-sm text-app-muted">{tr.platformAdmin.pageModulesSubtitle}</p>
      <PlatformAdminPageModules />
    </AppShell>
  );
}
