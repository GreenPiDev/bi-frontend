import { AppShell } from './app-shell';
import { HorizontalTabPanel, type HorizontalTabItem } from '../components/ui/horizontal-tab-panel';
import { AlertsSection } from '../features/alerts/alerts-section';
import { hasPermission } from '../features/auth/permissions';
import { useMeQuery } from '../features/auth/use-auth';
import { useAuditLogsQuery } from '../features/audit/use-audit-logs';
import { CrmSettingsSection } from '../features/crm/crm-settings-section';
import { useIsModuleEnabled } from '../features/crm/use-tenant-modules';
import { PageAccessMatrixSection } from '../features/roles/page-access-matrix-section';
import { RolesSettingsSection } from '../features/roles/roles-settings-section';
import { UsersSettingsSection } from '../features/roles/users-settings-section';
import { ReportsSection } from '../features/reports/reports-section';
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
  UPDATE_PROFILE: 'Profilini Güncelledi',
  CHANGE_PASSWORD: 'Şifresini Değiştirdi',
};

const entityLabels: Record<string, string> = {
  Dashboard: 'Pano',
  Widget: 'Widget',
  Dataset: 'Veri Kümesi',
  DataSource: 'Veri Kaynağı',
  User: 'Kullanıcı',
  ScheduledReport: 'Zamanlanmış Rapor',
  Alert: 'Alarm',
  Invitation: 'Davet',
  Role: 'Rol',
};

function GeneralTab() {
  return (
    <div className="flex flex-col gap-6">
      <ReportsSection />
      <AlertsSection />
    </div>
  );
}

function AuditLogTab() {
  const auditLogsQuery = useAuditLogsQuery();

  return (
    <section>
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
  );
}

export function SettingsPage() {
  const meQuery = useMeQuery();
  const crmEnabled = useIsModuleEnabled('crm');
  const permissions = meQuery.data?.permissions;
  const canViewTab = (tabKey: string) => hasPermission(permissions, 'settings', 'VIEW', tabKey);

  // Roller/Sayfa Erisimleri sekmelerinin GORUNURLUGU de artik diger sekmeler gibi RBAC
  // (settings/roles, settings/pageAccess VIEW izni) ile kontrol edilir - varsayilan olarak
  // sadece COMPANYADMIN bu izne sahip (bkz. permission.types.ts default bos permissions).
  // Ama bu sekmeler icindeki YAZMA islemleri (rol olustur/sil/izin degistir) backend'de
  // hala sabit CompanyAdminGuard'da - bu yuzden VIEW izni verilen bir role bu ekranlari
  // sadece salt-okunur gorur (bkz. roles-settings-section.tsx / page-access-matrix-section.tsx
  // icindeki isCompanyAdmin kontrolleri).
  const tabs: HorizontalTabItem[] = [
    ...(canViewTab('general')
      ? [{ key: 'general', label: tr.settings.tabs.general, content: <GeneralTab /> }]
      : []),
    ...(crmEnabled && canViewTab('crm')
      ? [{ key: 'crm', label: tr.settings.tabs.crm, content: <CrmSettingsSection /> }]
      : []),
    ...(canViewTab('audit')
      ? [{ key: 'audit', label: tr.settings.tabs.audit, content: <AuditLogTab /> }]
      : []),
    ...(canViewTab('roles')
      ? [{ key: 'roles', label: tr.settings.tabs.roles, content: <RolesSettingsSection /> }]
      : []),
    ...(canViewTab('users')
      ? [{ key: 'users', label: tr.settings.tabs.users, content: <UsersSettingsSection /> }]
      : []),
    ...(canViewTab('pageAccess')
      ? [
          {
            key: 'pageAccess',
            label: tr.settings.tabs.pageAccess,
            content: <PageAccessMatrixSection />,
          },
        ]
      : []),
  ];

  return (
    <AppShell>
      <h1 className="text-xl font-bold text-app-text">{tr.settings.title}</h1>

      <div className="mt-6">
        <HorizontalTabPanel tabs={tabs} queryParam="tab" />
      </div>
    </AppShell>
  );
}
