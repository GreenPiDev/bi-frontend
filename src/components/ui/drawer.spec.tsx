import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Drawer } from './drawer';

describe('Drawer', () => {
  it('baslik ve icerigi gosterir', () => {
    render(
      <Drawer title="Filtrele" onClose={vi.fn()}>
        <p>Filtre icerigi</p>
      </Drawer>,
    );
    expect(screen.getByRole('dialog', { name: 'Filtrele' })).toBeInTheDocument();
    expect(screen.getByText('Filtre icerigi')).toBeInTheDocument();
  });

  it('kapat butonuna tiklaninca onClose cagirilir', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Drawer title="Filtrele" onClose={onClose}>
        <p>Filtre icerigi</p>
      </Drawer>,
    );
    await user.click(screen.getByRole('button', { name: 'Kapat' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('ESC tusuna basilinca onClose cagirilir', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Drawer title="Filtrele" onClose={onClose}>
        <p>Filtre icerigi</p>
      </Drawer>,
    );
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('overlay tiklaninca onClose cagirilir, panel icine tiklaninca cagirilmaz', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Drawer title="Filtrele" onClose={onClose}>
        <p>Filtre icerigi</p>
      </Drawer>,
    );
    await user.click(screen.getByText('Filtre icerigi'));
    expect(onClose).not.toHaveBeenCalled();

    await user.click(screen.getByRole('dialog').parentElement as HTMLElement);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('footer verilirse gosterilir', () => {
    render(
      <Drawer title="Filtrele" onClose={vi.fn()} footer={<button type="button">Uygula</button>}>
        <p>Filtre icerigi</p>
      </Drawer>,
    );
    expect(screen.getByRole('button', { name: 'Uygula' })).toBeInTheDocument();
  });
});
