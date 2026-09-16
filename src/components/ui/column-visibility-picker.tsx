import { MultiSelect } from './multi-select';
import { tr } from '../../i18n/tr';

interface ColumnVisibilityPickerProps {
  columns: { key: string; label: string }[];
  value: string[];
  onChange: (value: string[]) => void;
}

/** Liste tablolarinin (firmalar, kisiler, urunler...) ortak "Gosterilecek kolonlar"
 * secicisi - /firmalar/yeni'deki "Firma Turu" ile ayni MultiSelect'in ustune kurulu.
 * Zorunlu (her zaman gorunur) kolonlar bu listeye hic girmez - sadece opsiyonel
 * kolonlar arasindan secim yapilir. Opsiyonel kolon yoksa hicbir sey render etmez. */
export function ColumnVisibilityPicker({ columns, value, onChange }: ColumnVisibilityPickerProps) {
  if (columns.length === 0) return null;

  return (
    <div className="w-full sm:w-64">
      <MultiSelect
        label={tr.common.columnPicker.label}
        placeholder={tr.common.columnPicker.placeholder}
        value={value}
        onChange={onChange}
        options={columns.map((c) => ({ value: c.key, label: c.label }))}
      />
    </div>
  );
}
