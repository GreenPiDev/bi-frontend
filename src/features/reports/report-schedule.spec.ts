import { describe, expect, it } from 'vitest';
import { buildCron, describeCron } from './report-schedule';

describe('buildCron', () => {
  it('gunluk sikliginda dakika-saat-*-*-* uretir', () => {
    expect(buildCron('daily', '08:00', 1)).toBe('0 8 * * *');
  });

  it('haftalik sikliginda haftanin gununu ekler', () => {
    expect(buildCron('weekly', '09:30', 1)).toBe('30 9 * * 1');
  });
});

describe('describeCron', () => {
  it('gunluk cron ifadesini Turkce aciklar', () => {
    expect(describeCron('0 8 * * *')).toBe('Her gün saat 08:00');
  });

  it('haftalik cron ifadesini gun adiyla aciklar', () => {
    expect(describeCron('30 9 * * 1')).toBe('Her Pazartesi saat 09:30');
  });

  it('taninmayan formati oldugu gibi dondurur', () => {
    expect(describeCron('*/5 * * * *')).toBe('*/5 * * * *');
  });
});
