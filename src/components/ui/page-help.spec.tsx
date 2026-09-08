import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { PageHelp } from './page-help';

describe('PageHelp', () => {
  it('yardim metnini varsayilan olarak gostermez, odaklaninca gosterir', async () => {
    const user = userEvent.setup();
    render(<PageHelp text="Bu ekran ne ise yarar aciklamasi." />);

    expect(screen.queryByText('Bu ekran ne ise yarar aciklamasi.')).not.toBeInTheDocument();

    await user.tab();
    expect(await screen.findByText('Bu ekran ne ise yarar aciklamasi.')).toBeInTheDocument();
  });

  it('erisilebilir bir yardim etiketiyle butondur', () => {
    render(<PageHelp text="Aciklama." />);
    expect(screen.getByRole('button', { name: 'Yardım' })).toBeInTheDocument();
  });
});
