import { useNavigate, useParams } from 'react-router-dom';
import { AppShell } from './app-shell';
import { useProductQuery } from '../features/crm/use-products';
import { tr } from '../i18n/tr';

export function ProductDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const productQuery = useProductQuery(id);

  if (productQuery.isPending) {
    return (
      <AppShell>
        <p className="text-sm text-app-muted">{tr.common.loading}</p>
      </AppShell>
    );
  }

  if (!productQuery.data) {
    return null;
  }

  const product = productQuery.data;

  const fields: { label: string; value: string }[] = [
    { label: tr.crm.products.detail.skuLabel, value: product.sku ?? '—' },
    { label: tr.crm.products.detail.unitLabel, value: product.unit },
    {
      label: tr.crm.products.detail.minStockLevelLabel,
      value: product.minStockLevel !== null ? String(product.minStockLevel) : '—',
    },
    {
      label: tr.crm.products.detail.maxDiscountPctLabel,
      value: product.maxDiscountPct ? `%${product.maxDiscountPct}` : '—',
    },
  ];

  return (
    <AppShell>
      <button
        type="button"
        onClick={() => navigate('/urunler')}
        className="text-sm font-semibold text-app-muted hover:text-app-text"
      >
        {'←'} {tr.crm.products.detail.back}
      </button>

      <div className="mt-6">
        <h1 className="text-xl font-bold text-app-text">{product.name}</h1>
      </div>

      <dl className="mt-6 grid grid-cols-1 gap-4 rounded-xl border border-app-border bg-app-surface p-6 sm:grid-cols-2">
        {fields.map((field) => (
          <div key={field.label}>
            <dt className="text-xs font-semibold uppercase text-app-muted">{field.label}</dt>
            <dd className="mt-1 text-sm text-app-text">{field.value}</dd>
          </div>
        ))}
      </dl>
    </AppShell>
  );
}
