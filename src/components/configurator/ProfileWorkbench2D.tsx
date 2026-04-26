import { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { Plus, Trash2, Copy, FlipHorizontal2, X, AlertTriangle, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  HOLE_TYPES,
  CONNECTOR_TYPES,
  SLOT_LABEL_DE,
  SLOT_SIDE_DE,
  getFaceWidth,
  getModulePitch,
  getSlotCenters,
  getAllSlots,
  getSlotNumber,
  getBoreCounts,
  getBoreNumber,
  type ProfileSection,
  type ProfileHole,
  type ProfileConnector,
  type ConnectorType,
  type SlotId,
  type EndTreatment,
} from '@/lib/profile-configurator-types';
import { ProfileCrossSection2D, slotKey } from './ProfileCrossSection2D';
import { NumericInput } from './NumericInput';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Tool = 'select' | 'hole' | 'connector';

interface Props {
  section: ProfileSection;
  length: number;
  angleStart: number;
  angleEnd: number;
  holes: ProfileHole[];
  connectors: ProfileConnector[];
  endStart?: EndTreatment;
  endEnd?: EndTreatment;
  onUpdateHoles: (holes: ProfileHole[]) => void;
  onUpdateConnectors: (connectors: ProfileConnector[]) => void;
  onUpdateEndStart?: (e: EndTreatment) => void;
  onUpdateEndEnd?: (e: EndTreatment) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Festes feines 1-mm-Raster – Auswahl wurde auf Wunsch entfernt.
const SNAP_FINE = 1;

const CONNECTOR_FOOTPRINT = 22; // mm – Länge des Verbinder-Blocks im Profil

function holeColor(type: ProfileHole['type']): string {
  if (type === 'm6-thread' || type === 'm8-thread') return '#b78628';
  if (type === 'step-m6' || type === 'step-m8') return '#3b67a8';
  return '#1e293b';
}

function snapValue(raw: number, snap: number, snapPoints: number[], length: number): number {
  // Bei feinem Raster (1 mm) sollen die "magischen" Punkte (Profilmitte, 10/15/20 mm Abstand)
  // den Cursor anziehen. Bei Mittel/Grob ist das Raster die führende Größe – wir snappen
  // strikt darauf, sonst ergibt sich aus der Sicht des Users keine Rasterung.
  if (snap <= 1) {
    for (const p of snapPoints) {
      if (Math.abs(raw - p) <= 2) return Math.round(p);
    }
  }
  const v = Math.round(raw / snap) * snap;
  return Math.max(snap, Math.min(Math.floor((length - 1) / snap) * snap, v));
}


/** Backwards-compat: Bohrungen aus alten Configs ohne 'slot' migrieren */
function ensureSlot(h: ProfileHole): SlotId {
  if (h.slot) return h.slot;
  switch (h.face) {
    case 'top': return 'A';
    case 'right': return 'B';
    case 'bottom': return 'C';
    case 'left': return 'D';
    default: return 'A';
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProfileWorkbench2D({
  section,
  length,
  angleStart,
  angleEnd,
  holes,
  connectors,
  endStart,
  endEnd,
  onUpdateHoles,
  onUpdateConnectors,
  onUpdateEndStart,
  onUpdateEndEnd,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [activeSlot, setActiveSlot] = useState<SlotId>('A');
  const [activeModuleIndex, setActiveModuleIndex] = useState<number>(0);
  /** Multi-Select: zusätzliche Nuten für Batch-Bearbeitung */
  const [multiSelected, setMultiSelected] = useState<Set<string>>(new Set());
  const [tool, setTool] = useState<Tool>('hole');
  /** Stirnseiten-Modus: zeigt Querschnitt groß an, klickbar für Kernzug-Gewinde */
  const [endFaceMode, setEndFaceMode] = useState<null | 'start' | 'end'>(null);
  const snap = SNAP_FINE;
  const [holeType, setHoleType] = useState<ProfileHole['type']>('d55');
  const [connType, setConnType] = useState<ConnectorType>('tnut-m8');
  const [hoverZ, setHoverZ] = useState<number | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const faceDepth = getFaceWidth(section, activeSlot);
  const MODULE = getModulePitch(section);
  const slotCenters = getSlotCenters(section, activeSlot);
  const allSlots = useMemo(() => getAllSlots(section), [section]);

  /** Liste aller derzeit ausgewählten Slots (immer mind. der aktive) */
  const selectedSlots = useMemo(() => {
    const set = new Set(multiSelected);
    set.add(slotKey(activeSlot, activeModuleIndex));
    return Array.from(set).map((k) => {
      const [s, mi] = k.split(':');
      return { slot: s as SlotId, moduleIndex: Number(mi) };
    });
  }, [multiSelected, activeSlot, activeModuleIndex]);

  // Wenn Profilwechsel den moduleIndex ungültig macht, korrigieren
  useEffect(() => {
    if (activeModuleIndex >= slotCenters.length) setActiveModuleIndex(0);
  }, [activeModuleIndex, slotCenters.length]);

  // Aktive Spur (für Visualisierung der einen aktiven Nut)
  const activeCenter = slotCenters[Math.min(activeModuleIndex, slotCenters.length - 1)] ?? slotCenters[0];
  const activeSlotNumber = getSlotNumber(section, activeSlot, activeModuleIndex);

  // Filter visible items by slot + moduleIndex (with backwards compat)
  const visibleHoles = useMemo(
    () => holes.filter((h) => ensureSlot(h) === activeSlot && (h.moduleIndex ?? 0) === activeModuleIndex),
    [holes, activeSlot, activeModuleIndex],
  );
  const visibleConnectors = useMemo(
    () => connectors.filter((c) => c.slot === activeSlot && (c.moduleIndex ?? 0) === activeModuleIndex),
    [connectors, activeSlot, activeModuleIndex],
  );
  /**
   * Bohrungen aus „gegenüberliegenden" oder anderen Slots, die optisch durch das aktive
   * Profilfenster sichtbar sind (z. B. Bohrung von Nut C wird auch in Ansicht von Nut A
   * leicht angedeutet). Wir zeigen sie gedimmt, damit klar ist: die Bohrung geht durch.
   */
  const ghostHoles = useMemo(() => {
    return holes.filter((h) => {
      const s = ensureSlot(h);
      // Auf der gleichen Achse (A↔C oder B↔D) und gleichem moduleIndex
      const sameAxis =
        (activeSlot === 'A' && s === 'C') || (activeSlot === 'C' && s === 'A') ||
        (activeSlot === 'B' && s === 'D') || (activeSlot === 'D' && s === 'B');
      return sameAxis && (h.moduleIndex ?? 0) === activeModuleIndex;
    });
  }, [holes, activeSlot, activeModuleIndex]);

  // Overlap detection (warning only, not blocking)
  const overlapWarning = useMemo(() => {
    for (let i = 0; i < visibleHoles.length; i++) {
      for (let j = i + 1; j < visibleHoles.length; j++) {
        const a = visibleHoles[i];
        const b = visibleHoles[j];
        const minDist = (a.diameter + b.diameter) / 2;
        if (Math.abs(a.zPosition - b.zPosition) < minDist) return true;
      }
    }
    return false;
  }, [visibleHoles]);

  const PAD_X = 40;
  const PAD_Y = 30;
  const VB_W = length + PAD_X * 2;
  const VB_H = faceDepth + PAD_Y * 2 + 40;

  // Snap points
  const snapPoints = useMemo(() => {
    const pts = [length / 2, 10, 15, 20, length - 10, length - 15, length - 20];
    visibleHoles.forEach((h) => pts.push(h.zPosition));
    return pts;
  }, [length, visibleHoles]);

  // ─── Coordinate transforms ────────────────────────────────────────────
  const screenToMm = useCallback((clientX: number, clientY: number): { z: number; y: number } | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const local = pt.matrixTransform(ctm.inverse());
    const z = local.x - PAD_X;
    const y = local.y - PAD_Y - 40;
    return { z, y };
  }, []);

  // ─── Pointer handlers ─────────────────────────────────────────────────
  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const m = screenToMm(e.clientX, e.clientY);
    if (!m) return;
    if (m.z >= 0 && m.z <= length) setHoverZ(m.z); else setHoverZ(null);

    if (draggingId) {
      // Wir editieren eine konkrete Nut – Spur bleibt fix bei activeModuleIndex
      const targetModuleIndex = activeModuleIndex;

      // Connector? Snap to nearest end + active track
      const conn = connectors.find((c) => c.id === draggingId);
      if (conn) {
        const newEnd: 'start' | 'end' = m.z < length / 2 ? 'start' : 'end';
        if (conn.end !== newEnd || (conn.moduleIndex ?? 0) !== targetModuleIndex) {
          onUpdateConnectors(connectors.map((c) => c.id === draggingId ? { ...c, end: newEnd, moduleIndex: targetModuleIndex } : c));
        }
        return;
      }
      // Hole — free positioning along z, fixed track
      const hole = holes.find((h) => h.id === draggingId);
      if (hole) {
        const z = snapValue(
          m.z,
          snap,
          snapPoints.filter((p) => Math.abs(p - hole.zPosition) > 0.1),
          length,
        );
        onUpdateHoles(holes.map((h) => h.id === draggingId ? { ...h, zPosition: z, moduleIndex: targetModuleIndex } : h));
      }
    }
  };

  const handlePointerLeave = () => setHoverZ(null);

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (draggingId) return;
    const target = e.target as SVGElement;
    if (target.dataset.role === 'marker') return;
    const m = screenToMm(e.clientX, e.clientY);
    if (!m || m.z < 0 || m.z > length) {
      setSelectedId(null);
      return;
    }

    // Aktuelle Spur ist durch den Tab vorgegeben – alle neuen Items landen dort
    const targetModuleIndex = activeModuleIndex;

    if (tool === 'hole') {
      const z = snapValue(m.z, snap, snapPoints, length);
      const typeDef = HOLE_TYPES.find((t) => t.id === holeType)!;
      // Multi-Slot: für jeden ausgewählten Slot eine Bohrung erstellen
      const newHoles: ProfileHole[] = selectedSlots.map((s) => ({
        id: crypto.randomUUID(),
        zPosition: z,
        diameter: typeDef.diameter,
        slot: s.slot,
        moduleIndex: s.moduleIndex,
        type: holeType,
        label: typeDef.label,
      }));
      onUpdateHoles([...holes, ...newHoles]);
      const primary = newHoles.find((h) => h.slot === activeSlot && h.moduleIndex === activeModuleIndex);
      setSelectedId(primary?.id ?? newHoles[0]?.id ?? null);
    } else if (tool === 'connector') {
      const end: 'start' | 'end' = m.z < length / 2 ? 'start' : 'end';
      const typeDef = CONNECTOR_TYPES.find((t) => t.id === connType)!;
      // Multi-Slot: für jeden ausgewählten Slot, sofern noch frei
      const additions: ProfileConnector[] = [];
      selectedSlots.forEach((s) => {
        const taken = connectors.some((c) => c.slot === s.slot && c.end === end && (c.moduleIndex ?? 0) === s.moduleIndex);
        if (!taken) {
          additions.push({
            id: crypto.randomUUID(),
            type: connType,
            end,
            slot: s.slot,
            moduleIndex: s.moduleIndex,
            label: typeDef.label,
          });
        }
      });
      if (additions.length === 0) { setSelectedId(null); return; }
      onUpdateConnectors([...connectors, ...additions]);
      const primary = additions.find((c) => c.slot === activeSlot && c.moduleIndex === activeModuleIndex);
      setSelectedId(primary?.id ?? additions[0].id);
    } else {
      setSelectedId(null);
    }
  };

  const startDrag = (e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    setDraggingId(id);
    setSelectedId(id);
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };

  const endDrag = () => setDraggingId(null);

  // ─── Selected item helpers ────────────────────────────────────────────
  const selectedHole = visibleHoles.find((h) => h.id === selectedId);
  const selectedConn = visibleConnectors.find((c) => c.id === selectedId);

  const updateHole = (patch: Partial<ProfileHole>) => {
    if (!selectedHole) return;
    onUpdateHoles(holes.map((h) => h.id === selectedHole.id ? { ...h, ...patch } : h));
  };
  const updateConn = (patch: Partial<ProfileConnector>) => {
    if (!selectedConn) return;
    onUpdateConnectors(connectors.map((c) => c.id === selectedConn.id ? { ...c, ...patch } : c));
  };
  const deleteSelected = () => {
    if (selectedHole) onUpdateHoles(holes.filter((h) => h.id !== selectedHole.id));
    if (selectedConn) onUpdateConnectors(connectors.filter((c) => c.id !== selectedConn.id));
    setSelectedId(null);
  };
  const duplicateSelected = () => {
    if (selectedHole) {
      const copy = { ...selectedHole, id: crypto.randomUUID(), zPosition: Math.min(length - 5, selectedHole.zPosition + 40) };
      onUpdateHoles([...holes, copy]);
      setSelectedId(copy.id);
    }
    // Connectors duplicate to the OPPOSITE end if free
    if (selectedConn) {
      const otherEnd: 'start' | 'end' = selectedConn.end === 'start' ? 'end' : 'start';
      const taken = connectors.some((c) => c.slot === selectedConn.slot && c.end === otherEnd);
      if (taken) return;
      const copy = { ...selectedConn, id: crypto.randomUUID(), end: otherEnd };
      onUpdateConnectors([...connectors, copy]);
      setSelectedId(copy.id);
    }
  };
  const mirrorSelected = () => {
    if (selectedHole) {
      const z = Math.max(1, Math.min(length - 1, length - selectedHole.zPosition));
      updateHole({ zPosition: z });
    } else if (selectedConn) {
      const otherEnd: 'start' | 'end' = selectedConn.end === 'start' ? 'end' : 'start';
      const taken = connectors.some((c) => c.slot === selectedConn.slot && c.end === otherEnd && c.id !== selectedConn.id);
      if (taken) return;
      updateConn({ end: otherEnd });
    }
  };

  // Keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      if (e.key === 'Escape') { setSelectedId(null); return; }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedId) { e.preventDefault(); deleteSelected(); }
      }
      if (e.key === 'b' || e.key === 'B') setTool('hole');
      if (e.key === 'v' || e.key === 'V') setTool('connector');
      if (e.key === 's' || e.key === 'S') setTool('select');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, holes, connectors]);

  // ─── Ruler ticks ──────────────────────────────────────────────────────
  const rulerStep = length <= 500 ? 50 : length <= 1500 ? 100 : 250;
  const ruler = useMemo(() => {
    const t: { z: number; major: boolean; label: string | null }[] = [];
    for (let z = 0; z <= length; z += rulerStep / 5) {
      const major = z % rulerStep === 0;
      t.push({ z, major, label: major ? `${z}` : null });
    }
    return t;
  }, [length, rulerStep]);

  // ─── Profile face geometry ────────────────────────────────────────────
  const tanS = Math.tan((angleStart * Math.PI) / 180);
  const tanE = Math.tan((angleEnd * Math.PI) / 180);
  const cutS = faceDepth * tanS;
  const cutE = faceDepth * tanE;
  const profilePath = `M 0 ${faceDepth} L ${length} ${faceDepth} L ${length - cutE} 0 L ${cutS} 0 Z`;

  // Nur die aktuell ausgewählte Spur als Hauptband visualisieren
  const slotGuides: number[] = activeCenter !== undefined ? [activeCenter] : [];

  const showConnectorMagnets = tool === 'connector' || draggingId !== null;

  // ───────────────────────────────────────────────────────────────────────
  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex flex-col h-full bg-white rounded-lg border border-slate-200 overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3 px-3 py-2 border-b border-slate-200 bg-slate-50 flex-wrap">
          {/* Nut-Auswahl: pro Nut ein Knopf, Beschriftung mit Alvaris-Nummer */}
          <div className="flex items-center gap-1 flex-wrap max-w-[60%]">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mr-1">Nut</span>
            {allSlots.map((s) => {
              const key = slotKey(s.slot, s.moduleIndex);
              const isActive = s.slot === activeSlot && s.moduleIndex === activeModuleIndex;
              const isMulti = multiSelected.has(key);
              const isSel = isActive || isMulti;
              return (
                <Tooltip key={key}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={(e) => {
                        if (e.shiftKey || e.metaKey || e.ctrlKey) {
                          // Multi-Select Toggle (aktive Nut nicht entfernen)
                          setMultiSelected((prev) => {
                            const next = new Set(prev);
                            if (next.has(key)) next.delete(key); else next.add(key);
                            // Aktive nicht in Multi halten
                            next.delete(slotKey(activeSlot, activeModuleIndex));
                            return next;
                          });
                        } else {
                          setActiveSlot(s.slot);
                          setActiveModuleIndex(s.moduleIndex);
                          setMultiSelected(new Set());
                          setSelectedId(null);
                        }
                      }}
                      className={`min-w-[28px] px-2 py-1 text-xs rounded-md transition-colors border font-semibold ${
                        isActive
                          ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                          : isMulti
                          ? 'bg-primary/15 text-primary border-primary/50'
                          : 'bg-white border-slate-200 text-foreground hover:border-primary/50 hover:text-primary'
                      }`}
                    >
                      {s.number}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    Nut {s.number} · {SLOT_SIDE_DE[s.slot]}{!isActive && ' · Shift-Klick = Mehrfach'}
                  </TooltipContent>
                </Tooltip>
              );
            })}
            {multiSelected.size > 0 && (
              <button
                onClick={() => setMultiSelected(new Set())}
                className="ml-1 text-[10px] text-muted-foreground hover:text-foreground underline"
              >
                Mehrfach aufheben ({multiSelected.size + 1})
              </button>
            )}
          </div>

          {/* Tool palette */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-white rounded-md border border-slate-200 p-0.5">
              <button
                onClick={() => setTool('select')}
                title="Auswählen (S)"
                className={`px-2 py-1 text-xs rounded ${tool === 'select' ? 'bg-primary/10 text-primary font-semibold' : 'text-muted-foreground'}`}
              >
                Auswahl
              </button>
              <button
                onClick={() => setTool('hole')}
                title="Bohrung setzen (B)"
                className={`px-2 py-1 text-xs rounded ${tool === 'hole' ? 'bg-primary/10 text-primary font-semibold' : 'text-muted-foreground'}`}
              >
                + Bohrung
              </button>
              <button
                onClick={() => setTool('connector')}
                title="Verbinder setzen (V)"
                className={`px-2 py-1 text-xs rounded ${tool === 'connector' ? 'bg-primary/10 text-primary font-semibold' : 'text-muted-foreground'}`}
              >
                + Verbinder
              </button>
            </div>

            {tool === 'hole' && (
              <Select value={holeType} onValueChange={(v) => setHoleType(v as ProfileHole['type'])}>
                <SelectTrigger className="h-7 w-[200px] text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {HOLE_TYPES.map((t) => (
                    <SelectItem key={t.id} value={t.id} className="text-xs">{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {tool === 'connector' && (
              <Select value={connType} onValueChange={(v) => setConnType(v as ConnectorType)}>
                <SelectTrigger className="h-7 w-[200px] text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CONNECTOR_TYPES.map((t) => (
                    <SelectItem key={t.id} value={t.id} className="text-xs">{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Stirnseiten-Modus */}
          {(onUpdateEndStart || onUpdateEndEnd) && (
            <div className="flex items-center gap-1 bg-white rounded-md border border-slate-200 p-0.5">
              <button
                onClick={() => setEndFaceMode((m) => m === 'start' ? null : 'start')}
                title="Stirnseite Anfang – Kernzug-Gewinde wählen"
                className={`px-2 py-1 text-[11px] rounded flex items-center gap-1 ${endFaceMode === 'start' ? 'bg-primary/10 text-primary font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <Eye className="h-3 w-3" /> Stirn Anfang
              </button>
              <button
                onClick={() => setEndFaceMode((m) => m === 'end' ? null : 'end')}
                title="Stirnseite Ende – Kernzug-Gewinde wählen"
                className={`px-2 py-1 text-[11px] rounded flex items-center gap-1 ${endFaceMode === 'end' ? 'bg-primary/10 text-primary font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <Eye className="h-3 w-3" /> Stirn Ende
              </button>
            </div>
          )}

          {/* Raster: festes 1-mm-Feinraster */}
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
            <span>Raster</span>
            <span className="px-2 py-0.5 rounded border border-primary/30 bg-primary/5 text-primary font-semibold normal-case tracking-normal text-[11px]">
              Genau · 1 mm
            </span>
          </div>
        </div>

        {/* SVG stage */}
        <div className="flex-1 relative overflow-auto bg-gradient-to-br from-slate-50 to-slate-100">
          {/* Mini cross-section overlay (multi-select aware, rotated for tall profiles).
              Positioniert oben-rechts neben der Overlap-Warnung, damit das Profil links frei bleibt. */}
          <div className="absolute top-3 right-3 z-10 bg-white/95 backdrop-blur border border-slate-200 rounded-lg shadow-sm p-2">
            <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 text-center">
              Querschnitt {section.w > section.h && '(↻90°)'}
            </div>
            <ProfileCrossSection2D
              section={section}
              activeSlot={activeSlot}
              activeModuleIndex={activeModuleIndex}
              selectedKeys={
                multiSelected.size > 0
                  ? new Set([...multiSelected, slotKey(activeSlot, activeModuleIndex)])
                  : undefined
              }
              onSelectSlot={(s, mi, additive) => {
                if (additive) {
                  setMultiSelected((prev) => {
                    const k = slotKey(s, mi);
                    if (s === activeSlot && mi === activeModuleIndex) return prev;
                    const next = new Set(prev);
                    if (next.has(k)) next.delete(k); else next.add(k);
                    return next;
                  });
                } else {
                  setActiveSlot(s); setActiveModuleIndex(mi); setMultiSelected(new Set()); setSelectedId(null);
                }
              }}
              size={120}
              showLabels
              rotate90={section.h > section.w}
            />
          </div>

          {/* Overlap warning */}
          {overlapWarning && (
            <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 bg-amber-50 border border-amber-300 text-amber-800 text-[10px] font-medium rounded-md px-2 py-1">
              <AlertTriangle className="h-3 w-3" />
              Bohrungen überlappen
            </div>
          )}

          {/* Stirnseiten-Großansicht (Kernzug-Auswahl) */}
          {endFaceMode && (
            <EndFaceOverlay
              section={section}
              endLabel={endFaceMode === 'start' ? 'Anfang' : 'Ende'}
              treatment={endFaceMode === 'start' ? endStart : endEnd}
              onChange={(t) => {
                if (endFaceMode === 'start') onUpdateEndStart?.(t);
                else onUpdateEndEnd?.(t);
              }}
              onClose={() => setEndFaceMode(null)}
            />
          )}

          <svg
            ref={svgRef}
            viewBox={`0 0 ${VB_W} ${VB_H}`}
            preserveAspectRatio="xMidYMid meet"
            className="w-full h-full select-none"
            style={{ cursor: tool === 'hole' || tool === 'connector' ? 'crosshair' : 'default' }}
            onPointerMove={handlePointerMove}
            onPointerLeave={handlePointerLeave}
            onPointerUp={endDrag}
            onClick={handleSvgClick}
          >
            <defs>
              <linearGradient id="alu" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#e2e8f0" />
                <stop offset="50%" stopColor="#cbd5e1" />
                <stop offset="100%" stopColor="#94a3b8" />
              </linearGradient>
              <pattern id="slotHatch" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="6" stroke="#94a3b8" strokeWidth="0.6" opacity="0.3" />
              </pattern>
            </defs>

            {/* Ruler */}
            <g transform={`translate(${PAD_X}, ${PAD_Y})`}>
              <line x1="0" y1="30" x2={length} y2="30" stroke="#64748b" strokeWidth="0.8" />
              {ruler.map((tk, i) => (
                <g key={i}>
                  <line
                    x1={tk.z}
                    y1={tk.major ? 22 : 27}
                    x2={tk.z}
                    y2="30"
                    stroke="#64748b"
                    strokeWidth={tk.major ? 1 : 0.5}
                  />
                  {tk.label !== null && (
                    <text
                      x={tk.z}
                      y="18"
                      textAnchor="middle"
                      fontSize="10"
                      fill="#475569"
                      fontFamily="ui-monospace, monospace"
                    >
                      {tk.label}
                    </text>
                  )}
                </g>
              ))}
              <text x={length + 6} y="33" fontSize="9" fill="#94a3b8">mm</text>
            </g>

            {/* Profile body */}
            <g transform={`translate(${PAD_X}, ${PAD_Y + 40})`}>
              <path d={profilePath} fill="url(#alu)" stroke="#475569" strokeWidth="0.8" />
              <path d={profilePath} fill="url(#slotHatch)" />

              {/* Slot tracks (highlighted bands so it's obvious where holes/connectors sit) */}
              {slotGuides.map((y, i) => (
                <g key={i}>
                  <rect
                    x={0}
                    y={y - 6}
                    width={length}
                    height={12}
                    fill="hsl(var(--primary))"
                    opacity={0.06}
                  />
                  <line
                    x1="0"
                    y1={y}
                    x2={length}
                    y2={y}
                    stroke="hsl(var(--primary))"
                    strokeWidth="0.5"
                    strokeDasharray="4 3"
                    opacity="0.55"
                  />
                  <text x={-6} y={y + 3} textAnchor="end" fontSize="8" fill="hsl(var(--primary))" fontWeight="700">
                    {activeSlotNumber}
                  </text>
                </g>
              ))}

              <line
                x1={length / 2}
                y1={-4}
                x2={length / 2}
                y2={faceDepth + 4}
                stroke="#94a3b8"
                strokeWidth="0.4"
                strokeDasharray="2 4"
                opacity="0.5"
              />

              {/* Connector magnet zones (only visible when relevant) */}
              {showConnectorMagnets && (
                <g pointerEvents="none">
                  <rect
                    x={0}
                    y={0}
                    width={CONNECTOR_FOOTPRINT}
                    height={faceDepth}
                    fill="hsl(var(--primary))"
                    opacity={0.08}
                    stroke="hsl(var(--primary))"
                    strokeDasharray="3 2"
                    strokeWidth="0.6"
                  />
                  <rect
                    x={length - CONNECTOR_FOOTPRINT}
                    y={0}
                    width={CONNECTOR_FOOTPRINT}
                    height={faceDepth}
                    fill="hsl(var(--primary))"
                    opacity={0.08}
                    stroke="hsl(var(--primary))"
                    strokeDasharray="3 2"
                    strokeWidth="0.6"
                  />
                  <text x={CONNECTOR_FOOTPRINT / 2} y={-3} textAnchor="middle" fontSize="8" fill="hsl(var(--primary))" fontWeight="600">
                    Anfang
                  </text>
                  <text x={length - CONNECTOR_FOOTPRINT / 2} y={-3} textAnchor="middle" fontSize="8" fill="hsl(var(--primary))" fontWeight="600">
                    Ende
                  </text>
                </g>
              )}

              {/* Hover indicator */}
              {hoverZ !== null && !draggingId && (tool === 'hole' || tool === 'connector') && (
                <g pointerEvents="none">
                  <line
                    x1={hoverZ}
                    y1={-6}
                    x2={hoverZ}
                    y2={faceDepth + 6}
                    stroke="hsl(var(--primary))"
                    strokeWidth="0.6"
                    strokeDasharray="2 2"
                    opacity="0.7"
                  />
                  <rect
                    x={hoverZ - 18}
                    y={-22}
                    width="36"
                    height="14"
                    rx="3"
                    fill="hsl(var(--primary))"
                  />
                  <text
                    x={hoverZ}
                    y={-12}
                    textAnchor="middle"
                    fontSize="9"
                    fill="white"
                    fontFamily="ui-monospace, monospace"
                    fontWeight="600"
                  >
                    {Math.round(hoverZ)} mm
                  </text>
                </g>
              )}

              {/* Connectors as silver squares anchored at the relevant end, on the chosen slot track */}
              {visibleConnectors.map((c) => {
                const isSel = selectedId === c.id;
                const idx = Math.min(slotCenters.length - 1, c.moduleIndex ?? 0);
                const cy = slotCenters[idx];
                const w = CONNECTOR_FOOTPRINT;
                const x = c.end === 'start' ? 0 : length - w;
                return (
                  <g
                    key={c.id}
                    data-role="marker"
                    onPointerDown={(e) => startDrag(e, c.id)}
                    onClick={(e) => { e.stopPropagation(); setSelectedId(c.id); }}
                    style={{ cursor: 'grab' }}
                  >
                    <rect
                      data-role="marker"
                      x={x}
                      y={cy - 7}
                      width={w}
                      height={14}
                      fill="#94a3b8"
                      stroke={isSel ? 'hsl(var(--primary))' : '#475569'}
                      strokeWidth={isSel ? 1.4 : 0.6}
                      rx="2"
                    />
                    <text
                      data-role="marker"
                      x={x + w / 2}
                      y={cy + 3}
                      textAnchor="middle"
                      fontSize="7"
                      fill="white"
                      fontWeight="600"
                      pointerEvents="none"
                    >
                      {c.type === 'tnut-m6' || c.type === 'tnut-m8' ? 'NS' : c.type === 'angle-8' ? 'WV' : 'AV'}
                    </text>
                  </g>
                );
              })}

              {/* Ghost-Bohrungen aus Gegenseite (gestrichelte Outline, kein Klick) */}
              {ghostHoles.map((h) => {
                const idx = Math.min(slotCenters.length - 1, h.moduleIndex ?? 0);
                const cy = slotCenters[idx];
                const r = Math.max(3, Math.min(10, h.diameter * 0.7));
                return (
                  <g key={`ghost-${h.id}`} pointerEvents="none">
                    <circle
                      cx={h.zPosition}
                      cy={cy}
                      r={r}
                      fill="none"
                      stroke="#94a3b8"
                      strokeWidth="0.8"
                      strokeDasharray="2 1.5"
                      opacity="0.7"
                    />
                    <text
                      x={h.zPosition}
                      y={cy - r - 2}
                      textAnchor="middle"
                      fontSize="6"
                      fill="#64748b"
                      fontFamily="ui-sans-serif, system-ui"
                    >
                      ↻ Nut {getSlotNumber(section, ensureSlot(h), h.moduleIndex ?? 0)}
                    </text>
                  </g>
                );
              })}

              {/* Holes as colored circles */}
              {visibleHoles.map((h) => {
                const isSel = selectedId === h.id;
                const idx = Math.min(slotCenters.length - 1, h.moduleIndex ?? 0);
                const cy = slotCenters[idx];
                const r = Math.max(3, Math.min(10, h.diameter * 0.7));
                const color = holeColor(h.type);
                return (
                  <g
                    key={h.id}
                    data-role="marker"
                    onPointerDown={(e) => startDrag(e, h.id)}
                    onClick={(e) => { e.stopPropagation(); setSelectedId(h.id); }}
                    style={{ cursor: 'grab' }}
                  >
                    {(isSel || draggingId === h.id) && (
                      <g pointerEvents="none">
                        <line x1="0" y1={faceDepth + 14} x2={h.zPosition} y2={faceDepth + 14} stroke="hsl(var(--primary))" strokeWidth="0.5" />
                        <line x1={h.zPosition} y1={faceDepth + 14} x2={length} y2={faceDepth + 14} stroke="#94a3b8" strokeWidth="0.5" strokeDasharray="2 2" />
                        <text x={h.zPosition / 2} y={faceDepth + 24} textAnchor="middle" fontSize="9" fill="hsl(var(--primary))" fontFamily="ui-monospace, monospace" fontWeight="600">
                          {Math.round(h.zPosition)}
                        </text>
                        <text x={(h.zPosition + length) / 2} y={faceDepth + 24} textAnchor="middle" fontSize="9" fill="#94a3b8" fontFamily="ui-monospace, monospace">
                          {Math.round(length - h.zPosition)}
                        </text>
                      </g>
                    )}
                    <circle
                      data-role="marker"
                      cx={h.zPosition}
                      cy={cy}
                      r={r + 1.5}
                      fill="white"
                      stroke={isSel ? 'hsl(var(--primary))' : '#cbd5e1'}
                      strokeWidth={isSel ? 1.4 : 0.6}
                    />
                    <circle
                      data-role="marker"
                      cx={h.zPosition}
                      cy={cy}
                      r={r}
                      fill={color}
                    />
                  </g>
                );
              })}
            </g>

            <text x={PAD_X} y={VB_H - 4} fontSize="9" fill="#94a3b8">Anfang</text>
            <text x={PAD_X + length} y={VB_H - 4} textAnchor="end" fontSize="9" fill="#94a3b8">Ende ({length} mm)</text>
          </svg>

          {/* Selected-item floating panel */}
          {(selectedHole || selectedConn) && (
            <div className="absolute top-3 right-3 w-[260px] bg-white border border-slate-200 rounded-lg shadow-lg p-3 space-y-2.5 z-20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">
                  {selectedHole ? 'Bohrung' : 'Verbinder'} · Nut {activeSlotNumber} ({SLOT_SIDE_DE[activeSlot]})
                </span>
                <button onClick={() => setSelectedId(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {selectedHole && (
                <>
                  <div>
                    <Label className="text-[10px] text-muted-foreground mb-1 block">Typ</Label>
                    <Select
                      value={selectedHole.type}
                      onValueChange={(v) => {
                        const td = HOLE_TYPES.find((t) => t.id === v as ProfileHole['type'])!;
                        updateHole({ type: v as ProfileHole['type'], diameter: td.diameter, label: td.label });
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {HOLE_TYPES.map((t) => (
                          <SelectItem key={t.id} value={t.id} className="text-xs">{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground mb-1 block">
                      Position (mm vom Anfang)
                    </Label>
                    <NumericInput
                      value={selectedHole.zPosition}
                      min={1}
                      max={length - 1}
                      step={1}
                      onCommit={(z) => updateHole({ zPosition: z })}
                      className="h-8 text-xs"
                    />
                  </div>
                  {/* Spur-Auswahl entfällt – jede Nut ist als eigener Tab adressierbar */}
                </>
              )}

              {selectedConn && (
                <>
                  <div>
                    <Label className="text-[10px] text-muted-foreground mb-1 block">Typ</Label>
                    <Select
                      value={selectedConn.type}
                      onValueChange={(v) => {
                        const td = CONNECTOR_TYPES.find((t) => t.id === v as ConnectorType)!;
                        updateConn({ type: v as ConnectorType, label: td.label });
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CONNECTOR_TYPES.map((t) => (
                          <SelectItem key={t.id} value={t.id} className="text-xs">{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground mb-1 block">Position</Label>
                    <Select value={selectedConn.end} onValueChange={(v) => updateConn({ end: v as 'start' | 'end' })}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="start" className="text-xs">Profilanfang</SelectItem>
                        <SelectItem value="end" className="text-xs">Profilende</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {/* Spur-Auswahl entfällt – jede Nut ist als eigener Tab adressierbar */}
                </>
              )}

              <div className="flex gap-1.5 pt-1">
                <Button size="sm" variant="outline" className="flex-1 h-7 text-[11px] gap-1" onClick={duplicateSelected}>
                  <Copy className="h-3 w-3" /> Kopie
                </Button>
                <Button size="sm" variant="outline" className="flex-1 h-7 text-[11px] gap-1" onClick={mirrorSelected}>
                  <FlipHorizontal2 className="h-3 w-3" /> Spiegeln
                </Button>
                <Button size="sm" variant="outline" className="h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={deleteSelected}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}

          {/* Hint when empty */}
          {visibleHoles.length === 0 && visibleConnectors.length === 0 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur border border-slate-200 rounded-full px-4 py-1.5 text-[11px] text-muted-foreground shadow-sm pointer-events-none">
              <Plus className="h-3 w-3 inline mr-1" />
              {tool === 'connector'
                ? `Klicke an einen Profilende-Bereich, um einen Verbinder auf Nut ${activeSlotNumber} zu setzen`
                : `Klicke auf das Profil, um eine Bohrung auf Nut ${activeSlotNumber} zu setzen`}
            </div>
          )}
        </div>

        {/* Status bar */}
        <div className="flex items-center justify-between px-3 py-1.5 border-t border-slate-200 bg-slate-50 text-[10px] text-muted-foreground">
          <div>
            {visibleHoles.length} Bohrung{visibleHoles.length !== 1 ? 'en' : ''} · {visibleConnectors.length} Verbinder auf Nut {activeSlotNumber} ({SLOT_SIDE_DE[activeSlot]})
          </div>
          <div className="flex items-center gap-3">
            <span>Raster: Genau (1 mm)</span>
            <span>
              <kbd className="px-1 bg-white border border-slate-200 rounded">B</kbd> Bohrung ·{' '}
              <kbd className="px-1 bg-white border border-slate-200 rounded">V</kbd> Verbinder ·{' '}
              <kbd className="px-1 bg-white border border-slate-200 rounded">Esc</kbd> Auswahl ·{' '}
              <kbd className="px-1 bg-white border border-slate-200 rounded">Del</kbd> Löschen
            </span>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

// ---------------------------------------------------------------------------
// Stirnseiten-Overlay: Querschnitt groß, Klick auf Kernzug = Gewinde toggeln
// ---------------------------------------------------------------------------

interface EndFaceOverlayProps {
  section: ProfileSection;
  endLabel: 'Anfang' | 'Ende';
  treatment?: EndTreatment;
  onChange: (t: EndTreatment) => void;
  onClose: () => void;
}

function EndFaceOverlay({ section, endLabel, treatment, onChange, onClose }: EndFaceOverlayProps) {
  const t: EndTreatment = treatment ?? { thread: false, scope: 'all' };
  const bores = getBoreCounts(section);
  const allBoreNums = useMemo(() => {
    const out: number[] = [];
    for (let iy = 0; iy < bores.y; iy++) {
      for (let ix = 0; ix < bores.x; ix++) {
        out.push(getBoreNumber(section, ix, iy));
      }
    }
    return out;
  }, [section, bores.x, bores.y]);

  const activeBores = useMemo(() => {
    if (!t.thread) return new Set<number>();
    if (t.scope === 'all' || t.scope === undefined) return new Set(allBoreNums);
    if (t.scope === 'center') {
      const mid = Math.ceil(allBoreNums.length / 2);
      return new Set([mid]);
    }
    return new Set(allBoreNums);
  }, [t.thread, t.scope, allBoreNums]);

  const toggleBore = (num: number) => {
    const next = new Set(activeBores);
    if (next.has(num)) next.delete(num); else next.add(num);
    if (next.size === 0) onChange({ ...t, thread: false });
    else if (next.size === allBoreNums.length) onChange({ ...t, thread: true, scope: 'all' });
    else if (next.size === 1) onChange({ ...t, thread: true, scope: 'center' });
    else onChange({ ...t, thread: true, scope: 'all' });
  };

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-6" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Stirnseite {endLabel}</h3>
            <p className="text-[11px] text-muted-foreground">Klicke auf einen Kernzug, um dort ein M8-Gewinde zu setzen.</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center justify-center bg-slate-50 rounded-lg p-4 border border-slate-200">
          <ProfileCrossSection2D
            section={section}
            activeSlot="A"
            activeModuleIndex={0}
            onSelectSlot={() => { /* keine Nutwahl im Stirnseitenmodus */ }}
            onSelectBore={toggleBore}
            activeBores={activeBores}
            size={260}
            showLabels
          />
        </div>

        <div className="mt-3 flex items-center justify-between gap-2 text-[11px]">
          <div className="text-muted-foreground">
            {t.thread ? `Aktiv: ${activeBores.size} von ${allBoreNums.length} Kernzügen` : 'Kein Gewinde gesetzt'}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onChange({ thread: true, scope: 'all' })}
              className="px-2 py-1 rounded border border-slate-200 hover:border-primary/50 hover:text-primary"
            >
              Alle
            </button>
            <button
              onClick={() => onChange({ thread: false })}
              className="px-2 py-1 rounded border border-slate-200 hover:border-red-300 hover:text-red-600"
            >
              Keine
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
