import { Link } from 'react-router-dom';
import { Select } from '../../components/ui/select';
import { tr } from '../../i18n/tr';
import { useDrawingLibraryComponentsQuery } from './use-drawing-library';

interface LibraryComponentSelectProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

/** `BrandSelect` ile aynı desen: tenant henüz "/cizim-ayarlari?tab=library" üzerinden bir
 * kütüphane komponenti tanımlamadıysa dropdown yerine oraya (yeni sekmede) yönlendiren bir
 * mesaj/link gösterilir. Serbest metin yerine bu listeden seçim yapılması, ürün formundaki
 * anahtarın gerçekte var olan bir komponentle eşleşmesini garanti eder. */
export function LibraryComponentSelect({ value, onChange, error }: LibraryComponentSelectProps) {
  const componentsQuery = useDrawingLibraryComponentsQuery();
  const components = componentsQuery.data ?? [];

  if (componentsQuery.isSuccess && components.length === 0) {
    return (
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold text-app-muted">
          {tr.crm.products.form.drawingSection.libraryComponentKeyLabel}
        </span>
        <div className="rounded-lg border border-dashed border-app-border bg-app-surface px-3.5 py-2.5 text-sm text-app-muted">
          {tr.crm.products.form.drawingSection.libraryComponentKeyEmptyMessage}{' '}
          <Link
            to="/cizim-ayarlari?tab=library"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-app-brand hover:underline"
          >
            {tr.crm.products.form.drawingSection.libraryComponentKeyEmptyLink}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <Select
      label={tr.crm.products.form.drawingSection.libraryComponentKeyLabel}
      placeholder={tr.crm.products.form.drawingSection.libraryComponentKeyPlaceholder}
      hint={tr.crm.products.form.drawingSection.libraryComponentKeyHint}
      error={error}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      options={components.map((component) => ({ value: component.key, label: component.name }))}
    />
  );
}
