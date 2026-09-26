import { clsx } from 'clsx';
import type { ButtonHTMLAttributes } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Tooltip } from './tooltip';

type IconActionVariant = 'default' | 'danger';

interface IconActionButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icon: LucideIcon;
  tooltip: string;
  variant?: IconActionVariant;
  iconSize?: number;
}

const VARIANT_CLASSES: Record<IconActionVariant, string> = {
  default: 'hover:text-app-text',
  danger: 'hover:text-red-600',
};

/** Proje genelindeki tablo/detay sayfası satır aksiyonları (duzenle/sil/onayla vb.) icin
 * tek, standart ikon-buton stili - tum ayri ayri yazilan Tooltip+button bloklarinin
 * yerine gecer. Ikon boyutu varsayilan olarak 20 (kullanici talebiyle buyutuldu, eskiden
 * dosya bazinda 14-18 arasinda degisen tutarsiz degerler vardi). */
export function IconActionButton({
  icon: Icon,
  tooltip,
  variant = 'default',
  iconSize = 20,
  className,
  onClick,
  ...props
}: IconActionButtonProps) {
  return (
    <Tooltip content={tooltip}>
      <button
        type="button"
        aria-label={tooltip}
        onClick={(event) => {
          event.stopPropagation();
          onClick?.(event);
        }}
        className={clsx(
          'rounded-lg p-2 text-app-muted transition-colors hover:bg-app-bg disabled:cursor-not-allowed disabled:opacity-60',
          VARIANT_CLASSES[variant],
          className,
        )}
        {...props}
      >
        <Icon size={iconSize} />
      </button>
    </Tooltip>
  );
}
