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
  usePurchaseOrderQuery,
  useSetPurchaseOrderItemCancelledMutation,
  useSetPurchaseOrderItemReceivedQuantityMutation,
  useUpdatePurchaseOrderMutation,
} from '../features/crm/use-purchase-orders';
import { ApiError, type PurchaseOrderItem, type PurchaseOrderStatus } from '../lib/api';
import { tr } from '../i18n/tr';

const STATUS_BADGE_VARIANT: Record<
  PurchaseOrderStatus,
  'success' | 'neutral' | 'warning' | 'danger'
> = {
  DRAFT: 'neutral',
  CONFIRMED: 'warning',
  PARTIALLY_RECEIVED: 'warning',
  FULLY_RECEIVED: 'success',
  COMPLETED: 'success',
  CANCELLED: 'danger',
};

const STATUS_OPTIONS: { value: PurchaseOrderStatus; label: string }[] = (
  ['DRAFT', 'CONFIRMED', 'PARTIALLY_RECEIVED', 'FULLY_RECEIVED', 'COMPLETED', 'CANCELLED'] as const
).map((status) => ({ value: status, label: tr.crm.purchaseOrders.statusOptions[status] }));

const DESCRIPTION_TRUNCATE_LENGTH = 40;

function DescriptionCell({
  item,
  onOpen,
}: {
  item: PurchaseOrderItem;
  onOpen: (item: PurchaseOrderItem) => void;
}) {
  if (!item.description) return <>—</>;
  if (item.description.length <= DESCRIPTION_TRUNCATE_LENGTH) return <>{item.description}</>;
  return (
    <button
      type="button"
      className="cursor-pointer text-left text-app-text hover:text-blue-600"
      onClick={() => onOpen(item)}
    >
      {`${item.description.slice(0, DESCRIPTION_TRUNCATE_LENGTH)}...`}
    </button>
  );
}

