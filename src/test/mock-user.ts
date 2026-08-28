import type { AuthenticatedUser } from '../lib/api';

/** Testlerde /auth/me mock'lari icin ortak fabrika - varsayilan olarak tam yetkili
 * (isCompanyAdmin) bir kullanici doner, ihtiyaca gore override edilir. */
export function createMockUser(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    id: 'u1',
    tenantId: 't1',
    email: 'test@test.com',
    name: 'Test Kullanici',
    roles: [{ id: 'r1', name: 'COMPANYADMIN' }],
    isPlatformAdmin: false,
    permissions: { isCompanyAdmin: true, permissions: [] },
    ...overrides,
  };
}
