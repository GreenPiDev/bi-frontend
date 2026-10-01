import { buildIdSlug, extractIdFromSlug } from '../../lib/slug';

/** Firma URL slug'i - genel `buildIdSlug`/`extractIdFromSlug` (bkz. lib/slug.ts) uzerine
 * ince, isimlendirme-amacli sarmalayicilar. */
export function buildAccountSlug(account: { id: string; name: string }): string {
  return buildIdSlug(account);
}

export function extractAccountId(slugParam: string): string {
  return extractIdFromSlug(slugParam);
}
