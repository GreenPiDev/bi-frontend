export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001/api/v1';

export type PermissionAction =
  'VIEW' | 'CREATE' | 'UPDATE' | 'DELETE' | 'IMPORT' | 'EXPORT' | 'APPROVE';

/** VIEW ayrica "Sayfa Erisimleri" sekmesinde yonetilir; "Islem Izinleri" matrisinin
 * sutunlarini belirleyen aksiyonlar bunlardir. */
export type CrudPermissionAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'IMPORT' | 'EXPORT' | 'APPROVE';

export interface SafeUserRole {
  id: string;
  name: string;
}

export interface SafeUser {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  roles: SafeUserRole[];
  isPlatformAdmin: boolean;
}

export interface EffectivePermission {
  pageKey: string;
  tabKey: string | null;
  action: PermissionAction;
}

export interface EffectivePermissionSet {
  isCompanyAdmin: boolean;
  permissions: EffectivePermission[];
}

/** /auth/me yanitindaki "su an giris yapmis kullanici" gorunumu - nav filtreleme (G1)
 * bu `permissions` alanini kullanir. */
export interface AuthenticatedUser extends SafeUser {
  permissions: EffectivePermissionSet;
}

export interface UserProfile extends SafeUser {
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: string, message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

interface ApiErrorBody {
  error: { code: string; message: string; details?: unknown };
}

const NO_SILENT_REFRESH_PATHS = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'];

let refreshPromise: Promise<boolean> | null = null;

async function silentRefresh(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
      .then((res) => res.ok)
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

async function doFetch(path: string, init?: RequestInit): Promise<Response> {
  const isFormData = init?.body instanceof FormData;
  return fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...init?.headers,
    },
  });
}

