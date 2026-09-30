import { ChevronDown, ChevronRight, ListFilter } from 'lucide-react';
import { useState } from 'react';
import { AppShell } from './app-shell';
import { Button } from '../components/ui/button';
import { CircleIconButton } from '../components/ui/circle-icon-button';
import { DateField } from '../components/ui/date-field';
import { Drawer } from '../components/ui/drawer';
import { HorizontalTabPanel, type HorizontalTabItem } from '../components/ui/horizontal-tab-panel';
import { PageHelp } from '../components/ui/page-help';
import { Select } from '../components/ui/select';
import { Pagination, Table, type TableColumn } from '../components/ui/table';
import { AlertsSection } from '../features/alerts/alerts-section';
import { hasPermission } from '../features/auth/permissions';
import { useMeQuery } from '../features/auth/use-auth';
import { useAuditLogsQuery } from '../features/audit/use-audit-logs';
import type { AuditLogEntry } from '../lib/api';
import { CrmSettingsSection } from '../features/crm/crm-settings-section';
import { useIsModuleEnabled } from '../features/crm/use-tenant-modules';
import { ActionPermissionsSection } from '../features/roles/action-permissions-section';
import { PageAccessMatrixSection } from '../features/roles/page-access-matrix-section';
import { RolesSettingsSection } from '../features/roles/roles-settings-section';
import { UsersSettingsSection } from '../features/roles/users-settings-section';
import { useUsersQuery } from '../features/roles/use-users';
import { ReportsSection } from '../features/reports/reports-section';
import { CacheSection } from '../features/settings/cache-section';
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
  ProductPrice: 'Ürün Fiyatı',
  ProductList: 'Ürün Listesi',
  ProductCategoryOption: 'Ürün Kategorisi Seçeneği',
  StockItem: 'Stok',
  PurchaseOrder: 'Satın Alma Siparişi',
  Account: 'Firma',
  Contact: 'Kişi',
  Interaction: 'Görüşme',
  InteractionTypeOption: 'Görüşme Türü Seçeneği',
  Opportunity: 'Fırsat',
  Quote: 'Teklif',
  QuoteTemplate: 'Teklif Şablonu',
  Project: 'Proje',
  CalendarEvent: 'Takvim Etkinliği',
  PostSaleCase: 'Satış Sonrası Destek',
  Message: 'Mesaj',
  Tenant: 'Şirket',
  TenantSetting: 'Şirket Ayarı',
  SectorOption: 'Sektör Seçeneği',
  BrandOption: 'Marka Seçeneği',
  UnitOption: 'Birim Seçeneği',
  IbanOption: 'IBAN Seçeneği',
  PaymentMethodOption: 'Ödeme Yöntemi Seçeneği',
  TitleOption: 'Unvan Seçeneği',
  DepartmentOption: 'Departman Seçeneği',
  ReminderTypeOption: 'Hatırlatma Türü Seçeneği',
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
      <CacheSection />
    </div>
  );
}

const AUDIT_LOG_PAGE_SIZE = 25;

