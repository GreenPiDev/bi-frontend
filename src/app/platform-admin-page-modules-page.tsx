import { tr } from '../i18n/tr';
import { AppShell } from './app-shell';
import { PlatformAdminPageModules } from './platform-admin-page-modules';

export function PlatformAdminPageModulesPage() {
  return (
    <AppShell>
      <h1 className="text-xl font-bold text-app-text">{tr.platformAdmin.pageModulesTitle}</h1>
      <p className="mt-1 text-sm text-app-muted">{tr.platformAdmin.pageModulesSubtitle}</p>
      <PlatformAdminPageModules />
    </AppShell>
  );
}