async function throwApiError(response: Response): Promise<never> {
  let body: ApiErrorBody | undefined;
  try {
    body = (await response.json()) as ApiErrorBody;
  } catch {
    body = undefined;
  }
  throw new ApiError(
    body?.error.code ?? 'UNKNOWN_ERROR',
    body?.error.message ?? 'Beklenmeyen bir hata olustu.',
    response.status,
    body?.error.details,
  );
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response = await doFetch(path, init);

  if (response.status === 401 && !NO_SILENT_REFRESH_PATHS.includes(path)) {
    const refreshed = await silentRefresh();
    if (refreshed) {
      response = await doFetch(path, init);
    }
  }

  if (!response.ok) {
    return throwApiError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

export async function getHealth(): Promise<{ status: string; timestamp: string }> {
  return request('/health');
}

export interface LoginInput {
  email: string;
  password: string;
}

export function login(input: LoginInput): Promise<{ user: AuthenticatedUser }> {
  return request('/auth/login', { method: 'POST', body: JSON.stringify(input) });
}

export function refresh(): Promise<{ user: AuthenticatedUser }> {
  return request('/auth/refresh', { method: 'POST' });
}

export function logout(): Promise<{ ok: true }> {
  return request('/auth/logout', { method: 'POST' });
}

export function me(): Promise<AuthenticatedUser> {
  return request('/auth/me');
}

export function getProfile(): Promise<UserProfile> {
  return request('/users/me');
}

export interface UpdateProfileInput {
  name?: string;
  email?: string;
}

export function updateProfile(input: UpdateProfileInput): Promise<UserProfile> {
  return request('/users/me', { method: 'PATCH', body: JSON.stringify(input) });
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export function changePassword(input: ChangePasswordInput): Promise<{ ok: true }> {
  return request('/users/me/password', {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export interface TenantSummary {
  id: string;
  name: string;
  slug: string;
  plan: string;
  createdAt: string;
  adminEmail: string | null;
}

export interface TenantModuleStatus {
  key: string;
  label: string;
  alwaysOn: boolean;
  enabled: boolean;
}

export function getMyTenantModules(): Promise<TenantModuleStatus[]> {
  return request('/tenants/me/modules');
}

export interface PageAccessStatus {
  pageKey: string;
  moduleKeys: string[];
  accessible: boolean;
}

export function getMyPageAccess(): Promise<PageAccessStatus[]> {
  return request('/tenants/me/page-modules');
}

export function getPlatformTenants(): Promise<TenantSummary[]> {
  return request('/platform-admin/tenants');
}

export interface CreateTenantInput {
  tenantName: string;
  adminName: string;
  adminEmail: string;
}

export function createTenant(
  input: CreateTenantInput,
): Promise<{ tenant: TenantSummary; temporaryPassword: string }> {
  return request('/platform-admin/tenants', { method: 'POST', body: JSON.stringify(input) });
}

export function resetTenantAdminPassword(tenantId: string): Promise<{ temporaryPassword: string }> {
  return request(`/platform-admin/tenants/${tenantId}/reset-admin-password`, {
    method: 'POST',
  });
}

export interface ModuleDefinition {
  key: string;
  label: string;
  alwaysOn: boolean;
}

export function getPlatformModuleDefinitions(): Promise<ModuleDefinition[]> {
  return request('/platform-admin/modules');
}

export function getPlatformTenantModules(tenantId: string): Promise<TenantModuleStatus[]> {
  return request(`/platform-admin/tenants/${tenantId}/modules`);
}

export function setPlatformTenantModule(
  tenantId: string,
  moduleKey: string,
  enabled: boolean,
): Promise<TenantModuleStatus[]> {
  return request(`/platform-admin/tenants/${tenantId}/modules/${moduleKey}`, {
    method: 'PATCH',
    body: JSON.stringify({ enabled }),
  });
}

export interface PageModuleAssignment {
  pageKey: string;
  label: string;
  moduleKeys: string[];
}

export function getPlatformPageModules(): Promise<PageModuleAssignment[]> {
  return request('/platform-admin/page-modules');
}

export function setPlatformPageModule(
  pageKey: string,
  moduleKeys: string[],
): Promise<PageModuleAssignment[]> {
  return request(`/platform-admin/page-modules/${pageKey}`, {
    method: 'PATCH',
    body: JSON.stringify({ moduleKeys }),
  });
}

export type DataSourceStatus = 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED';

export interface DataSourceStatusView {
  id: string;
  status: DataSourceStatus;
  errorMessage: string | null;
  datasetId: string | null;
}

export function uploadDatasource(file: File, name?: string): Promise<{ id: string }> {
  const formData = new FormData();
  formData.append('file', file);
  if (name) {
    formData.append('name', name);
  }
  return request('/datasources/upload', { method: 'POST', body: formData });
}

export function getDatasourceStatus(id: string): Promise<DataSourceStatusView> {
  return request(`/datasources/${id}/status`);
}

export function seedDemoDataset(): Promise<{ id: string }> {
  return request('/onboarding/demo-dataset', { method: 'POST' });
}

export function createStarterDashboard(datasetId: string): Promise<{ id: string }> {
  return request('/onboarding/dashboard', {
    method: 'POST',
    body: JSON.stringify({ datasetId }),
  });
}

export interface DatasetSummary {
  id: string;
  name: string;
  rowCount: number;
  lastIngestedAt: string | null;
  createdAt: string;
}

export type DatasetFieldType = 'STRING' | 'NUMBER' | 'DATE' | 'BOOLEAN';
export type DatasetFieldRole = 'DIMENSION' | 'MEASURE' | 'DATE';

export interface DatasetField {
  id: string;
  datasetId: string;
  sourceName: string;
  name: string;
  label: string;
  type: DatasetFieldType;
  role: DatasetFieldRole;
  format: string | null;
  isVisible: boolean;
  ordinal: number;
}

export interface DatasetWithFields extends DatasetSummary {
  fields: DatasetField[];
}

export interface PreviewResult {
  columns: string[];
  rows: unknown[][];
}

export interface UpdateDatasetFieldInput {
  id: string;
  name?: string;
  label?: string;
  type?: DatasetFieldType;
  role?: DatasetFieldRole;
  format?: string | null;
  isVisible?: boolean;
}

export function listDatasets(): Promise<DatasetSummary[]> {
  return request('/datasets');
}

export function getDataset(id: string): Promise<DatasetWithFields> {
  return request(`/datasets/${id}`);
}

export function previewDataset(id: string): Promise<PreviewResult> {
  return request(`/datasets/${id}/preview`, { method: 'POST' });
}

export function updateDatasetFields(
  id: string,
  fields: UpdateDatasetFieldInput[],
): Promise<DatasetWithFields> {
  return request(`/datasets/${id}/fields`, {
    method: 'PATCH',
    body: JSON.stringify({ fields }),
  });
}

export type AggregationType = 'sum' | 'avg' | 'min' | 'max' | 'count' | 'count_distinct';
export type Granularity = 'day' | 'week' | 'month' | 'quarter' | 'year';
export type FilterOperator =
  | 'eq'
  | 'neq'
  | 'in'
  | 'nin'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'between'
  | 'contains'
  | 'is_null'
  | 'is_not_null';

export interface MeasureSpec {
  field: string;
  agg: AggregationType;
  alias: string;
}

export interface DimensionSpec {
  field: string;
  granularity?: Granularity;
}

export interface FilterSpec {
  field: string;
  op: FilterOperator;
  value?: unknown;
}

export interface OrderBySpec {
  field: string;
  dir: 'asc' | 'desc';
}

export interface QuerySpec {
  datasetId: string;
  measures: MeasureSpec[];
  dimensions: DimensionSpec[];
  filters: FilterSpec[];
  orderBy: OrderBySpec[];
  limit?: number;
}

export interface QueryColumn {
  name: string;
  type: DatasetFieldType;
  label: string;
}

export interface QueryResult {
  columns: QueryColumn[];
  rows: unknown[][];
  rowCount: number;
  executionMs: number;
  truncated: boolean;
}

export function runQuery(spec: QuerySpec): Promise<QueryResult> {
  return request('/query', { method: 'POST', body: JSON.stringify(spec) });
}

export function queryRows(spec: QuerySpec): Promise<QueryResult> {
  return request('/query/rows', { method: 'POST', body: JSON.stringify(spec) });
}

export type WidgetType = 'kpi' | 'line' | 'bar' | 'bar_horizontal' | 'pie' | 'table';

export interface WidgetPosition {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Widget {
  id: string;
  dashboardId: string;
  type: WidgetType;
  title: string;
  querySpec: QuerySpec;
  vizOptions: Record<string, unknown>;
  position: WidgetPosition;
  createdAt: string;
}

export interface LayoutItem {
  widgetId: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DashboardSummary {
  id: string;
  name: string;
  description: string | null;
  layout: LayoutItem[];
  filters: unknown[];
  createdById: string;
  createdAt: string;
}

export interface DashboardWithWidgets extends DashboardSummary {
  widgets: Widget[];
}

export interface CreateDashboardInput {
  name: string;
  description?: string;
}

export interface UpdateDashboardInput {
  name?: string;
  description?: string | null;
  layout?: LayoutItem[];
  filters?: unknown[];
}

export interface CreateWidgetInput {
  type: WidgetType;
  title: string;
  querySpec: QuerySpec;
  vizOptions?: Record<string, unknown>;
  position: WidgetPosition;
}

export interface UpdateWidgetInput {
  type?: WidgetType;
  title?: string;
  querySpec?: QuerySpec;
  vizOptions?: Record<string, unknown>;
  position?: WidgetPosition;
}

export function listDashboards(): Promise<DashboardSummary[]> {
  return request('/dashboards');
}

export function getDashboard(id: string): Promise<DashboardWithWidgets> {
  return request(`/dashboards/${id}`);
}

export function createDashboard(input: CreateDashboardInput): Promise<DashboardSummary> {
  return request('/dashboards', { method: 'POST', body: JSON.stringify(input) });
}

export function updateDashboard(
  id: string,
  input: UpdateDashboardInput,
): Promise<DashboardWithWidgets> {
  return request(`/dashboards/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function deleteDashboard(id: string): Promise<void> {
  return request(`/dashboards/${id}`, { method: 'DELETE' });
}

export function createWidget(dashboardId: string, input: CreateWidgetInput): Promise<Widget> {
  return request(`/dashboards/${dashboardId}/widgets`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateWidget(
  dashboardId: string,
  widgetId: string,
  input: UpdateWidgetInput,
): Promise<Widget> {
  return request(`/dashboards/${dashboardId}/widgets/${widgetId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function deleteWidget(dashboardId: string, widgetId: string): Promise<void> {
  return request(`/dashboards/${dashboardId}/widgets/${widgetId}`, { method: 'DELETE' });
}

export interface AuditLogEntry {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  action: string;
  entity: string;
  entityId: string;
  meta: unknown;
  createdAt: string;
}

export function listAuditLogs(): Promise<AuditLogEntry[]> {
  return request('/audit-logs');
}

export type ChatRole = 'user' | 'assistant';

export interface ChatHistoryItem {
  role: ChatRole;
  content: string;
}

export interface SendChatMessageInput {
  message: string;
  history: ChatHistoryItem[];
}

export interface ChatMessageResponse {
  reply: string;
  navigateTo: string | null;
}

export function sendChatMessage(input: SendChatMessageInput): Promise<ChatMessageResponse> {
  return request('/chatbot/message', { method: 'POST', body: JSON.stringify(input) });
}

async function requestBlob(path: string, method: 'GET' | 'POST' = 'POST'): Promise<Blob> {
  let response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    credentials: 'include',
  });

  if (response.status === 401) {
    const refreshed = await silentRefresh();
    if (refreshed) {
      response = await fetch(`${API_BASE_URL}${path}`, { method, credentials: 'include' });
    }
  }

  if (!response.ok) {
    return throwApiError(response);
  }
  return response.blob();
}

export function exportWidgetCsv(widgetId: string): Promise<Blob> {
  return requestBlob(`/exports/widget/${widgetId}?format=csv`);
}

export function exportDashboardPdf(dashboardId: string): Promise<Blob> {
  return requestBlob(`/exports/dashboard/${dashboardId}/pdf`);
}

export interface ScheduledReport {
  id: string;
  dashboardId: string;
  cron: string;
  recipients: string[];
  isActive: boolean;
  lastRunAt: string | null;
}

export interface CreateReportInput {
  dashboardId: string;
  cron: string;
  recipients: string[];
  isActive?: boolean;
}

export interface UpdateReportInput {
  cron?: string;
  recipients?: string[];
  isActive?: boolean;
}

export function listReports(): Promise<ScheduledReport[]> {
  return request('/reports');
}

export function createReport(input: CreateReportInput): Promise<ScheduledReport> {
  return request('/reports', { method: 'POST', body: JSON.stringify(input) });
}

export function updateReport(id: string, input: UpdateReportInput): Promise<ScheduledReport> {
  return request(`/reports/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function deleteReport(id: string): Promise<void> {
  return request(`/reports/${id}`, { method: 'DELETE' });
}

export type AlertOperator = 'lt' | 'lte' | 'gt' | 'gte';

export interface Alert {
  id: string;
  widgetId: string;
  operator: AlertOperator;
  threshold: number;
  recipients: string[];
  lastTriggeredAt: string | null;
}

export interface CreateAlertInput {
  widgetId: string;
  operator: AlertOperator;
  threshold: number;
  recipients: string[];
}

export interface UpdateAlertInput {
  operator?: AlertOperator;
  threshold?: number;
  recipients?: string[];
}

export function listAlerts(): Promise<Alert[]> {
  return request('/alerts');
}

export function createAlert(input: CreateAlertInput): Promise<Alert> {
  return request('/alerts', { method: 'POST', body: JSON.stringify(input) });
}

export function updateAlert(id: string, input: UpdateAlertInput): Promise<Alert> {
  return request(`/alerts/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function deleteAlert(id: string): Promise<void> {
  return request(`/alerts/${id}`, { method: 'DELETE' });
}

export interface PagedResult<T> {
  data: T[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

export type AccountType = 'CUSTOMER' | 'SUPPLIER';

export interface Account {
  id: string;
  name: string;
  taxNumber: string | null;
  taxOffice: string | null;
  sector: string | null;
  accountTypes: AccountType[];
  website: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  ownerId: string | null;
  missingCriticalFields: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AccountWithContacts extends Account {
  contacts: Contact[];
}

export interface AccountInput {
  name: string;
  taxNumber?: string;
  taxOffice?: string;
  sector?: string;
  accountTypes?: AccountType[];
  website?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
}

export function listAccounts(
  params: { page?: number; q?: string } = {},
): Promise<PagedResult<Account>> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.q) query.set('q', params.q);
  const qs = query.toString();
  return request(`/accounts${qs ? `?${qs}` : ''}`);
}

export function getAccount(id: string): Promise<AccountWithContacts> {
  return request(`/accounts/${id}`);
}

export function createAccount(input: AccountInput): Promise<Account> {
  return request('/accounts', { method: 'POST', body: JSON.stringify(input) });
}

export function updateAccount(id: string, input: Partial<AccountInput>): Promise<Account> {
  return request(`/accounts/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function deleteAccount(id: string): Promise<void> {
  return request(`/accounts/${id}`, { method: 'DELETE' });
}

export type ContactStatus = 'ACTIVE' | 'INACTIVE';

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  accountId: string | null;
  account?: { id: string; name: string } | null;
  title: string | null;
  email: string | null;
  phone: string | null;
  ownerId: string | null;
  status: ContactStatus;
  lastContactedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ContactInput {
  firstName: string;
  lastName: string;
  accountId?: string;
  title?: string;
  email?: string;
  phone?: string;
  status?: ContactStatus;
  lastContactedAt?: string;
}

export function listContacts(
  params: { page?: number; q?: string } = {},
): Promise<PagedResult<Contact>> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.q) query.set('q', params.q);
  const qs = query.toString();
  return request(`/contacts${qs ? `?${qs}` : ''}`);
}

export function getContact(id: string): Promise<Contact> {
  return request(`/contacts/${id}`);
}

export function createContact(input: ContactInput): Promise<Contact> {
  return request('/contacts', { method: 'POST', body: JSON.stringify(input) });
}

export function updateContact(id: string, input: Partial<ContactInput>): Promise<Contact> {
  return request(`/contacts/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function deleteContact(id: string): Promise<void> {
  return request(`/contacts/${id}`, { method: 'DELETE' });
}

export interface SectorOption {
  id: string;
  label: string;
  createdAt: string;
}

export function listSectorOptions(): Promise<SectorOption[]> {
  return request('/sector-options');
}

export function createSectorOption(label: string): Promise<SectorOption> {
  return request('/sector-options', { method: 'POST', body: JSON.stringify({ label }) });
}

export function deleteSectorOption(id: string): Promise<void> {
  return request(`/sector-options/${id}`, { method: 'DELETE' });
}

export interface TenantSetting {
  key: string;
  value: unknown;
  isDefault: boolean;
}

export function listTenantSettings(): Promise<TenantSetting[]> {
  return request('/tenant-settings');
}

export function updateTenantSetting(key: string, value: unknown): Promise<TenantSetting> {
  return request(`/tenant-settings/${encodeURIComponent(key)}`, {
    method: 'PATCH',
    body: JSON.stringify({ value }),
  });
}

export type ImportEntity = 'accounts' | 'contacts';

export interface ImportPreview {
  headers: string[];
  sampleRows: Record<string, string>[];
  totalRows: number;
}

export interface ImportRowError {
  row: number;
  messages: string[];
}

export interface ImportResult {
  totalRows: number;
  imported: number;
  errors: ImportRowError[];
}

export function previewImport(file: File): Promise<ImportPreview> {
  const formData = new FormData();
  formData.append('file', file);
  return request('/imports/preview', { method: 'POST', body: formData });
}

export function runImport(
  entity: ImportEntity,
  file: File,
  mapping: Record<string, string>,
): Promise<ImportResult> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('mapping', JSON.stringify(mapping));
  return request(`/imports/${entity}`, { method: 'POST', body: formData });
}

export function exportEntity(entity: ImportEntity): Promise<Blob> {
  return requestBlob(`/imports/${entity}/export`, 'GET');
}

// --- Kullanicilar / Davetler -----------------------------------------------

export function listUsers(): Promise<SafeUser[]> {
  return request('/users');
}

export interface CreateUserInput {
  email: string;
  name: string;
  roleIds: string[];
}

export function createUser(
  input: CreateUserInput,
): Promise<{ user: SafeUser; temporaryPassword: string }> {
  return request('/users', { method: 'POST', body: JSON.stringify(input) });
}

export function resetUserPassword(userId: string): Promise<{ temporaryPassword: string }> {
  return request(`/users/${userId}/reset-password`, { method: 'POST' });
}

export function updateUserRole(userId: string, roleIds: string[]): Promise<SafeUser> {
  return request(`/users/${userId}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ roleIds }),
  });
}

// --- Roller / Sayfa Yonetimi (dinamik RBAC) ---------------------------------

export interface PageTabDefinition {
  key: string;
  label: string;
  supportedActions?: CrudPermissionAction[];
}

export interface PageDefinition {
  key: string;
  label: string;
  tabs?: PageTabDefinition[];
  alwaysVisible?: boolean;
  requiresModule?: string;
  supportedActions?: CrudPermissionAction[];
}

export function getPageRegistry(): Promise<PageDefinition[]> {
  return request('/page-registry');
}

export interface RolePermissionView {
  pageKey: string;
  tabKey: string | null;
  action: PermissionAction;
}

export interface RoleView {
  id: string;
  name: string;
  isSystem: boolean;
  isBasic: boolean;
  isCompanyAdmin: boolean;
  userCount: number;
  permissions: RolePermissionView[];
}

export interface RolePermissionInput {
  pageKey: string;
  tabKey?: string | null;
  actions: PermissionAction[];
}

export interface CreateRoleInput {
  name: string;
  permissions: RolePermissionInput[];
}

export interface UpdateRoleInput {
  name?: string;
  permissions?: RolePermissionInput[];
}

export function listRoles(): Promise<RoleView[]> {
  return request('/roles');
}

export function createRole(input: CreateRoleInput): Promise<RoleView> {
  return request('/roles', { method: 'POST', body: JSON.stringify(input) });
}

export function updateRole(id: string, input: UpdateRoleInput): Promise<RoleView> {
  return request(`/roles/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function deleteRole(id: string): Promise<void> {
  return request(`/roles/${id}`, { method: 'DELETE' });
}

export interface CalendarEventAttendee {
  id: string;
  userId: string;
  note: string | null;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  startAt: string;
  endAt: string;
  allDay: boolean;
  createdById: string;
  attendees: CalendarEventAttendee[];
}

export interface CalendarEventAttendeeInput {
  userId: string;
  note?: string;
}

export interface CalendarEventInput {
  title: string;
  description?: string;
  startAt: string;
  endAt: string;
  allDay?: boolean;
  attendees?: CalendarEventAttendeeInput[];
}

export interface AssignableUser {
  id: string;
  name: string;
}

export function listAssignableCalendarUsers(): Promise<AssignableUser[]> {
  return request('/calendar-events/assignable-users');
}

export function listCalendarEvents(
  params: { from?: string; to?: string; order?: 'asc' | 'desc' } = {},
): Promise<CalendarEvent[]> {
  const query = new URLSearchParams();
  if (params.from) query.set('from', params.from);
  if (params.to) query.set('to', params.to);
  if (params.order) query.set('order', params.order);
  const qs = query.toString();
  return request(`/calendar-events${qs ? `?${qs}` : ''}`);
}

export function getCalendarEvent(id: string): Promise<CalendarEvent> {
  return request(`/calendar-events/${id}`);
}

export function createCalendarEvent(input: CalendarEventInput): Promise<CalendarEvent> {
  return request('/calendar-events', { method: 'POST', body: JSON.stringify(input) });
}

export function updateCalendarEvent(
  id: string,
  input: Partial<CalendarEventInput>,
): Promise<CalendarEvent> {
  return request(`/calendar-events/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function deleteCalendarEvent(id: string): Promise<void> {
  return request(`/calendar-events/${id}`, { method: 'DELETE' });
}

export type InteractionType = 'CALL' | 'VISIT' | 'MEETING' | 'EMAIL' | 'OTHER';
export type InteractionStatus = 'OPEN' | 'CLOSED';
export type OpportunityStage = 'NEW' | 'QUALIFIED' | 'PROPOSAL' | 'WON' | 'LOST';

export interface Opportunity {
  id: string;
  accountId: string;
  interactionId: string | null;
  quoteId: string | null;
  name: string;
  stage: OpportunityStage;
  estimatedValue: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InteractionParticipant {
  id: string;
  name: string;
  isInternal: boolean;
  note: string | null;
}

export interface Interaction {
  id: string;
  accountId: string;
  contactId: string | null;
  account: Account;
  contact: Contact | null;
  type: InteractionType;
  notes: string;
  occurredAt: string;
  status: InteractionStatus;
  accountAutoCreated: boolean;
  contactAutoCreated: boolean;
  participants: InteractionParticipant[];
  opportunity: Opportunity | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInteractionInput {
  accountId?: string;
  accountName?: string;
  contactId?: string;
  contactName?: string;
  type: InteractionType;
  notes: string;
  occurredAt: string;
  participants?: { name: string; isInternal: boolean; note?: string }[];
  opportunity?: { name: string; stage?: OpportunityStage; estimatedValue?: number };
  reminder?: {
    startAt: string;
    title?: string;
    assignees: { userId: string; note?: string }[];
  };
}

export interface UpdateInteractionInput {
  type?: InteractionType;
  notes?: string;
  occurredAt?: string;
  status?: InteractionStatus;
}

export interface ReminderConflict {
  userId: string;
  suggestedStartAt: string;
}

export interface CreateInteractionResult {
  interaction: Interaction;
  reminderConflicts: ReminderConflict[];
}

export function listInteractions(
  params: { page?: number; accountId?: string; status?: InteractionStatus } = {},
): Promise<PagedResult<Interaction>> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.accountId) query.set('accountId', params.accountId);
  if (params.status) query.set('status', params.status);
  const qs = query.toString();
  return request(`/interactions${qs ? `?${qs}` : ''}`);
}

export function getInteraction(id: string): Promise<Interaction> {
  return request(`/interactions/${id}`);
}

export function createInteraction(input: CreateInteractionInput): Promise<CreateInteractionResult> {
  return request('/interactions', { method: 'POST', body: JSON.stringify(input) });
}

export function updateInteraction(id: string, input: UpdateInteractionInput): Promise<Interaction> {
  return request(`/interactions/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function deleteInteraction(id: string): Promise<void> {
  return request(`/interactions/${id}`, { method: 'DELETE' });
}

export interface OpportunityInput {
  accountId: string;
  name: string;
  stage?: OpportunityStage;
  estimatedValue?: number;
}

export function listOpportunities(
  params: { page?: number; accountId?: string; stage?: OpportunityStage } = {},
): Promise<PagedResult<Opportunity>> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.accountId) query.set('accountId', params.accountId);
  if (params.stage) query.set('stage', params.stage);
  const qs = query.toString();
  return request(`/opportunities${qs ? `?${qs}` : ''}`);
}

export function getOpportunity(id: string): Promise<Opportunity> {
  return request(`/opportunities/${id}`);
}

export function createOpportunity(input: OpportunityInput): Promise<Opportunity> {
  return request('/opportunities', { method: 'POST', body: JSON.stringify(input) });
}

export function updateOpportunity(
  id: string,
  input: Partial<OpportunityInput>,
): Promise<Opportunity> {
  return request(`/opportunities/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function deleteOpportunity(id: string): Promise<void> {
  return request(`/opportunities/${id}`, { method: 'DELETE' });
}

export interface Product {
  id: string;
  name: string;
  sku: string | null;
  unit: string;
  minStockLevel: number | null;
  maxDiscountPct: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductInput {
  name: string;
  sku?: string;
  unit?: string;
  minStockLevel?: number;
  maxDiscountPct?: number | null;
}

export function listProducts(
  params: { page?: number; q?: string } = {},
): Promise<PagedResult<Product>> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.q) query.set('q', params.q);
  const qs = query.toString();
  return request(`/products${qs ? `?${qs}` : ''}`);
}

export function getProduct(id: string): Promise<Product> {
  return request(`/products/${id}`);
}

export function createProduct(input: ProductInput): Promise<Product> {
  return request('/products', { method: 'POST', body: JSON.stringify(input) });
}

export function updateProduct(id: string, input: Partial<ProductInput>): Promise<Product> {
  return request(`/products/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function deleteProduct(id: string): Promise<void> {
  return request(`/products/${id}`, { method: 'DELETE' });
}

export interface PriceListItem {
  id: string;
  priceListId: string;
  productId: string;
  unitPrice: string;
  product: Product;
}

export interface PriceList {
  id: string;
  name: string;
  isDefault: boolean;
  items: PriceListItem[];
  createdAt: string;
  updatedAt: string;
}

export interface PriceListItemInput {
  productId: string;
  unitPrice: number;
}

export interface PriceListInput {
  name: string;
  isDefault?: boolean;
  items: PriceListItemInput[];
}

export function listPriceLists(
  params: { page?: number; q?: string } = {},
): Promise<PagedResult<PriceList>> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.q) query.set('q', params.q);
  const qs = query.toString();
  return request(`/price-lists${qs ? `?${qs}` : ''}`);
}

export function getPriceList(id: string): Promise<PriceList> {
  return request(`/price-lists/${id}`);
}

export function createPriceList(input: PriceListInput): Promise<PriceList> {
  return request('/price-lists', { method: 'POST', body: JSON.stringify(input) });
}

export function updatePriceList(id: string, input: Partial<PriceListInput>): Promise<PriceList> {
  return request(`/price-lists/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function deletePriceList(id: string): Promise<void> {
  return request(`/price-lists/${id}`, { method: 'DELETE' });
}

export type QuoteStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';

export interface QuoteItem {
  id: string;
  quoteId: string;
  productId: string;
  product: Product;
  quantity: string;
  unitPrice: string;
  discountPct: string;
  discountNote: string | null;
  vatPct: string;
}

export interface Quote {
  id: string;
  quoteNumber: string;
  accountId: string;
  account: Account;
  contactId: string | null;
  contact: Contact | null;
  priceListId: string;
  priceList: PriceList;
  status: QuoteStatus;
  approvedAt: string | null;
  approvedById: string | null;
  createdById: string;
  items: QuoteItem[];
  opportunity: Opportunity | null;
  createdAt: string;
  updatedAt: string;
}

export interface QuoteItemInput {
  productId: string;
  quantity: number;
  unitPrice?: number;
  discountPct?: number;
  vatPct?: number;
}

export interface CreateQuoteInput {
  accountId: string;
  contactId?: string;
  priceListId: string;
  items: QuoteItemInput[];
  opportunity?: { name: string; stage?: OpportunityStage; estimatedValue?: number };
}

export interface UpdateQuoteInput {
  priceListId?: string;
  items?: QuoteItemInput[];
}

export function listQuotes(
  params: { page?: number; accountId?: string; status?: QuoteStatus } = {},
): Promise<PagedResult<Quote>> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.accountId) query.set('accountId', params.accountId);
  if (params.status) query.set('status', params.status);
  const qs = query.toString();
  return request(`/quotes${qs ? `?${qs}` : ''}`);
}

export function getQuote(id: string): Promise<Quote> {
  return request(`/quotes/${id}`);
}

export function createQuote(input: CreateQuoteInput): Promise<Quote> {
  return request('/quotes', { method: 'POST', body: JSON.stringify(input) });
}

export function updateQuote(id: string, input: UpdateQuoteInput): Promise<Quote> {
  return request(`/quotes/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function deleteQuote(id: string): Promise<void> {
  return request(`/quotes/${id}`, { method: 'DELETE' });
}

export function approveQuote(id: string): Promise<Quote> {
  return request(`/quotes/${id}/approve`, { method: 'POST' });
}

export interface Project {
  id: string;
  projectNumber: string;
  accountId: string;
  quoteId: string | null;
  name: string;
  estimatedBudget: string;
  actualCost: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectInput {
  accountId: string;
  quoteId?: string;
  name: string;
  estimatedBudget: number;
  actualCost?: number;
}

export function listProjects(
  params: { page?: number; accountId?: string } = {},
): Promise<PagedResult<Project>> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.accountId) query.set('accountId', params.accountId);
  const qs = query.toString();
  return request(`/projects${qs ? `?${qs}` : ''}`);
}

export function getProject(id: string): Promise<Project> {
  return request(`/projects/${id}`);
}

export function createProject(input: ProjectInput): Promise<Project> {
  return request('/projects', { method: 'POST', body: JSON.stringify(input) });
}

export function updateProject(id: string, input: Partial<ProjectInput>): Promise<Project> {
  return request(`/projects/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function deleteProject(id: string): Promise<void> {
  return request(`/projects/${id}`, { method: 'DELETE' });
}

export function rejectQuote(id: string): Promise<Quote> {
  return request(`/quotes/${id}/reject`, { method: 'POST' });
}

export function exportQuotePdf(quoteId: string): Promise<Blob> {
  return requestBlob(`/exports/quote/${quoteId}/pdf`);
}

export type PostSaleCaseStatus = 'BEKLEMEDE' | 'HATIRLATILDI' | 'GERI_BILDIRIM_ALINDI';

export interface FeedbackSurvey {
  id: string;
  postSaleCaseId: string;
  contactId: string;
  sentAt: string;
  respondedAt: string | null;
  responseNote: string | null;
}

export interface PostSaleCase {
  id: string;
  quoteId: string;
  quote: Quote;
  accountId: string;
  account: Account;
  contactId: string | null;
  contact: Contact | null;
  reminderAt: string;
  reminderSentAt: string | null;
  feedbackReceivedAt: string | null;
  feedbackNote: string | null;
  feedbackSurvey: FeedbackSurvey | null;
  status: PostSaleCaseStatus;
  createdAt: string;
  updatedAt: string;
}

export function listPostSaleCases(
  params: {
    page?: number;
    accountId?: string;
    status?: PostSaleCaseStatus;
  } = {},
): Promise<PagedResult<PostSaleCase>> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.accountId) query.set('accountId', params.accountId);
  if (params.status) query.set('status', params.status);
  const qs = query.toString();
  return request(`/post-sale-cases${qs ? `?${qs}` : ''}`);
}

export function getPostSaleCase(id: string): Promise<PostSaleCase> {
  return request(`/post-sale-cases/${id}`);
}

export function sendPostSaleSurvey(
  id: string,
  input: { contactId?: string } = {},
): Promise<PostSaleCase> {
  return request(`/post-sale-cases/${id}/send-survey`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function markPostSaleFeedback(
  id: string,
  input: { responseNote?: string } = {},
): Promise<PostSaleCase> {
  return request(`/post-sale-cases/${id}/feedback`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

// Siparis / Satin Alma (SP1-SP3) + Stok (ST1) - §2.3.11/§2.3.12

export type PurchaseOrderStatus = 'DRAFT' | 'CONFIRMED';
export type PurchaseOrderItemSource = 'QUOTE' | 'EXTRA';

export interface PurchaseOrderItem {
  id: string;
  purchaseOrderId: string;
  productId: string | null;
  description: string;
  quantity: string;
  source: PurchaseOrderItemSource;
  product: Product | null;
  createdAt: string;
}

export interface PurchaseOrder {
  id: string;
  orderNumber: string;
  quoteId: string;
  quote: Quote;
  projectId: string | null;
  project: Project | null;
  status: PurchaseOrderStatus;
  createdById: string;
  items: PurchaseOrderItem[];
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseOrderItemInput {
  id?: string;
  productId?: string;
  description: string;
  quantity: number;
  source: PurchaseOrderItemSource;
}

export interface UpdatePurchaseOrderInput {
  items?: PurchaseOrderItemInput[];
  status?: PurchaseOrderStatus;
}

export function listPurchaseOrders(
  params: { page?: number; quoteId?: string; projectId?: string } = {},
): Promise<PagedResult<PurchaseOrder>> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.quoteId) query.set('quoteId', params.quoteId);
  if (params.projectId) query.set('projectId', params.projectId);
  const qs = query.toString();
  return request(`/purchase-orders${qs ? `?${qs}` : ''}`);
}

export function getPurchaseOrder(id: string): Promise<PurchaseOrder> {
  return request(`/purchase-orders/${id}`);
}

export function createPurchaseOrderFromQuote(quoteId: string): Promise<PurchaseOrder> {
  return request(`/quotes/${quoteId}/create-purchase-order`, { method: 'POST' });
}

export function updatePurchaseOrder(
  id: string,
  input: UpdatePurchaseOrderInput,
): Promise<PurchaseOrder> {
  return request(`/purchase-orders/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function deletePurchaseOrder(id: string): Promise<void> {
  return request(`/purchase-orders/${id}`, { method: 'DELETE' });
}

export interface StockItem {
  id: string;
  productId: string;
  quantity: string;
  product: { id: string; name: string; minStockLevel: number | null };
  createdAt: string;
  updatedAt: string;
}

export function listStockItems(
  params: { page?: number; q?: string } = {},
): Promise<PagedResult<StockItem>> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.q) query.set('q', params.q);
  const qs = query.toString();
  return request(`/stock-items${qs ? `?${qs}` : ''}`);
}

export function listLowStockItems(): Promise<StockItem[]> {
  return request('/stock-items/low-stock');
}

export function upsertStockItem(productId: string, quantity: number): Promise<StockItem> {
  return request(`/stock-items/${productId}`, {
    method: 'PATCH',
    body: JSON.stringify({ quantity }),
  });
}