function buildItemColumns(params: {
  onOpenDescription: (item: PurchaseOrderItem) => void;
  onRequestEditReceipt: (item: PurchaseOrderItem) => void;
  onToggleCancelled: (item: PurchaseOrderItem) => void;
  isTogglingCancelled: boolean;
  selectedIds: Set<string>;
  onToggleSelected: (itemId: string) => void;
  allSelected: boolean;
  onToggleSelectAll: () => void;
  /** Siparis Iptal Edildi/Tamamlandi durumundayken true - bu nihai durumlarda
   * kalem teslim alma/iptal duzenlemesi UI'dan engellenir (SalesOrderDetailPage
   * ile ayni desen). */
  itemEditingDisabled: boolean;
}): TableColumn<PurchaseOrderItem>[] {
  return [
    {
      key: 'select',
      header: '',
      headerNode: params.itemEditingDisabled ? null : (
        <input
          type="checkbox"
          checked={params.allSelected}
          onChange={params.onToggleSelectAll}
          aria-label={tr.crm.purchaseOrders.detail.selectAllAria}
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
            aria-label={tr.crm.purchaseOrders.detail.selectRowAria}
            className="accent-app-primary cursor-pointer"
          />
        ),
    },
    {
      key: 'product',
      header: tr.crm.purchaseOrders.detail.productColumn,
      className: 'w-1/4',
      render: (item) => (
        <span className={item.isCancelled ? 'line-through' : undefined}>
          {item.product?.name ?? '—'}
        </span>
      ),
    },
    {
      key: 'description',
      header: tr.crm.purchaseOrders.detail.descriptionColumn,
      className: 'w-1/4 text-app-muted',
      render: (item) => <DescriptionCell item={item} onOpen={params.onOpenDescription} />,
    },
    {
      key: 'quantity',
      header: tr.crm.purchaseOrders.detail.quantityColumn,
      className: 'text-app-muted',
      render: (item) => item.quantity,
    },
    {
      key: 'received',
      header: tr.crm.purchaseOrders.detail.receivedColumn,
      className: 'text-app-muted',
      render: (item) => item.receivedQuantity,
    },
    {
      key: 'remaining',
      header: tr.crm.purchaseOrders.detail.remainingColumn,
      className: 'text-app-muted',
      render: (item) => String(Number(item.quantity) - Number(item.receivedQuantity)),
    },
    {
      key: 'actions',
      header: tr.crm.purchaseOrders.detail.actionsColumn,
      className: 'w-px',
      required: true,
      render: (item) => (
        <div className="flex items-center gap-1">
          <IconActionButton
            icon={Truck}
            tooltip={tr.crm.purchaseOrders.detail.editReceiptButton}
            disabled={params.itemEditingDisabled}
            onClick={() => params.onRequestEditReceipt(item)}
          />
          <IconActionButton
            icon={item.isCancelled ? Undo2 : Ban}
            tooltip={
              item.isCancelled
                ? tr.crm.purchaseOrders.detail.uncancelItemButton
                : tr.crm.purchaseOrders.detail.cancelItemButton
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

/** Satir rengi/sira onceligi: 0 = kirmizi (hic teslim alinmadi), 1 = sari
 * (kismi), 2 = yesil (tamami teslim alindi) - SalesOrderDetailPage ile ayni
 * desen. */
function receivingStatusPriority(item: PurchaseOrderItem): 0 | 1 | 2 {
  const quantity = Number(item.quantity);
  const received = Number(item.receivedQuantity);
  if (received >= quantity) {
    return 2;
  }
  if (received <= 0) {
    return 0;
  }
  return 1;
}

function itemRowClassName(item: PurchaseOrderItem): string {
  if (item.isCancelled) {
    return 'opacity-40 grayscale';
  }
  const ROW_CLASS_BY_PRIORITY = ['!bg-red-50', '!bg-yellow-50', '!bg-green-50'] as const;
  return ROW_CLASS_BY_PRIORITY[receivingStatusPriority(item)];
}

function sortItemsByReceivingStatus(items: PurchaseOrderItem[]): PurchaseOrderItem[] {
  return [...items].sort((a, b) => {
    if (a.isCancelled !== b.isCancelled) {
      return a.isCancelled ? 1 : -1;
    }
    return receivingStatusPriority(a) - receivingStatusPriority(b);
  });
}

interface EditReceivedQuantityModalProps {
  item: PurchaseOrderItem;
  isPending: boolean;
  onSubmit: (receivedQuantity: number) => void;
  onClose: () => void;
}

function EditReceivedQuantityModal({
  item,
  isPending,
  onSubmit,
  onClose,
}: EditReceivedQuantityModalProps) {
  const totalQuantity = Number(item.quantity);
  const [value, setValue] = useState(item.receivedQuantity);
  const parsedValue = Number(value);
  const isValid =
    value.trim() !== '' &&
    Number.isFinite(parsedValue) &&
    parsedValue >= 0 &&
    parsedValue <= totalQuantity;

  return (
    <Modal
      title={tr.crm.purchaseOrders.detail.editReceiptModal.title}
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
            {tr.crm.purchaseOrders.detail.editReceiptModal.save}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-sm text-app-muted">
          {tr.crm.purchaseOrders.detail.editReceiptModal.description(
            item.product?.name ?? '—',
            item.quantity,
          )}
        </p>
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <TextField
              label={tr.crm.purchaseOrders.detail.editReceiptModal.fieldLabel}
              type="number"
              min={0}
              max={totalQuantity}
              value={value}
              onChange={(event) => setValue(event.target.value)}
              error={
                !isValid ? tr.crm.purchaseOrders.detail.editReceiptModal.invalidError : undefined
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
            {tr.crm.purchaseOrders.detail.editReceiptModal.markAllButton}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function PurchaseOrderDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const purchaseOrderQuery = usePurchaseOrderQuery(id);
  const updateMutation = useUpdatePurchaseOrderMutation(id);
  const setReceivedQuantityMutation = useSetPurchaseOrderItemReceivedQuantityMutation(id);
  const setCancelledMutation = useSetPurchaseOrderItemCancelledMutation(id);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [descriptionModalItem, setDescriptionModalItem] = useState<PurchaseOrderItem | null>(null);
  const [editingItem, setEditingItem] = useState<PurchaseOrderItem | undefined>(undefined);
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

  if (purchaseOrderQuery.isPending) {
    return (
      <AppShell>
        <p className="text-sm text-app-muted">{tr.common.loading}</p>
      </AppShell>
    );
  }

  if (!purchaseOrderQuery.data) {
    return null;
  }

  const purchaseOrder = purchaseOrderQuery.data;
  const relatedProject = purchaseOrder.quote?.project ?? null;
  const displayItems = sortItemsByReceivingStatus(purchaseOrder.items);

  // Siparis Iptal Edildi/Tamamlandi durumundayken kalem teslim alma/iptal
  // duzenlemesi UI'dan engellenir (SalesOrderDetailPage ile ayni desen).
  const itemEditingDisabled =
    purchaseOrder.status === 'CANCELLED' || purchaseOrder.status === 'COMPLETED';

  const selectableItems = itemEditingDisabled
    ? []
    : displayItems.filter((item) => !item.isCancelled);

  const allItemsSelected =
    selectableItems.length > 0 && selectableItems.every((item) => selectedIds.has(item.id));

  function toggleSelectAll() {
    setSelectedIds(allItemsSelected ? new Set() : new Set(selectableItems.map((item) => item.id)));
  }

  async function handleBulkMarkReceived(received: boolean) {
    setBulkPending(true);
    try {
      await Promise.all(
        selectableItems
          .filter((item) => selectedIds.has(item.id))
          .map((item) =>
            setReceivedQuantityMutation.mutateAsync({
              itemId: item.id,
              receivedQuantity: received ? Number(item.quantity) : 0,
            }),
          ),
      );
      toast.success(
        received
          ? tr.crm.purchaseOrders.detail.bulkBar.markReceivedSuccess
          : tr.crm.purchaseOrders.detail.bulkBar.markNotReceivedSuccess,
      );
      setSelectedIds(new Set());
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : tr.crm.purchaseOrders.detail.bulkBar.markReceivedError,
      );
    } finally {
      setBulkPending(false);
    }
  }

  return (
    <AppShell>
      <div className="flex flex-col items-start gap-1">
        <BackLink to={'/teklifler'} label={tr.crm.purchaseOrders.detail.backToQuotes} />
        <BackLink to={'/siparisler'} label={tr.crm.purchaseOrders.detail.back} />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-bold text-app-text">{purchaseOrder.orderNumber}</h1>
        <PageHelp text={tr.help.purchaseOrderDetail} />
        <Badge variant={STATUS_BADGE_VARIANT[purchaseOrder.status]}>
          {tr.crm.purchaseOrders.statusOptions[purchaseOrder.status]}
        </Badge>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm font-semibold text-app-text">
          {tr.crm.purchaseOrders.detail.statusLabel}
          <select
            value={purchaseOrder.status}
            onChange={(event) => {
              const status = event.target.value as PurchaseOrderStatus;
              updateMutation.mutate(
                { status },
                {
                  onSuccess: () => toast.success(tr.crm.purchaseOrders.statusUpdateSuccess),
                  onError: (error) => {
                    toast.error(
                      error instanceof ApiError
                        ? error.message
                        : tr.crm.purchaseOrders.statusUpdateError,
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

        {purchaseOrder.quoteId && (
          <button
            type="button"
            onClick={() => setIsQuoteModalOpen(true)}
            className="text-sm font-semibold text-app-brand hover:underline"
          >
            {tr.crm.purchaseOrders.detail.relatedQuoteLink}
          </button>
        )}
        {relatedProject && (
          <button
            type="button"
            onClick={() => navigate(`/projeler/${relatedProject.projectNumber}`)}
            className="text-sm font-semibold text-app-brand hover:underline"
          >
            {tr.crm.purchaseOrders.detail.relatedProjectLink}
          </button>
        )}
      </div>

      <div className="mt-6 border-t border-app-border p-6">
        <h2 className="text-sm font-bold text-app-text">
          {tr.crm.purchaseOrders.detail.itemsTitle}
        </h2>

        <div className="mt-3">
          <Table
            bulkActionsVisible={!itemEditingDisabled && selectedIds.size > 0}
            selectedCount={selectedIds.size}
            bulkActions={[
              {
                key: 'mark-received',
                icon: PackageCheck,
                tooltip: tr.crm.purchaseOrders.detail.bulkBar.markReceived,
                onClick: () => handleBulkMarkReceived(true),
                disabled: bulkPending,
              },
              {
                key: 'mark-not-received',
                icon: PackageX,
                tooltip: tr.crm.purchaseOrders.detail.bulkBar.markNotReceived,
                onClick: () => handleBulkMarkReceived(false),
                disabled: bulkPending,
              },
              {
                key: 'clear-selection',
                icon: X,
                tooltip: tr.crm.purchaseOrders.detail.bulkBar.clearSelection,
                onClick: () => setSelectedIds(new Set()),
                disabled: bulkPending,
              },
            ]}
            columns={buildItemColumns({
              onOpenDescription: setDescriptionModalItem,
              onRequestEditReceipt: (item) => setEditingItem(item),
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
                          ? tr.crm.purchaseOrders.detail.uncancelItemSuccess
                          : tr.crm.purchaseOrders.detail.cancelItemSuccess,
                      );
                    },
                    onError: (error) => {
                      toast.error(
                        error instanceof ApiError
                          ? error.message
                          : item.isCancelled
                            ? tr.crm.purchaseOrders.detail.uncancelItemError
                            : tr.crm.purchaseOrders.detail.cancelItemError,
                      );
                    },
                  },
                );
              },
            })}
            data={displayItems}
            keyField={(item) => item.id}
            emptyMessage={tr.crm.purchaseOrders.detail.itemsEmpty}
            rowClassName={itemRowClassName}
            fixedLayout
          />
        </div>
      </div>

      {descriptionModalItem && (
        <Modal
          title={tr.crm.purchaseOrders.detail.descriptionModal.title}
          onClose={() => setDescriptionModalItem(null)}
        >
          <div className="flex flex-col gap-3 text-sm">
            <div>
              <div className="text-xs font-semibold text-app-muted">
                {tr.crm.purchaseOrders.detail.descriptionModal.descriptionLabel}
              </div>
              <p className="mt-1 whitespace-pre-wrap text-app-text">
                {descriptionModalItem.description}
              </p>
            </div>
            <dl className="grid grid-cols-2 gap-3 border-t border-app-border pt-3">
              <div>
                <dt className="text-xs font-semibold text-app-muted">
                  {tr.crm.purchaseOrders.detail.descriptionModal.productLabel}
                </dt>
                <dd className="text-app-text">{descriptionModalItem.product?.name ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-app-muted">
                  {tr.crm.purchaseOrders.detail.descriptionModal.quantityLabel}
                </dt>
                <dd className="text-app-text">{descriptionModalItem.quantity}</dd>
              </div>
            </dl>
          </div>
        </Modal>
      )}

      {isQuoteModalOpen && purchaseOrder.quoteId && (
        <QuoteViewModal
          quoteId={purchaseOrder.quoteId}
          onClose={() => setIsQuoteModalOpen(false)}
        />
      )}

      {editingItem && (
        <EditReceivedQuantityModal
          item={editingItem}
          isPending={setReceivedQuantityMutation.isPending}
          onClose={() => setEditingItem(undefined)}
          onSubmit={(receivedQuantity) => {
            setReceivedQuantityMutation.mutate(
              { itemId: editingItem.id, receivedQuantity },
              {
                onSuccess: () => {
                  toast.success(tr.crm.purchaseOrders.detail.editReceiptSuccess);
                  setEditingItem(undefined);
                },
                onError: (error) => {
                  toast.error(
                    error instanceof ApiError
                      ? error.message
                      : tr.crm.purchaseOrders.detail.editReceiptError,
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
