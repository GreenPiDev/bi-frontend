import { Select } from './select';
import type { TableSort } from './table';
import { tr } from '../../i18n/tr';

export interface SortPickerOption {
  /** Backend'in ListQuerySchema `sort` parametresinde bekledigi alan adi
   * (bkz. bi-backend core/dto/list-query.dto.ts parseSort). Bos string ("") verilirse
   * bu secenek "varsayilan siralama"yi (sort: null, backend'in kendi fallback'ine
   * doner - orn. products.service.ts'teki stok durumu sirasi) temsil eder; `direction`
   * bu durumda kullanilmaz ama tip uyumu icin hala verilmesi gerekir. */
  key: string;
  direction: TableSort['direction'];
  label: string;
}

interface SortPickerProps {
  options: SortPickerOption[];
  value: TableSort | null;
  onChange: (sort: TableSort | null) => void;
}

function optionValue(key: string, direction: TableSort['direction']): string {
  return key === '' ? '' : `${key}:${direction}`;
}

/** Liste tablolarinin "Gosterilecek kolonlar" seciciisinin yanina konan, tabloya
 * ozel sira secenekleri sunan tekil-secim dropdown'u. Her sayfa kendi kolonlarina
 * gore anlamli secenekleri (orn. "Ad Soyada gore A-Z") kendi tanimlar - Table
 * bilesenindeki kolon basligi tiklama sortu ile ayni `TableSort` state'ini kullanir,
 * sadece ikinci bir giris noktasi sunar.
 *
 * Secenek listesi `key: ''` ile acik bir "Varsayilan Siralama" secenegi iceriyorsa
 * (bkz. products-list-page.tsx) placeholder/clear butonu gereksiz hale gelir -
 * bu durumda otomatik olarak atlanir, var olan sayfalardaki (kisiler, firmalar)
 * placeholder+clear deseni degismeden kalir. */
export function SortPicker({ options, value, onChange }: SortPickerProps) {
  if (options.length === 0) return null;

  const hasExplicitDefault = options.some((option) => option.key === '');
  const selectedValue = value ? optionValue(value.key, value.direction) : '';

  return (
    <div className="w-full sm:w-64">
      <Select
        label={tr.common.sortPicker.label}
        placeholder={hasExplicitDefault ? undefined : tr.common.sortPicker.placeholder}
        value={selectedValue}
        onChange={(event) => {
          const raw = event.target.value;
          if (!raw) {
            onChange(null);
            return;
          }
          const [key, direction] = raw.split(':') as [string, TableSort['direction']];
          onChange({ key, direction });
        }}
        options={options.map((option) => ({
          value: optionValue(option.key, option.direction),
          label: option.label,
        }))}
        clearable={!hasExplicitDefault}
        onClear={hasExplicitDefault ? undefined : () => onChange(null)}
      />
    </div>
  );
}
