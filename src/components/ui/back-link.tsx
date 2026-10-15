import { useNavigate } from 'react-router-dom';

interface BackLinkProps {
  to: string;
  label: string;
  /** `to` sayfasının kendi "nereden geldim" state'ini geri yüklemek için - zincirdeki bir
   * ara sayfadan (ör. /urunler/:id) bir üst listeye (ör. /urun-listeleri/:id) dönülürken bu
   * olmadan o sayfa kendi `location.state`'ini kaybedip varsayılan geri adresine düşer. */
  state?: unknown;
}

/** Sayfa üstündeki "← X'e dön" linki - tüm sayfalarda aynı davranış/görünüm
 * (imleç işaretçi + hover'da altı çizili) için tek yerden yönetilir. */
export function BackLink({ to, label, state }: BackLinkProps) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate(to, state !== undefined ? { state } : undefined)}
      className="cursor-pointer text-sm font-semibold text-app-muted hover:text-app-text hover:underline"
    >
      {'←'} {label}
    </button>
  );
}
