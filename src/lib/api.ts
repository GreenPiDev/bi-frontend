export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001/api/v1';

export type UserRole = 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER';

export interface SafeUser {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  role: UserRole;
  isPlatformAdmin: boolean;
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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const isFormData = init?.body instanceof FormData;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...init?.headers,
    },
  });

  if (!response.ok) {
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
