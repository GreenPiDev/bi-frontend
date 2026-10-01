import { Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AppShell } from './app-shell';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { ConfirmModal } from '../components/ui/confirm-modal';
import { IconActionButton } from '../components/ui/icon-action-button';
import { PageHelp } from '../components/ui/page-help';
import { Pagination, Table, type TableColumn } from '../components/ui/table';
import { useToast } from '../components/ui/toast-context';
import { useMeQuery } from '../features/auth/use-auth';
import { useDeleteWarehouseMutation, useWarehousesQuery } from '../features/crm/use-warehouses';
import { WarehouseEditModal } from './warehouse-edit-modal';
import { ApiError, type Warehouse } from '../lib/api';
import { tr } from '../i18n/tr';

export function WarehousesListContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const backState = { from: `${location.pathname}${location.search}` };
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | undefined>(undefined);
  const [deletingWarehouse, setDeletingWarehouse] = useState<Warehouse | undefined>(undefined);
  const meQuery = useMeQuery();
  const pageSize = meQuery.data?.defaultPageSize ?? 25;
  const warehousesQuery = useWarehousesQuery({ page, pageSize });
  const deleteMutation = useDeleteWarehouseMutation();

  function handleConfirmDelete() {
    if (!deletingWarehouse) return;
    deleteMutation.mutate(deletingWarehouse.id, {
      onSuccess: () => {
        toast.success(tr.crm.warehouses.deleteSuccess);
        setDeletingWarehouse(undefined);
      },
      onError: (error) => {
        toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
      },
    });
  }

  const columns: TableColumn<Warehouse>[] = [
    {
      key: 'name',
      header: tr.crm.warehouses.nameColumn,
      required: true,
      render: (w) => (
        <span className="flex items-center gap-2 font-semibold text-app-text">
          {w.name}
          {w.isDefault && <Badge variant="info">{tr.crm.warehouses.defaultBadge}</Badge>}
        </span>
      ),
    },
    {
      key: 'address',
      header: tr.crm.warehouses.addressColumn,
      className: 'text-app-muted',
      render: (w) => w.address ?? '—',
    },
    {
      key: 'actions',
      header: tr.crm.warehouses.actionsColumn,
      className: 'w-px',
      required: true,
      render: (w) => (
        <div className="flex items-center gap-1">
          <IconActionButton
            icon={Pencil}
            tooltip={tr.crm.warehouses.editTooltip}
            onClick={() => setEditingWarehouse(w)}
          />
          <IconActionButton
            icon={Trash2}
            tooltip={tr.crm.warehouses.deleteTooltip}
            variant="danger"
            onClick={() => setDeletingWarehouse(w)}
          />
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-app-text">{tr.crm.warehouses.title}</h1>
            <PageHelp text={tr.help.warehouses} />
          </div>
          <p className="mt-1 text-sm text-app-muted">{tr.crm.warehouses.subtitle}</p>
        </div>
        <Button type="button" onClick={() => navigate('/depolar/yeni', { state: backState })}>
          {tr.crm.warehouses.newButton}
        </Button>
      </div>

      <Table
        columns={columns}
        data={warehousesQuery.data?.data ?? []}
        keyField={(warehouse) => warehouse.id}
        onRowClick={(warehouse) => setEditingWarehouse(warehouse)}
        isLoading={warehousesQuery.isPending}
        loadingMessage={tr.crm.warehouses.loading}
        emptyMessage={tr.crm.warehouses.empty}
      />

      {warehousesQuery.data && warehousesQuery.data.data.length > 0 && (
        <Pagination
          page={warehousesQuery.data.meta.page}
          totalPages={warehousesQuery.data.meta.totalPages}
          total={warehousesQuery.data.meta.total}
          onPageChange={setPage}
          onPrevious={() => setPage((p) => p - 1)}
          onNext={() => setPage((p) => p + 1)}
        />
      )}

      {editingWarehouse && (
        <WarehouseEditModal
          warehouse={editingWarehouse}
          onClose={() => setEditingWarehouse(undefined)}
        />
      )}

      {deletingWarehouse && (
        <ConfirmModal
          title={tr.crm.warehouses.deleteConfirmTitle}
          message={tr.crm.warehouses.deleteConfirm}
          confirmLabel={tr.crm.warehouses.deleteTooltip}
          isPending={deleteMutation.isPending}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeletingWarehouse(undefined)}
        />
      )}
    </>
  );
}

export function WarehousesListPage() {
  return (
    <AppShell>
      <WarehousesListContent />
    </AppShell>
  );
}
