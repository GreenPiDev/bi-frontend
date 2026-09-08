import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProfilePage } from './profile-page';
import { ToastProvider } from '../components/ui/toast';
import * as api from '../lib/api';
import { createMockUser } from '../test/mock-user';

function baseProfile(overrides: Partial<api.UserProfile> = {}): api.UserProfile {
  return {
    ...createMockUser(),
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    lastLoginAt: null,
    ...overrides,
  };
}

function renderProfilePage() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter initialEntries={['/profile']}>
          <ProfilePage />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

describe('ProfilePage - Profil Fotografi (G2)', () => {
  beforeEach(() => {
    vi.spyOn(api, 'me').mockResolvedValue(createMockUser());
  });

  it('avatar yokken baslangic harfi gosterir ve "Fotoğraf Yükle" butonu cikar', async () => {
    vi.spyOn(api, 'getProfile').mockResolvedValue(
      baseProfile({ avatarUrl: null, name: 'Test Kullanici' }),
    );
    renderProfilePage();
    const uploadButton = await screen.findByRole('button', { name: 'Fotoğraf Yükle' });
    expect(uploadButton).toBeInTheDocument();
    expect(screen.getByText('Henüz fotoğraf eklenmemiş')).toBeInTheDocument();
  });

  it('avatar varsa gorseli gosterir ve "Fotoğrafı Değiştir"/"Fotoğrafı Kaldır" butonlari cikar', async () => {
    vi.spyOn(api, 'getProfile').mockResolvedValue(
      baseProfile({ avatarUrl: 'https://cdn.example.com/avatar.png' }),
    );
    renderProfilePage();
    const img = await screen.findByAltText('Profil fotoğrafı');
    expect(img).toHaveAttribute('src', 'https://cdn.example.com/avatar.png');
    expect(screen.getByRole('button', { name: 'Fotoğrafı Değiştir' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Fotoğrafı Kaldır' })).toBeInTheDocument();
  });

  it("dosya secince yukleme cagrilir ve basari toast'i gorunur", async () => {
    const user = userEvent.setup();
    vi.spyOn(api, 'getProfile').mockResolvedValue(baseProfile({ avatarUrl: null }));
    const uploadSpy = vi
      .spyOn(api, 'uploadAvatar')
      .mockResolvedValue(baseProfile({ avatarUrl: 'https://cdn.example.com/new.png' }));
    renderProfilePage();

    await screen.findByRole('button', { name: 'Fotoğraf Yükle' });
    const file = new File(['fake-bytes'], 'avatar.png', { type: 'image/png' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(fileInput, file);

    expect(uploadSpy).toHaveBeenCalledWith(file);
    expect(await screen.findByText('Profil fotoğrafı güncellendi.')).toBeInTheDocument();
  });

  it("desteklenmeyen dosya turunde yukleme cagrilmaz, hata toast'i gosterilir", async () => {
    // applyAccept:false - input'un accept niteligi jsdom'da userEvent tarafindan zaten
    // filtrelendigi icin (gif accept listesinde olmadigindan dosya hic uygulanmaz), bilesenin
    // kendi JS dogrulamasini (tarayici accept'i atlatilsa bile ikinci savunma hatti) test
    // edebilmek icin bu filtre burada devre disi birakiliyor.
    const user = userEvent.setup({ applyAccept: false });
    vi.spyOn(api, 'getProfile').mockResolvedValue(baseProfile({ avatarUrl: null }));
    const uploadSpy = vi.spyOn(api, 'uploadAvatar').mockClear();
    renderProfilePage();

    await screen.findByRole('button', { name: 'Fotoğraf Yükle' });
    const file = new File(['fake-bytes'], 'avatar.gif', { type: 'image/gif' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(fileInput, file);

    expect(uploadSpy).not.toHaveBeenCalled();
    expect(
      await screen.findByText('Sadece JPEG, PNG veya WEBP formatında görsel yüklenebilir.'),
    ).toBeInTheDocument();
  });

  it('"Fotoğrafı Kaldır" onaylaninca DELETE cagrilir', async () => {
    const user = userEvent.setup();
    vi.spyOn(api, 'getProfile').mockResolvedValue(
      baseProfile({ avatarUrl: 'https://cdn.example.com/avatar.png' }),
    );
    const deleteSpy = vi
      .spyOn(api, 'deleteAvatar')
      .mockResolvedValue(baseProfile({ avatarUrl: null }));
    renderProfilePage();

    await user.click(await screen.findByRole('button', { name: 'Fotoğrafı Kaldır' }));
    const dialog = await screen.findByRole('dialog', { name: 'Fotoğrafı kaldır' });
    await user.click(within(dialog).getByRole('button', { name: 'Fotoğrafı Kaldır' }));

    expect(deleteSpy).toHaveBeenCalled();
    expect(await screen.findByText('Profil fotoğrafı kaldırıldı.')).toBeInTheDocument();
  });
});
