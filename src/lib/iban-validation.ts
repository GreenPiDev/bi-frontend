/** ISO 13616 IBAN kayıt otoritesinin yayınladığı ülke koduna göre sabit toplam
 * uzunluk tablosu (ülke kodu dahil karakter sayısı). Kapsam: IBAN kullanan tüm
 * ülkeler (SEPA + SEPA dışı, ör. Türkiye, Brezilya, Suudi Arabistan). */
const IBAN_LENGTH_BY_COUNTRY: Record<string, number> = {
  AD: 24,
  AE: 23,
  AL: 28,
  AT: 20,
  AZ: 28,
  BA: 20,
  BE: 16,
  BG: 22,
  BH: 22,
  BR: 29,
  BY: 28,
  CH: 21,
  CR: 22,
  CY: 28,
  CZ: 24,
  DE: 22,
  DK: 18,
  DO: 28,
  EE: 20,
  EG: 29,
  ES: 24,
  FI: 18,
  FO: 18,
  FR: 27,
  GB: 22,
  GE: 22,
  GI: 23,
  GL: 18,
  GR: 27,
  GT: 28,
  HR: 21,
  HU: 28,
  IE: 22,
  IL: 23,
  IQ: 23,
  IS: 26,
  IT: 27,
  JO: 30,
  KW: 30,
  KZ: 20,
  LB: 28,
  LC: 32,
  LI: 21,
  LT: 20,
  LU: 20,
  LV: 21,
  LY: 25,
  MC: 27,
  MD: 24,
  ME: 22,
  MK: 19,
  MR: 27,
  MT: 31,
  MU: 30,
  NL: 18,
  NO: 15,
  PK: 24,
  PL: 28,
  PS: 29,
  PT: 25,
  QA: 29,
  RO: 24,
  RS: 22,
  SA: 24,
  SC: 31,
  SE: 24,
  SI: 19,
  SK: 24,
  SM: 27,
  ST: 25,
  SV: 28,
  TL: 23,
  TN: 24,
  TR: 26,
  UA: 29,
  VA: 22,
  VG: 24,
  XK: 20,
};

/** Görüntüleme/karşılaştırma amaçlı boşluksuz, büyük harf hali. Backend'e giden
 * değer de bu haliyle gönderilmelidir. */
export function normalizeIban(value: string): string {
  return value.replace(/\s+/g, '').toUpperCase();
}

const IBAN_MAX_LENGTH = Math.max(...Object.values(IBAN_LENGTH_BY_COUNTRY));

/** Kullanıcı yazarken input'ta okunabilirlik için her 4 karakterde bir boşluk
 * ekler (ör. "TR33 0006 1005 1978 6457 8413 26"). Gönderilecek değer her zaman
 * `normalizeIban` ile boşluksuz alınmalıdır - bu sadece görüntü formatıdır. */
export function formatIbanInput(rawValue: string): string {
  const cleaned = normalizeIban(rawValue)
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, IBAN_MAX_LENGTH);
  return (cleaned.match(/.{1,4}/g) ?? []).join(' ');
}

/** IBAN mod-97 checksum (ISO 7064): ilk 4 karakteri sona taşı, harfleri
 * sayıya çevir (A=10..Z=35), 97'ye bölümünden kalan 1 olmalı. */
function mod97Check(iban: string): boolean {
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let remainder = '';
  for (const char of rearranged) {
    const code = char.charCodeAt(0);
    const digits = code >= 65 && code <= 90 ? String(code - 55) : char;
    remainder += digits;
  }
  let remainderValue = 0;
  for (const digit of remainder) {
    remainderValue = (remainderValue * 10 + Number(digit)) % 97;
  }
  return remainderValue === 1;
}

export interface IbanValidationResult {
  isValid: boolean;
  /** Kullanıcıya gösterilecek Türkçe hata mesajı, geçerliyse undefined. */
  error?: string;
}

/** Dünyadaki tüm IBAN kullanan ülkeleri kabul eder, ama "saçma sapan" girişleri
 * (yanlış uzunluk, bilinmeyen ülke kodu, checksum tutmayan rastgele karakterler)
 * eler. Gerçek banka/hesap doğrulaması yapmaz - sadece format + checksum. */
export function validateIban(rawValue: string): IbanValidationResult {
  const iban = normalizeIban(rawValue);
  if (!iban) {
    return { isValid: false, error: 'IBAN numarası zorunludur.' };
  }
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(iban)) {
    return {
      isValid: false,
      error: 'IBAN, 2 harfli ülke kodu ve 2 haneli kontrol numarasıyla başlamalıdır.',
    };
  }
  const countryCode = iban.slice(0, 2);
  const expectedLength = IBAN_LENGTH_BY_COUNTRY[countryCode];
  if (!expectedLength) {
    return { isValid: false, error: `"${countryCode}" tanınan bir IBAN ülke kodu değil.` };
  }
  if (iban.length !== expectedLength) {
    return {
      isValid: false,
      error: `${countryCode} için IBAN ${expectedLength} karakter olmalıdır (girilen: ${iban.length}).`,
    };
  }
  if (!mod97Check(iban)) {
    return { isValid: false, error: 'Geçerli bir IBAN numarası giriniz.' };
  }
  return { isValid: true };
}
