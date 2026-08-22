import { AppShell } from './app-shell';
import { useAuditLogsQuery } from '../features/audit/use-audit-logs';
import { tr } from '../i18n/tr';

const dateFormatter = new Intl.DateTimeFormat('tr-TR', {
  dateStyle: 'short',
  timeStyle: 'short',
});

const actionLabels: Record<string, string> = {
  CREATE: 'Oluşturdu',
  UPDATE: 'Güncelledi',
  DELETE: 'Sildi',
  UPLOAD: 'Yükledi',
  INVITE: 'Davet Etti',
  UPDATE_ROLE: 'Rol Değiştirdi',
};

const entityLabels: Record<string, string> = {
  Dashboard: 'Pano',
  Widget: 'Widget',
  Dataset: 'Veri Kümesi',
  DataSource: 'Veri Kaynağı',
  User: 'Kullanıcı',
  Invitation: 'Davet',
};

export function SettingsPage() {
  const auditLogsQuery = useAuditLogsQuery();

  return (
    <AppShell>
      <h1 className="text-xl font-bold text-app-text">{tr.settings.title}</h1>
      <p className="text-sm text-app-muted">{tr.settings.subtitle}</p>

      <section className="mt-6 rounded-xl border border-app-border bg-app-surface p-4">
        <h2 className="mb-1 text-base font-bold text-app-text">{tr.settings.audit.title}</h2>
        <p className="mb-4 text-sm text-app-muted">{tr.settings.audit.subtitle}</p>

        {auditLogsQuery.isPending && (
          <p className="text-sm text-app-muted">{tr.settings.audit.loading}</p>
        )}
        {auditLogsQuery.data && auditLogsQuery.data.length === 0 && (
          <p className="text-sm text-app-muted">{tr.settings.audit.empty}</p>
        )}
        {auditLogsQuery.data && auditLogsQuery.data.length > 0 && (
          <div className="overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-app-border text-xs uppercase text-app-muted">
                <tr>
                  <th className="whitespace-nowrap px-3 py-2">{tr.settings.audit.userColumn}</th>
                  <th className="whitespace-nowrap px-3 py-2">{tr.settings.audit.actionColumn}</th>
                  <th className="whitespace-nowrap px-3 py-2">{tr.settings.audit.entityColumn}</th>
                  <th className="whitespace-nowrap px-3 py-2">{tr.settings.audit.dateColumn}</th>
                </tr>
              </thead>
              <tbody>
                {auditLogsQuery.data.map((log) => (
                  <tr key={log.id} className="border-b border-app-border last:border-0">
                    <td className="whitespace-nowrap px-3 py-2 text-app-text">
                      {log.userName}
                      <span className="ml-1 text-app-muted">({log.userEmail})</span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-app-text">
                      {actionLabels[log.action] ?? log.action}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-app-text">
                      {entityLabels[log.entity] ?? log.entity}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-app-muted">
                      {dateFormatter.format(new Date(log.createdAt))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AppShell>
  );
}
