import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { HorizontalTabPanel } from './horizontal-tab-panel';

const TABS = [
  { key: 'genel', label: 'Genel', content: <p>Genel icerik</p> },
  { key: 'roller', label: 'Roller', content: <p>Roller icerik</p> },
  { key: 'sayfalar', label: 'Sayfa Yonetimi', content: <p>Sayfa icerik</p> },
];

describe('HorizontalTabPanel', () => {
  it('ilk tab varsayilan olarak secili ve icerigi gorunur', () => {
    render(
      <MemoryRouter>
        <HorizontalTabPanel tabs={TABS} />
      </MemoryRouter>,
    );
    expect(screen.getByRole('tab', { name: 'Genel' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Genel icerik')).toBeInTheDocument();
    expect(screen.queryByText('Roller icerik')).not.toBeInTheDocument();
  });

  it('bir tab tiklaninca icerik degisir', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <HorizontalTabPanel tabs={TABS} />
      </MemoryRouter>,
    );
    await user.click(screen.getByRole('tab', { name: 'Roller' }));
    expect(screen.getByText('Roller icerik')).toBeInTheDocument();
    expect(screen.queryByText('Genel icerik')).not.toBeInTheDocument();
  });

  it('sag ok tusuyla bir sonraki taba gecer', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <HorizontalTabPanel tabs={TABS} />
      </MemoryRouter>,
    );
    screen.getByRole('tab', { name: 'Genel' }).focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Roller' })).toHaveFocus();
    expect(screen.getByText('Roller icerik')).toBeInTheDocument();
  });

  it('queryParam verildiginde ?tab= parametresi URL de tutulur', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/settings']}>
        <HorizontalTabPanel tabs={TABS} queryParam="tab" />
      </MemoryRouter>,
    );
    await user.click(screen.getByRole('tab', { name: 'Sayfa Yonetimi' }));
    expect(screen.getByText('Sayfa icerik')).toBeInTheDocument();
  });

  it('queryParam ile baslangic tab i URL den okunur', () => {
    render(
      <MemoryRouter initialEntries={['/settings?tab=roller']}>
        <HorizontalTabPanel tabs={TABS} queryParam="tab" />
      </MemoryRouter>,
    );
    expect(screen.getByText('Roller icerik')).toBeInTheDocument();
  });
});
