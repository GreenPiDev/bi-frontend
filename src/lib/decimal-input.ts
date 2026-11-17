/**
 * Kullanicinin ondalik ayirac olarak nokta ya da virgul yazabildigi sayi alanlari
 * (orn. teklif satirindaki Miktar / Birim Fiyat) icin yardimcilar. Form state'inde
 * kullanicinin yazdigi ham metin tutulur (ekranda "12,5" yazan "12,5" gorur); canli
 * hesaplamalar `parseDecimalInput`, backend'e giden deger ise Zod semasindaki
 * `normalizeDecimalString` donusumu ile standart "12.5" bicimine cevrilir.
 *
 * Yorumlama kurallari:
 * - Hem nokta hem virgul varsa SON gelen ayirac ondaliktir, digerleri binlik ayiractir
 *   ("1.234,56" -> 1234.56, "1,234.56" -> 1234.56).
 * - Tek tur ayirac tek kez geciyorsa ondaliktir ("12,5" -> 12.5, "12.5" -> 12.5).
 * - Tek tur ayirac birden fazla geciyorsa binlik ayiractir ("1.234.567" -> 1234567).
 */

/** Ondalik ayiracin metindeki indeksi (yoksa -1) - dosya basindaki kurallarla ayni:
 * iki tur ayirac varsa sonuncusu, tek tur ayirac tek kez geciyorsa o. */
function findDecimalSeparatorIndex(value: string): number {
  const lastDot = value.lastIndexOf('.');
  const lastComma = value.lastIndexOf(',');
  if (lastDot !== -1 && lastComma !== -1) return Math.max(lastDot, lastComma);
  const index = Math.max(lastDot, lastComma);
  if (index === -1) return -1;
  return value.indexOf(value[index]) === index ? index : -1;
}

/**
 * Yazarken (ve gosterirken) uygulanan bicim: sadece rakam/nokta/virgul kalir, tam
 * sayi kismi her 3 basamakta bir boslukla gruplanir ("1234567,5" -> "1 234 567,5").
 * Kullanicinin sectigi ondalik ayirac (nokta ya da virgul) aynen korunur; tam sayi
 * kismina yazilmis binlik ayiraclar bosluga donusur. Bosluklar SADECE gorseldir -
 * `parseDecimalInput`/`normalizeDecimalString` onlari yok sayar, backend'e gitmez.
 * Idempotent: zaten bicimli bir metne tekrar uygulanabilir.
 */
export function formatDecimalTyping(raw: string): string {
  const value = raw.replace(/[^0-9.,]/g, '');
  const decimalIndex = findDecimalSeparatorIndex(value);
  const integerDigits = (decimalIndex === -1 ? value : value.slice(0, decimalIndex)).replace(
    /[.,]/g,
    '',
  );
  const grouped = integerDigits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  if (decimalIndex === -1) return grouped;
  const fraction = value.slice(decimalIndex + 1).replace(/[.,]/g, '');
  return `${grouped}${value[decimalIndex]}${fraction}`;
}

/**
 * Bicimli sayi input'unun onChange'i icin: yeni bicimli degeri dondurur ve imleci,
 * bosluklar eklenip/kalksa da kullanicinin yazdigi karakterin hemen arkasinda tutar
 * (kontrollu input'ta deger degisince tarayici imleci sona atar).
 */
export function formatDecimalInputChange(input: HTMLInputElement): string {
  const caret = input.selectionStart ?? input.value.length;
  const significantBeforeCaret = input.value.slice(0, caret).replace(/[^0-9.,]/g, '').length;
  const formatted = formatDecimalTyping(input.value);
  requestAnimationFrame(() => {
    if (document.activeElement !== input) return;
    let position = 0;
    let seen = 0;
    while (position < formatted.length && seen < significantBeforeCaret) {
      if (formatted[position] !== ' ') seen += 1;
      position += 1;
    }
    input.setSelectionRange(position, position);
  });
  return formatted;
}

/** Bicimli sayi input'unun onKeyDown'u icin: imlecin hemen yanindaki gruplama
 * boslugunu Backspace/Delete ile silmeye calisinca (bicimlendirme onu hemen geri
 * ekleyecegi icin hicbir sey olmazdi) imleci boslugun otesine alir, boylece
 * yanindaki rakam silinir. */
export function skipGroupingSpaceOnDelete(event: {
  key: string;
  currentTarget: HTMLInputElement;
}): void {
  const input = event.currentTarget;
  const start = input.selectionStart;
  if (start === null || start !== input.selectionEnd) return;
  if (event.key === 'Backspace' && input.value[start - 1] === ' ') {
    input.setSelectionRange(start - 1, start - 1);
  } else if (event.key === 'Delete' && input.value[start] === ' ') {
    input.setSelectionRange(start + 1, start + 1);
  }
}

/** Ham metni "1234.56" bicimine cevirir; gecersizse null. Bos metin icin ''. */
function toCanonical(raw: string): string | null {
  // Binlik gruplama bosluklari (formatDecimalTyping) sadece gorseldir.
  const value = raw.replace(/\s/g, '');
  if (!value) return '';
  if (!/^[0-9.,]+$/.test(value)) return null;

  const lastDot = value.lastIndexOf('.');
  const lastComma = value.lastIndexOf(',');
  let canonical: string;
  if (lastDot !== -1 && lastComma !== -1) {
    const decimalIndex = Math.max(lastDot, lastComma);
    const integerPart = value.slice(0, decimalIndex).replace(/[.,]/g, '');
    canonical = `${integerPart}.${value.slice(decimalIndex + 1)}`;
  } else {
    const separator = lastDot !== -1 ? '.' : lastComma !== -1 ? ',' : null;
    if (separator === null) {
      canonical = value;
    } else if (value.split(separator).length > 2) {
      canonical = value.split(separator).join('');
    } else {
      canonical = value.replace(separator, '.');
    }
  }
  if (canonical.endsWith('.')) canonical = canonical.slice(0, -1);
  if (canonical.startsWith('.')) canonical = `0${canonical}`;
  return /^\d+(\.\d+)?$/.test(canonical) ? canonical : null;
}

/** Nokta/virgul fark etmeksizin gecerli bir sayi mi (bos metin gecersiz). */
export function isValidDecimalInput(raw: string | undefined): boolean {
  const canonical = toCanonical(raw ?? '');
  return canonical !== null && canonical !== '';
}

/** Ham metnin sayisal degeri - bos/gecersizse NaN. */
export function parseDecimalInput(raw: string | undefined): number {
  const canonical = toCanonical(raw ?? '');
  return canonical ? Number(canonical) : Number.NaN;
}

/** Zod `transform`'u icin: gecerliyse "1234.56" bicimi, degilse metni aynen birakir
 * (gecersiz deger zaten ondeki `refine` ile reddedilir). */
export function normalizeDecimalString(raw: string): string {
  return toCanonical(raw) ?? raw;
}
