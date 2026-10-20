import { useState } from 'react';
import { Ban, PackageCheck, PackageX, Truck, Undo2, X } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppShell } from './app-shell';
import { QuoteViewModal } from './quote-view-modal';
import { BackLink } from '../components/ui/back-link';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { IconActionButton } from '../components/ui/icon-action-button';
import { Modal } from '../components/ui/modal';
import { PageHelp } from '../components/ui/page-help';
import { Table, type TableColumn } from '../components/ui/table';
import { TextField } from '../components/ui/text-field';
import { useToast } from '../components/ui/toast-context';
import {
  useSalesOrderQuery,
  useSetSalesOrderItemCancelledMutation,
  useSetSalesOrderItemDeliveredQuantityMutation,
  useUpdateSalesOrderStatusMutation,
} from '../features/crm/use-sales-orders';
import { ApiError, type Product, type SalesOrderStatus } from '../lib/api';
import { tr } from '../i18n/tr';

const STATUS_BADGE_VARIANT: Record<SalesOrderStatus, 'success' | 'neutral' | 'warning' | 'danger'> =
  {
    PENDING: 'neutral',
    PROCESSING: 'warning',
    READY_FOR_SHIPMENT: 'warning',
    SHIPPED: 'success',
    PARTIALLY_DELIVERED: 'warning',
    DELIVERED: 'success',
    COMPLETED: 'success',
    CANCELLED: 'danger',
  };

const STATUS_OPTIONS: { value: SalesOrderStatus; label: string }[] = (
  [
    'PENDING',
    'PROCESSING',
    'READY_FOR_SHIPMENT',
    'SHIPPED',
    'PARTIALLY_DELIVERED',
    'DELIVERED',
    'COMPLETED',
    'CANCELLED',
  ] as const
).map((status) => ({ value: status, label: tr.crm.salesOrders.statusOptions[status] }));

/** Hem Quote.items hem kendi SalesOrderItem'lari ayni kolonlarda gosterilebilir -
 * ikisi de product/quantity/unitPrice/currency/deliveredQuantity tasiyor (bkz.
 * SalesOrder.items alani). */
interface DisplayItem {
  id: string;
  product: Product;
  quantity: string;
  unitPrice: string;
  currency: string;
  deliveredQuantity: string;
  isCancelled: boolean;
}

function buildItemColumns(params: {
  onRequestEditDelivery: (item: DisplayItem) => void;
  onToggleCancelled: (item: DisplayItem) => void;
  isTogglingCancelled: boolean;
  selectedIds: Set<string>;
  onToggleSelected: (itemId: string) => void;
  allSelected: boolean;
  onToggleSelectAll: () => void;
  /** Siparis Iptal Edildi/Tamamlandi durumundayken true - bu nihai durumlarda
   * kalem teslimat/iptal duzenlemesi UI'dan engellenir (bkz. kullanici talebi:
   * otomatik durum senkronizasyonu bu durumlara dokunmamali, elle de kalem
   * degistirilmemeli). Durum tekrar baska bir seye cekilirse duzenleme acilir. */
  itemEditingDisabled: boolean;
}): TableColumn<DisplayItem>[] {
  return [
    {
      key: 'select',
      header: '',
      headerNode: params.itemEditingDisabled ? null : (
        <input
          type="checkbox"
          checked={params.allSelected}
          onChange={params.onToggleSelectAll}
          aria-label={tr.crm.salesOrders.detail.selectAllAria}
          className={`accent-app-primary cursor-pointer ${
            params.allSelected ? 'outline outline-2 outline-offset-1 outline-white' : ''
          }`}
        />
      ),
      className: 'w-8',
      required: true,
      render: (item) =>
        item.isCancelled || params.itemEditingDisabled ? null : (
          <input
            type="checkbox"
            checked={params.selectedIds.has(item.id)}
            onChange={() => params.onToggleSelected(item.id)}
            onClick={(event) => event.stopPropagation()}
            aria-label={tr.crm.salesOrders.detail.selectRowAria}
            className="accent-app-primary cursor-pointer"
          />
        ),
    },
    {
      key: 'product',
      header: tr.crm.salesOrders.detail.productColumn,
      className: 'w-[30%]',
      render: (item) => (
        <span className={item.isCancelled ? 'line-through' : undefined}>
          {item.product?.name ?? '—'}
        </span>
      ),
    },
    {
      key: 'quantity',
      header: tr.crm.salesOrders.detail.quantityColumn,
      className: 'w-[12%] text-app-muted',
      render: (item) => item.quantity,
    },
    {
      key: 'delivered',
      header: tr.crm.salesOrders.detail.deliveredColumn,
      className: 'w-[13%] text-app-muted',
      render: (item) => item.deliveredQuantity,
    },
    {
      key: 'remaining',
      header: tr.crm.salesOrders.detail.remainingColumn,
      className: 'w-[13%] text-app-muted',
      render: (item) => String(Number(item.quantity) - Number(item.deliveredQuantity)),
    },
    {
      key: 'unitPrice',
      header: tr.crm.salesOrders.detail.unitPriceColumn,
      className: 'w-[20%] text-app-muted',
      render: (item) => `${item.unitPrice} ${item.currency}`,
    },
    {
      key: 'actions',
      header: tr.crm.salesOrders.detail.actionsColumn,
      className: 'w-[14%]',
      required: true,
      render: (item) => (
        <div className="flex items-center gap-1">
          <IconActionButton
            icon={Truck}
            tooltip={tr.crm.salesOrders.detail.editDeliveryButton}
            disabled={params.itemEditingDisabled}
            onClick={() => params.onRequestEditDelivery(item)}
          />
          <IconActionButton
            icon={item.isCancelled ? Undo2 : Ban}
            tooltip={
              item.isCancelled
                ? tr.crm.salesOrders.detail.uncancelItemButton
                : tr.crm.salesOrders.detail.cancelItemButton
            }
            variant={item.isCancelled ? 'default' : 'danger'}
            disabled={params.isTogglingCancelled || params.itemEditingDisabled}
            onClick={() => params.onToggleCancelled(item)}
          />
        </div>
      ),
    },
  ];
}

