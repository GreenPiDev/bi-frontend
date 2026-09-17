const LEGACY_REMINDER_TITLE_PREFIX = 'Hatirlatma: ';

/** Eskiden hatirlatma baslikları "Hatirlatma: ..." onekiyle olusturuluyordu (bkz.
 * interactions.service.ts / opportunities.service.ts); onek artik eklenmiyor ama
 * daha once olusturulmus kayitlarda hala var - goruntulerken temizle. */
export function displayEventTitle(title: string): string {
  return title.startsWith(LEGACY_REMINDER_TITLE_PREFIX)
    ? title.slice(LEGACY_REMINDER_TITLE_PREFIX.length)
    : title;
}
