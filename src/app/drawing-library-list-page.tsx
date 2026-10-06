import { Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from './app-shell';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { ConfirmModal } from '../components/ui/confirm-modal';
import { IconActionButton } from '../components/ui/icon-action-button';
import { Table, type TableColumn } from '../components/ui/table';
import { useToast } from '../components/ui/toast-context';
import {
  useDeleteDrawingLibraryComponentMutation,
  useDrawingLibraryComponentsQuery,
} from '../features/crm/use-drawing-library';
import { DrawingLibraryComponentEditModal } from './drawing-library-component-edit-modal';
import { ApiError, type DrawingLibraryComponent } from '../lib/api';
import { tr } from '../i18n/tr';

export function DrawingLibraryListContent() {
  const navigate = useNavigate();
  const toast = useToast();
  const [editingComponent, setEditingComponent] = useState<DrawingLibraryComponent | undefined>(
    undefined,
  );
  const [deletingComponent, setDeletingComponent] = useState<DrawingLibraryComponent | undefined>(
    undefined,
  );
  const componentsQuery = useDrawingLibraryComponentsQuery();
  const deleteMutation = useDeleteDrawingLibraryComponentMutation();

  function handleConfirmDelete() {
    if (!deletingComponent) return;
    deleteMutation.mutate(deletingComponent.id, {
      onSuccess: () => {
        toast.success(tr.crm.drawingLibrary.deleteSuccess);
        setDeletingComponent(undefined);
      },
      onError: (error) => {
        toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
      },
    });
  }

  const columns: TableColumn<DrawingLibraryComponent>[] = [
    {
      key: 'name',
      header: tr.crm.drawingLibrary.nameColumn,
      required: true,
      render: (c) => (
        <span className="flex items-center gap-2 font-semibold text-app-text">
          {c.name}
          {c.isBuiltIn && <Badge variant="info">{tr.crm.drawingLibrary.builtInBadge}</Badge>}
        </span>
      ),
    },
    {
      key: 'key',
      header: tr.crm.drawingLibrary.keyColumn,
      className: 'font-mono text-xs text-app-muted',
      render: (c) => c.key,
    },
    {
      key: 'category',
      header: tr.crm.drawingLibrary.categoryColumn,
      render: (c) => c.category,
    },
    {
      key: 'size',
      header: tr.crm.drawingLibrary.sizeColumn,
      className: 'text-app-muted',
      render: (c) => `${c.defaultWidthMm} × ${c.defaultHeightMm}`,
    },
    {
      key: 'actions',
      header: tr.crm.drawingLibrary.actionsColumn,
      className: 'w-px',
      required: true,
      render: (c) => (
        <div className="flex items-center gap-1">
          <IconActionButton
            icon={Pencil}
            tooltip={tr.crm.drawingLibrary.editTooltip}
            onClick={() => setEditingComponent(c)}
          />
          <IconActionButton
            icon={Trash2}
            tooltip={tr.crm.drawingLibrary.deleteTooltip}
            variant="danger"
            onClick={() => setDeletingComponent(c)}
          />
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <p className="text-sm text-app-muted">{tr.crm.drawingLibrary.subtitle}</p>
        <Button type="button" onClick={() => navigate('/cizim-kutuphanesi/yeni')}>
          {tr.crm.drawingLibrary.newButton}
        </Button>
      </div>

      <Table
        columns={columns}
        data={componentsQuery.data ?? []}
        keyField={(component) => component.id}
        onRowClick={(component) => setEditingComponent(component)}
        isLoading={componentsQuery.isPending}
        loadingMessage={tr.crm.drawingLibrary.loading}
        emptyMessage={tr.crm.drawingLibrary.empty}
      />

      {editingComponent && (
        <DrawingLibraryComponentEditModal
          component={editingComponent}
          onClose={() => setEditingComponent(undefined)}
        />
      )}

      {deletingComponent && (
        <ConfirmModal
          title={tr.crm.drawingLibrary.deleteConfirmTitle}
          message={tr.crm.drawingLibrary.deleteConfirm}
          confirmLabel={tr.crm.drawingLibrary.deleteTooltip}
          isPending={deleteMutation.isPending}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeletingComponent(undefined)}
        />
      )}
    </>
  );
}

export function DrawingLibraryListPage() {
  return (
    <AppShell>
      <DrawingLibraryListContent />
    </AppShell>
  );
}
