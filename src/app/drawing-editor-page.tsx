import { Canvas, Line, Rect, Textbox, type FabricObject, type TPointerEvent } from 'fabric';
import { clsx } from 'clsx';
import { Maximize, ZoomIn, ZoomOut } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AppShell } from './app-shell';
import { BackLink } from '../components/ui/back-link';
import { Button } from '../components/ui/button';
import { IconActionButton } from '../components/ui/icon-action-button';
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

/** Canli editor, panonun gercek mm boyutundan BAGIMSIZ, sabit bir "sayfa" kutusuna
 * (A4 kagidi hissi veren, ortalanmis, tasma/kaydirma olmayan) sigacak sekilde
 * olceklenir - export/PDF (render-svg.ts) kendi mm tabanli olcegini kullanir, bu
 * sabitlerden etkilenmez. Sabit bir PX_PER_MM (onceki yaklasim) hem kucuk panolarda
 * fontu okunamaz kucultuyor hem de buyuk panolarda sayfadan tasip kaydirma
 * gerektiriyordu (bkz. CLAUDE.md "Ad-hoc: Cizim Editoru Font/Clipping") - dogru cozum
 * sabit bir oran degil, HER panoyu bu kutuya sigdiran DINAMIK bir olcek. */
const PAGE_MAX_WIDTH_PX = 650;
const PAGE_MAX_HEIGHT_PX = 850;

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;
const ZOOM_STEP = 1.25;

/** engine/render-svg.ts#fitFontSize ile BIREBIR AYNI formul (mm biriminde) - export'ta
 * (PDF/SVG/DXF) etiketler kutuya sigacak sekilde kuculuyordu ama bu canli Fabric
 * editorunde sabit fontSize:10 kullanildigi icin dar komponentlerin (ornegin 50mm'lik
 * role kutusu) uzun urun adlari komsu kutulara/canvas kenarina tasip kesiliyordu -
 * gercek canvas piksel verisiyle dogrulandi (dark pixeller canvas'in son kolonuna
 * kadar kesintisiz devam ediyordu). Iki yerde ayri tutulmasi CLAUDE.md'nin "repo'lar
 * arasi tip/mantik kasitli olarak iki kez tanimlanir" kuraliyla tutarli (bkz. CLAUDE.md
 * SS3) - burada backend/frontend arasi, SVG/px birim farki yuzunden dogrudan paylasilamaz. */
function fitFontSizeMm(text: string, widthMm: number, heightMm: number): number {
  const len = Math.max(1, text.length);
  const byWidth = (0.85 * widthMm) / (len * 0.62);
  return Math.max(2.5, Math.min(byWidth, 0.45 * heightMm, 10));
}

/** `isLabel` ile kutu (Rect) mi etiket (Textbox) mi oldugunu ayirt ederiz - ikisi de
 * ayni `elementId`'yi tasir (kullanici talebi: "labelların da yerini/boyutunu
 * degistirebilmek" - artik kutudan BAGIMSIZ, kendi basina secilebilir/tasinabilir/
 * boyutlandirilabilir iki ayri Fabric nesnesi, eskiden tek bir Group'tu). */
type FabricObjectWithId = FabricObject & { elementId?: string; isLabel?: boolean };

function findRectById(canvas: Canvas, id: string): Rect | undefined {
  return canvas
    .getObjects()
    .find(
      (o) => (o as FabricObjectWithId).elementId === id && !(o as FabricObjectWithId).isLabel,
    ) as Rect | undefined;
}

