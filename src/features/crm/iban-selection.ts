/** IbanSelect'in encode ettigi "option:<id>" / "group:<id>" degerlerini uretir/
 * ayirir - teklif formu (quote-form-page.tsx/quote-edit-page.tsx) submit
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
