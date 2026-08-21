import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import App from './App';
import * as api from './lib/api';

describe('App', () => {
  it('girisi olmayan kullaniciyi / rotasinda /login e yonlendirir', async () => {
    vi.spyOn(api, 'me').mockRejectedValue(new api.ApiError('UNAUTHORIZED', 'Yetkisiz.', 401));
    window.history.pushState({}, '', '/');
    const queryClient = new QueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Hesabınıza giriş yapın' })).toBeInTheDocument();
    });
  });
});
