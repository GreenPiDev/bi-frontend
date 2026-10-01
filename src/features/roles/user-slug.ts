import { buildIdSlug, extractIdFromSlug } from '../../lib/slug';

/** Kullanici URL slug'i (`/settings/kullanicilar/:slug`) - genel `buildIdSlug`/
 * `extractIdFromSlug` (bkz. lib/slug.ts) uzerine ince, isimlendirme-amacli sarmalayicilar. */
export function buildUserSlug(user: { id: string; name: string }): string {
  return buildIdSlug(user);
}

export function extractUserId(slugParam: string): string {
  return extractIdFromSlug(slugParam);
}
