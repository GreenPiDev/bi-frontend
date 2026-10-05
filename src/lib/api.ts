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
  isActive: boolean;
  avatarUrl: string | null;
  defaultPageSize: number;
  columnPreferences: Record<string, string[]> | null;
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
  defaultPageSize?: 10 | 25 | 50;
  columnPreferences?: Record<string, string[]>;
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

export function uploadAvatar(file: File): Promise<UserProfile> {
  const formData = new FormData();
  formData.append('file', file);
  return request('/users/me/avatar', { method: 'POST', body: formData });
}

export function deleteAvatar(): Promise<UserProfile> {
  return request('/users/me/avatar', { method: 'DELETE' });
}

export interface TenantProfile {
  id: string;
  name: string;
  logoUrl: string | null;
}

export function getMyTenant(): Promise<TenantProfile> {
  return request('/tenants/me');
}

export function uploadTenantLogo(file: File): Promise<TenantProfile> {
  const formData = new FormData();
  formData.append('file', file);
  return request('/tenants/me/logo', { method: 'POST', body: formData });
}

export function deleteTenantLogo(): Promise<TenantProfile> {
  return request('/tenants/me/logo', { method: 'DELETE' });
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

export function updateTenantSlug(tenantId: string, slug: string): Promise<TenantSummary> {
  return request(`/platform-admin/tenants/${tenantId}/slug`, {
    method: 'PATCH',
    body: JSON.stringify({ slug }),
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

export interface DataSourceRawPreview {
  rows: string[][];
}

export function previewDatasourceRaw(file: File): Promise<DataSourceRawPreview> {
  const formData = new FormData();
  formData.append('file', file);
  return request('/datasources/preview-raw', { method: 'POST', body: formData });
}

export function uploadDatasource(
  file: File,
  name: string | undefined,
  headerRowIndex: number,
): Promise<{ id: string }> {
  const formData = new FormData();
  formData.append('file', file);
  if (name) {
    formData.append('name', name);
  }
  formData.append('headerRowIndex', String(headerRowIndex));
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

export type DatasetSourceKind = 'UPLOAD' | 'CRM_TABLE';

export interface DatasetSummary {
  id: string;
  name: string;
  rowCount: number;
  lastIngestedAt: string | null;
  createdAt: string;
  sourceKind: DatasetSourceKind;
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

export function deleteDataset(id: string): Promise<void> {
  return request(`/datasets/${id}`, { method: 'DELETE' });
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

export function listAuditLogs(
  params: {
    page?: number;
    pageSize?: number;
    userId?: string;
    entity?: string;
    action?: string;
    from?: string;
    to?: string;
  } = {},
): Promise<PagedResult<AuditLogEntry>> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('pageSize', String(params.pageSize));
  if (params.userId) query.set('userId', params.userId);
  if (params.entity) query.set('entity', params.entity);
  if (params.action) query.set('action', params.action);
  if (params.from) query.set('from', params.from);
  if (params.to) query.set('to', params.to);
  const qs = query.toString();
  return request(`/audit-logs${qs ? `?${qs}` : ''}`);
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

export type AccountType = 'CUSTOMER' | 'SUPPLIER' | 'CONTRACTOR' | 'SUBCONTRACTOR';

export interface Account {
  id: string;
  name: string;
  taxNumber: string | null;
  taxOffice: string | null;
  sector: string[];
  accountTypes: AccountType[];
  website: string | null;
  phone: string | null;
  landlinePhone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  district: string | null;
  ownerId: string | null;
  missingCriticalFields: string[];
  customFields: Record<string, string> | null;
  createdByName: string | null;
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
  sector?: string[];
  accountTypes?: AccountType[];
  website?: string;
  phone?: string;
  landlinePhone?: string;
  email?: string;
  address?: string;
  city?: string;
  district?: string;
  contact?: {
    firstName: string;
    lastName: string;
    department?: string;
    title?: string;
    phone?: string;
    extension?: string;
  };
}

export function listAccounts(
  params: {
    page?: number;
    pageSize?: number;
    q?: string;
    sort?: string;
    from?: string;
    notContactedDays?: number;
    createdById?: string;
  } = {},
): Promise<PagedResult<Account>> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('pageSize', String(params.pageSize));
  if (params.q) query.set('q', params.q);
  if (params.sort) query.set('sort', params.sort);
  if (params.from) query.set('from', params.from);
  if (params.notContactedDays) query.set('notContactedDays', String(params.notContactedDays));
  if (params.createdById) query.set('createdById', params.createdById);
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
  department: string | null;
  title: string | null;
  email: string | null;
  phone: string | null;
  extension: string | null;
  ownerId: string | null;
  status: ContactStatus;
  lastContactedAt: string | null;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ContactInput {
  firstName: string;
  lastName: string;
  accountId?: string;
  department?: string;
  title?: string;
  email?: string;
  phone?: string;
  extension?: string;
  status?: ContactStatus;
  lastContactedAt?: string;
}

export function listContacts(
  params: {
    page?: number;
    pageSize?: number;
    q?: string;
    accountId?: string;
    status?: ContactStatus;
    sort?: string;
    createdById?: string;
  } = {},
): Promise<PagedResult<Contact>> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('pageSize', String(params.pageSize));
  if (params.q) query.set('q', params.q);
  if (params.accountId) query.set('accountId', params.accountId);
  if (params.status) query.set('status', params.status);
  if (params.sort) query.set('sort', params.sort);
  if (params.createdById) query.set('createdById', params.createdById);
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

export function updateSectorOption(id: string, label: string): Promise<SectorOption> {
  return request(`/sector-options/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ label }),
  });
}

export function deleteSectorOption(id: string): Promise<void> {
  return request(`/sector-options/${id}`, { method: 'DELETE' });
}

export interface DepartmentOption {
  id: string;
  label: string;
  createdAt: string;
}

export function listDepartmentOptions(): Promise<DepartmentOption[]> {
  return request('/department-options');
}

export function createDepartmentOption(label: string): Promise<DepartmentOption> {
  return request('/department-options', { method: 'POST', body: JSON.stringify({ label }) });
}

export function updateDepartmentOption(id: string, label: string): Promise<DepartmentOption> {
  return request(`/department-options/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ label }),
  });
}

export function deleteDepartmentOption(id: string): Promise<void> {
  return request(`/department-options/${id}`, { method: 'DELETE' });
}

export interface TitleOption {
  id: string;
  label: string;
  createdAt: string;
}

export function listTitleOptions(): Promise<TitleOption[]> {
  return request('/title-options');
}

export function createTitleOption(label: string): Promise<TitleOption> {
  return request('/title-options', { method: 'POST', body: JSON.stringify({ label }) });
}

export function updateTitleOption(id: string, label: string): Promise<TitleOption> {
  return request(`/title-options/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ label }),
  });
}

export function deleteTitleOption(id: string): Promise<void> {
  return request(`/title-options/${id}`, { method: 'DELETE' });
}

export interface ProductCategoryOption {
  id: string;
  label: string;
  createdAt: string;
}

export function listProductCategoryOptions(): Promise<ProductCategoryOption[]> {
  return request('/product-categories');
}

export function createProductCategoryOption(label: string): Promise<ProductCategoryOption> {
  return request('/product-categories', {
    method: 'POST',
    body: JSON.stringify({ label }),
  });
}

export function updateProductCategoryOption(
  id: string,
  label: string,
): Promise<ProductCategoryOption> {
  return request(`/product-categories/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ label }),
  });
}

export function deleteProductCategoryOption(id: string): Promise<void> {
  return request(`/product-categories/${id}`, { method: 'DELETE' });
}

export interface BrandOption {
  id: string;
  label: string;
  createdAt: string;
}

export function listBrandOptions(): Promise<BrandOption[]> {
  return request('/brand-options');
}

export function createBrandOption(label: string): Promise<BrandOption> {
  return request('/brand-options', {
    method: 'POST',
    body: JSON.stringify({ label }),
  });
}

export function updateBrandOption(id: string, label: string): Promise<BrandOption> {
  return request(`/brand-options/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ label }),
  });
}

export function deleteBrandOption(id: string): Promise<void> {
  return request(`/brand-options/${id}`, { method: 'DELETE' });
}

export interface UnitOption {
  id: string;
  label: string;
  createdAt: string;
}

export function listUnitOptions(): Promise<UnitOption[]> {
  return request('/unit-options');
}

export function createUnitOption(label: string): Promise<UnitOption> {
  return request('/unit-options', {
    method: 'POST',
    body: JSON.stringify({ label }),
  });
}

export function updateUnitOption(id: string, label: string): Promise<UnitOption> {
  return request(`/unit-options/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ label }),
  });
}

