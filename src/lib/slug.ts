const TR_CHAR_MAP: Record<string, string> = {
  ğ: 'g',
  ü: 'u',
  ş: 's',
  ı: 'i',
  ö: 'o',
  ç: 'c',
};

// Unicode combining diacritical marks block (U+0300-U+036F), left over after NFD normalization.
const COMBINING_MARKS_REGEX = /[̀-ͯ]/g;
const UUID_SUFFIX_REGEX = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function slugifyText(input: string): string {
  const lowered = input
    .toLowerCase()
    .split('')
    .map((char) => TR_CHAR_MAP[char] ?? char)
    .join('');

  return lowered
    .normalize('NFD')
    .replace(COMBINING_MARKS_REGEX, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

/**
 * Genel `{isim-slug}-{id}` URL slug'i - Account/User gibi garanti-unique bir "numara"
 * alani olmayan kayitlar icin (Project.projectNumber'in aksine, bkz. CLAUDE.md).
 * Cozumleme (extractIdFromSlug) her zaman sondaki UUID'den yapilir; isim kismi sadece
 * okunabilirlik icindir, isim degissc/iki kayit ayni ismi tasisa bile dogru kayda gider.
 */
export function buildIdSlug(entity: { id: string; name: string }): string {
  const base = slugifyText(entity.name);
  return base ? `${base}-${entity.id}` : entity.id;
}

/**
 * URL'deki slug'dan gercek id'yi cikarir - sondaki UUID'i arar. Bulamazsa (eski duz-id
 * linki ya da elle yazilmis bir id) parametrenin kendisini id sayar, boylece eski
 * `/.../{id}` bookmarklari da calismaya devam eder.
 */
export function extractIdFromSlug(slugParam: string): string {
  const match = slugParam.match(UUID_SUFFIX_REGEX);
  return match ? match[0] : slugParam;
}
