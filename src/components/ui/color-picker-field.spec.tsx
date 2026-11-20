import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ColorPickerField } from './color-picker-field';

describe('ColorPickerField', () => {
  it('tiklaninca hex girisi acilir, "#" olmadan yazilan kodu normalize eder', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ColorPickerField label="Yazılar" value="#16202e" onChange={onChange} />);

    expect(screen.queryByLabelText('Hex kodu')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Yazılar' }));

    const hexInput = screen.getByLabelText('Hex kodu');
    await user.clear(hexInput);
    await user.type(hexInput, 'ABC');
    expect(onChange).toHaveBeenLastCalledWith('#aabbcc');
  });

  it('hazir renk secilince o rengi gonderir', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ColorPickerField label="Başlık" value="#000000" onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: 'Başlık' }));
    await user.click(screen.getByRole('button', { name: '#2196f3' }));
    expect(onChange).toHaveBeenCalledWith('#2196f3');
  });
});
