import { Canvas, FabricText, Group, Line, Rect, type FabricObject } from 'fabric';
import { clsx } from 'clsx';
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AppShell } from './app-shell';
import { BackLink } from '../components/ui/back-link';
import { Button } from '../components/ui/button';
import { TextField } from '../components/ui/text-field';
import { useToast } from '../components/ui/toast-context';
import {
  useDrawingQuery,
  useExportDrawingDxfMutation,
  useExportDrawingPdfMutation,
  useExportDrawingSvgMutation,
  useUpdateDrawingMutation,
} from '../features/crm/use-drawings';
import { downloadBlob } from '../lib/download';
import {
  ApiError,
  type DrawingElementInstance,
  type DrawingModel,
  type DrawingViewKey,
} from '../lib/api';
import { tr } from '../i18n/tr';

/** mm -> px olcek faktoru - 1000x2000mm'lik tipik bir pano 500x1000px'e sigar. */
const PX_PER_MM = 0.5;

type FabricObjectWithId = FabricObject & { elementId?: string };

function getGroupLabelText(group: Group): string {
  const textObj = group.getObjects().find((o): o is FabricText => o.type === 'text') as
    FabricText | undefined;
  return textObj?.text ?? '';
}

const VIEW_KEYS: readonly DrawingViewKey[] = ['internal', 'coverPlate', 'external'];

function viewLabel(key: DrawingViewKey): string {
  if (key === 'internal') return tr.crm.drawings.editor.viewInternal;
  if (key === 'coverPlate') return tr.crm.drawings.editor.viewCoverPlate;
  return tr.crm.drawings.editor.viewExternal;
}

