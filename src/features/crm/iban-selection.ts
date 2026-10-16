/** IbanSelect'in encode ettigi "option:<id>" / "group:<id>" degerlerini uretir/
 * ayirir - teklif formu (quote-form-page.tsx) submit
 * aninda bunu kullanarak secilen degerleri ibanOptionIds/ibanOptionGroupIds
 * dizilerine ayirir (kullanici talebi: birden fazla hesap/grup ayni teklife
 * eklenebilmeli, bkz. IbanOptionGroup doc comment'i). */
const IBAN_OPTION_PREFIX = 'option:';
const IBAN_GROUP_PREFIX = 'group:';

export function encodeIbanOptionSelection(id: string): string {
  return `${IBAN_OPTION_PREFIX}${id}`;
}

export function encodeIbanGroupSelection(id: string): string {
  return `${IBAN_GROUP_PREFIX}${id}`;
}

export function decodeIbanSelections(selections: string[]): {
  ibanOptionIds: string[];
  ibanOptionGroupIds: string[];
} {
  const ibanOptionIds: string[] = [];
  const ibanOptionGroupIds: string[] = [];
  for (const selection of selections) {
    if (selection.startsWith(IBAN_OPTION_PREFIX)) {
      ibanOptionIds.push(selection.slice(IBAN_OPTION_PREFIX.length));
    } else if (selection.startsWith(IBAN_GROUP_PREFIX)) {
      ibanOptionGroupIds.push(selection.slice(IBAN_GROUP_PREFIX.length));
    }
  }
  return { ibanOptionIds, ibanOptionGroupIds };
}

/** Duzenleme ekraninda Quote.ibanAccounts snapshot'ini (bkz. IbanAccountSnapshot) elden
 * guncel IbanOption/IbanOptionGroup listesine geri esleyip IbanSelect'in encode ettigi
 * secim dizisini ("option:<id>"/"group:<id>") uretir - snapshot FK degil oldugundan hangi
 * tanimin secili oldugu bilinmez, bu yuzden IBAN numarasi uzerinden eslestirilir. Bir
 * grubun TUM guncel hesaplari snapshot'ta eslesiyorsa grup secimi, aksi halde tekil hesap
 * secimi uretilir (kismi/silinmis/degismis gruplarda yanlis secim gostermemek icin). */
export function deriveIbanSelectionsFromSnapshot(
  snapshotAccounts: { iban: string; groupId: string | null }[],
  liveOptions: { id: string; iban: string; groupId: string | null }[],
): string[] {
  const snapshotIbans = new Set(snapshotAccounts.map((account) => account.iban));
  const matchedOptions = liveOptions.filter((option) => snapshotIbans.has(option.iban));
  const matchedOptionIds = new Set(matchedOptions.map((option) => option.id));

  const snapshotGroupIds = new Set(
    snapshotAccounts
      .map((account) => account.groupId)
      .filter((groupId): groupId is string => groupId !== null),
  );

  const selections: string[] = [];
  const consumedOptionIds = new Set<string>();

  for (const groupId of snapshotGroupIds) {
    const groupLiveOptions = liveOptions.filter((option) => option.groupId === groupId);
    const groupFullyMatched =
      groupLiveOptions.length > 0 &&
      groupLiveOptions.every((option) => matchedOptionIds.has(option.id));
    if (groupFullyMatched) {
      selections.push(encodeIbanGroupSelection(groupId));
      groupLiveOptions.forEach((option) => consumedOptionIds.add(option.id));
    }
  }

  for (const option of matchedOptions) {
    if (!consumedOptionIds.has(option.id)) {
      selections.push(encodeIbanOptionSelection(option.id));
    }
  }

  return selections;
}
