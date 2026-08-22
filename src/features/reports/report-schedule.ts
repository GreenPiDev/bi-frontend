export type ReportFrequency = 'daily' | 'weekly';

const WEEKDAY_LABELS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

/** Kullaniciya "gunluk saat 08:00" gibi bir secim sunup arka planda cron string'ine
 * ceviriyoruz (CLAUDE.md'nin "kullanici teknik terim gormez" ilkesi, F11 icin). */
export function buildCron(frequency: ReportFrequency, time: string, weekday: number): string {
  const [hour, minute] = time.split(':').map((n) => Number(n));
  if (frequency === 'daily') {
    return `${minute} ${hour} * * *`;
  }
  return `${minute} ${hour} * * ${weekday}`;
}

const CRON_PATTERN = /^(\d+)\s+(\d+)\s+\*\s+\*\s+(\*|\d)$/;

export function describeCron(cron: string): string {
  const match = CRON_PATTERN.exec(cron);
  if (!match) return cron;
  const [, minute, hour, dow] = match;
  const time = `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
  if (dow === '*') return `Her gün saat ${time}`;
  return `Her ${WEEKDAY_LABELS[Number(dow)]} saat ${time}`;
}
