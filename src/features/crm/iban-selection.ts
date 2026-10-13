/** IbanSelect'in encode ettigi "option:<id>" / "group:<id>" degerini uretir/
 * ayirir - teklif formu (quote-form-page.tsx/quote-edit-page.tsx) submit
 * aninda bunu kullanarak ibanOptionId/ibanOptionGroupId'yi ayri ayri doldurur
 * (ikisi ayni anda backend'e gidemez, bkz. IbanOptionGroup doc comment'i). */
const IBAN_OPTION_PREFIX = 'option:';
const IBAN_GROUP_PREFIX = 'group:';

export function encodeIbanOptionSelection(id: string): string {
  return `${IBAN_OPTION_PREFIX}${id}`;
}

export function encodeIbanGroupSelection(id: string): string {
  return `${IBAN_GROUP_PREFIX}${id}`;
}

export function decodeIbanSelection(selection: string): {
  ibanOptionId?: string;
  ibanOptionGroupId?: string;
} {
  if (selection.startsWith(IBAN_OPTION_PREFIX)) {
    return { ibanOptionId: selection.slice(IBAN_OPTION_PREFIX.length) };
  }
  if (selection.startsWith(IBAN_GROUP_PREFIX)) {
    return { ibanOptionGroupId: selection.slice(IBAN_GROUP_PREFIX.length) };
  }
  return {};
}