export function deleteUnitOption(id: string): Promise<void> {
  return request(`/unit-options/${id}`, { method: 'DELETE' });
}

export interface InteractionTypeOption {
  id: string;
  label: string;
  createdAt: string;
}

export function listInteractionTypeOptions(): Promise<InteractionTypeOption[]> {
  return request('/interaction-type-options');
}

export function createInteractionTypeOption(label: string): Promise<InteractionTypeOption> {
  return request('/interaction-type-options', {
    method: 'POST',
    body: JSON.stringify({ label }),
  });
}

export function updateInteractionTypeOption(
  id: string,
  label: string,
): Promise<InteractionTypeOption> {
  return request(`/interaction-type-options/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ label }),
  });
}

export function deleteInteractionTypeOption(id: string): Promise<void> {
  return request(`/interaction-type-options/${id}`, { method: 'DELETE' });
}

export interface ReminderTypeOption {
  id: string;
  label: string;
  createdAt: string;
}

export function listReminderTypeOptions(): Promise<ReminderTypeOption[]> {
  return request('/reminder-type-options');
}

export function createReminderTypeOption(label: string): Promise<ReminderTypeOption> {
  return request('/reminder-type-options', {
    method: 'POST',
    body: JSON.stringify({ label }),
  });
}

export function updateReminderTypeOption(id: string, label: string): Promise<ReminderTypeOption> {
  return request(`/reminder-type-options/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ label }),
  });
}

export function deleteReminderTypeOption(id: string): Promise<void> {
  return request(`/reminder-type-options/${id}`, { method: 'DELETE' });
}

export interface PaymentMethodOption {
  id: string;
  label: string;
  createdAt: string;
}

export function listPaymentMethodOptions(): Promise<PaymentMethodOption[]> {
  return request('/payment-method-options');
}

export function createPaymentMethodOption(label: string): Promise<PaymentMethodOption> {
  return request('/payment-method-options', {
    method: 'POST',
    body: JSON.stringify({ label }),
  });
}

export function updatePaymentMethodOption(id: string, label: string): Promise<PaymentMethodOption> {
  return request(`/payment-method-options/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ label }),
  });
}

export function deletePaymentMethodOption(id: string): Promise<void> {
  return request(`/payment-method-options/${id}`, { method: 'DELETE' });
}

export interface IbanOption {
  id: string;
  bankName: string;
  accountHolderName: string;
  accountNumber: string | null;
  iban: string;
  createdAt: string;
}

export interface IbanOptionInput {
  bankName: string;
  accountHolderName: string;
  accountNumber?: string;
  iban: string;
}

export function listIbanOptions(): Promise<IbanOption[]> {
  return request('/iban-options');
}

export function createIbanOption(input: IbanOptionInput): Promise<IbanOption> {
  return request('/iban-options', { method: 'POST', body: JSON.stringify(input) });
}

export function updateIbanOption(id: string, input: IbanOptionInput): Promise<IbanOption> {
  return request(`/iban-options/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function deleteIbanOption(id: string): Promise<void> {
  return request(`/iban-options/${id}`, { method: 'DELETE' });
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
  created: number;
  updated: number;
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

// --- Firma İçe Aktarma (marka/kaynak-bağımsız, product-imports ile aynı sihirbaz) ------

export interface AccountImportRawPreview {
  rows: string[][];
}

export function previewAccountImportRaw(file: File): Promise<AccountImportRawPreview> {
  const formData = new FormData();
  formData.append('file', file);
  return request('/imports/accounts/preview', { method: 'POST', body: formData });
}

export function previewAccountImportMapped(
  file: File,
  headerRowIndex: number,
): Promise<ImportPreview> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('headerRowIndex', String(headerRowIndex));
  return request('/imports/accounts/preview', { method: 'POST', body: formData });
}

export function runAccountImport(
  file: File,
  headerRowIndex: number,
  mapping: Record<string, string>,
  attributeColumns: string[],
): Promise<ImportResult> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('headerRowIndex', String(headerRowIndex));
  formData.append('mapping', JSON.stringify(mapping));
  formData.append('attributeColumns', JSON.stringify(attributeColumns));
  return request('/imports/accounts', { method: 'POST', body: formData });
}

// --- Ürün İçe Aktarma (Faz B, marka bazlı heterojen liste import) ----------

export interface ProductImportRawPreview {
  rows: string[][];
}

export interface ProductImportPreview {
  headers: string[];
  sampleRows: Record<string, string>[];
  totalRows: number;
}

export interface ProductImportResult extends ImportResult {
  created: number;
  updated: number;
}
export type NumberFormat = 'tr' | 'en';

export function previewProductImportRaw(file: File): Promise<ProductImportRawPreview> {
  const formData = new FormData();
  formData.append('file', file);
  return request('/product-imports/preview', { method: 'POST', body: formData });
}

export function previewProductImportMapped(
  file: File,
  headerRowIndex: number,
): Promise<ProductImportPreview> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('headerRowIndex', String(headerRowIndex));
  return request('/product-imports/preview', { method: 'POST', body: formData });
}