function findLabelById(canvas: Canvas, id: string): Textbox | undefined {
  return canvas
    .getObjects()
    .find(
      (o) => (o as FabricObjectWithId).elementId === id && (o as FabricObjectWithId).isLabel,
    ) as Textbox | undefined;
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
  /** Panonun mm boyutunu PAGE_MAX_WIDTH/HEIGHT_PX kutusuna sigdiran dinamik olcek
   * (px/mm) - plate boyutu bilinir bilinmez bir kere hesaplanir, degismez. */
  const scaleRef = useRef<number>(1);
  /** Kullanicinin sectiği zoom carpani (1 = "sayfaya sig" taban olcek). Ref'te
   * tutulur ki goruntu (tab) degisince canvas yeniden kurulurken korunabilsin -
   * React state'i sadece UI'da yuzde gostermek icin ayrica tutuluyor. */
  const zoomRef = useRef<number>(1);

  const [ready, setReady] = useState(false);
  const [activeView, setActiveView] = useState<DrawingViewKey>('internal');
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [labelDraft, setLabelDraft] = useState('');
  /** Secili etiketin punto degeri (mm) - Word'deki yazi boyutu kutusu gibi,
   * surukleyerek degil DOGRUDAN SAYI girerek belirlenebilsin diye (kullanici
   * talebi). Secim degisince handleSelection/selectElementById'de doldurulur. */
  const [fontSizeDraftMm, setFontSizeDraftMm] = useState(0);
  const [zoom, setZoom] = useState(1);
  /** A4'un saginda gosterilen "yerlestirilmis urunler" listesi - aktif goruntudeki
   * her komponent, secili olani vurgulanacak sekilde. Canli Fabric nesnelerinden
   * degil, bu React state'inden render edilir (liste tiklanabilir/vurgulanabilir
   * olsun diye); canvas kurulurken bir kere doldurulur, etiket degisince
   * handleLabelChange'de de guncellenir. */
  const [elementList, setElementList] = useState<{ id: string; label: string; bandKey: string }[]>(
    [],
  );

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
      scaleRef.current = Math.min(
        PAGE_MAX_WIDTH_PX / plateRef.current.widthMm,
        PAGE_MAX_HEIGHT_PX / plateRef.current.heightMm,
      );
      busbarsRef.current = drawingQuery.data.model.busbars;
      setReady(true);
    }
  }, [drawingQuery.data]);

  function flushCurrentView(view: DrawingViewKey) {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !viewsRef.current) return;
    const existing = viewsRef.current[view];
    const scale = scaleRef.current;
    const updated = existing.map((original) => {
      const rect = findRectById(canvas, original.id);
      const label = findLabelById(canvas, original.id);
      return {
        id: original.id,
        libraryComponentKey: original.libraryComponentKey,
        category: original.category,
        bandKey: original.bandKey,
        label: label ? (label.text ?? '') : original.label,
        x: rect ? +((rect.left ?? 0) / scale).toFixed(2) : original.x,
        y: rect ? +((rect.top ?? 0) / scale).toFixed(2) : original.y,
        // getScaledWidth/Height (width*scaleX, height*scaleY) - kose tutamaciyla
        // yeniden boyutlandirma nesnenin olcegini (scaleX/scaleY) degistirir, kendi
        // width/height'ini degil; bu yuzden orijinal widthMm/heightMm yerine
        // GERCEK render boyutu buradan okunur (bkz. kullanici talebi: "boyutunu
        // degistirebilmek").
        widthMm: rect ? +(rect.getScaledWidth() / scale).toFixed(2) : original.widthMm,
        heightMm: rect ? +(rect.getScaledHeight() / scale).toFixed(2) : original.heightMm,
        rotationDeg: rect ? +(rect.angle ?? 0).toFixed(2) : original.rotationDeg,
        // Etiket artik kutudan bagimsiz tasinabilir/boyutlandirilabilir (kullanici
        // talebi) - labelX/Y onun MERKEZ noktasi (Textbox originX/Y='center' ile
        // kuruldugu icin left/top zaten merkez konumu).
        labelX: label ? +((label.left ?? 0) / scale).toFixed(2) : original.labelX,
        labelY: label ? +((label.top ?? 0) / scale).toFixed(2) : original.labelY,
        labelWidthMm: label ? +(label.getScaledWidth() / scale).toFixed(2) : original.labelWidthMm,
        labelFontSizeMm: label
          ? +(((label.fontSize ?? 0) * (label.scaleY ?? 1)) / scale).toFixed(2)
          : original.labelFontSizeMm,
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
    // selection:false - bos alanda tiklayip surukleme artik rubber-band secim
    // kutusu degil, TARAYICI SAYFASINI kaydirma (asagidaki mouse:down/move/up)
    // anlamina gelir. Bir komponentin uzerine tiklamak bundan etkilenmez, Fabric
    // o durumda normal secim/tasima davranisini sürdürür (bu bayrak sadece BOS
    // alan suruklemesini etkiler).
    const canvas = new Canvas(canvasElRef.current, { selection: false });
    fabricCanvasRef.current = canvas;
    canvas.defaultCursor = 'grab';

    const scale = scaleRef.current;
    const plateWpx = plateRef.current.widthMm * scale;
    const plateHpx = plateRef.current.heightMm * scale;
    // Zoom yapinca "sayfanin kendisi" (A4 kutusu) buyur - sabit boyutlu bir
    // pencere icinde icerik olceklenmez (kullanici acikca bunu istedi: "sayfa
    // buyumeli"). Tasma, bir ic ice scrollbar'la DEGIL, normal tarayici sayfa
    // kaydirmasiyla cozulur (asagidaki JSX'te canvas'i saran div'de max-h/
    // overflow-auto YOK - bkz. CLAUDE.md "Ad-hoc: Cizim Editoru Zoom").
    canvas.setDimensions({
      width: plateWpx * zoomRef.current,
      height: plateHpx * zoomRef.current,
    });
    canvas.setZoom(zoomRef.current);

    const plateRect = new Rect({
      left: 0,
      top: 0,
      // Fabric v7'de TUM nesnelerin varsayilan origin'i 'center' (bkz.
      // node_modules/fabric/dist/src/shapes/Object/defaultValues.mjs) - 'left'/'top'
      // DEGIL. Bu acikca belirtilmeden left:0,top:0 vermek, dikdortgeni (0,0)'da
      // ORTALAR, sol-ust kosesini degil - panonun yarisi kanvasin GORUNMEZ
      // (negatif koordinat) bolgesine tasiyordu. Bu projedeki TUM tasma/kesilme
      // sorunlarinin gercek kok sebebi buydu (bkz. CLAUDE.md "Ad-hoc: Cizim Editoru
      // Font/Clipping").
      originX: 'left',
      originY: 'top',
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
          [bar.startX * scale, bar.startY * scale, bar.endX * scale, bar.endY * scale],
          {
            stroke: '#d97706',
            strokeWidth: Math.max(1, bar.thicknessMm * scale),
            selectable: false,
            evented: false,
          },
        );
        canvas.add(line);
      }
    }

    // Kutu (Rect) ve etiket (Textbox) ARTIK ayri, bagimsiz Fabric nesneleri -
    // eskiden tek bir Group'tu, bu da etiketin kutuyla birlikte hareket etmesini
    // zorunlu kiliyordu. Kullanici talebi: labelların da kutudan bagimsiz yerini/
    // boyutunu degistirebilmek. Ikisi de ayni elementId'yi tasir (flushCurrentView
    // bunlardan ikisini okuyup tek bir DrawingElementInstance'a birlestirir).
    for (const el of viewsRef.current[view]) {
      const rect = new Rect({
        left: el.x * scale,
        top: el.y * scale,
        // bkz. yukaridaki plateRect yorumu - origin acikca 'left'/'top' verilmezse
        // Fabric v7 varsayilani 'center' bu kutuyu beklenmedik bir yere kaydirir.
        originX: 'left',
        originY: 'top',
        width: el.widthMm * scale,
        height: el.heightMm * scale,
        angle: el.rotationDeg,
        fill: '#fff',
        stroke: '#222',
        strokeWidth: 1,
      });
      (rect as unknown as FabricObjectWithId).elementId = el.id;
      canvas.add(rect);

      // Varsayilan (kullanici hic tasimamissa/boyutlandirmamissa) etiket konumu/
      // boyutu: kutunun merkezi, kutu genisligiyle ayni, otomatik punto (eskisiyle
      // birebir ayni gorunum). Kullanici tasimis/boyutlandirmissa labelX/Y/
      // labelWidthMm/labelFontSizeMm kullanilir (bkz. backend render-svg.ts'teki
      // ayni geriye-donuk-uyumlu mantik).
      const labelWidthMm = el.labelWidthMm ?? el.widthMm;
      const labelCenterXMm = el.labelX ?? el.x + el.widthMm / 2;
      const labelCenterYMm = el.labelY ?? el.y + el.heightMm / 2;
      const labelFontSizeMm =
        el.labelFontSizeMm ?? fitFontSizeMm(el.label, labelWidthMm, el.heightMm);
      // Textbox (FabricText degil) kullanilir: FabricText'in otomatik genislik
      // olcumu nesnenin bounding box'ini kutunun kendi genisliginden daha genis
      // hesaplatip panonun kenarindan tasmasina yol aciyordu (gercek Fabric nesne
      // verisiyle dogrulandi - bkz. CLAUDE.md "Ad-hoc: Cizim Editoru Font/Clipping").
      const label = new Textbox(el.label, {
        width: labelWidthMm * scale,
        fontSize: labelFontSizeMm * scale,
        textAlign: 'center',
        originX: 'center',
        originY: 'center',
        left: labelCenterXMm * scale,
        top: labelCenterYMm * scale,
      });
      (label as unknown as FabricObjectWithId).elementId = el.id;
      (label as unknown as FabricObjectWithId).isLabel = true;
      // Etiket, kutudan SONRA eklenir - ayni ekrana tikladiginizda (kutu tam etiketin
      // altinda kalsa bile) ustteki etiket secilir; kutuyu secmek icin etiketin
      // disinda kalan bir kenarina tiklamak yeterli.
      canvas.add(label);
    }

    setElementList(
      viewsRef.current[view].map((el) => ({ id: el.id, label: el.label, bandKey: el.bandKey })),
    );

    function handleSelection(e: { selected?: FabricObject[] }) {
      const obj = e.selected?.[0] as FabricObjectWithId | undefined;
      if (obj?.elementId) {
        setSelectedElementId(obj.elementId);
        // Kutu ya da etiket, hangisi secilmis olursa olsun "Etiket"/"Punto" alanlari
        // her zaman o elementin etiket metnini/yazi boyutunu gosterir.
        const labelObj = findLabelById(canvas, obj.elementId);
        setLabelDraft(labelObj?.text ?? '');
        setFontSizeDraftMm(getLabelFontSizeMm(labelObj));
      }
    }
    canvas.on('selection:created', handleSelection);
    canvas.on('selection:updated', handleSelection);
    canvas.on('selection:cleared', () => setSelectedElementId(null));

    // Ctrl/Cmd+tekerlek ile zoom (CAD araclarindaki standart konvansiyon) - duz
    // tekerlek normal sayfa kaydirmasini bozmasin diye modifier zorunlu tutuldu.
    function handleWheel(opt: { e: WheelEvent }) {
      if (!opt.e.ctrlKey && !opt.e.metaKey) return;
      opt.e.preventDefault();
      opt.e.stopPropagation();
      const factor = opt.e.deltaY > 0 ? 1 / ZOOM_STEP : ZOOM_STEP;
      applyZoom(zoomRef.current * factor);
    }
    canvas.on('mouse:wheel', handleWheel);

    // Bos alanda tiklayip surukleyerek TARAYICI SAYFASINI kaydirma - sayfa zoom'la
    // buyudugunde (bkz. yukarida) icerigi gormenin yolu artik Fabric'in kendi
    // viewport'u degil, gercek sayfa scroll'u; bu yuzden pan da window.scrollBy
    // ile yapiliyor, Fabric viewportTransform'una DOKUNMUYOR.
    let isPanning = false;
    let lastClientX = 0;
    let lastClientY = 0;
    function handlePanStart(opt: { e: TPointerEvent; target?: FabricObject }) {
      if (opt.target || !(opt.e instanceof MouseEvent)) return;
      isPanning = true;
      canvas.defaultCursor = 'grabbing';
      lastClientX = opt.e.clientX;
      lastClientY = opt.e.clientY;
    }
    function handlePanMove(opt: { e: TPointerEvent }) {
      if (!isPanning || !(opt.e instanceof MouseEvent)) return;
      window.scrollBy(lastClientX - opt.e.clientX, lastClientY - opt.e.clientY);
      lastClientX = opt.e.clientX;
      lastClientY = opt.e.clientY;
    }
    function handlePanEnd() {
      isPanning = false;
      canvas.defaultCursor = 'grab';
    }
    canvas.on('mouse:down', handlePanStart);
    canvas.on('mouse:move', handlePanMove);
    canvas.on('mouse:up', handlePanEnd);

    return () => {
      flushCurrentView(view);
      canvas.dispose();
      fabricCanvasRef.current = null;
    };
    // viewsRef/plateRef/busbarsRef bilerek dependency disi (mutable ref, degisimleri
    // re-render tetiklememeli).
  }, [ready, activeView]);

  /** Zoom carpanini uygular - nesnelerin left/top/width degerlerine DOKUNMAZ, canvas'in
   * KENDI boyutu da hic degismez (sabit "pencere", bkz. yukaridaki canvas kurulum
   * yorumu) - sadece Fabric'in viewportTransform'u (zoomToPoint) degisir, bu yuzden
   * flushCurrentView/export'un kullandigi "sayfaya sig" taban olcek (scaleRef) zoom'dan
   * tamamen bagimsiz kalir. Pencerenin merkezi sabit kalacak sekilde yakinlasir/uzaklasir. */
  function applyZoom(nextZoom: number) {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !plateRef.current) return;
    const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nextZoom));
    zoomRef.current = clamped;
    canvas.setZoom(clamped);
    const plateWpx = plateRef.current.widthMm * scaleRef.current;
    const plateHpx = plateRef.current.heightMm * scaleRef.current;
    canvas.setDimensions({ width: plateWpx * clamped, height: plateHpx * clamped });
    setZoom(clamped);
  }

  /** Bir Textbox'in o anki GORUNEN punto degeri (mm) - fontSize (px) * scaleY (kose
   * tutamaciyla surukleyerek buyutme de fontSize'i degil scaleY'yi degistirir),
   * scaleRef.current'a bolunerek mm'ye cevrilir. */
  function getLabelFontSizeMm(label: Textbox | undefined): number {
    if (!label) return 0;
    return +(((label.fontSize ?? 0) * (label.scaleY ?? 1)) / scaleRef.current).toFixed(2);
  }

  /** "Punto (mm)" kutusuna dogrudan sayi girilince (Word'deki yazi boyutu kutusu
   * gibi, surukleyerek degil) etiketin fontSize'ini DOGRUDAN bu deger yapar ve
   * olcegi (scaleX/scaleY) sifirlar - aksi halde bir sonraki surukleyerek
   * buyutmede eski olcekle birikerek (compounding) yanlis sonuc verirdi. */
  function handleFontSizeChange(newSizeMm: number) {
    setFontSizeDraftMm(newSizeMm);
    const canvas = fabricCanvasRef.current;
    if (!canvas || !selectedElementId || newSizeMm <= 0) return;
    const labelObj = findLabelById(canvas, selectedElementId);
    if (!labelObj) return;
    labelObj.set({ fontSize: newSizeMm * scaleRef.current, scaleX: 1, scaleY: 1 });
    canvas.requestRenderAll();
  }

  function handleLabelChange(newLabel: string) {
    setLabelDraft(newLabel);
    const canvas = fabricCanvasRef.current;
    if (!canvas || !selectedElementId) return;
    const labelObj = findLabelById(canvas, selectedElementId);
    if (!labelObj) return;
    labelObj.set('text', newLabel);
    canvas.requestRenderAll();
    setElementList((prev) =>
      prev.map((item) => (item.id === selectedElementId ? { ...item, label: newLabel } : item)),
    );
  }

  /** Sagdaki "yerlestirilmis urunler" listesinden bir satira tiklayinca semadaki
   * karsilik gelen komponenti secer (kullanici talebi: "ordan secince semadan
   * secilsin"). */
  function selectElementById(id: string) {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const rect = findRectById(canvas, id);
    if (!rect) return;
    canvas.setActiveObject(rect);
    canvas.requestRenderAll();
    setSelectedElementId(id);
    const labelObj = findLabelById(canvas, id);
    setLabelDraft(labelObj?.text ?? '');
    setFontSizeDraftMm(getLabelFontSizeMm(labelObj));
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

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-b border-app-border">
        <div className="flex gap-1">
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

        <div className="flex items-center gap-1 pb-1">
          <IconActionButton
            icon={ZoomOut}
            tooltip={tr.crm.drawings.editor.zoomOutTooltip}
            onClick={() => applyZoom(zoomRef.current / ZOOM_STEP)}
          />
          <span className="w-12 text-center text-sm tabular-nums text-app-muted">
            {Math.round(zoom * 100)}%
          </span>
          <IconActionButton
            icon={ZoomIn}
            tooltip={tr.crm.drawings.editor.zoomInTooltip}
            onClick={() => applyZoom(zoomRef.current * ZOOM_STEP)}
          />
          <IconActionButton
            icon={Maximize}
            tooltip={tr.crm.drawings.editor.zoomResetTooltip}
            onClick={() => applyZoom(1)}
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-start justify-center gap-6">
        <div className="rounded-lg border border-app-border bg-white p-4 shadow-sm">
          <canvas ref={canvasElRef} />
        </div>

        <div className="flex w-64 shrink-0 flex-col gap-4">
          <div>
            {selectedElementId ? (
              <div className="flex flex-col gap-3">
                <TextField
                  label={tr.crm.drawings.editor.selectedLabelLabel}
                  value={labelDraft}
                  onChange={(e) => handleLabelChange(e.target.value)}
                />
                <TextField
                  label={tr.crm.drawings.editor.labelFontSizeLabel}
                  type="number"
                  min={1}
                  step={0.5}
                  value={fontSizeDraftMm}
                  onChange={(e) => handleFontSizeChange(Number(e.target.value))}
                />
              </div>
            ) : (
              <p className="text-xs text-app-muted">{tr.crm.drawings.editor.noSelectionHint}</p>
            )}
          </div>

          <div>
            <h2 className="text-sm font-semibold text-app-text">
              {tr.crm.drawings.editor.placedProductsTitle}
            </h2>
            {elementList.length === 0 ? (
              <p className="mt-2 text-xs text-app-muted">
                {tr.crm.drawings.editor.placedProductsEmpty}
              </p>
            ) : (
              <ul className="mt-2 max-h-96 overflow-y-auto rounded-lg border border-app-border divide-y divide-app-border">
                {elementList.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => selectElementById(item.id)}
                      className={clsx(
                        'block w-full px-3 py-2 text-left text-sm transition-colors',
                        item.id === selectedElementId
                          ? 'bg-app-brand/10 font-medium text-app-brand'
                          : 'text-app-text hover:bg-app-bg-muted',
                      )}
                    >
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
