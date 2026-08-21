import { AppShell } from './app-shell';
import { tr } from '../i18n/tr';

export function HomePage() {
  return (
    <AppShell>
      <div className="rounded-xl border border-app-border bg-app-surface p-8 text-app-muted">
        {tr.shell.dashboardsSoon}
      </div>
    </AppShell>
  );
}
