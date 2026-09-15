import { useNavigate } from 'react-router-dom';

interface BackLinkProps {
  to: string;
  label: string;
}

/** Sayfa üstündeki "← X'e dön" linki - tüm sayfalarda aynı davranış/görünüm
 * (imleç işaretçi + hover'da altı çizili) için tek yerden yönetilir. */
export function BackLink({ to, label }: BackLinkProps) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate(to)}
      className="cursor-pointer text-sm font-semibold text-app-muted hover:text-app-text hover:underline"
    >
      {'←'} {label}
    </button>
  );
}
