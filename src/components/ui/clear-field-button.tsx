import { X } from 'lucide-react';

/**
 * Filtre alanlarinda kullanilan tekil "sifirla" butonu - kenarlari yuvarlatilmis bir
 * kare icinde çarpı isareti. Opt-in: TextField/Select/DateField/AsyncAutocomplete'te
 * sadece `clearable` prop'u acikca verildiginde render edilir, bu bilesenlerin form
 * gibi diger kullanim yerlerini etkilemez.
 */
export function ClearFieldButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClick();
      }}
      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-app-bg-muted text-app-muted transition-colors hover:bg-app-border hover:text-app-text"
    >
      <X size={12} strokeWidth={2.5} />
    </button>
  );
}
