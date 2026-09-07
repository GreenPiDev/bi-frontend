import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { QueryResult } from '../../../lib/api';
import { KpiCard } from './kpi-card';

function makeResult(value: number): QueryResult {
  return {
    columns: [{ name: 'toplam', type: 'NUMBER', label: 'Toplam Ciro' }],
    rows: [[value]],
    rowCount: 1,
    executionMs: 1,
    truncated: false,
  };
}

describe('KpiCard', () => {
  it('degeri tr-TR sayi formatinda gosterir', () => {
    render(<KpiCard result={makeResult(1234567)} />);
    expect(screen.getByText('1.234.567')).toBeInTheDocument();
    expect(screen.getByText('Toplam Ciro')).toBeInTheDocument();
  });

  it('format=currency ise para birimi ile gosterir', () => {
    render(<KpiCard result={makeResult(1000)} format="currency" />);
    expect(screen.getByText(/1\.000,00/)).toBeInTheDocument();
  });

  it('boyut secilmisse ilk NUMBER sutunu (olcuyu) hedef alir, boyutu degil (NaN regresyonu)', () => {
    const result: QueryResult = {
      columns: [
        { name: 'salesRepName', type: 'STRING', label: 'Satışçı' },
        { name: 'toplam', type: 'NUMBER', label: 'Adet' },
      ],
      rows: [['mustafa akagündüz', 42]],
      rowCount: 1,
      executionMs: 1,
      truncated: false,
    };
    render(<KpiCard result={result} />);
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('Adet')).toBeInTheDocument();
    expect(screen.queryByText('NaN')).not.toBeInTheDocument();
  });
});
