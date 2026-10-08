import type { MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import { buildUserSlug } from '../../features/roles/user-slug';

interface UserLinkProps {
  userId: string | null;
  name: string | null;
}

/** Liste tablolarindaki "olusturan"/"bizden ilgili" gibi kullanici isimlerini
 * /settings/kullanicilar/:slug detay sayfasina baglayan ortak link - satirin kendisi
 * de tiklanabilir oldugu icin (bkz. Table onRowClick) tiklama satirin navigasyonunu
 * tetiklemesin diye stopPropagation yapar. userId yoksa (silinmis kullanici vb.)
 * duz metin olarak gosterilir. */
export function UserLink({ userId, name }: UserLinkProps) {
  if (!userId || !name) {
    return <>{name ?? '—'}</>;
  }
  return (
    <Link
      to={`/settings/kullanicilar/${buildUserSlug({ id: userId, name })}`}
      className="cursor-pointer text-app-brand underline"
      onClick={(event: MouseEvent) => event.stopPropagation()}
    >
      {name}
    </Link>
  );
}