function AuditLogTab() {
  const [page, setPage] = useState(1);
  const [userId, setUserId] = useState('');
  const [entity, setEntity] = useState('');
  const [action, setAction] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const hasActiveFilter =
    Boolean(userId) || Boolean(entity) || Boolean(action) || Boolean(from) || Boolean(to);
  const usersQuery = useUsersQuery();
  const auditLogsQuery = useAuditLogsQuery({
    page,
    pageSize: AUDIT_LOG_PAGE_SIZE,
    userId: userId || undefined,
    entity: entity || undefined,
    action: action || undefined,
    from: from || undefined,
    to: to || undefined,
  });
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function goToPage(newPage: number) {
    setExpandedId(null);
    setPage(newPage);
  }

  function resetFilters() {
    setPage(1);
    setUserId('');
    setEntity('');
    setAction('');
    setFrom('');
    setTo('');
  }

  const columns: TableColumn<AuditLogEntry>[] = [
    {
      key: 'toggle',
      header: '',
      className: 'w-px',
      render: (log) => {
        const isExpanded = expandedId === log.id;
        return (
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
            className="flex items-center rounded-lg p-1 hover:bg-app-bg"
          >
            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
        );
      },
    },
    {
      key: 'user',
      header: tr.settings.audit.userColumn,
      className: 'whitespace-nowrap',
      render: (log) => (
        <>
          {log.userName}
          <span className="ml-1 text-app-muted">({log.userEmail})</span>
        </>
      ),
    },
    {
      key: 'action',
      header: tr.settings.audit.actionColumn,
      className: 'whitespace-nowrap',
      render: (log) => actionLabels[log.action] ?? log.action,
    },
    {
      key: 'entity',
      header: tr.settings.audit.entityColumn,
      className: 'whitespace-nowrap',
      render: (log) => entityLabels[log.entity] ?? log.entity,
    },
    {
      key: 'createdAt',
      header: tr.settings.audit.dateColumn,
      className: 'whitespace-nowrap',
      render: (log) => dateFormatter.format(new Date(log.createdAt)),
    },
  ];

  return (
    <section>
      <div className="mb-4 flex justify-end">
        <CircleIconButton
          icon={ListFilter}
          tooltip={tr.settings.audit.filterButton}
          onClick={() => setDrawerOpen(true)}
        >
          {hasActiveFilter && (
            <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 ring-2 ring-app-surface" />
          )}
        </CircleIconButton>
      </div>
      <Table
        columns={columns}
        data={auditLogsQuery.data?.data ?? []}
        keyField={(log) => log.id}
        isLoading={auditLogsQuery.isPending}
        loadingMessage={tr.settings.audit.loading}
        emptyMessage={tr.settings.audit.empty}
        onRowClick={(log) => setExpandedId(expandedId === log.id ? null : log.id)}
        isRowExpanded={(log) => expandedId === log.id}
        renderExpandedRow={(log) => <AuditLogMetaDetail meta={log.meta} />}
      />
      {auditLogsQuery.data && auditLogsQuery.data.data.length > 0 && (
        <Pagination
          page={auditLogsQuery.data.meta.page}
          totalPages={auditLogsQuery.data.meta.totalPages}
          total={auditLogsQuery.data.meta.total}
          onPrevious={() => goToPage(page - 1)}
          onNext={() => goToPage(page + 1)}
        />
      )}
      {drawerOpen && (
        <Drawer title={tr.settings.audit.filterDrawer.title} onClose={() => setDrawerOpen(false)}>
          <div className="flex flex-col gap-4">
            <Select
              label={tr.settings.audit.filterDrawer.userLabel}
              value={userId}
              onChange={(event) => {
                setPage(1);
                setUserId(event.target.value);
              }}
              options={(usersQuery.data ?? []).map((user) => ({
                value: user.id,
                label: user.name,
              }))}
              placeholder={tr.settings.audit.filterDrawer.userPlaceholder}
              clearable
              onClear={() => {
                setPage(1);
                setUserId('');
              }}
            />
            <Select
              label={tr.settings.audit.filterDrawer.entityLabel}
              value={entity}
              onChange={(event) => {
                setPage(1);
                setEntity(event.target.value);
              }}
              options={Object.entries(entityLabels).map(([value, label]) => ({ value, label }))}
              placeholder={tr.settings.audit.filterDrawer.entityPlaceholder}
              clearable
              onClear={() => {
                setPage(1);
                setEntity('');
              }}
            />
            <Select
              label={tr.settings.audit.filterDrawer.actionLabel}
              value={action}
              onChange={(event) => {
                setPage(1);
                setAction(event.target.value);
              }}
              options={Object.entries(actionLabels).map(([value, label]) => ({ value, label }))}
              placeholder={tr.settings.audit.filterDrawer.actionPlaceholder}
              clearable
              onClear={() => {
                setPage(1);
                setAction('');
              }}
            />
            <DateField
              label={tr.settings.audit.filterDrawer.fromLabel}
              value={from}
              onChange={(value) => {
                setPage(1);
                setFrom(value);
              }}
              clearable
              onClear={() => {
                setPage(1);
                setFrom('');
              }}
            />
            <DateField
              label={tr.settings.audit.filterDrawer.toLabel}
              value={to}
              onChange={(value) => {
                setPage(1);
                setTo(value);
              }}
              clearable
              onClear={() => {
                setPage(1);
                setTo('');
              }}
            />
            <Button type="button" variant="secondary" onClick={resetFilters}>
              {tr.settings.audit.filterDrawer.reset}
            </Button>
          </div>
        </Drawer>
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