export function DrawingEditorPage() {
  const { id = '' } = useParams();
  const toast = useToast();
  const drawingQuery = useDrawingQuery(id);
  const updateMutation = useUpdateDrawingMutation(id);
  const exportSvgMutation = useExportDrawingSvgMutation();
  const exportPdfMutation = useExportDrawingPdfMutation();
  const exportDxfMutation = useExportDrawingDxfMutation();

  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<Canvas | null>(null);
  const viewsRef = useRef<Record<DrawingViewKey, DrawingElementInstance[]> | null>(null);
  const plateRef = useRef<{ widthMm: number; heightMm: number } | null>(null);
  const busbarsRef = useRef<DrawingModel['busbars']>([]);

  const [ready, setReady] = useState(false);
  const [activeView, setActiveView] = useState<DrawingViewKey>('internal');
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [labelDraft, setLabelDraft] = useState('');

  // Model yuklenince bir kerelik ic referanslara kopyalanir - sonrasi (konum/aci/etiket
  // duzenleme) dogrudan bu referanslar uzerinden, React state'ini tetiklemeden yurur
  // (proje-1'in "model tek dogruluk kaynagi, canvas sadece view" ilkesi - burada
  // "model" React state'i degil bu mutable referanslardir, canvas'in kendisi de bir view).
  useEffect(() => {
    if (drawingQuery.data && !viewsRef.current) {
      viewsRef.current = {
        internal: drawingQuery.data.model.views.internal.elements,
        coverPlate: drawingQuery.data.model.views.coverPlate.elements,
        external: drawingQuery.data.model.views.external.elements,
      };
      plateRef.current = {
        widthMm: drawingQuery.data.model.plateWidthMm,
        heightMm: drawingQuery.data.model.plateHeightMm,
      };
      busbarsRef.current = drawingQuery.data.model.busbars;
      setReady(true);
    }
  }, [drawingQuery.data]);

  function flushCurrentView(view: DrawingViewKey) {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !viewsRef.current) return;
    const objects = canvas
      .getObjects()
      .filter((o): o is Group & FabricObjectWithId => Boolean((o as FabricObjectWithId).elementId));
    const existing = viewsRef.current[view];
    const updated = objects.map((obj) => {
      const original = existing.find((el) => el.id === obj.elementId);
      return {
        id: obj.elementId!,
        libraryComponentKey: original?.libraryComponentKey ?? '',
        category: original?.category ?? 'OTHER',
        bandKey: original?.bandKey ?? '',
        label: getGroupLabelText(obj),
        x: +((obj.left ?? 0) / PX_PER_MM).toFixed(2),
        y: +((obj.top ?? 0) / PX_PER_MM).toFixed(2),
        widthMm: original?.widthMm ?? 0,
        heightMm: original?.heightMm ?? 0,
        rotationDeg: +(obj.angle ?? 0).toFixed(2),
      } satisfies DrawingElementInstance;
    });
    viewsRef.current[view] = updated;
  }

  // Canvas'i aktif goruntu icin kurar - goruntu degistiginde (veya ilk yuklemede) tetiklenir.
  // Cleanup, bir SONRAKI goruntuye gecmeden once (veya unmount'ta) o anki canvas'in
  // konum/aci/etiket durumunu viewsRef'e geri yazar ("flush").
  useEffect(() => {
    if (!ready || !viewsRef.current || !plateRef.current || !canvasElRef.current) {
      return;
    }
    const view = activeView;
    const canvas = new Canvas(canvasElRef.current, { selection: true });
    fabricCanvasRef.current = canvas;

    const plateWpx = plateRef.current.widthMm * PX_PER_MM;
    const plateHpx = plateRef.current.heightMm * PX_PER_MM;
    canvas.setDimensions({ width: plateWpx, height: plateHpx });

    const plateRect = new Rect({
      left: 0,
      top: 0,
      width: plateWpx,
      height: plateHpx,
      fill: '#fafafa',
      stroke: '#000',
      strokeWidth: 1,
      selectable: false,
      evented: false,
    });
    canvas.add(plateRect);

    if (view === 'internal') {
      for (const bar of busbarsRef.current) {
        const line = new Line(
          [
            bar.startX * PX_PER_MM,
            bar.startY * PX_PER_MM,
            bar.endX * PX_PER_MM,
            bar.endY * PX_PER_MM,
          ],
          {
            stroke: '#d97706',
            strokeWidth: Math.max(1, bar.thicknessMm * PX_PER_MM),
            selectable: false,
            evented: false,
          },
        );
        canvas.add(line);
      }
    }

    for (const el of viewsRef.current[view]) {
      const wPx = el.widthMm * PX_PER_MM;
      const hPx = el.heightMm * PX_PER_MM;
      const rect = new Rect({
        left: 0,
        top: 0,
        width: wPx,
        height: hPx,
        fill: '#fff',
        stroke: '#222',
        strokeWidth: 1,
      });
      const text = new FabricText(el.label, {
        fontSize: 10,
        originX: 'center',
        originY: 'center',
        left: wPx / 2,
        top: hPx / 2,
      });
      const group = new Group([rect, text], {
        left: el.x * PX_PER_MM,
        top: el.y * PX_PER_MM,
        angle: el.rotationDeg,
      });
      group.setControlsVisibility({
        mt: false,
        mb: false,
        ml: false,
        mr: false,
        bl: false,
        br: false,
        tl: false,
        tr: false,
        mtr: true,
      });
      (group as unknown as FabricObjectWithId).elementId = el.id;
      canvas.add(group);
    }

    function handleSelection(e: { selected?: FabricObject[] }) {
      const obj = e.selected?.[0] as FabricObjectWithId | undefined;
      if (obj?.elementId) {
        setSelectedElementId(obj.elementId);
        setLabelDraft(getGroupLabelText(obj as unknown as Group));
      }
    }
    canvas.on('selection:created', handleSelection);
    canvas.on('selection:updated', handleSelection);
    canvas.on('selection:cleared', () => setSelectedElementId(null));

    return () => {
      flushCurrentView(view);
      canvas.dispose();
      fabricCanvasRef.current = null;
    };
    // viewsRef/plateRef/busbarsRef bilerek dependency disi (mutable ref, degisimleri
    // re-render tetiklememeli).
  }, [ready, activeView]);

  function handleLabelChange(newLabel: string) {
    setLabelDraft(newLabel);
    const canvas = fabricCanvasRef.current;
    if (!canvas || !selectedElementId) return;
    const obj = canvas
      .getObjects()
      .find((o) => (o as FabricObjectWithId).elementId === selectedElementId) as Group | undefined;
    if (!obj) return;
    const textObj = obj.getObjects().find((o): o is FabricText => o.type === 'text');
    textObj?.set('text', newLabel);
    canvas.requestRenderAll();
  }

  function handleSave() {
    flushCurrentView(activeView);
    if (!viewsRef.current || !plateRef.current) return;
    const model: DrawingModel = {
      plateWidthMm: plateRef.current.widthMm,
      plateHeightMm: plateRef.current.heightMm,
      views: {
        internal: { elements: viewsRef.current.internal },
        coverPlate: { elements: viewsRef.current.coverPlate },
        external: { elements: viewsRef.current.external },
      },
      busbars: busbarsRef.current,
    };
    updateMutation.mutate(
      { model },
      {
        onSuccess: () => toast.success(tr.crm.drawings.editor.saveSuccess),
        onError: (error) => {
          toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
        },
      },
    );
  }

  function handleExportSvg() {
    exportSvgMutation.mutate(
      { id, view: activeView },
      {
        onSuccess: (blob) =>
          downloadBlob(blob, `${drawingQuery.data?.name ?? 'cizim'}-${activeView}.svg`),
        onError: (error) => {
          toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
        },
      },
    );
  }

  function handleExportDxf() {
    exportDxfMutation.mutate(id, {
      onSuccess: (blob) => downloadBlob(blob, `${drawingQuery.data?.name ?? 'cizim'}.dxf`),
      onError: (error) => {
        toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
      },
    });
  }

  function handleExportPdf() {
    exportPdfMutation.mutate(id, {
      onSuccess: () => toast.success(tr.crm.drawings.editor.exportPdfSuccess),
      onError: (error) => {
        toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
      },
    });
  }

  if (drawingQuery.isPending || !ready) {
    return (
      <AppShell>
        <p className="text-sm text-app-muted">{tr.common.loading}</p>
      </AppShell>
    );
  }

  if (!drawingQuery.data) {
    return (
      <AppShell>
        <BackLink to="/cizim-ayarlari" label={tr.crm.drawings.editor.backLabel} />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <BackLink to="/cizim-ayarlari" label={tr.crm.drawings.editor.backLabel} />

      <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-bold text-app-text">{drawingQuery.data.name}</h1>
        <div className="flex flex-wrap items-center gap-2">
          {drawingQuery.data.exportFileUrl && (
            <a
              href={drawingQuery.data.exportFileUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-app-brand underline"
            >
              {tr.crm.drawings.editor.lastExportedAt}:{' '}
              {new Date(drawingQuery.data.exportedAt!).toLocaleString('tr-TR')}
            </a>
          )}
          <Button
            type="button"
            variant="secondary"
            onClick={handleExportSvg}
            disabled={exportSvgMutation.isPending}
          >
            {exportSvgMutation.isPending
              ? tr.crm.drawings.editor.exportingSvg
              : tr.crm.drawings.editor.exportSvgButton}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={handleExportDxf}
            disabled={exportDxfMutation.isPending}
          >
            {exportDxfMutation.isPending
              ? tr.crm.drawings.editor.exportingDxf
              : tr.crm.drawings.editor.exportDxfButton}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={handleExportPdf}
            disabled={exportPdfMutation.isPending}
          >
            {exportPdfMutation.isPending
              ? tr.crm.drawings.editor.exportingPdf
              : tr.crm.drawings.editor.exportPdfButton}
          </Button>
          <Button type="button" onClick={handleSave} disabled={updateMutation.isPending}>
            {updateMutation.isPending
              ? tr.crm.drawings.editor.saving
              : tr.crm.drawings.editor.saveButton}
          </Button>
        </div>
      </div>

      <div className="mt-4 flex gap-1 border-b border-app-border">
        {VIEW_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveView(key)}
            className={clsx(
              'border-b-2 px-4 py-2 text-sm font-semibold transition-colors',
              key === activeView
                ? 'border-app-brand text-app-brand'
                : 'border-transparent text-app-muted hover:text-app-text',
            )}
          >
            {viewLabel(key)}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-start gap-6">
        <div className="overflow-auto rounded-lg border border-app-border bg-white p-4">
          <canvas ref={canvasElRef} />
        </div>

        <div className="w-64">
          {selectedElementId ? (
            <TextField
              label={tr.crm.drawings.editor.selectedLabelLabel}
              value={labelDraft}
              onChange={(e) => handleLabelChange(e.target.value)}
            />
          ) : (
            <p className="text-xs text-app-muted">{tr.crm.drawings.editor.noSelectionHint}</p>
          )}
        </div>
      </div>
    </AppShell>
  );
}
