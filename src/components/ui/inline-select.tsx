import { clsx } from 'clsx';
import { ChevronDown } from 'lucide-react';

export interface InlineSelectOption {
  value: string;
  label: string;
}

interface InlineSelectProps {
  value: string;
  options: InlineSelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  /** `<select>` elemanının kendisine eklenecek ek sınıflar (ör. renk/kalınlık) - çağıran
   * kendi renklendirmesini burada verir, temel stil (appearance/hover/padding) bileşenin
   * kendisinde sabit kalır. */
  selectClassName?: string;
  /** Mevcut değer `options` listesinde yoksa (ör. içe aktarma ile geldi ya da sonradan
   * silindi) yedek olarak gösterilecek etiket - verilmezse `value`'nun kendisi gösterilir. */
  currentLabel?: string;
}

/** Tablo hücrelerinde satır-içi düzenleme için tıklanabilir `<select>` - hücrenin kendisi
 * dropdown'dur, seçim değişince `onChange` çağrılır. Ok işareti tarayıcı varsayılanı yerine
 * metnin soluna alınmış özel bir `ChevronDown` ikonudur. `ProductListInlineSelect` ve
 * `ProductUnitSelect` bu bileşeni kullanır. */
export function InlineSelect({
  value,
  options,
  onChange,
  disabled,
  className,
  selectClassName,
  currentLabel,
}: InlineSelectProps) {
  const hasCurrentValue = options.some((option) => option.value === value);

  return (
    <div className={clsx('relative inline-flex items-center', className)}>
      <ChevronDown
        size={14}
        className="pointer-events-none absolute left-1.5 text-app-muted"
        aria-hidden="true"
      />
      <select
        value={value}
        onClick={(event) => event.stopPropagation()}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className={clsx(
          'cursor-pointer appearance-none rounded-md border-none bg-transparent py-1 pl-7 pr-2 -mx-2 -my-1 text-sm outline-none transition-colors hover:bg-[#1a2440] hover:text-white focus:ring-2 focus:ring-app-primary disabled:cursor-not-allowed',
          selectClassName,
        )}
      >
        {!hasCurrentValue && <option value={value}>{currentLabel ?? value}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