export function runProductImport(
  productListId: string,
  file: File,
  headerRowIndex: number,
  mapping: Record<string, string>,
  attributeColumns: string[],
  numberFormat: NumberFormat,
): Promise<ProductImportResult> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('headerRowIndex', String(headerRowIndex));
  formData.append('mapping', JSON.stringify(mapping));
  formData.append('attributeColumns', JSON.stringify(attributeColumns));
  formData.append('numberFormat', numberFormat);
  return request(`/product-imports/${productListId}`, { method: 'POST', body: formData });
}

// --- Görüşme İçe Aktarma (marka/kaynak-bağımsız, accounts/product-imports ile aynı sihirbaz) --

export interface InteractionImportRawPreview {
  rows: string[][];
}

export type InteractionImportPreview = ImportPreview;
export type InteractionImportResult = ImportResult;

export function previewInteractionImportRaw(file: File): Promise<InteractionImportRawPreview> {
  const formData = new FormData();
  formData.append('file', file);
  return request('/interaction-imports/preview', { method: 'POST', body: formData });
}

export function previewInteractionImportMapped(
  file: File,
  headerRowIndex: number,
): Promise<InteractionImportPreview> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('headerRowIndex', String(headerRowIndex));
  return request('/interaction-imports/preview', { method: 'POST', body: formData });
}

export function runInteractionImport(
  file: File,
  headerRowIndex: number,
  mapping: Record<string, string>,
  attributeColumns: string[],
): Promise<InteractionImportResult> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('headerRowIndex', String(headerRowIndex));
  formData.append('mapping', JSON.stringify(mapping));
  formData.append('attributeColumns', JSON.stringify(attributeColumns));
  return request('/interaction-imports', { method: 'POST', body: formData });
}

// --- Kullanicilar / Davetler -----------------------------------------------

export function listUsers(includeInactive = false): Promise<SafeUser[]> {
  const query = includeInactive ? '?includeInactive=true' : '';
  return request(`/users${query}`);
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

export function updateUserActive(userId: string, isActive: boolean): Promise<SafeUser> {
  return request(`/users/${userId}/active`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive }),
  });
}

export interface UserStats {
  user: SafeUser;
  counts: {
    accounts: number;
    contacts: number;
    interactions: number;
    opportunities: number;
    quotes: number;
    projects: number;
    purchaseOrders: number;
  };
  responsibleProjects: { id: string; projectNumber: string; name: string }[];
}

