import { describe, expect, it } from 'vitest';
import { reopenQuoteFormSchema } from './schemas';

describe('reopenQuoteFormSchema', () => {
  it('gerekce bos ise reddeder', () => {
    const result = reopenQuoteFormSchema.safeParse({ status: 'REVIZE', note: '   ' });
    expect(result.success).toBe(false);
  });

  it('hedef Onaylandi ise depo zorunlu', () => {
    const result = reopenQuoteFormSchema.safeParse({ status: 'APPROVED', note: 'x' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['warehouseId']);
  });

  it('hedef Reddedildi ise red sebebi zorunlu', () => {
    const result = reopenQuoteFormSchema.safeParse({ status: 'REJECTED', note: 'x' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['rejectionReason']);
  });

  it('gecerli bir gecisi kabul eder', () => {
    const result = reopenQuoteFormSchema.safeParse({
      status: 'REVIZE',
      note: 'Musteri degisiklik istedi',
    });
    expect(result.success).toBe(true);
  });
});
