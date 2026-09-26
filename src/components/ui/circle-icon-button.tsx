import { clsx } from 'clsx';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Tooltip } from './tooltip';

type CircleIconVariant = 'primary' | 'success' | 'danger';

interface CircleIconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icon: LucideIcon;
  tooltip: string;
  variant?: CircleIconVariant;
  iconSize?: number;
  strokeWidth?: number;
  /** Rozet/sayaç gibi butonun ustune bindirilen ekstra icerik (badge overlay). */
  children?: ReactNode;
}

const VARIANT_CLASSES: Record<CircleIconVariant, string> = {
  primary: 'text-white',
  success: 'text-app-success',
  danger: 'text-[#ff5c5c]',
};

/** Proje genelindeki "yuvarlak koyu-lacivert" aksiyon butonu (yeni kayit/duzenle/sil/
 * filtrele/disa-aktar vb. sayfa basligi butonlari) icin tek, standart bicim - dosya dosya
 * tekrar edilen ayni Tooltip+button+className blogunun yerine gecer. */
export function CircleIconButton({
  icon: Icon,
  tooltip,
  variant = 'primary',
  iconSize = 20,
  strokeWidth,
  className,
  children,
  ...props
}: CircleIconButtonProps) {
  return (
    <Tooltip content={tooltip}>
      <button
        type="button"
        aria-label={tooltip}
        className={clsx(
          'relative flex h-11 w-11 items-center justify-center rounded-xl bg-[#1a2440] transition-colors hover:bg-[#141c33] disabled:cursor-not-allowed disabled:opacity-60',
          VARIANT_CLASSES[variant],
          className,
        )}
        {...props}
      >
        <Icon size={iconSize} strokeWidth={strokeWidth} />
        {children}
      </button>
    </Tooltip>
  );
}
