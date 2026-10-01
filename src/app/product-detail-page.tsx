import { Pencil, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { AppShell } from './app-shell';
import { BackLink } from '../components/ui/back-link';
import { Badge } from '../components/ui/badge';
import { CircleIconButton } from '../components/ui/circle-icon-button';
import { ConfirmModal } from '../components/ui/confirm-modal';
import { PageHelp } from '../components/ui/page-help';
import { useToast } from '../components/ui/toast-context';
import { useDeleteProductMutation, useProductQuery } from '../features/crm/use-products';
import { ApiError } from '../lib/api';
import { tr } from '../i18n/tr';
import { ProductPriceMovements } from './product-price-history-page';

function MetaCell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-semibold tracking-wide text-app-muted uppercase">{label}</p>
      <div className="mt-1.5 text-sm font-medium text-app-text">{children}</div>
    </div>
  );
}

function SectionHeader({ children }: { children: ReactNode }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span className="shrink-0 text-[11px] font-bold tracking-wide text-app-muted uppercase">
        {children}
      </span>
      <span className="h-px flex-1 bg-app-border" />
    </div>
  );
}

export function ProductDetailPage() {
  const { id = '' } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const backTo = (location.state as { from?: string } | null)?.from ?? '/urunler';
  const productQuery = useProductQuery(id);
  const deleteMutation = useDeleteProductMutation();
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

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

  function handleDelete() {
    deleteMutation.mutate(product.id, {
      onSuccess: () => {
        toast.success(tr.crm.products.deleteSuccess);
        navigate(backTo);
      },
      onError: (error) => {
        toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
        setIsDeleteConfirmOpen(false);
      },
    });
  }

  const attributeEntries = Object.entries(product.attributes ?? {});

  return (
    <AppShell>
      <BackLink to={backTo} label={tr.crm.products.detail.back} />

      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-app-text">{product.name}</h1>
            <PageHelp text={tr.help.productDetail} />
            {product.deletedAt && <Badge variant="danger">{tr.crm.products.deletedBadge}</Badge>}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-app-muted">
            <span>{product.productList.name}</span>
            {product.brand && (
              <>
                <span className="text-app-border">•</span>
                <Badge variant="info">{product.brand}</Badge>
              </>
            )}
            {product.sku && (
              <>
                <span className="text-app-border">•</span>
                <span>
                  {tr.crm.products.detail.skuLabel}: {product.sku}
                </span>
              </>
            )}
          </div>
        </div>

        {!product.deletedAt && (
          <div className="flex items-center gap-2 pt-1">
            <CircleIconButton
              icon={Pencil}
              tooltip={tr.crm.products.detail.editButton}
              onClick={() =>
                navigate(`/urunler/duzenle/${product.id}`, { state: { from: backTo } })
              }
            />
            <CircleIconButton
              icon={Trash2}
              tooltip={tr.crm.products.detail.deleteButton}
              variant="danger"
              onClick={() => setIsDeleteConfirmOpen(true)}
            />
          </div>
        )}
      </div>

      {product.description && (
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-app-muted">
          {product.description}
        </p>
      )}

      <div className="mt-6 grid grid-cols-2 gap-4 rounded-xl border border-app-border bg-white p-5 sm:grid-cols-3 lg:grid-cols-6 sm:divide-x sm:divide-app-border">
        <MetaCell label={tr.crm.products.detail.unitLabel}>{product.unit}</MetaCell>
        <MetaCell label={tr.crm.products.detail.categoryLabel}>{product.category ?? '—'}</MetaCell>
        <MetaCell label={tr.crm.products.detail.priceLabel}>
          {product.price ? `${product.price} ${product.currency}` : '—'}
        </MetaCell>
        <MetaCell label={tr.crm.products.detail.avgCostLabel}>
          {product.avgCost ? `₺${product.avgCost}` : '—'}
        </MetaCell>
        <MetaCell label={tr.crm.products.detail.minStockLevelLabel}>
          {product.minStockLevel !== null ? String(product.minStockLevel) : '—'}
        </MetaCell>
        <MetaCell label={tr.crm.products.detail.maxDiscountPctLabel}>
          {product.maxDiscountPct ? `%${product.maxDiscountPct}` : '—'}
        </MetaCell>
      </div>

      <div className="mt-8 rounded-xl border border-app-border bg-white p-5">
        <SectionHeader>{tr.crm.products.detail.attributesTitle}</SectionHeader>
        {attributeEntries.length > 0 ? (
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {attributeEntries.map(([key, value]) => (
              <MetaCell key={key} label={key}>
                {value}
              </MetaCell>
            ))}
          </dl>
        ) : (
          <p className="text-sm text-app-muted">{tr.crm.products.detail.attributesEmpty}</p>
        )}
      </div>

      <div className="mt-8 rounded-xl border border-app-border bg-white p-5">
        <SectionHeader>{tr.crm.products.detail.priceHistoryTitle}</SectionHeader>
        <ProductPriceMovements productId={product.id} />
      </div>

      {isDeleteConfirmOpen && (
        <ConfirmModal
          title={tr.crm.products.deleteConfirmTitle}
          message={tr.crm.products.deleteConfirm}
          confirmLabel={tr.crm.products.detail.deleteButton}
          isPending={deleteMutation.isPending}
          onConfirm={handleDelete}
          onCancel={() => setIsDeleteConfirmOpen(false)}
        />
      )}
    </AppShell>
  );
}
