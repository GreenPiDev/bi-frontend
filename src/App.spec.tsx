import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import App from './App';
import * as api from './lib/api';

describe('App', () => {
  it('uygulama basligini gosterir', () => {
    vi.spyOn(api, 'getHealth').mockReturnValue(new Promise(() => {}));
    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>,
    );
    expect(screen.getByText('Pusula BI')).toBeInTheDocument();
  });
});