export function getUserStats(userId: string): Promise<UserStats> {
  return request(`/users/${userId}/stats`);
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

export type CalendarAttendeeStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED';

export interface CalendarEventAttendee {
  id: string;
  userId: string;
  note: string | null;
  status: CalendarAttendeeStatus;
  responseNote: string | null;
  respondedAt: string | null;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  reminderType: string | null;
  startAt: string;
  endAt: string;
  allDay: boolean;
  isMeeting: boolean;
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
  reminderType?: string;
  startAt: string;
  endAt: string;
  allDay?: boolean;
  isMeeting?: boolean;
  attendees?: CalendarEventAttendeeInput[];
}

export interface AssignableUser {
  id: string;
  name: string;
  avatarUrl: string | null;
}

export function listAssignableCalendarUsers(): Promise<AssignableUser[]> {
  return request('/calendar-events/assignable-users');
}

export function listCalendarEvents(
  params: {
    from?: string;
    to?: string;
    order?: 'asc' | 'desc';
    /** Verilmezse kendi ajandam (mevcut birlesik gorunum). Baska bir kullanicinin
     * id'si verilirse, o kullanici bana ajandasini paylasmissa sadece onun
     * katildigi etkinlikler doner (bkz. CalendarSharingSection / /ajanda dropdown). */
    userId?: string;
  } = {},
): Promise<CalendarEvent[]> {
  const query = new URLSearchParams();
  if (params.from) query.set('from', params.from);
  if (params.to) query.set('to', params.to);
  if (params.order) query.set('order', params.order);
  if (params.userId) query.set('userId', params.userId);
  const qs = query.toString();
  return request(`/calendar-events${qs ? `?${qs}` : ''}`);
}

export interface CalendarShareUser {
  id: string;
  name: string;
  avatarUrl: string | null;
}

/** Ajandami kimlerin gorebildigi (ben owner'im) - /profile?tab=security. */
export function getMyCalendarGrants(): Promise<CalendarShareUser[]> {
  return request('/calendar-shares/my-grants');
}

export function updateMyCalendarGrants(viewerIds: string[]): Promise<CalendarShareUser[]> {
  return request('/calendar-shares/my-grants', {
    method: 'PUT',
    body: JSON.stringify({ viewerIds }),
  });
}

/** Kimlerin ajandasini gorebildigim (ben viewer'im) - /ajanda dropdown. */
export function getCalendarsSharedWithMe(): Promise<CalendarShareUser[]> {
  return request('/calendar-shares/shared-with-me');
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

export interface PendingCalendarInvite {
  attendeeId: string;
  eventId: string;
  eventTitle: string;
  eventDescription: string | null;
  startAt: string;
  endAt: string;
  allDay: boolean;
  creatorId: string;
  creatorName: string;
}

export interface SentCalendarInvite {
  attendeeId: string;
  eventId: string;
  eventTitle: string;
  startAt: string;
  attendeeUserId: string;
  attendeeName: string;
  status: CalendarAttendeeStatus;
  responseNote: string | null;
  respondedAt: string | null;
}

export interface RespondToCalendarEventInput {
  status: 'ACCEPTED' | 'DECLINED';
  /** DECLINED'ta zorunlu, ACCEPTED'ta opsiyonel (bkz. RespondToCalendarEventSchema). */
  responseNote?: string;
}

/** Ad-hoc (2026-09-29): katilimci daveti kabul/red akisi - /ajanda ustundeki panel
 * ve altindaki "gonderdigim davetler" tablosu bu uclari kullanir. */
export function listPendingCalendarInvites(): Promise<PendingCalendarInvite[]> {
  return request('/calendar-events/pending-invites');
}

export function listSentCalendarInvites(): Promise<SentCalendarInvite[]> {
  return request('/calendar-events/sent-invites');
}

export function respondToCalendarEvent(
  eventId: string,
  input: RespondToCalendarEventInput,
): Promise<CalendarEvent> {
  return request(`/calendar-events/${eventId}/respond`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

/** Eskiden 5 sabit degerli bir union'du - artik tenant'in /settings?tab=crm'de yonettigi
 * dinamik InteractionTypeOption listesine karsi dogrulanan serbest metin (bkz.
 * schema.prisma Interaction.type yorumu, InteractionTypeSelect). */
export type InteractionType = string;
export type InteractionStatus = 'OPEN' | 'CLOSED';
export type OpportunityStage = 'NEW' | 'QUALIFIED' | 'PROPOSAL' | 'WON' | 'LOST';
export type CurrencyCode = 'TRY' | 'USD' | 'EUR' | 'GBP' | 'CHF' | 'JPY';

export interface Opportunity {
  id: string;
  accountId: string;
  interactionId: string | null;
  quoteId: string | null;
  name: string;
  stage: OpportunityStage;
  estimatedValue: string | null;
  estimatedValueCurrency: CurrencyCode;
  description: string | null;
  occurredAt: string;
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
  accountId: string | null;
  contactId: string | null;
  account: Account | null;
  contact: Contact | null;
  type: InteractionType;
  subject: string | null;
  notes: string | null;
  occurredAt: string;
  status: InteractionStatus;
  accountAutoCreated: boolean;
  contactAutoCreated: boolean;
  customFields: Record<string, string> | null;
  participants: InteractionParticipant[];
  opportunity: Opportunity | null;
  /** "Bağlı Görüşme Ekle" ile eklenen ek kayıtlar için ana görüşmenin id'si - bkz.
   * schema.prisma Interaction.parentInteractionId yorumu. */
  parentInteractionId: string | null;
  /** Görüşmeyi fiilen yapan kullanıcı - bkz. schema.prisma Interaction.performedByUserId
   * yorumu. */
  performedByUserId: string | null;
  performedByName: string | null;
  createdById: string;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInteractionInput {
  accountId?: string;
  accountName?: string;
  contactId?: string;
  contactName?: string;
  type: InteractionType;
  subject?: string;
  notes?: string;
  occurredAt: string;
  participants?: { name: string; isInternal: boolean; note?: string }[];
  opportunity?: {
    name: string;
    stage?: OpportunityStage;
    estimatedValue?: number;
    estimatedValueCurrency?: CurrencyCode;
  };
  reminder?: {
    startAt: string;
    title: string;
    description?: string;
    assignees: { userId: string }[];
  };
  /** "Bağlı Görüşme Ekle" modalından oluşturulan ek kayıtlar için ana görüşmenin id'si. */
  parentInteractionId?: string;
  /** Görüşmeyi fiilen yapan kullanıcı. */
  performedByUserId?: string;
}

export interface UpdateInteractionInput {
  type?: InteractionType;
  subject?: string;
  notes?: string;
  occurredAt?: string;
  status?: InteractionStatus;
  /** Sadece "Bağlı Görüşme Ekle" ile oluşturulan kayıtların düzenleme modalından gelir. */
  contactId?: string;
  performedByUserId?: string;
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
  params: {
    page?: number;
    pageSize?: number;
    accountId?: string;
    contactId?: string;
    createdById?: string;
    type?: InteractionType;
    status?: InteractionStatus;
    from?: string;
    to?: string;
    parentInteractionId?: string;
  } = {},
): Promise<PagedResult<Interaction>> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('pageSize', String(params.pageSize));
  if (params.accountId) query.set('accountId', params.accountId);
  if (params.contactId) query.set('contactId', params.contactId);
  if (params.createdById) query.set('createdById', params.createdById);
  if (params.type) query.set('type', params.type);
  if (params.status) query.set('status', params.status);
  if (params.from) query.set('from', params.from);
  if (params.to) query.set('to', params.to);
  if (params.parentInteractionId) query.set('parentInteractionId', params.parentInteractionId);
  const qs = query.toString();
  return request(`/interactions${qs ? `?${qs}` : ''}`);
}

export interface InteractionCreator {
  id: string;
  name: string;
}

export function listInteractionCreators(): Promise<InteractionCreator[]> {
  return request('/interactions/creators');
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
  estimatedValueCurrency?: CurrencyCode;
  description?: string;
  occurredAt?: string;
}

export interface CreateOpportunityInput extends OpportunityInput {
  reminder?: {
    startAt: string;
    title?: string;
    assignees: { userId: string; note?: string }[];
  };
}

export interface CreateOpportunityResult {
  opportunity: Opportunity;
  reminderConflicts: ReminderConflict[];
}

export function listOpportunities(
  params: {
    page?: number;
    pageSize?: number;
    accountId?: string;
    stage?: OpportunityStage;
    minEstimatedValue?: number;
    from?: string;
    to?: string;
  } = {},
): Promise<PagedResult<Opportunity>> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('pageSize', String(params.pageSize));
  if (params.accountId) query.set('accountId', params.accountId);
  if (params.stage) query.set('stage', params.stage);
  if (params.minEstimatedValue !== undefined) {
    query.set('minEstimatedValue', String(params.minEstimatedValue));
  }
  if (params.from) query.set('from', params.from);
  if (params.to) query.set('to', params.to);
  const qs = query.toString();
  return request(`/opportunities${qs ? `?${qs}` : ''}`);
}

export function getOpportunity(id: string): Promise<Opportunity> {
  return request(`/opportunities/${id}`);
}

export function createOpportunity(input: CreateOpportunityInput): Promise<CreateOpportunityResult> {
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

export interface Warehouse {
  id: string;
  name: string;
  address: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WarehouseInput {
  name: string;
  address?: string;
  isDefault?: boolean;
}

export function listWarehouses(
  params: { page?: number; pageSize?: number; q?: string } = {},
): Promise<PagedResult<Warehouse>> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('pageSize', String(params.pageSize));
  if (params.q) query.set('q', params.q);
  const qs = query.toString();
  return request(`/warehouses${qs ? `?${qs}` : ''}`);
}

export function createWarehouse(input: WarehouseInput): Promise<Warehouse> {
  return request('/warehouses', { method: 'POST', body: JSON.stringify(input) });
}

export function updateWarehouse(id: string, input: Partial<WarehouseInput>): Promise<Warehouse> {
  return request(`/warehouses/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function deleteWarehouse(id: string): Promise<void> {
  return request(`/warehouses/${id}`, { method: 'DELETE' });
}

export interface ProductList {
  id: string;
  name: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductListInput {
  name: string;
  isDefault?: boolean;
}

export function listProductLists(
  params: { page?: number; pageSize?: number; q?: string } = {},
): Promise<PagedResult<ProductList>> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('pageSize', String(params.pageSize));
  if (params.q) query.set('q', params.q);
  const qs = query.toString();
  return request(`/product-lists${qs ? `?${qs}` : ''}`);
}

export function getProductList(id: string): Promise<ProductList> {
  return request(`/product-lists/${id}`);
}

export function createProductList(input: ProductListInput): Promise<ProductList> {
  return request('/product-lists', { method: 'POST', body: JSON.stringify(input) });
}

export function updateProductList(
  id: string,
  input: Partial<ProductListInput>,
): Promise<ProductList> {
  return request(`/product-lists/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function deleteProductList(id: string): Promise<void> {
  return request(`/product-lists/${id}`, { method: 'DELETE' });
}

export interface Product {
  id: string;
  productListId: string;
  productList: { id: string; name: string };
  name: string;
  sku: string | null;
  unit: string;
  minStockLevel: number | null;
  maxDiscountPct: string | null;
  price: string | null;
  currency: string;
  attributes: Record<string, string> | null;
  description: string | null;
  category: string | null;
  brand: string | null;
  /** Hareketli agirlikli ortalama maliyet (WAC) - bkz. docs/PLAN_STOK_MALIYET.md.
   * Statik costPrice'in yerini aldi, stok girisi (increaseStockItem) uzerinden hesaplanir,
   * urun formundan elle girilemez. */
  avgCost: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

/** /products listesinde (GET /products) donen ek alan - /envanter?tab=stock'taki ayni
 * StockItem 1:1 iliskisinin urun listesine yansitilmis hali (bkz. CLAUDE.md, kullanici
 * talebi: stok durumu products sayfasinda da gorunsun/renklendirilsin). Sadece liste
 * ucunda var, create/update/getById cevaplarinda yok - Product tipi bu yuzden ayrildi. */
export interface ProductWithStock extends Product {
  stockQuantity: string;
}

export interface ProductInput {
  productListId: string;
  name: string;
  sku?: string;
  unit?: string;
  minStockLevel?: number;
  maxDiscountPct?: number | null;
  price?: number | null;
  currency?: string;
  description?: string | null;
  category?: string | null;
  brand?: string | null;
}

export function listProducts(
  params: {
    page?: number;
    pageSize?: number;
    q?: string;
    productListId?: string;
    brand?: string;
    category?: string;
    attr?: Record<string, string>;
    includeDeleted?: boolean;
  } = {},
): Promise<PagedResult<ProductWithStock>> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('pageSize', String(params.pageSize));
  if (params.q) query.set('q', params.q);
  if (params.productListId) query.set('productListId', params.productListId);
  if (params.brand) query.set('brand', params.brand);
  if (params.category) query.set('category', params.category);
  if (params.attr) {
    for (const [key, value] of Object.entries(params.attr)) {
      if (value) query.set(`attr[${key}]`, value);
    }
  }
  if (params.includeDeleted) query.set('includeDeleted', 'true');
  const qs = query.toString();
  return request(`/products${qs ? `?${qs}` : ''}`);
}

export function getProductAttributeKeys(): Promise<string[]> {
  return request('/products/attribute-keys');
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

export interface ProductPriceMovement {
  id: string;
  productId: string;
  productName: string;
  userName: string;
  userEmail: string;
  previousPrice: number | null;
  previousCurrency: string | null;
  price: number | null;
  currency: string;
  createdAt: string;
}

export function listProductPriceHistory(
  params: { productId?: string; userId?: string } = {},
): Promise<ProductPriceMovement[]> {
  const query = new URLSearchParams();
  if (params.productId) query.set('productId', params.productId);
  if (params.userId) query.set('userId', params.userId);
  const qs = query.toString();
  return request(`/products/price-history${qs ? `?${qs}` : ''}`);
}

export function bulkMoveProducts(
  productIds: string[],
  targetProductListId: string,
): Promise<{ movedCount: number }> {
  return request('/products/bulk-move', {
    method: 'PATCH',
    body: JSON.stringify({ productIds, targetProductListId }),
  });
}

export function bulkDeleteProducts(productIds: string[]): Promise<{ deletedCount: number }> {
  return request('/products/bulk-delete', {
    method: 'POST',
    body: JSON.stringify({ productIds }),
  });
}

export type QuoteStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'REVIZE';

export interface QuoteItem {
  id: string;
  quoteId: string;
  productId: string;
  product: Product;
  quantity: string;
  unitPrice: string;
  currency: string;
  discountPct: string;
  discountNote: string | null;
  vatPct: string;
}

/** quoteCurrency disindaki her item para biriminin quoteCurrency'ye cevrim kuru
 * snapshot'i - `rates[X]` = "1 X = ? quoteCurrency" (bkz. Quote.exchangeRates). */
export interface QuoteExchangeRates {
  asOf?: string;
  rates: Record<string, number>;
}

/** Ad-hoc revizyon takibi (bkz. Quote.revisionSnapshot doc comment'i, backend'de). */
export interface QuoteRevisionSnapshot {
  items: {
    productName: string;
    quantity: number;
    unitPrice: number;
    currency: string;
    discountPct: number;
    vatPct: number;
  }[];
  quoteCurrency: string;
  exchangeRates: QuoteExchangeRates | null;
}

export interface Quote {
  id: string;
  quoteNumber: string;
  accountId: string;
  account: Account;
  contactId: string | null;
  contact: Contact | null;
  quoteCurrency: string;
  exchangeRates: QuoteExchangeRates | null;
  /** Bir proje birden fazla teklifle iliskilendirilebilir, ama bir teklif en fazla
   * bir projeye bagli olur (FK burada) - bkz. Project.quotes. */
  projectId: string | null;
  /** Ad-hoc: markali PDF sablonu (bkz. docs/VARSAYIMLAR.md V41). null = sade export. */
  templateId: string | null;
  template: { id: string; name: string } | null;
  /** Sadece bazi uclarda (orn. siparis detayinda) nested olarak doner, her zaman
   * gelmeyebilir. */
  project?: Project | null;
  status: QuoteStatus;
  quoteDate: string;
  leadTime: string | null;
  paymentMethod: string | null;
  title: string | null;
  paymentTerms: string | null;
  salesTerms: string | null;
  deliveryTerms: string | null;
  generalTerms: string | null;
  ibanBankName: string | null;
  ibanAccountHolderName: string | null;
  ibanAccountNumber: string | null;
  ibanNumber: string | null;
  approvedAt: string | null;
  approvedById: string | null;
  createdById: string;
  createdByName: string | null;
  items: QuoteItem[];
  opportunity: Opportunity | null;
  /** Ad-hoc revizyon takibi - sadece EN SON revizyonu tutar, PDF export'ta gosterilmez. */
  revisionNote: string | null;
  revisionSnapshot: QuoteRevisionSnapshot | null;
  revisionCount: number;
  lastRevisedAt: string | null;
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
  items: QuoteItemInput[];
  opportunity?: { name: string; stage?: OpportunityStage; estimatedValue?: number };
  quoteDate: string;
  leadTime?: string;
  paymentMethod?: string;
  title?: string;
  paymentTerms?: string;
  salesTerms?: string;
  deliveryTerms?: string;
  generalTerms?: string;
  ibanOptionId?: string;
  quoteCurrency: string;
  exchangeRates?: QuoteExchangeRates;
  /** Verilmezse tenant'in varsayilan sablonu otomatik atanir (varsa). */
  templateId?: string | null;
}

export interface UpdateQuoteInput {
  items?: QuoteItemInput[];
  status?: QuoteStatus;
  /** status 'APPROVED' ise zorunlu - hangi depodan otomatik dusulecegi (bkz.
   * docs/PLAN_STOK_MALIYET.md Faz 4). */
  warehouseId?: string;
  /** Teklif REVIZE durumundayken `items` ile birlikte gonderilirse zorunludur. */
  revisionNote?: string;
  contactId?: string | null;
  quoteDate?: string;
  leadTime?: string | null;
  paymentMethod?: string | null;
  title?: string | null;
  paymentTerms?: string | null;
  salesTerms?: string | null;
  deliveryTerms?: string | null;
  generalTerms?: string | null;
  ibanOptionId?: string | null;
  quoteCurrency?: string;
  exchangeRates?: QuoteExchangeRates;
  templateId?: string | null;
}

export function listQuotes(
  params: {
    page?: number;
    pageSize?: number;
    accountId?: string;
    status?: QuoteStatus;
    createdById?: string;
    q?: string;
    from?: string;
    to?: string;
  } = {},
): Promise<PagedResult<Quote>> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('pageSize', String(params.pageSize));
  if (params.accountId) query.set('accountId', params.accountId);
  if (params.status) query.set('status', params.status);
  if (params.createdById) query.set('createdById', params.createdById);
  if (params.q) query.set('q', params.q);
  if (params.from) query.set('from', params.from);
  if (params.to) query.set('to', params.to);
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

export function approveQuote(id: string, warehouseId: string): Promise<Quote> {
  return request(`/quotes/${id}/approve`, {
    method: 'POST',
    body: JSON.stringify({ warehouseId }),
  });
}

export interface FxRatesResult {
  base: string;
  asOf: string;
  /** Her key icin: 1 <key> = <deger> <base>. */
  rates: Record<string, number>;
}

/** Teklif para birimi secimi icin guncel kur (otomatik on-doldurma, kullanici elle
 * duzenleyebilir - bkz. Quote.exchangeRates). targets bossa istek atilmaz. */
export function getQuoteFxRates(base: string, targets: string[]): Promise<FxRatesResult> {
  return request(`/quotes/fx-rates?base=${base}&targets=${targets.join(',')}`);
}

/** /teklifler/yeni'deki firma bazli uyari icin ("Bu firma daha once N kere revize
 * istedi") - bir firmanin tum tekliflerindeki revisionCount toplami. */
export function getQuoteRevisionSummary(accountId: string): Promise<{ count: number }> {
  return request(`/quotes/revision-summary?accountId=${accountId}`);
}

export interface ProjectResponsibleUser {
  id: string;
  name: string;
}

export interface ProjectAttachment {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  url: string | null;
  createdAt: string;
}

export interface Project {
  id: string;
  projectNumber: string;
  accountId: string;
  /** Sadece liste ucunda (GET /projects) doner, detayda (GET /projects/:id) yok. */
  accountName?: string;
  name: string;
  estimatedBudget: string;
  actualCost: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  quotes: Quote[];
  responsibleUsers: ProjectResponsibleUser[];
  attachments: ProjectAttachment[];
}

export interface ProjectInput {
  accountId: string;
  name: string;
  estimatedBudget: number;
  actualCost?: number;
  /** Sadece guncellemede anlamli - projeyle iliskilendirilecek tekliflerin tam
   * listesi (replace semantigi), bkz. UpdateProjectDto. */
  quoteIds?: string[];
  /** "Bizden ilgili" - projeyle ilgilenen dahili kullanicilarin tam listesi
   * (replace semantigi), hem olusturma hem duzenlemede gonderilebilir. */
  responsibleUserIds?: string[];
}

export function listProjectAssignableUsers(): Promise<{ id: string; name: string }[]> {
  return request('/projects/assignable-users');
}

/** Form "Kaydet"e basilinca (proje olusturulduktan/guncellendikten hemen sonra)
 * cagrilir - dosya secildigi anda degil, boylece kullanici yanlis dosya secip
 * Kaydet'ten once vazgecebilir (bkz. project-form-page.tsx stagedFiles). */
export function addProjectAttachment(projectId: string, file: File): Promise<ProjectAttachment> {
  const formData = new FormData();
  formData.append('file', file);
  return request(`/projects/${projectId}/attachments`, {
    method: 'POST',
    body: formData,
  });
}

export function removeProjectAttachment(projectId: string, attachmentId: string): Promise<void> {
  return request(`/projects/${projectId}/attachments/${attachmentId}`, {
    method: 'DELETE',
  });
}

export function renameProjectAttachment(
  projectId: string,
  attachmentId: string,
  fileName: string,
): Promise<ProjectAttachment> {
  return request(`/projects/${projectId}/attachments/${attachmentId}`, {
    method: 'PATCH',
    body: JSON.stringify({ fileName }),
  });
}

export function listProjects(
  params: {
    page?: number;
    pageSize?: number;
    accountId?: string;
    q?: string;
  } = {},
): Promise<PagedResult<Project>> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('pageSize', String(params.pageSize));
  if (params.accountId) query.set('accountId', params.accountId);
  if (params.q) query.set('q', params.q);
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

// Teklif PDF Sablonlari (ad-hoc, bkz. docs/VARSAYIMLAR.md V41)

export interface QuoteTemplate {
  id: string;
  name: string;
  isDefault: boolean;
  logoKey: string | null;
  coverImageKey: string | null;
  closingImageKey: string | null;
  logoUrl: string | null;
  coverImageUrl: string | null;
  closingImageUrl: string | null;
  companyDisplayName: string;
  companyTagline: string | null;
  companyPhone: string | null;
  companyEmail: string | null;
  companyAddressLines: string[];
  senderName: string | null;
  senderTitle: string | null;
  senderPhone: string | null;
  senderEmail: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuoteTemplateInput {
  name: string;
  isDefault?: boolean;
  companyDisplayName: string;
  companyTagline?: string | null;
  companyPhone?: string | null;
  companyEmail?: string | null;
  companyAddressLines: string[];
  senderName?: string | null;
  senderTitle?: string | null;
  senderPhone?: string | null;
  senderEmail?: string | null;
}

export function listQuoteTemplates(
  params: { page?: number; pageSize?: number; q?: string } = {},
): Promise<PagedResult<QuoteTemplate>> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('pageSize', String(params.pageSize));
  if (params.q) query.set('q', params.q);
  const qs = query.toString();
  return request(`/quote-templates${qs ? `?${qs}` : ''}`);
}

export function getQuoteTemplate(id: string): Promise<QuoteTemplate> {
  return request(`/quote-templates/${id}`);
}

export function createQuoteTemplate(input: QuoteTemplateInput): Promise<QuoteTemplate> {
  return request('/quote-templates', { method: 'POST', body: JSON.stringify(input) });
}

export function updateQuoteTemplate(
  id: string,
  input: Partial<QuoteTemplateInput>,
): Promise<QuoteTemplate> {
  return request(`/quote-templates/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function deleteQuoteTemplate(id: string): Promise<void> {
  return request(`/quote-templates/${id}`, { method: 'DELETE' });
}

export function setDefaultQuoteTemplate(id: string): Promise<QuoteTemplate> {
  return request(`/quote-templates/${id}/set-default`, { method: 'POST' });
}

export type QuoteTemplateImageSlot = 'logo' | 'cover-image' | 'closing-image';

export function uploadQuoteTemplateImage(
  id: string,
  slot: QuoteTemplateImageSlot,
  file: File,
): Promise<QuoteTemplate> {
  const formData = new FormData();
  formData.append('file', file);
  return request(`/quote-templates/${id}/${slot}`, { method: 'POST', body: formData });
}

export function removeQuoteTemplateImage(
  id: string,
  slot: QuoteTemplateImageSlot,
): Promise<QuoteTemplate> {
  return request(`/quote-templates/${id}/${slot}`, { method: 'DELETE' });
}

/** Markali yazdirma sayfasinin (quote-template-print-page.tsx) tek seferlik veri ucu. */
export type QuotePrintData = Omit<Quote, 'template'> & {
  template: Pick<
    QuoteTemplate,
    | 'id'
    | 'name'
    | 'logoUrl'
    | 'coverImageUrl'
    | 'closingImageUrl'
    | 'companyDisplayName'
    | 'companyTagline'
    | 'companyPhone'
    | 'companyEmail'
    | 'companyAddressLines'
    | 'senderName'
    | 'senderTitle'
    | 'senderPhone'
    | 'senderEmail'
  > | null;
};

export function getQuotePrintData(quoteId: string): Promise<QuotePrintData> {
  return request(`/quotes/${quoteId}/print-data`);
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
    pageSize?: number;
    accountId?: string;
    status?: PostSaleCaseStatus;
    q?: string;
  } = {},
): Promise<PagedResult<PostSaleCase>> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('pageSize', String(params.pageSize));
  if (params.accountId) query.set('accountId', params.accountId);
  if (params.status) query.set('status', params.status);
  if (params.q) query.set('q', params.q);
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
  title: string | null;
  quoteId: string | null;
  /** Siparisin kendi projectId alani YOK - proje iliskisi her zaman quote.project
   * uzerinden okunur (bkz. Quote.project doc comment'i). quoteId opsiyonel oldugu
   * icin (ad-hoc, 2026-09-28: /siparisler/yeni'den teklifsiz siparis) quote da
   * null olabilir. */
  quote: (Quote & { project: Project | null }) | null;
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
  quoteId?: string | null;
  title?: string | null;
}

export interface CreatePurchaseOrderItemInput {
  productId?: string;
  description: string;
  quantity: number;
}

export interface CreatePurchaseOrderInput {
  quoteId?: string;
  title?: string;
  items: CreatePurchaseOrderItemInput[];
}

export function listPurchaseOrders(
  params: {
    page?: number;
    pageSize?: number;
    quoteId?: string;
    projectId?: string;
    status?: PurchaseOrderStatus;
    q?: string;
  } = {},
): Promise<PagedResult<PurchaseOrder>> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('pageSize', String(params.pageSize));
  if (params.quoteId) query.set('quoteId', params.quoteId);
  if (params.projectId) query.set('projectId', params.projectId);
  if (params.status) query.set('status', params.status);
  if (params.q) query.set('q', params.q);
  const qs = query.toString();
  return request(`/purchase-orders${qs ? `?${qs}` : ''}`);
}

export function getPurchaseOrder(id: string): Promise<PurchaseOrder> {
  return request(`/purchase-orders/${id}`);
}

export function createPurchaseOrderFromQuote(quoteId: string): Promise<PurchaseOrder> {
  return request(`/quotes/${quoteId}/create-purchase-order`, { method: 'POST' });
}

export function createPurchaseOrder(input: CreatePurchaseOrderInput): Promise<PurchaseOrder> {
  return request('/purchase-orders', { method: 'POST', body: JSON.stringify(input) });
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

export interface StockItemWarehouseBreakdown {
  warehouseId: string;
  warehouseName: string;
  quantity: string;
}

export interface StockItem {
  id: string;
  productId: string;
  /** Depolar arasi toplam miktar. */
  quantity: string;
  product: {
    id: string;
    name: string;
    minStockLevel: number | null;
    /** Hareketli agirlikli ortalama maliyet (WAC) - bkz. docs/PLAN_STOK_MALIYET.md. */
    avgCost: string | null;
  };
  /** Satir genisletildiginde gosterilen depo bazli kirilim - sadece gercek StockItem
   * kaydi olan depoleri icerir. */
  warehouses: StockItemWarehouseBreakdown[];
  createdAt: string;
  updatedAt: string;
}

export type StockStatusFilter = 'low' | 'equal' | 'ok' | 'unknown';

export function listStockItems(
  params: {
    page?: number;
    pageSize?: number;
    q?: string;
    productListId?: string;
    brand?: string;
    category?: string;
    stockStatus?: StockStatusFilter;
    sort?: string;
  } = {},
): Promise<PagedResult<StockItem>> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('pageSize', String(params.pageSize));
  if (params.q) query.set('q', params.q);
  if (params.productListId) query.set('productListId', params.productListId);
  if (params.brand) query.set('brand', params.brand);
  if (params.category) query.set('category', params.category);
  if (params.stockStatus) query.set('stockStatus', params.stockStatus);
  if (params.sort) query.set('sort', params.sort);
  const qs = query.toString();
  return request(`/stock-items${qs ? `?${qs}` : ''}`);
}

export function listLowStockItems(): Promise<StockItem[]> {
  return request('/stock-items/low-stock');
}

/** Stok girisi (alim/parti) - unitCost zorunlu, WAC (hareketli agirlikli ortalama
 * maliyet) hesabina katkisi var. Bkz. docs/PLAN_STOK_MALIYET.md Faz 2/3. */
export function increaseStockItem(
  productId: string,
  warehouseId: string,
  quantity: number,
  unitCost: number,
  note?: string,
): Promise<StockItem> {
  return request(`/stock-items/${productId}/increase`, {
    method: 'POST',
    body: JSON.stringify({ warehouseId, quantity, unitCost, note: note || undefined }),
  });
}

/** Elle stok cikisi - maliyeti degistirmez, negatife dusmeye izin verilir. */
export function decreaseStockItem(
  productId: string,
  warehouseId: string,
  quantity: number,
  note?: string,
): Promise<StockItem> {
  return request(`/stock-items/${productId}/decrease`, {
    method: 'POST',
    body: JSON.stringify({ warehouseId, quantity, note: note || undefined }),
  });
}

export interface TransferStockInput {
  fromWarehouseId: string;
  toWarehouseId: string;
  quantity: number;
  note?: string;
}

export function transferStock(productId: string, input: TransferStockInput): Promise<StockItem> {
  return request(`/stock-items/${productId}/transfer`, {
    method: 'POST',
    body: JSON.stringify({ ...input, note: input.note || undefined }),
  });
}

export type StockMovementType =
  'INCREASE' | 'DECREASE' | 'QUOTE_SALE' | 'TRANSFER_OUT' | 'TRANSFER_IN' | 'CORRECTION';

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  warehouseId: string;
  warehouseName: string;
  userName: string;
  userEmail: string;
  type: StockMovementType;
  note: string | null;
  previousQuantity: number;
  /** Hareketin kendisi - her zaman pozitif, "yeni degeri" GOSTERMEZ (bkz. newQuantity). */
  quantity: number;
  newQuantity: number;
  delta: number;
  /** Sadece INCREASE'de dolu. */
  unitCost: number | null;
  previousAvgCost: number | null;
  newAvgCost: number | null;
  quoteId: string | null;
  createdAt: string;
}

export function listStockHistory(
  params: { productId?: string; warehouseId?: string; userId?: string } = {},
): Promise<StockMovement[]> {
  const query = new URLSearchParams();
  if (params.productId) query.set('productId', params.productId);
  if (params.warehouseId) query.set('warehouseId', params.warehouseId);
  if (params.userId) query.set('userId', params.userId);
  const qs = query.toString();
  return request(`/stock-items/history${qs ? `?${qs}` : ''}`);
}

export type MessageRelatedEntity = 'PROJECT' | 'QUOTE' | 'INTERACTION';
export type MessageRecipientKind = 'TO' | 'CC';

export interface MessageRecipient {
  id: string;
  userId: string;
  kind: MessageRecipientKind;
  readAt: string | null;
}

export interface MessageAttachment {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  url: string | null;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  subject: string;
  body: string;
  sentAt: string;
  relatedEntity: MessageRelatedEntity | null;
  relatedEntityId: string | null;
  isMeetingReport: boolean;
  recipients: MessageRecipient[];
  attachments: MessageAttachment[];
  createdAt: string;
  updatedAt: string;
}

/** POST /messages/attachments'in donusu - mesaj olusturulmadan once yuklenip
 * anahtari CreateMessageInput.attachments'ta referans verilir. */
export interface UploadedMessageAttachment {
  fileKey: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}

export interface ConversationSummary {
  conversationId: string;
  relatedEntity: MessageRelatedEntity | null;
  relatedEntityId: string | null;
  relatedEntityLabel: string | null;
  lastMessage: Message;
  messageCount: number;
  unreadCount: number;
  starred: boolean;
}

export interface ConversationDetail {
  conversationId: string;
  relatedEntity: MessageRelatedEntity | null;
  relatedEntityId: string | null;
  relatedEntityLabel: string | null;
  messages: Message[];
  starred: boolean;
}

export interface CreateMessageInput {
  /** Yeni konusma baslatirken zorunlu; conversationId ile yanit atarken
   * gonderilse bile yok sayilir - konu ilk mesajdan miras alinir. */
  subject?: string;
  body: string;
  toUserIds: string[];
  ccUserIds?: string[];
  relatedEntity?: MessageRelatedEntity;
  relatedEntityId?: string;
  conversationId?: string;
  attachments?: UploadedMessageAttachment[];
  /** Ajanda'daki "Toplanti Raporu Olustur" akisi: verilirse, mesaj olusturulduktan
   * sonra alicilara MEETING_REPORT_SENT bildirimi gonderilir. */
  meetingEventId?: string;
}

export function listMessages(
  params: {
    page?: number;
    pageSize?: number;
    q?: string;
    relatedEntity?: MessageRelatedEntity[];
    quoteIds?: string[];
    projectIds?: string[];
    interactionIds?: string[];
    recipientUserId?: string;
    isMeetingReport?: boolean;
  } = {},
): Promise<PagedResult<ConversationSummary>> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('pageSize', String(params.pageSize));
  if (params.q) query.set('q', params.q);
  for (const type of params.relatedEntity ?? []) query.append('relatedEntity', type);
  for (const id of params.quoteIds ?? []) query.append('quoteIds', id);
  for (const id of params.projectIds ?? []) query.append('projectIds', id);
  for (const id of params.interactionIds ?? []) query.append('interactionIds', id);
  if (params.recipientUserId) query.set('recipientUserId', params.recipientUserId);
  if (params.isMeetingReport) query.set('isMeetingReport', 'true');
  const qs = query.toString();
  return request(`/messages${qs ? `?${qs}` : ''}`);
}

export function getConversation(conversationId: string): Promise<ConversationDetail> {
  return request(`/messages/${conversationId}`);
}

export function createMessage(input: CreateMessageInput): Promise<Message> {
  return request('/messages', { method: 'POST', body: JSON.stringify(input) });
}

export function uploadMessageAttachment(file: File): Promise<UploadedMessageAttachment> {
  const formData = new FormData();
  formData.append('file', file);
  return request('/messages/attachments', { method: 'POST', body: formData });
}

/** Kullanici mesaji gondermeden vazgecip eki kaldirirsa, R2'de yetim dosya
 * kalmamasi icin temizlik. */
export function deleteUnattachedMessageFile(fileKey: string): Promise<void> {
  return request(`/messages/attachments?key=${encodeURIComponent(fileKey)}`, {
    method: 'DELETE',
  });
}

export function setConversationRead(conversationId: string, read = true): Promise<void> {
  return request(`/messages/${conversationId}/read`, {
    method: 'PATCH',
    body: JSON.stringify({ read }),
  });
}

export function setConversationStar(conversationId: string, starred: boolean): Promise<void> {
  return request(`/messages/${conversationId}/star`, {
    method: 'PATCH',
    body: JSON.stringify({ starred }),
  });
}

export function listAssignableMessageUsers(): Promise<AssignableUser[]> {
  return request('/messages/assignable-users');
}

// --- Bildirimler -------------------------------------------------------------

/** Yeni bir bildirim turu eklendikce buraya da eklenir (bkz. CLAUDE.md, backend
 * NotificationType enum'iyla birebir esler). */
export type NotificationType =
  | 'CALENDAR_REMINDER_ASSIGNED'
  | 'CALENDAR_REMINDERS_DUE_TODAY'
  | 'CONTACT_INACTIVITY_ALERT'
  | 'CALENDAR_EVENT_INVITE'
  | 'CALENDAR_EVENT_RESPONSE'
  | 'CALENDAR_EVENT_UPDATED'
  | 'MEETING_REPORT_SENT'
  | 'QUOTE_REVISION_REQUESTED';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  readAt: string | null;
  createdAt: string;
}

export function listUnreadNotifications(): Promise<Notification[]> {
  return request('/notifications/unread');
}

export function listNotifications(
  params: { page?: number; pageSize?: number } = {},
): Promise<PagedResult<Notification>> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('pageSize', String(params.pageSize));
  const qs = query.toString();
  return request(`/notifications${qs ? `?${qs}` : ''}`);
}

export function setNotificationRead(id: string, read = true): Promise<void> {
  return request(`/notifications/${id}/read`, {
    method: 'PATCH',
    body: JSON.stringify({ read }),
  });
}

// --- Önbellek --------------------------------------------------------------

export function clearCache(): Promise<void> {
  return request('/cache/clear', { method: 'POST' });
}