/** Satir rengi/sira onceligi: 0 = kirmizi (hic gonderilmedi), 1 = sari (kismi),
 * 2 = yesil (tamami gonderildi) - bkz. kullanici talebi (hem renk hem siralama
 * bu aynı durum uzerinden). */
function deliveryStatusPriority(item: DisplayItem): 0 | 1 | 2 {
  const quantity = Number(item.quantity);
  const delivered = Number(item.deliveredQuantity);
  if (delivered >= quantity) {
    return 2;
  }
  if (delivered <= 0) {
    return 0;
  }
  return 1;
}

/** Iptal edilen kalem, teslimat durumu renginden bagimsiz olarak "golge gibi"
 * (soluk/gri) gorunur - bkz. kullanici talebi. */
function itemRowClassName(item: DisplayItem): string {
  if (item.isCancelled) {
    return 'opacity-40 grayscale';
  }
  const ROW_CLASS_BY_PRIORITY = ['!bg-red-50', '!bg-yellow-50', '!bg-green-50'] as const;
  return ROW_CLASS_BY_PRIORITY[deliveryStatusPriority(item)];
}

/** Siparis kalemlerini teslimat durumuna gore kirmizi -> sari -> yesil sirala
 * (bkz. kullanici talebi) - ayni durumdaki kalemler arasinda orijinal sira
 * korunur (Array.prototype.sort stabildir). Iptal edilen kalemler, teslimat
 * durumundan bagimsiz olarak her zaman en altta kalir (bkz. kullanici talebi -
 * iptal iptali geri alinana kadar "hayalet gibi" en altta durur). */
function sortItemsByDeliveryStatus(items: DisplayItem[]): DisplayItem[] {
  return [...items].sort((a, b) => {
    if (a.isCancelled !== b.isCancelled) {
      return a.isCancelled ? 1 : -1;
    }
    return deliveryStatusPriority(a) - deliveryStatusPriority(b);
  });
}

interface EditDeliveredQuantityModalProps {
  item: DisplayItem;
  isPending: boolean;
  onSubmit: (deliveredQuantity: number) => void;
  onClose: () => void;
}

/** "Tamamı Gönderildi"/"Geri Al" gibi ayrı aksiyonlar yerine tek bir miktar
 * düzenleme modalı - hem kısmi sevkiyat ("10 adetten 5'i gönderildi") hem kısmi
 * geri alma ("gönderilen 5'in 1'i geri alındı, 4 kaldı") aynı input üzerinden
 * yapılır (bkz. kullanıcı talebi). */
