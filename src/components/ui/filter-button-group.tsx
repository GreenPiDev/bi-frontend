import { clsx } from 'clsx';

export interface FilterButtonOption<T extends string> {
  value: T;
  label: string;
}

interface FilterButtonGroupProps<T extends string> {
  label: string;
  value: T | '';
  onChange: (value: T | '') => void;
  options: FilterButtonOption<T>[];
  /** Tum kayitlari gosteren ilk secenegin metni. */
  allLabel: string;
  /** Verilirse her butonun yanina parantez icinde kayit sayisi eklenir (ör. "Taslak (5)").
   * Sayi henuz yuklenmemis (undefined) bir secenek icin parantez hic gosterilmez. */
  counts?: Partial<Record<T | '', number>>;
}

function buttonLabel(label: string, count: number | undefined) {
  return count === undefined ? label : `${label} (${count})`;
}

/**
 * Liste sayfalarinin durum/tip vb. tekli-secim filtrelerinde kullanilan genel amacli
 * buton grubu - dropdown yerine tablo uzerinde pill-buton filtresi gerektiren her ekranda
 * (teklifler, siparisler, firsatlar...) kullanilmak uzere tasarlandi.
 */
export function FilterButtonGroup<T extends string>({
  label,
  value,
  onChange,
  options,
  allLabel,
  counts,
}: FilterButtonGroupProps<T>) {
  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-app-muted">{label}</p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onChange('')}
          className={clsx(
            'rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors',
            value === ''
              ? 'border-app-brand bg-app-brand text-white'
              : 'border-app-border text-app-muted hover:bg-app-bg hover:text-app-text',
          )}
        >
          {buttonLabel(allLabel, counts?.[''])}
        </button>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={clsx(
              'rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors',
              value === option.value
                ? 'border-app-brand bg-app-brand text-white'
                : 'border-app-border text-app-muted hover:bg-app-bg hover:text-app-text',
            )}
          >
            {buttonLabel(option.label, counts?.[option.value])}
          </button>
        ))}
      </div>
    </div>
  );
}
