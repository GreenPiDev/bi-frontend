import { InlineSelect } from '../../components/ui/inline-select';
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

  return (
    <InlineSelect
      value={product.unit}
      options={options.map((option) => ({ value: option.label, label: option.label }))}
      disabled={updateMutation.isPending || Boolean(product.deletedAt)}
      selectClassName="text-app-muted disabled:opacity-50"
      onChange={(unit) => {
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
    />
  );
}