function EditDeliveredQuantityModal({
  item,
  isPending,
  onSubmit,
  onClose,
}: EditDeliveredQuantityModalProps) {
  const totalQuantity = Number(item.quantity);
  const [value, setValue] = useState(item.deliveredQuantity);
  const parsedValue = Number(value);
  const isValid =
    value.trim() !== '' &&
    Number.isFinite(parsedValue) &&
    parsedValue >= 0 &&
    parsedValue <= totalQuantity;

  return (
    <Modal
      title={tr.crm.salesOrders.detail.editDeliveryModal.title}
      onClose={onClose}
      width="sm"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
            {tr.common.cancel}
          </Button>
          <Button
            type="button"
            onClick={() => onSubmit(parsedValue)}
            disabled={isPending || !isValid}
          >
            {tr.crm.salesOrders.detail.editDeliveryModal.save}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-sm text-app-muted">
          {tr.crm.salesOrders.detail.editDeliveryModal.description(
            item.product?.name ?? '—',
            item.quantity,
          )}
        </p>
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <TextField
              label={tr.crm.salesOrders.detail.editDeliveryModal.fieldLabel}
              type="number"
              min={0}
              max={totalQuantity}
              value={value}
              onChange={(event) => setValue(event.target.value)}
              error={
                !isValid ? tr.crm.salesOrders.detail.editDeliveryModal.invalidError : undefined
              }
              className="[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
          </div>
          <Button
            type="button"
            variant="navy"
            onClick={() => setValue(item.quantity)}
            disabled={isPending}
          >
            {tr.crm.salesOrders.detail.editDeliveryModal.markAllButton}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function SalesOrderDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const salesOrderQuery = useSalesOrderQuery(id);
  const updateMutation = useUpdateSalesOrderStatusMutation(id);
  const setDeliveredQuantityMutation = useSetSalesOrderItemDeliveredQuantityMutation(id);
  const setCancelledMutation = useSetSalesOrderItemCancelledMutation(id);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<DisplayItem | undefined>(undefined);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkPending, setBulkPending] = useState(false);

  function toggleSelected(itemId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  }

  if (salesOrderQuery.isPending) {
    return (
      <AppShell>
        <p className="text-sm text-app-muted">{tr.common.loading}</p>
      </AppShell>
    );
  }

  if (!salesOrderQuery.data) {
    return null;
  }

  const salesOrder = salesOrderQuery.data;
  const relatedProject = salesOrder.quote?.project ?? null;
  // Teklifli siparislerde kalemler Quote.items'tan (MANUAL_TOTAL teklifte bos),
  // teklifsiz (manuel) siparislerde kendi SalesOrderItem'larindan gelir.
  const isManualTotalQuote = salesOrder.quote?.itemsEntryMode === 'MANUAL_TOTAL';
  const displayItems: DisplayItem[] = sortItemsByDeliveryStatus(
    salesOrder.quoteId ? (salesOrder.quote?.items ?? []) : salesOrder.items,
  );

  // Siparis Iptal Edildi/Tamamlandi durumundayken kalem teslimat/iptal
  // duzenlemesi UI'dan engellenir (bkz. kullanici talebi).
  const itemEditingDisabled =
    salesOrder.status === 'CANCELLED' || salesOrder.status === 'COMPLETED';

  // Iptal edilen kalemler secilemez - tumunu sec ve bulk islemler sadece aktif
  // kalemleri kapsar (bkz. kullanici talebi).
  const selectableItems = itemEditingDisabled
    ? []
    : displayItems.filter((item) => !item.isCancelled);

  const allItemsSelected =
    selectableItems.length > 0 && selectableItems.every((item) => selectedIds.has(item.id));

  function toggleSelectAll() {
    setSelectedIds(allItemsSelected ? new Set() : new Set(selectableItems.map((item) => item.id)));
  }

  async function handleBulkMarkDelivered(delivered: boolean) {
    setBulkPending(true);
    try {
      await Promise.all(
        selectableItems
          .filter((item) => selectedIds.has(item.id))
          .map((item) =>
            setDeliveredQuantityMutation.mutateAsync({
              itemId: item.id,
              deliveredQuantity: delivered ? Number(item.quantity) : 0,
            }),
          ),
      );
      toast.success(
        delivered
          ? tr.crm.salesOrders.detail.bulkBar.markDeliveredSuccess
          : tr.crm.salesOrders.detail.bulkBar.markNotDeliveredSuccess,
      );
      setSelectedIds(new Set());
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : tr.crm.salesOrders.detail.bulkBar.markDeliveredError,
      );
    } finally {
      setBulkPending(false);
    }
  }

  return (
    <AppShell>
      <BackLink to="/siparisler?tab=salesOrders" label={tr.crm.salesOrders.detail.back} />

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-bold text-app-text">{salesOrder.orderNumber}</h1>
        <PageHelp text={tr.help.salesOrderDetail} />
        <Badge variant={STATUS_BADGE_VARIANT[salesOrder.status]}>
          {tr.crm.salesOrders.statusOptions[salesOrder.status]}
        </Badge>
      </div>

      <p className="mt-1 text-sm text-app-muted">{salesOrder.account?.name}</p>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm font-semibold text-app-text">
          {tr.crm.salesOrders.detail.statusLabel}
          <select
            value={salesOrder.status}
            onChange={(event) => {
              const status = event.target.value as SalesOrderStatus;
              updateMutation.mutate(
                { status },
                {
                  onSuccess: () => toast.success(tr.crm.salesOrders.statusUpdateSuccess),
                  onError: (error) => {
                    toast.error(
                      error instanceof ApiError
                        ? error.message
                        : tr.crm.salesOrders.statusUpdateError,
                    );
                  },
                },
              );
            }}
            disabled={updateMutation.isPending}
            className="rounded-md border border-app-border bg-app-surface px-3 py-1.5 text-sm text-app-text outline-none focus:border-app-primary disabled:opacity-80"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {salesOrder.quoteId && (
          <button
            type="button"
            onClick={() => setIsQuoteModalOpen(true)}
            className="text-sm font-semibold text-app-brand hover:underline"
          >
            {tr.crm.salesOrders.detail.relatedQuoteLink}
          </button>
        )}
        {relatedProject && (
          <button
            type="button"
            onClick={() => navigate(`/projeler/${relatedProject.projectNumber}`)}
            className="text-sm font-semibold text-app-brand hover:underline"
          >
            {tr.crm.salesOrders.detail.relatedProjectLink}
          </button>
        )}
      </div>

      <div className="mt-6 border-t border-app-border p-6">
        <h2 className="text-sm font-bold text-app-text">{tr.crm.salesOrders.detail.itemsTitle}</h2>

        <div className="mt-3">
          {isManualTotalQuote ? (
            <p className="text-sm text-app-muted">{tr.crm.salesOrders.detail.itemsEmpty}</p>
          ) : (
            <>
              <Table
                bulkActionsVisible={!itemEditingDisabled && selectedIds.size > 0}
                bulkActions={[
                  {
                    key: 'mark-delivered',
                    icon: PackageCheck,
                    tooltip: tr.crm.salesOrders.detail.bulkBar.markDelivered,
                    onClick: () => handleBulkMarkDelivered(true),
                    disabled: bulkPending,
                  },
                  {
                    key: 'mark-not-delivered',
                    icon: PackageX,
                    tooltip: tr.crm.salesOrders.detail.bulkBar.markNotDelivered,
                    onClick: () => handleBulkMarkDelivered(false),
                    disabled: bulkPending,
                  },
                  {
                    key: 'clear-selection',
                    icon: X,
                    tooltip: tr.crm.salesOrders.detail.bulkBar.clearSelection,
                    onClick: () => setSelectedIds(new Set()),
                    disabled: bulkPending,
                  },
                ]}
                columns={buildItemColumns({
                  onRequestEditDelivery: (item) => setEditingItem(item),
                  isTogglingCancelled: setCancelledMutation.isPending,
                  selectedIds,
                  onToggleSelected: toggleSelected,
                  allSelected: allItemsSelected,
                  onToggleSelectAll: toggleSelectAll,
                  itemEditingDisabled,
                  onToggleCancelled: (item) => {
                    setCancelledMutation.mutate(
                      { itemId: item.id, isCancelled: !item.isCancelled },
                      {
                        onSuccess: () => {
                          toast.success(
                            item.isCancelled
                              ? tr.crm.salesOrders.detail.uncancelItemSuccess
                              : tr.crm.salesOrders.detail.cancelItemSuccess,
                          );
                        },
                        onError: (error) => {
                          toast.error(
                            error instanceof ApiError
                              ? error.message
                              : item.isCancelled
                                ? tr.crm.salesOrders.detail.uncancelItemError
                                : tr.crm.salesOrders.detail.cancelItemError,
                          );
                        },
                      },
                    );
                  },
                })}
                data={displayItems}
                keyField={(item) => item.id}
                emptyMessage={tr.crm.salesOrders.detail.itemsEmpty}
                rowClassName={itemRowClassName}
                fixedLayout
              />
            </>
          )}
        </div>
      </div>

      {isQuoteModalOpen && salesOrder.quoteId && (
        <QuoteViewModal quoteId={salesOrder.quoteId} onClose={() => setIsQuoteModalOpen(false)} />
      )}

      {editingItem && (
        <EditDeliveredQuantityModal
          item={editingItem}
          isPending={setDeliveredQuantityMutation.isPending}
          onClose={() => setEditingItem(undefined)}
          onSubmit={(deliveredQuantity) => {
            setDeliveredQuantityMutation.mutate(
              { itemId: editingItem.id, deliveredQuantity },
              {
                onSuccess: () => {
                  toast.success(tr.crm.salesOrders.detail.editDeliverySuccess);
                  setEditingItem(undefined);
                },
                onError: (error) => {
                  toast.error(
                    error instanceof ApiError
                      ? error.message
                      : tr.crm.salesOrders.detail.editDeliveryError,
                  );
                },
              },
            );
          }}
        />
      )}
    </AppShell>
  );
}
