export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001/api/v1';

export type UserRole = 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER';

export interface SafeUser {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  role: UserRole;
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
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
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
