export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001/api/v1';

export type UserRole = 'OWNER' | 'ADMIN' | 'EDITOR' | 'SALES' | 'VIEWER';

export interface SafeUser {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  role: UserRole;
  isPlatformAdmin: boolean;
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

export interface RegisterInput {
  tenantName: string;
  name: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AcceptInvitationInput {
  name: string;
  password: string;
}

export interface InvitationInfo {
  tenantName: string;
  email: string;
  role: UserRole;
  expired: boolean;
}

export function register(input: RegisterInput): Promise<{ user: SafeUser }> {
  return request('/auth/register', { method: 'POST', body: JSON.stringify(input) });
}

export function login(input: LoginInput): Promise<{ user: SafeUser }> {
  return request('/auth/login', { method: 'POST', body: JSON.stringify(input) });
}

export function refresh(): Promise<{ user: SafeUser }> {
  return request('/auth/refresh', { method: 'POST' });
}

export function logout(): Promise<{ ok: true }> {
  return request('/auth/logout', { method: 'POST' });
}

export function me(): Promise<SafeUser> {
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

export function getInvitation(token: string): Promise<InvitationInfo> {
  return request(`/invitations/${token}`);
}

export function acceptInvitation(
  token: string,
  input: AcceptInvitationInput,
): Promise<{ user: SafeUser }> {
  return request(`/invitations/${token}/accept`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export interface TenantSummary {
  id: string;
  name: string;
  slug: string;
  plan: string;
  createdAt: string;
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

export function getPlatformTenants(): Promise<TenantSummary[]> {
  return request('/platform-admin/tenants');
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
