import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../../components/ui/toast';
import * as api from '../../lib/api';
import { RolesSettingsSection } from './roles-settings-section';

function renderSection() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <RolesSettingsSection />
      </ToastProvider>
    </QueryClientProvider>,
  );
}

const PAGE_REGISTRY: api.PageDefinition[] = [
  { key: 'dashboards', label: 'Panolar' },
  { key: 'settings', label: 'Ayarlar' },
];

const ROLES: api.RoleView[] = [
  {
    id: 'role-admin',
    name: 'COMPANYADMIN',
    isSystem: true,
    isBasic: false,
    isCompanyAdmin: true,
    userCount: 1,
    permissions: [],
  },
  {
    id: 'role-sales',
    name: 'Satış',
    isSystem: false,
    isBasic: false,
    isCompanyAdmin: false,
    userCount: 2,
    permissions: [{ pageKey: 'dashboards', tabKey: null, action: 'VIEW' }],
  },
];

const USERS: api.SafeUser[] = [
  {
    id: 'u1',
    tenantId: 't1',
    email: 'ada@test.com',
    name: 'Ada Lovelace',
    roles: [{ id: 'role-sales', name: 'Satış' }],
    isPlatformAdmin: false,
  },
];

describe('RolesSettingsSection', () => {
  it('sistem rolu icin duzenle/sil butonlari yerine bilgi notu gosterir', async () => {
    vi.spyOn(api, 'listRoles').mockResolvedValue(ROLES);
    vi.spyOn(api, 'getPageRegistry').mockResolvedValue(PAGE_REGISTRY);
    vi.spyOn(api, 'listUsers').mockResolvedValue(USERS);

    renderSection();

    await screen.findByText('COMPANYADMIN');
    const systemRow = screen.getByText('COMPANYADMIN').closest('tr');
    expect(systemRow).not.toBeNull();
    expect(systemRow!.querySelector('button')).toBeNull();

    const dynamicRow = screen.getByRole('button', { name: 'Düzenle' }).closest('tr');
    expect(dynamicRow!.querySelector('button')).not.toBeNull();
  });

  it('yeni rol olusturma formu ad ve izinlerle POST /roles cagirir', async () => {
    const user = userEvent.setup();
    vi.spyOn(api, 'listRoles').mockResolvedValue(ROLES);
    vi.spyOn(api, 'getPageRegistry').mockResolvedValue(PAGE_REGISTRY);
    vi.spyOn(api, 'listUsers').mockResolvedValue(USERS);
    const createSpy = vi.spyOn(api, 'createRole').mockResolvedValue({
      ...ROLES[1],
      id: 'role-new',
      name: 'Depo Sorumlusu',
    });

    renderSection();
    await screen.findByText('COMPANYADMIN');

    await user.click(screen.getByRole('button', { name: '+ Yeni Rol' }));
    await user.type(await screen.findByLabelText('Rol adı'), 'Depo Sorumlusu');
    await user.click(screen.getByLabelText('Panolar - VIEW'));
    await user.click(screen.getByRole('button', { name: 'Kaydet' }));

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith({
        name: 'Depo Sorumlusu',
        permissions: [{ pageKey: 'dashboards', tabKey: null, actions: ['VIEW'] }],
      });
    });
  });

  it('rol silme, onay modalinda onaylandiktan sonra DELETE /roles/:id cagirir', async () => {
    const user = userEvent.setup();
    vi.spyOn(api, 'listRoles').mockResolvedValue(ROLES);
    vi.spyOn(api, 'getPageRegistry').mockResolvedValue(PAGE_REGISTRY);
    vi.spyOn(api, 'listUsers').mockResolvedValue(USERS);
    const deleteSpy = vi.spyOn(api, 'deleteRole').mockResolvedValue(undefined);

    renderSection();
    await screen.findByText('Satış');

    await user.click(screen.getByRole('button', { name: 'Sil' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Sil' }));

    await waitFor(() => {
      expect(deleteSpy).toHaveBeenCalledWith('role-sales');
    });
  });
});
