import { useToast } from '../../components/ui/toast-context';
import { useUnitOptionsQuery } from './use-unit-options';
import { useUpdateProductMutation } from './use-products';
import { ApiError, type ProductWithStock } from '../../lib/api';
import { tr } from '../../i18n/tr';

export function ProductUnitSelect({ product }: { product: ProductWithStock }) {
  const toast = useToast();
  const unitOptionsQuery = useUnitOptionsQuery();
  const updateMutation = useUpdateProductMutation(product.id);
  const options = unitOptionsQuery.data ?? [];

  // Ürünün mevcut birimi tenant'ın tanımlı birim listesinde yoksa (ör. içe aktarma ile
  // geldi ya da sonradan silindi), listeye kaybolmadan eklenir - InteractionStatusSelect'in
  // aksine burada değer serbest metin olabildiği için bu durum olağan.
  const hasCurrentValue = options.some((option) => option.label === product.unit);

  return (
    <select
      value={product.unit}
      onClick={(event) => event.stopPropagation()}
      onChange={(event) => {
        const unit = event.target.value;
        updateMutation.mutate(
          { unit },
          {
            onSuccess: () => toast.success(tr.crm.products.unitUpdateSuccess),
            onError: (error) => {
              toast.error(
                error instanceof ApiError ? error.message : tr.crm.products.unitUpdateError,
              );
            },
          },
        );
      }}
      disabled={updateMutation.isPending || Boolean(product.deletedAt)}
      className="cursor-pointer rounded-md border-none bg-transparent px-2 py-1 -mx-2 -my-1 text-sm text-app-muted outline-none transition-colors hover:bg-[#1a2440] hover:text-white focus:ring-2 focus:ring-app-primary disabled:cursor-not-allowed disabled:opacity-50"
    >
      {!hasCurrentValue && <option value={product.unit}>{product.unit}</option>}
      {options.map((option) => (
        <option key={option.id} value={option.label}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
