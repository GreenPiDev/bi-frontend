import { ChevronDown, ChevronRight } from 'lucide-react';
import { Fragment, useState } from 'react';
import { AppShell } from './app-shell';
import { HorizontalTabPanel, type HorizontalTabItem } from '../components/ui/horizontal-tab-panel';
import { PageHelp } from '../components/ui/page-help';
import { AlertsSection } from '../features/alerts/alerts-section';
import { hasPermission } from '../features/auth/permissions';
import { useMeQuery } from '../features/auth/use-auth';
import { useAuditLogsQuery } from '../features/audit/use-audit-logs';
import { CrmSettingsSection } from '../features/crm/crm-settings-section';
import { useIsModuleEnabled } from '../features/crm/use-tenant-modules';
import { ActionPermissionsSection } from '../features/roles/action-permissions-section';
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
  CREATE_USER: 'Kullanıcı Oluşturdu',
  RESET_PASSWORD: 'Şifre Sıfırladı',
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
  Role: 'Rol',
  Product: 'Ürün',
  PriceList: 'Fiyat Listesi',
  StockItem: 'Stok',
  PurchaseOrder: 'Satın Alma Siparişi',
};

/** log.meta icindeki bilinen alanlar icin okunabilir etiket - entity'ye gore degil,
 * anahtar ismine gore calisir (ayni anahtar birden fazla entity'de gecebiliyor, orn.
 * "name"), boylece her entity icin ayri bir kolon acmaya gerek kalmiyor. Bilinmeyen
 * anahtarlar oldugu gibi (raw key) gosterilir. */
const META_KEY_LABELS: Record<string, string> = {
  name: 'Ad',
  title: 'Başlık',
  label: 'Etiket',
  value: 'Değer',
  fileName: 'Dosya Adı',
  sizeBytes: 'Boyut (bayt)',
  fieldCount: 'Alan Sayısı',
  productId: 'Ürün ID',
  productName: 'Ürün',
  previousQuantity: 'Önceki Miktar',
  quantity: 'Yeni Miktar',
  orderNumber: 'Sipariş No',
  projectNumber: 'Proje No',
  quoteNumber: 'Teklif No',
  firstName: 'Ad',
  lastName: 'Soyad',
  email: 'E-posta',
  roleIds: "Rol ID'leri",
  previousRoleIds: "Önceki Rol ID'leri",
  newRoleIds: "Yeni Rol ID'leri",
  reassignedUsers: 'Taşınan Kullanıcı Sayısı',
  dashboardId: 'Pano ID',
  widgetId: 'Widget ID',
  cron: 'Zamanlama (cron)',
  operator: 'Operatör',
  threshold: 'Eşik',
  action: 'Alt İşlem',
};

function formatMetaValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (Array.isArray(value)) return value.length > 0 ? value.join(', ') : '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function AuditLogMetaDetail({ meta }: { meta: unknown }) {
  const entries =
    meta && typeof meta === 'object' && !Array.isArray(meta)
      ? Object.entries(meta as Record<string, unknown>)
      : [];

  if (entries.length === 0) {
    return <p className="text-sm text-app-muted">{tr.settings.audit.noDetail}</p>;
  }

  return (
    <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm">
      {entries.map(([key, value]) => (
        <div key={key} className="contents">
          <dt className="text-app-muted">{META_KEY_LABELS[key] ?? key}</dt>
          <dd className="text-app-text">{formatMetaValue(value)}</dd>
        </div>
      ))}
    </dl>
  );
}

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
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
                <th className="w-px px-3 py-2" />
                <th className="whitespace-nowrap px-3 py-2">{tr.settings.audit.userColumn}</th>
                <th className="whitespace-nowrap px-3 py-2">{tr.settings.audit.actionColumn}</th>
                <th className="whitespace-nowrap px-3 py-2">{tr.settings.audit.entityColumn}</th>
                <th className="whitespace-nowrap px-3 py-2">{tr.settings.audit.dateColumn}</th>
              </tr>
            </thead>
            <tbody>
              {auditLogsQuery.data.map((log) => {
                const isExpanded = expandedId === log.id;
                return (
                  <Fragment key={log.id}>
                    <tr
                      onClick={() => setExpandedId(isExpanded ? null : log.id)}
                      className="cursor-pointer border-b border-app-border last:border-0 hover:bg-app-bg"
                    >
                      <td className="px-3 py-2 text-app-muted">
                        <button
                          type="button"
                          aria-label={
                            isExpanded
                              ? tr.settings.audit.detailToggleCollapse
                              : tr.settings.audit.detailToggleExpand
                          }
                          onClick={(event) => {
                            event.stopPropagation();
                            setExpandedId(isExpanded ? null : log.id);
                          }}
                          className="flex items-center rounded-lg p-1 hover:bg-app-surface"
                        >
                          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </button>
                      </td>
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
                    {isExpanded && (
                      <tr className="border-b border-app-border bg-app-bg last:border-0">
                        <td />
                        <td colSpan={4} className="px-3 py-3">
                          <AuditLogMetaDetail meta={log.meta} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
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

  // Roller/Sayfa Erisimleri/Islem Izinleri sekmelerinin GORUNURLUGU de artik diger sekmeler gibi RBAC
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
    ...(canViewTab('actionPermissions')
      ? [
          {
            key: 'actionPermissions',
            label: tr.settings.tabs.actionPermissions,
            content: <ActionPermissionsSection />,
          },
        ]
      : []),
  ];

  return (
    <AppShell>
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-bold text-app-text">{tr.settings.title}</h1>
        <PageHelp text={tr.help.settings} />
      </div>

      <div className="mt-6">
        <HorizontalTabPanel tabs={tabs} queryParam="tab" />
      </div>
    </AppShell>
  );
}
