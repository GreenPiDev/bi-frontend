import { Eye, Pencil, Trash2 } from 'lucide-react';
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
  useDeleteDrawingPanelTemplateMutation,
  useDrawingPanelTemplatesQuery,
} from '../features/crm/use-drawing-templates';
import { DrawingPanelTemplateEditModal } from './drawing-panel-template-edit-modal';
import { ApiError, type DrawingPanelTemplate } from '../lib/api';
import { tr } from '../i18n/tr';

export function DrawingPanelTemplateListContent() {
  const navigate = useNavigate();
  const toast = useToast();
  const [editingTemplate, setEditingTemplate] = useState<DrawingPanelTemplate | undefined>(
    undefined,
  );
  const [deletingTemplate, setDeletingTemplate] = useState<DrawingPanelTemplate | undefined>(
    undefined,
  );
  const templatesQuery = useDrawingPanelTemplatesQuery();
  const deleteMutation = useDeleteDrawingPanelTemplateMutation();

  function handleConfirmDelete() {
    if (!deletingTemplate) return;
    deleteMutation.mutate(deletingTemplate.id, {
      onSuccess: () => {
        toast.success(tr.crm.drawingTemplates.deleteSuccess);
        setDeletingTemplate(undefined);
      },
      onError: (error) => {
        toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
      },
    });
  }

  const columns: TableColumn<DrawingPanelTemplate>[] = [
    {
      key: 'name',
      header: tr.crm.drawingTemplates.nameColumn,
      required: true,
      render: (t) => (
        <span className="flex items-center gap-2 font-semibold text-app-text">
          {t.name}
          {t.isBuiltIn && <Badge variant="info">{tr.crm.drawingTemplates.builtInBadge}</Badge>}
        </span>
      ),
    },
    {
      key: 'type',
      header: tr.crm.drawingTemplates.typeColumn,
      className: 'text-app-muted',
      render: (t) => tr.crm.drawingTemplates.typeLabels[t.type],
    },
    {
      key: 'size',
      header: tr.crm.drawingTemplates.sizeColumn,
      className: 'text-app-muted',
      render: (t) => `${t.widthMm} × ${t.heightMm}`,
    },
    {
      key: 'actions',
      header: tr.crm.drawingTemplates.actionsColumn,
      className: 'w-px',
      required: true,
      render: (t) => (
        <div className="flex items-center gap-1">
          <IconActionButton
            icon={Eye}
            tooltip={tr.crm.drawingTemplates.previewTooltip}
            onClick={() => navigate(`/pano-sablonlari/${t.id}/onizle`)}
          />
          <IconActionButton
            icon={Pencil}
            tooltip={tr.crm.drawingTemplates.editTooltip}
            onClick={() => setEditingTemplate(t)}
          />
          <IconActionButton
            icon={Trash2}
            tooltip={tr.crm.drawingTemplates.deleteTooltip}
            variant="danger"
            onClick={() => setDeletingTemplate(t)}
          />
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <p className="text-sm text-app-muted">{tr.crm.drawingTemplates.subtitle}</p>
        <Button type="button" onClick={() => navigate('/pano-sablonlari/yeni')}>
          {tr.crm.drawingTemplates.newButton}
        </Button>
      </div>

      <Table
        columns={columns}
        data={templatesQuery.data ?? []}
        keyField={(template) => template.id}
        onRowClick={(template) => setEditingTemplate(template)}
        isLoading={templatesQuery.isPending}
        loadingMessage={tr.crm.drawingTemplates.loading}
        emptyMessage={tr.crm.drawingTemplates.empty}
      />

      {editingTemplate && (
        <DrawingPanelTemplateEditModal
          template={editingTemplate}
          onClose={() => setEditingTemplate(undefined)}
        />
      )}

      {deletingTemplate && (
        <ConfirmModal
          title={tr.crm.drawingTemplates.deleteConfirmTitle}
          message={tr.crm.drawingTemplates.deleteConfirm}
          confirmLabel={tr.crm.drawingTemplates.deleteTooltip}
          isPending={deleteMutation.isPending}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeletingTemplate(undefined)}
        />
      )}
    </>
  );
}

export function DrawingPanelTemplateListPage() {
  return (
    <AppShell>
      <DrawingPanelTemplateListContent />
    </AppShell>
  );
}
