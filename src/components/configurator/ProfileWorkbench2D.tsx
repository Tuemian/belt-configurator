import { useCallback, useMemo, useRef, useState, useEffect, useLayoutEffect } from 'react';
import { Plus, Trash2, Copy, FlipHorizontal2, X, AlertTriangle, Keyboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  CONNECTOR_TYPES,
  SLOT_SIDE_DE,
  SLOT_LABEL_DE,
  MIN_EDGE_DISTANCE,
  getModulePitch,
  getSlotCounts,
  getSlotNumber,
  getBorePositions,
  type ProfileSection,
  type ProfileHole,
  type ProfileConnector,
  type ConnectorType,
  type SlotId,
  type EndTreatment,
  type AngleAxis,
} from '@/lib/profile-configurator-types';
import { ProfileCrossSection2D } from './ProfileCrossSection2D';
import { NumericInput } from './NumericInput';
import { useHoleTypes } from '@/hooks/use-hole-types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Tool = 'select' | 'hole' | 'connector';

interface SlotKey {
  slot: SlotId;
  moduleIndex: number;
}

interface Props {
  section: ProfileSection;
  length: number;
  angleStart: number;
  angleEnd: number;
  /** Um welche Achse der Schrägschnitt kippt (default 'AC', s. profile-configurator-types). */
  angleAxis?: AngleAxis;
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

const SNAP_FINE = 1;
const CONNECTOR_FOOTPRINT = 22; // mm

const SLOT_ORDER: SlotId[] = ['A', 'B', 'C', 'D'];

function holeColor(type: ProfileHole['type']): string {
  if (type === 'm6-thread' || type === 'm8-thread') return '#b78628';
  if (type === 'step-m6' || type === 'step-m8') return '#3b67a8';
  return '#1e293b';
}

function snapValue(raw: number, snap: number, snapPoints: number[], length: number): number {
  if (snap <= 1) {
    for (const p of snapPoints) {
      if (Math.abs(raw - p) <= 2) return Math.round(p);
    }
  }
  const v = Math.round(raw / snap) * snap;
  return Math.max(snap, Math.min(Math.floor((length - 1) / snap) * snap, v));
}

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

function keyOf(s: SlotId, mi: number): string { return `${s}:${mi}`; }

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProfileWorkbench2D({
  section,
  length,
  angleStart,
  angleEnd,
  angleAxis = 'AC',
  holes,
  connectors,
  endStart,
  endEnd,
  onUpdateHoles,
  onUpdateConnectors,
  onUpdateEndStart,
  onUpdateEndEnd,
}: Props) {
  const HOLE_TYPES = useHoleTypes();
  const [activeKey, setActiveKey] = useState<SlotKey>({ slot: 'A', moduleIndex: 0 });
  /** Multi-Select: zusätzliche Nuten für Batch-Bearbeitung (enthält die aktive Nut nicht) */
  const [multiSelected, setMultiSelected] = useState<Set<string>>(new Set());
  const [tool, setTool] = useState<Tool>('hole');
  const [holeType, setHoleType] = useState<ProfileHole['type']>('d55');
  const [connType, setConnType] = useState<ConnectorType>('tnut-m8');
  const [hoverZ, setHoverZ] = useState<{ key: string; z: number } | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const counts = useMemo(() => getSlotCounts(section), [section]);
  const MODULE = getModulePitch(section);

  // View modes & dialogs
  // Zoom/Pan der Zeichenfläche: zoom=1 zeigt das ganze Profil, panMm ist der
  // linke Rand des sichtbaren Fensters (mm). Ersetzt den alten Anpassen/Detail-
  // Umschalter durch echtes Zoomen (Mausrad) + Verschieben (Ziehen auf leerer Fläche).
  const [zoom, setZoom] = useState(1);
  const [panMm, setPanMm] = useState(0);
  const visibleWidthMm = length / zoom;
  const maxPanMm = Math.max(0, length - visibleWidthMm);
  const clampedPanMm = Math.min(Math.max(panMm, 0), maxPanMm);
  const resetView = () => { setZoom(1); setPanMm(0); };
  /** Zoomt um `factor`, hält dabei die Mitte des aktuell sichtbaren Ausschnitts stabil (für die +/- Buttons, ohne Cursor-Bezug). */
  const zoomByFactor = (factor: number) => {
    const nextZoom = Math.min(20, Math.max(1, zoom * factor));
    const prevVisible = length / zoom;
    const nextVisible = length / nextZoom;
    const centerMm = clampedPanMm + prevVisible / 2;
    const nextPan = Math.min(Math.max(centerMm - nextVisible / 2, 0), Math.max(0, length - nextVisible));
    setZoom(nextZoom);
    setPanMm(nextPan);
  };
  const [listDialogOpen, setListDialogOpen] = useState(false);

  /** Eine Reihe pro Profilseite (A/B/C/D); jede Reihe hat 1..n Nut-Spuren */
  const sideRows = useMemo(() => {
    return SLOT_ORDER.map((slot) => {
      const n = counts[slot];
      const faceWidth = (slot === 'A' || slot === 'C') ? section.w : section.h;
      const lanes = Array.from({ length: n }, (_, mi) => ({
        moduleIndex: mi,
        number: getSlotNumber(section, slot, mi),
        centerOnFace: MODULE * (mi + 0.5),
      }));
      return { slot, faceWidth, lanes };
    });
  }, [section, counts, MODULE]);

  /** Liste aller derzeit ausgewählten Slots (immer mind. der aktive) */
  const selectedSlots = useMemo<SlotKey[]>(() => {
    const set = new Set(multiSelected);
    set.add(keyOf(activeKey.slot, activeKey.moduleIndex));
    return Array.from(set).map((k) => {
      const [s, mi] = k.split(':');
      return { slot: s as SlotId, moduleIndex: Number(mi) };
    });
  }, [multiSelected, activeKey]);

  // Overlap detection across all rows
  const overlapWarning = useMemo(() => {
    const byKey: Record<string, ProfileHole[]> = {};
    holes.forEach((h) => {
      const k = keyOf(ensureSlot(h), h.moduleIndex ?? 0);
      (byKey[k] ??= []).push(h);
    });
    for (const list of Object.values(byKey)) {
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          const a = list[i], b = list[j];
          const minDist = (a.diameter + b.diameter) / 2;
          if (Math.abs(a.zPosition - b.zPosition) < minDist) return true;
        }
      }
    }
    return false;
  }, [holes]);

  // Snap points (per row are simple)
  const snapPointsFor = useCallback((rowKey: string) => {
    const pts = [length / 2, 10, 15, 20, length - 10, length - 15, length - 20];
    holes.filter((h) => keyOf(ensureSlot(h), h.moduleIndex ?? 0) === rowKey).forEach((h) => pts.push(h.zPosition));
    return pts;
  }, [length, holes]);

  // Selected helpers
  const selectedHole = holes.find((h) => h.id === selectedId);
  const selectedConn = connectors.find((c) => c.id === selectedId);

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
    if (selectedConn) {
      const otherEnd: 'start' | 'end' = selectedConn.end === 'start' ? 'end' : 'start';
      const taken = connectors.some((c) => c.slot === selectedConn.slot && c.end === otherEnd && (c.moduleIndex ?? 0) === (selectedConn.moduleIndex ?? 0));
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

  // ---- Klick-Handler für eine Reihe ----
  const handleRowClick = useCallback((row: { slot: SlotId; moduleIndex: number }, zMm: number, additive: boolean) => {
    if (draggingId) return;
    const rowKey = keyOf(row.slot, row.moduleIndex);
    const isAlreadyActive = row.slot === activeKey.slot && row.moduleIndex === activeKey.moduleIndex;

    if (tool === 'select') {
      // Bei Auswahl-Tool: Klick wechselt nur die aktive Nut
      if (additive) {
        setMultiSelected((prev) => {
          const next = new Set(prev);
          if (rowKey === keyOf(activeKey.slot, activeKey.moduleIndex)) return next;
          if (next.has(rowKey)) next.delete(rowKey); else next.add(rowKey);
          return next;
        });
      } else {
        setActiveKey(row);
        setMultiSelected(new Set());
        setSelectedId(null);
      }
      return;
    }

    // Tool: hole oder connector – Item auf alle ausgewählten Slots anwenden
    // Wenn diese Reihe noch nicht aktiv ist, wird sie zur aktiven Reihe
    if (!isAlreadyActive && !additive) {
      setActiveKey(row);
      setMultiSelected(new Set());
    }

    // Selected slots neu berechnen für diesen Klick
    const targets: SlotKey[] = (() => {
      if (additive) {
        // Multi-Modus: aktive + alle multi + die geklickte
        const set = new Set(multiSelected);
        set.add(keyOf(activeKey.slot, activeKey.moduleIndex));
        set.add(rowKey);
        return Array.from(set).map((k) => { const [s, mi] = k.split(':'); return { slot: s as SlotId, moduleIndex: Number(mi) }; });
      }
      if (isAlreadyActive) {
        return selectedSlots;
      }
      return [row];
    })();

    if (tool === 'hole') {
      const z = snapValue(zMm, SNAP_FINE, snapPointsFor(rowKey), length);
      const typeDef = HOLE_TYPES.find((t) => t.id === holeType)!;
      const newHoles: ProfileHole[] = targets.map((s) => ({
        id: crypto.randomUUID(),
        zPosition: z,
        diameter: typeDef.diameter,
        slot: s.slot,
        moduleIndex: s.moduleIndex,
        type: holeType,
        label: typeDef.label,
      }));
      onUpdateHoles([...holes, ...newHoles]);
      const primary = newHoles.find((h) => h.slot === row.slot && h.moduleIndex === row.moduleIndex);
      setSelectedId(primary?.id ?? newHoles[0]?.id ?? null);
    } else if (tool === 'connector') {
      const end: 'start' | 'end' = zMm < length / 2 ? 'start' : 'end';
      const typeDef = CONNECTOR_TYPES.find((t) => t.id === connType)!;
      const additions: ProfileConnector[] = [];
      targets.forEach((s) => {
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
      const primary = additions.find((c) => c.slot === row.slot && c.moduleIndex === row.moduleIndex);
      setSelectedId(primary?.id ?? additions[0].id);
    }
  }, [tool, holeType, connType, length, holes, connectors, snapPointsFor, draggingId, activeKey, multiSelected, selectedSlots, onUpdateHoles, onUpdateConnectors]);

  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex flex-col h-full bg-white rounded-lg border border-slate-200 overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3 px-3 py-2 border-b border-slate-200 bg-slate-50 flex-wrap">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="font-semibold uppercase tracking-wider">{section.label}</span>
            <span>·</span>
            <span>{length} mm</span>
            <span>·</span>
            <span className="text-foreground">Aktiv: <span className="font-semibold text-primary">Nut {getSlotNumber(section, activeKey.slot, activeKey.moduleIndex)}</span> ({SLOT_SIDE_DE[activeKey.slot]})</span>
            {multiSelected.size > 0 && (
              <>
                <span>·</span>
                <span>{multiSelected.size + 1} Nuten gleichzeitig</span>
                <button onClick={() => setMultiSelected(new Set())} className="underline hover:text-foreground">aufheben</button>
              </>
            )}
          </div>

          {/* Tool palette */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-white rounded-md border border-slate-200 p-0.5">
                <button
                  onClick={() => setTool('select')}
                  className={`px-2 py-1 text-xs rounded ${tool === 'select' ? 'bg-primary/10 text-primary font-semibold' : 'text-muted-foreground'}`}
                >
                  Auswahl
                </button>
                <button
                  onClick={() => setTool('hole')}
                  className={`px-2 py-1 text-xs rounded ${tool === 'hole' ? 'bg-primary/10 text-primary font-semibold' : 'text-muted-foreground'}`}
                >
                  + Bohrung
                </button>
                <button
                  onClick={() => setTool('connector')}
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

            <div className="hidden sm:block w-px h-6 bg-slate-200" />

            {/* Zoom / Pan: Mausrad zoomt zum Cursor, Ziehen auf leerer Fläche verschiebt */}
            <div className="flex items-center gap-0.5 bg-white rounded-md border border-slate-200 p-0.5">
              <button
                onClick={() => zoomByFactor(1 / 1.5)}
                disabled={zoom <= 1}
                className="w-6 h-6 flex items-center justify-center text-sm rounded text-muted-foreground hover:text-foreground hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed"
                title="Rauszoomen"
              >
                −
              </button>
              <button
                onClick={resetView}
                className="px-2 py-1 text-xs rounded text-muted-foreground hover:text-foreground font-semibold"
                title="Ganzes Profil anzeigen (Mausrad zoomt, Ziehen verschiebt)"
              >
                Passend
              </button>
              <button
                onClick={() => zoomByFactor(1.5)}
                disabled={zoom >= 20}
                className="w-6 h-6 flex items-center justify-center text-sm rounded text-muted-foreground hover:text-foreground hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed"
                title="Reinzoomen"
              >
                +
              </button>
            </div>

            <div className="hidden sm:block w-px h-6 bg-slate-200" />

            {/* Bohrungen als Liste eingeben */}
            <button
              onClick={() => setListDialogOpen(true)}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded border border-slate-200 bg-white hover:bg-primary/5 hover:border-primary/40 text-foreground"
              title="Bohrungspositionen als Liste eingeben"
            >
              <Keyboard className="h-3 w-3" /> Liste
            </button>
          </div>
        </div>


        {/* Main stage:
            EU 1st-angle layout:
              - Stirnseite "Ende"  links der Reihen
              - 4 Reihen je Profilseite (A/B/C/D), eine pro Seite
              - Stirnseite "Anfang" rechts der Reihen
        */}
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
          {/* Left: end face "Ende" */}
          {onUpdateEndEnd && (
            <aside className="w-full lg:w-40 shrink-0 max-h-36 lg:max-h-none border-b lg:border-b-0 lg:border-r border-slate-200 bg-slate-50 overflow-y-auto p-2 space-y-2">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground text-center">Stirnseite Ende</div>
              <EndFacePanel
                label="Ende"
                section={section}
                treatment={endEnd}
                onChange={(t) => onUpdateEndEnd?.(t)}
              />
              <p className="text-[9px] text-muted-foreground leading-tight px-1">
                Klick auf Kernzug = M8-Gewinde (× = aktiv).
              </p>
            </aside>
          )}

          {/* Center: focus view — only the active side is rendered, plus side switcher */}
          <div className="flex-1 min-w-0 overflow-auto p-4 md:p-6 space-y-4 relative">
            {overlapWarning && (
              <div className="sticky top-0 z-10 inline-flex items-center gap-1.5 bg-amber-50 border border-amber-300 text-amber-800 text-[10px] font-medium rounded-md px-2 py-1">
                <AlertTriangle className="h-3 w-3" />
                Bohrungen überlappen
              </div>
            )}

            {/* Side switcher header: clickable cross-section + active-side title */}
            <div className="flex items-center gap-4 md:gap-6 bg-white rounded-lg border border-slate-200 p-3 md:p-4 shadow-sm">
              <div className="shrink-0 flex flex-col items-center gap-1">
                <ProfileCrossSection2D
                  section={section}
                  activeSlot={activeKey.slot}
                  activeModuleIndex={activeKey.moduleIndex}
                  selectedKeys={new Set([keyOf(activeKey.slot, activeKey.moduleIndex), ...multiSelected])}
                  onSelectSlot={(slot, mi, additive) => {
                    if (additive) {
                      const k = keyOf(slot, mi);
                      const cur = keyOf(activeKey.slot, activeKey.moduleIndex);
                      if (k === cur) return;
                      setMultiSelected((prev) => {
                        const next = new Set(prev);
                        if (next.has(k)) next.delete(k); else next.add(k);
                        return next;
                      });
                    } else {
                      setActiveKey({ slot, moduleIndex: mi });
                      setMultiSelected(new Set());
                      setSelectedId(null);
                    }
                  }}
                  size={88}
                  showLabels
                  rotate90={section.w > section.h}
                />
                <span className="text-[9px] text-muted-foreground">Klick = Seite wählen</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Aktive Bearbeitungs-Seite</div>
                <h2 className="text-xl md:text-2xl font-bold text-foreground mt-0.5">
                  Nut {getSlotNumber(section, activeKey.slot, activeKey.moduleIndex)} – <span className="uppercase">{SLOT_LABEL_DE[activeKey.slot]}</span>
                </h2>
                <div className="text-xs text-muted-foreground mt-1">
                  {multiSelected.size > 0 && (
                    <> · <span className="text-primary font-medium">{multiSelected.size + 1} Nuten gleichzeitig</span> · <button onClick={() => setMultiSelected(new Set())} className="underline hover:text-foreground">aufheben</button></>
                  )}
                </div>
              </div>
            </div>

            <ProfileOverviewStrip
              length={length}
              panMm={clampedPanMm}
              visibleWidthMm={visibleWidthMm}
              holes={holes.filter((h) => ensureSlot(h) === activeKey.slot)}
              onNavigate={(mm) => {
                const half = visibleWidthMm / 2;
                setPanMm(Math.min(Math.max(mm - half, 0), maxPanMm));
              }}
            />
            <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 border border-slate-200 px-2.5 py-1 text-[10px] text-muted-foreground">
              <span>🖱️ Mausrad = Zoom</span>
              <span className="text-slate-300">·</span>
              <span>Ziehen auf der Zeichnung = Verschieben</span>
              <span className="text-slate-300">·</span>
              <span>Übersichtsstreifen oben = Springen</span>
            </div>

            <div className="space-y-2">
            {sideRows.filter((s) => s.slot === activeKey.slot).map((side) => {
              const sideHoles = holes.filter((h) => ensureSlot(h) === side.slot);
              const sideConns = connectors.filter((c) => c.slot === side.slot);
              // Bohrungen von der gegenüberliegenden Seite (A↔C, B↔D) als Geister-Marker
              const oppositeSlot: SlotId =
                side.slot === 'A' ? 'C' : side.slot === 'C' ? 'A' : side.slot === 'B' ? 'D' : 'B';
              const ghostHoles = holes.filter((h) => ensureSlot(h) === oppositeSlot);
              const isActiveSide = side.slot === activeKey.slot;
              const isMultiSide = side.lanes.some((l) => multiSelected.has(keyOf(side.slot, l.moduleIndex)));
              return (
                <SideRow
                  key={side.slot}
                  section={section}
                  side={side}
                  length={length}
                  zoom={zoom}
                  panMm={clampedPanMm}
                  onViewChange={(nextZoom, nextPanMm) => { setZoom(nextZoom); setPanMm(nextPanMm); }}
                  angleStart={angleStart}
                  angleEnd={angleEnd}
                  angleAxis={angleAxis}
                  holes={sideHoles}
                  ghostHoles={ghostHoles}
                  connectors={sideConns}
                  tool={tool}
                  activeModuleIndex={isActiveSide ? activeKey.moduleIndex : null}
                  multiSelected={multiSelected}
                  selectedId={selectedId}
                  draggingId={draggingId}
                  hoverInfo={hoverZ && hoverZ.key.startsWith(side.slot + ':') ? { moduleIndex: Number(hoverZ.key.split(':')[1]), z: hoverZ.z } : null}
                  onHover={(mi, z) => setHoverZ(z === null ? null : { key: keyOf(side.slot, mi), z })}
                  onClick={(mi, zMm, additive) => handleRowClick({ slot: side.slot, moduleIndex: mi }, zMm, additive)}
                  onDragStart={(id) => { setDraggingId(id); setSelectedId(id); }}
                  onDragMove={(id, zMm) => {
                    const conn = connectors.find((c) => c.id === id);
                    if (conn) {
                      const newEnd: 'start' | 'end' = zMm < length / 2 ? 'start' : 'end';
                      if (conn.end !== newEnd) onUpdateConnectors(connectors.map((c) => c.id === id ? { ...c, end: newEnd } : c));
                      return;
                    }
                    const hole = holes.find((h) => h.id === id);
                    if (hole) {
                      const rk = keyOf(ensureSlot(hole), hole.moduleIndex ?? 0);
                      const z = snapValue(zMm, SNAP_FINE, snapPointsFor(rk).filter((p) => Math.abs(p - hole.zPosition) > 0.1), length);
                      onUpdateHoles(holes.map((h) => h.id === id ? { ...h, zPosition: z } : h));
                    }
                  }}
                  onDragEnd={() => setDraggingId(null)}
                  onSelectMarker={(id) => setSelectedId(id)}
                />
              );
            })}
            </div>

            {/* Bottom hint */}
            {holes.length === 0 && connectors.length === 0 && (
              <div className="text-center text-[11px] text-muted-foreground py-3">
                <Plus className="h-3 w-3 inline mr-1" />
                Klicke auf das Profil, um eine Bohrung zu setzen. Über das Querschnitt-Icon links wechselst du die Seite.
              </div>
            )}
          </div>

          {/* Right: end face "Anfang" */}
          {onUpdateEndStart && (
            <aside className="w-full lg:w-40 shrink-0 max-h-36 lg:max-h-none border-t lg:border-t-0 lg:border-l border-slate-200 bg-slate-50 overflow-y-auto p-2 space-y-2">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground text-center">Stirnseite Anfang</div>
              <EndFacePanel
                label="Anfang"
                section={section}
                treatment={endStart}
                onChange={(t) => onUpdateEndStart?.(t)}
              />
              <p className="text-[9px] text-muted-foreground leading-tight px-1">
                Klick auf Kernzug = M8-Gewinde (× = aktiv).
              </p>
            </aside>
          )}
        </div>


        {/* Selected-item floating panel — anchored top-right so it never collides with the page-level price card (bottom-right) */}
        {(selectedHole || selectedConn) && (
          <div className="absolute top-4 right-4 w-[260px] bg-white border border-slate-200 rounded-lg shadow-lg p-3 space-y-2.5 z-20">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">
                {selectedHole ? 'Bohrung' : 'Verbinder'}
                {' · '}
                {selectedHole && `Nut ${getSlotNumber(section, ensureSlot(selectedHole), selectedHole.moduleIndex ?? 0)}`}
                {selectedConn && `Nut ${getSlotNumber(section, selectedConn.slot, selectedConn.moduleIndex ?? 0)}`}
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
                {selectedHole.type === 'custom' && (
                  <div>
                    <Label className="text-[10px] text-muted-foreground mb-1 block">Durchmesser (mm)</Label>
                    <NumericInput
                      value={selectedHole.diameter}
                      min={1}
                      max={30}
                      step={0.1}
                      onCommit={(d) => updateHole({ diameter: d })}
                      className="h-8 text-xs"
                    />
                  </div>
                )}
                <div>
                  <Label className="text-[10px] text-muted-foreground mb-1 block">Position (mm vom Anfang)</Label>
                  <NumericInput
                    value={selectedHole.zPosition}
                    min={1}
                    max={length - 1}
                    step={1}
                    onCommit={(z) => updateHole({ zPosition: z })}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground mb-1 block">Schnell-Position</Label>
                  <div className="grid grid-cols-5 gap-1">
                    {[
                      { lbl: '20→', z: 20, title: '20 mm vom Anfang' },
                      { lbl: '50→', z: 50, title: '50 mm vom Anfang' },
                      { lbl: 'Mitte', z: Math.round(length / 2), title: 'Mitte des Profils' },
                      { lbl: '←50', z: length - 50, title: '50 mm vom Ende' },
                      { lbl: '←20', z: length - 20, title: '20 mm vom Ende' },
                    ].map((q) => (
                      <button
                        key={q.lbl}
                        onClick={() => updateHole({ zPosition: Math.max(1, Math.min(length - 1, q.z)) })}
                        title={q.title}
                        className="h-7 text-[10px] rounded border border-slate-200 bg-white hover:bg-primary/10 hover:border-primary text-foreground font-medium"
                      >
                        {q.lbl}
                      </button>
                    ))}
                  </div>
                </div>
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

        {/* Status bar */}
        <div className="flex items-center justify-between px-3 py-1.5 border-t border-slate-200 bg-slate-50 text-[10px] text-muted-foreground">
          <div>{holes.length} Bohrung{holes.length !== 1 ? 'en' : ''} · {connectors.length} Verbinder gesamt</div>
          <div>
            <kbd className="px-1 bg-white border border-slate-200 rounded">B</kbd> Bohrung ·{' '}
            <kbd className="px-1 bg-white border border-slate-200 rounded">V</kbd> Verbinder ·{' '}
            <kbd className="px-1 bg-white border border-slate-200 rounded">S</kbd> Auswahl ·{' '}
            Shift-Klick = mehrere Nuten
          </div>
        </div>

        {/* Bulk-Eingabe-Dialog */}
        <BulkHolesDialog
          open={listDialogOpen}
          onOpenChange={setListDialogOpen}
          section={section}
          length={length}
          activeKey={activeKey}
          defaultType={holeType}
          onApply={(newHoles) => {
            onUpdateHoles([...holes, ...newHoles]);
            setListDialogOpen(false);
          }}
        />
      </div>
    </TooltipProvider>
  );
}

// ---------------------------------------------------------------------------
// SideRow: eine Reihe pro Profilseite (A/B/C/D), mit 1..n Nut-Spuren übereinander
// ---------------------------------------------------------------------------

interface SideRowProps {
  section: ProfileSection;
  side: {
    slot: SlotId;
    faceWidth: number;
    lanes: { moduleIndex: number; number: number; centerOnFace: number }[];
  };
  length: number;
  /** Zoomstufe (1 = ganzes Profil sichtbar) und linker Rand des sichtbaren Fensters (mm) */
  zoom: number;
  panMm: number;
  onViewChange: (zoom: number, panMm: number) => void;
  angleStart: number;
  angleEnd: number;
  angleAxis?: AngleAxis;
  holes: ProfileHole[];
  /** Bohrungen der gegenüberliegenden Seite – nur als Geister-Markierung anzeigen */
  ghostHoles?: ProfileHole[];
  connectors: ProfileConnector[];
  tool: Tool;
  activeModuleIndex: number | null;
  multiSelected: Set<string>;
  selectedId: string | null;
  draggingId: string | null;
  hoverInfo: { moduleIndex: number; z: number } | null;
  onHover: (moduleIndex: number, z: number | null) => void;
  onClick: (moduleIndex: number, zMm: number, additive: boolean) => void;
  onDragStart: (id: string) => void;
  onDragMove: (id: string, zMm: number) => void;
  onDragEnd: () => void;
  onSelectMarker: (id: string) => void;
}

function SideRow({
  section, side, length, zoom, panMm, onViewChange, angleStart, angleEnd, angleAxis = 'AC', holes, ghostHoles = [], connectors, tool,
  activeModuleIndex, multiSelected, selectedId, draggingId, hoverInfo,
  onHover, onClick, onDragStart, onDragMove, onDragEnd, onSelectMarker,
}: SideRowProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  /** Verfolgt, ob eine laufende Zeigerinteraktion (Pointer-Down auf leerer Fläche) sich zu einem Pan entwickelt hat, um den abschließenden Klick zu unterdrücken. */
  const panState = useRef<{ startClientX: number; startClientY: number; startPanMm: number; isPanning: boolean } | null>(null);
  const PAN_THRESHOLD_PX = 4;

  // Die Zeile nutzt viewBox + preserveAspectRatio="none", damit die Höhe pro Lane
  // konstant bleibt, egal wie lang das Profil ist. Dadurch wird die horizontale
  // und vertikale Skalierung unterschiedlich (besonders extrem bei langen Profilen
  // in "Anpassen"-Ansicht) — ein <circle> würde zur Ellipse/zum "Schlitz". Wir
  // messen das reale Verhältnis über getScreenCTM() und skalieren runde Marker
  // (Bohrungen) mit ihrem Gegenwert wieder gerade.
  const [circleScaleX, setCircleScaleX] = useState(1);
  useLayoutEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const update = () => {
      const ctm = svg.getScreenCTM();
      if (ctm && ctm.a) setCircleScaleX(Math.abs(ctm.d / ctm.a));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(svg);
    return () => ro.disconnect();
  });

  // Geometrie
  const PAD_X = 32;
  const PAD_Y = 10;
  const LANE_PIX_HEIGHT = 36;            // px pro Nut-Spur
  const RULER_H = 14;
  const ROW_PIX_HEIGHT = LANE_PIX_HEIGHT * side.lanes.length;
  const VB_W = length + PAD_X * 2;
  const VB_H = PAD_Y * 2 + RULER_H + ROW_PIX_HEIGHT;

  // EU 1st-angle Konvention: Anfang (z=0) zeigt RECHTS, Ende (z=length) zeigt LINKS.
  // dx() bildet eine z-Position (mm) auf die Display-X-Koordinate ab.
  const dx = useCallback((z: number) => length - z, [length]);

  // Sichtbares Fenster (Zoom/Pan): panMm/zoom kommen vom Elternteil, gelten
  // seitenübergreifend. Rand schrumpft mit dem Zoom mit, damit er bei starkem
  // Reinzoomen nicht dominiert; bei zoom=1 identisch zur alten Vollansicht.
  const visibleWidthMm = length / zoom;
  const marginMm = PAD_X / zoom;
  // panMm ist der z-Wert (mm ab Anfang) des sichtbaren Fensteranfangs. Die Zeichenfläche
  // ist gespiegelt (dx(z) = length - z), daher muss das Fenster beim Umrechnen in die
  // lokale/viewBox-X-Achse mitgespiegelt werden — sonst zeigt der viewBox einen anderen
  // Bereich als den, den Übersichtsstreifen/Zoom-zum-Cursor eigentlich ansteuern.
  const windowXDispStart = length - panMm - visibleWidthMm;
  const viewBoxX = PAD_X + windowXDispStart - marginMm;
  const viewBoxWidth = visibleWidthMm + marginMm * 2;

  // Schrägschnitt — wegen der Spiegelung ist der "Anfang"-Schnitt jetzt rechts.
  // Der Schnitt kippt real nur um EINE Achse (s. ProfileViewer3D). Welches Nutenpaar
  // quer dazu liegt (und damit diagonal ausläuft) ist wählbar (angleAxis), da es vom
  // Anschluss abhängt, an welcher Nut ein anderes Profil anstößt.
  //
  // Die eingegebene Länge darf NIE überschritten werden (kein Eckpunkt darf über sie
  // hinausragen) — pro Ende (Anfang/Ende) bleibt daher immer GENAU eine der beiden Kanten
  // exakt auf der Länge (Long Point) stehen, die andere läuft um den vollen Eckversatz
  // nach innen aus. WELCHE der beiden Kanten das ist, hängt vom Vorzeichen des jeweiligen
  // Winkels ab: positiv → "moving"-Kante (Nut D bzw. C) kürzer, "ref"-Kante (Nut B bzw. A)
  // bleibt auf Länge; negativ → umgekehrt (spiegelbildlich um den jeweils anderen
  // Eckpunkt). Beide Enden werden unabhängig voneinander behandelt (Anfang und Ende
  // können unterschiedliche Vorzeichen haben). Muss exakt dieselbe Logik wie
  // ProfileViewer3D.applyMiterCut verwenden.
  const tanS = Math.tan((angleStart * Math.PI) / 180);
  const tanE = Math.tan((angleEnd * Math.PI) / 180);
  const isDiagonal = angleAxis === 'BD' ? side.slot === 'B' || side.slot === 'D' : side.slot === 'A' || side.slot === 'C';
  const movingSlot: SlotId = angleAxis === 'BD' ? 'C' : 'D';
  const refSlot: SlotId = angleAxis === 'BD' ? 'A' : 'B';
  const pitch = getModulePitch(section);
  const widthLanes = Math.max(1, Math.round(section.w / pitch));
  const heightLanes = Math.max(1, Math.round(section.h / pitch));
  // Versatzbetrag der geraden Seiten = ROW_PIX_HEIGHT, die die DIAGONALEN Seiten für
  // ihre eigene volle Breite/Höhe hätten (unabhängig von der ROW_PIX_HEIGHT der aktuell
  // gerenderten geraden Seite selbst, die eine andere Spurzahl haben kann).
  const diagonalRowPixHeight = LANE_PIX_HEIGHT * (angleAxis === 'BD' ? heightLanes : widthLanes);
  const rawS = diagonalRowPixHeight * tanS; // Anfang, vorzeichenbehaftet
  const rawE = diagonalRowPixHeight * tanE; // Ende, vorzeichenbehaftet
  // Kürzungsbetrag je Ende und Kante (immer ≥ 0 — nie eine Verlängerung über die Länge hinaus).
  const movingRecedeS = Math.max(0, rawS);
  const movingRecedeE = Math.max(0, rawE);
  const refRecedeS = Math.max(0, -rawS);
  const refRecedeE = Math.max(0, -rawE);
  const top = PAD_Y + RULER_H;
  const bot = top + ROW_PIX_HEIGHT;
  // Diagonale Seiten: "obere" Kante (Zeile-y=top) = moving-Nut, "untere" Kante (y=bot) =
  // ref-Nut — je Ende (links=Ende, rechts=Anfang) unabhängig gekürzt. Gerade Seiten: die
  // eigene Kante wird an beiden Enden um ihren jeweiligen Betrag gekürzt (kein Diagonal-
  // Artefakt über mehrere Spuren hinweg).
  const cutS = side.slot === movingSlot ? movingRecedeS : side.slot === refSlot ? refRecedeS : movingRecedeS;
  const cutE = side.slot === movingSlot ? movingRecedeE : side.slot === refSlot ? refRecedeE : movingRecedeE;
  const profilePath = isDiagonal
    ? `M ${movingRecedeE} ${top} L ${length - movingRecedeS} ${top} L ${length - refRecedeS} ${bot} L ${refRecedeE} ${bot} Z`
    : `M ${cutE} ${top} L ${length - cutS} ${top} L ${length - cutS} ${bot} L ${cutE} ${bot} Z`;

  // y-Position der Nut-Mitte je Lane (oberste Lane = Lane 0)
  const laneCy = (laneIdx: number) => top + LANE_PIX_HEIGHT * (laneIdx + 0.5);

  // Mausmapping → (moduleIndex, zMm). Beachte X-Spiegelung.
  const screenToLocal = useCallback((clientX: number, clientY: number): { mi: number; z: number } | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const pt = svg.createSVGPoint();
    pt.x = clientX; pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const local = pt.matrixTransform(ctm.inverse());
    const xInBody = local.x - PAD_X;
    const z = length - xInBody;        // gespiegelt
    const yRel = local.y - top;
    const laneIdx = Math.max(0, Math.min(side.lanes.length - 1, Math.floor(yRel / LANE_PIX_HEIGHT)));
    return { mi: side.lanes[laneIdx].moduleIndex, z };
  }, [side.lanes, length]);

  // Pan per Ziehen auf leerer Fläche. Marker (Bohrung/Verbinder) rufen in ihrem
  // eigenen onPointerDown bereits stopPropagation() auf, d.h. dieser Handler
  // feuert nur bei Klicks/Zügen auf den Hintergrund — Repositionieren von
  // Markern bleibt unberührt.
  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    const target = e.target as SVGElement;
    if (target.dataset.role === 'marker') return;
    panState.current = { startClientX: e.clientX, startClientY: e.clientY, startPanMm: panMm, isPanning: false };
  };

  const handleMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (panState.current) {
      const deltaPx = e.clientX - panState.current.startClientX;
      if (!panState.current.isPanning && Math.hypot(deltaPx, e.clientY - panState.current.startClientY) > PAN_THRESHOLD_PX) {
        panState.current.isPanning = true;
      }
      if (panState.current.isPanning) {
        const ctm = svgRef.current?.getScreenCTM();
        if (ctm && ctm.a) {
          const mmPerPx = 1 / ctm.a;
          // Gespiegelte Zeichenfläche: Ziehen nach rechts (deltaPx > 0) muss den z-Wert des
          // Fensteranfangs erhöhen (weitere/höhere z liegen visuell weiter links), siehe
          // windowXDispStart oben.
          const nextPan = Math.min(Math.max(panState.current.startPanMm + deltaPx * mmPerPx, 0), Math.max(0, length - visibleWidthMm));
          onViewChange(zoom, nextPan);
        }
        return;
      }
    }
    const loc = screenToLocal(e.clientX, e.clientY);
    if (!loc) return;
    if (loc.z >= 0 && loc.z <= length) onHover(loc.mi, loc.z); else onHover(loc.mi, null);
    if (draggingId) onDragMove(draggingId, loc.z);
  };

  // WICHTIG: panState hier NICHT zurücksetzen — der Browser feuert nach
  // pointerup noch ein click-Event, das in handleClick prüfen muss, ob gerade
  // gepannt wurde (sonst würde jeder Pan zusätzlich eine Bohrung setzen).
  // Der nächste pointerdown überschreibt panState ohnehin mit frischem State.
  const handlePointerUp = () => {
    onDragEnd();
  };

  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (panState.current?.isPanning) { panState.current = null; return; }
    panState.current = null;
    const target = e.target as SVGElement;
    if (target.dataset.role === 'marker') return;
    const loc = screenToLocal(e.clientX, e.clientY);
    if (!loc || loc.z < 0 || loc.z > length) return;
    onClick(loc.mi, loc.z, e.shiftKey || e.metaKey || e.ctrlKey);
  };

  // Mausrad zoomt zum Cursor: mm-Position unter dem Cursor bleibt beim Zoomen stehen.
  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const loc = screenToLocal(e.clientX, e.clientY);
    if (!loc) return;
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    const nextZoom = Math.min(20, Math.max(1, zoom * factor));
    const nextVisibleWidthMm = length / nextZoom;
    const fraction = (loc.z - panMm) / visibleWidthMm;
    const nextPanMm = Math.min(Math.max(loc.z - fraction * nextVisibleWidthMm, 0), Math.max(0, length - nextVisibleWidthMm));
    onViewChange(nextZoom, nextPanMm);
  };

  // Ruler — Labels zeigen z-Wert, aber an gespiegelter X-Position. Schrittweite
  // richtet sich nach dem sichtbaren Ausschnitt, nicht der Gesamtlänge, damit
  // beim Reinzoomen feiner bemaßt wird.
  const rulerStep = visibleWidthMm <= 500 ? 50 : visibleWidthMm <= 1500 ? 100 : visibleWidthMm <= 3000 ? 250 : 500;
  const tickStart = Math.floor(Math.max(0, panMm - rulerStep) / (rulerStep / 5)) * (rulerStep / 5);
  const tickEnd = Math.min(length, panMm + visibleWidthMm + rulerStep);
  const ticks: { z: number; major: boolean; label: string | null }[] = [];
  for (let z = tickStart; z <= tickEnd; z += rulerStep / 5) {
    const major = Math.round(z) % rulerStep === 0;
    ticks.push({ z, major, label: major ? `${Math.round(z)}` : null });
  }


  const showConnectorMagnets = tool === 'connector' || draggingId !== null;
  const cursor = tool === 'hole' || tool === 'connector' ? 'crosshair' : 'default';

  const isAnyActive = activeModuleIndex !== null;
  const isAnyMulti = side.lanes.some((l) => multiSelected.has(`${side.slot}:${l.moduleIndex}`));
  const borderClass = isAnyActive
    ? 'border-primary ring-1 ring-primary/30'
    : isAnyMulti
    ? 'border-primary/50 bg-primary/5'
    : 'border-slate-200 hover:border-primary/40';

  return (
    <div className={`flex items-stretch gap-2 rounded-md border bg-white transition-colors ${borderClass}`}>
      {/* Label column (Seite) */}
      <div className={`shrink-0 w-20 flex flex-col items-center justify-center py-1 px-1 text-center rounded-l-md ${isAnyActive ? 'bg-primary/10' : isAnyMulti ? 'bg-primary/5' : 'bg-slate-50'}`}>
        <div className={`text-sm font-bold ${isAnyActive ? 'text-primary' : 'text-foreground'}`}>Nut {side.lanes.map((l) => l.number).join(', ')}</div>
        <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{SLOT_SIDE_DE[side.slot]}</div>
        <div className="text-[9px] text-muted-foreground">{holes.length} B · {connectors.length} V</div>
      </div>

      {/* SVG */}
      <div className="flex-1 min-w-0 py-1 pr-2">
        <svg
          ref={svgRef}
          viewBox={`${viewBoxX} 0 ${viewBoxWidth} ${VB_H}`}
          preserveAspectRatio="none"
          className="w-full select-none"
          style={{ height: VB_H, cursor: panState.current?.isPanning ? 'grabbing' : cursor }}
          onPointerDown={handlePointerDown}
          onPointerMove={handleMove}
          onPointerLeave={() => onHover(0, null)}
          onPointerUp={handlePointerUp}
          onClick={handleClick}
          onWheel={handleWheel}
        >
          <defs>
            <linearGradient id={`alu-${side.slot}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f1f5f9" />
              <stop offset="45%" stopColor="#cbd5e1" />
              <stop offset="100%" stopColor="#94a3b8" />
            </linearGradient>
          </defs>

          {/* Ruler — gespiegelt: 0 (Anfang) ist rechts, length (Ende) ist links */}
          <g transform={`translate(${PAD_X}, ${PAD_Y})`}>
            <line x1="0" y1={RULER_H} x2={length} y2={RULER_H} stroke="#64748b" strokeWidth="0.6" />
            {ticks.map((tk, i) => (
              <g key={i}>
                <line x1={dx(tk.z)} y1={tk.major ? RULER_H - 6 : RULER_H - 3} x2={dx(tk.z)} y2={RULER_H} stroke="#64748b" strokeWidth={tk.major ? 0.8 : 0.4} />
                {tk.label !== null && (
                  <text
                    x={dx(tk.z)}
                    y={RULER_H - 8}
                    textAnchor="middle"
                    fontSize="8"
                    fill="#475569"
                    fontFamily="ui-monospace, monospace"
                    transform={`translate(${dx(tk.z)} 0) scale(${circleScaleX} 1) translate(${-dx(tk.z)} 0)`}
                  >
                    {tk.label}
                  </text>
                )}
              </g>
            ))}
          </g>


          {/* Profile body */}
          <g transform={`translate(${PAD_X}, 0)`}>
            <path d={profilePath} fill={`url(#alu-${side.slot})`} stroke="#475569" strokeWidth="0.6" />

            {/* Referenzlinie bei Schrägschnitt: die geraden Seiten werden gerade gekürzt/verlängert
                (kein Diagonalschnitt, da sie quer zur gewählten Kippachse liegen — s. profilePath
                oben), aber eine gestrichelte Linie zeigt, wo die Kante ohne Schrägschnitt
                geendet hätte (die eingegebene Kernlänge). */}
            {!isDiagonal && cutE !== 0 && (
              <line x1={0} y1={top} x2={0} y2={bot} stroke="#94a3b8" strokeWidth="0.4" strokeDasharray="1.5 1.5" />
            )}
            {!isDiagonal && cutS !== 0 && (
              <line x1={length} y1={top} x2={length} y2={bot} stroke="#94a3b8" strokeWidth="0.4" strokeDasharray="1.5 1.5" />
            )}

            {/* Lane center lines + lane labels + lane highlights */}
            {side.lanes.map((lane, idx) => {
              const cy = laneCy(idx);
              const isLaneActive = activeModuleIndex === lane.moduleIndex;
              const isLaneMulti = multiSelected.has(`${side.slot}:${lane.moduleIndex}`);
              return (
                <g key={lane.moduleIndex}>
                  {(isLaneActive || isLaneMulti) && (
                    <rect
                      x={0}
                      y={top + LANE_PIX_HEIGHT * idx}
                      width={length}
                      height={LANE_PIX_HEIGHT}
                      fill="hsl(var(--primary))"
                      opacity={isLaneActive ? 0.1 : 0.05}
                      pointerEvents="none"
                    />
                  )}
                  <line
                    x1="0"
                    y1={cy}
                    x2={length}
                    y2={cy}
                    stroke="hsl(var(--primary))"
                    strokeWidth="0.4"
                    strokeDasharray="3 3"
                    opacity={isLaneActive ? 0.8 : 0.4}
                  />
                  {/* Lane number label — beim "Anfang" (rechts) gut sichtbar */}
                  <text
                    x={length - 6}
                    y={cy + 2.5}
                    textAnchor="end"
                    fontSize="7"
                    fill={isLaneActive ? 'hsl(var(--primary))' : '#64748b'}
                    fontWeight="600"
                    pointerEvents="none"
                  >
                    Nut {lane.number}
                  </text>
                  {/* divider between lanes */}
                  {idx > 0 && (
                    <line
                      x1={cutS}
                      y1={top + LANE_PIX_HEIGHT * idx}
                      x2={length - cutE}
                      y2={top + LANE_PIX_HEIGHT * idx}
                      stroke="#cbd5e1"
                      strokeWidth="0.3"
                      strokeDasharray="1 2"
                      pointerEvents="none"
                    />
                  )}
                </g>
              );
            })}

            {/* Connector magnets */}
            {showConnectorMagnets && (
              <g pointerEvents="none">
                <rect x={0} y={top} width={CONNECTOR_FOOTPRINT} height={ROW_PIX_HEIGHT} fill="hsl(var(--primary))" opacity={0.08} stroke="hsl(var(--primary))" strokeDasharray="3 2" strokeWidth="0.4" />
                <rect x={length - CONNECTOR_FOOTPRINT} y={top} width={CONNECTOR_FOOTPRINT} height={ROW_PIX_HEIGHT} fill="hsl(var(--primary))" opacity={0.08} stroke="hsl(var(--primary))" strokeDasharray="3 2" strokeWidth="0.4" />
              </g>
            )}

            {/* Hover */}
            {hoverInfo !== null && !draggingId && (tool === 'hole' || tool === 'connector') && (() => {
              const laneIdx = side.lanes.findIndex((l) => l.moduleIndex === hoverInfo.moduleIndex);
              if (laneIdx < 0) return null;
              const cy = laneCy(laneIdx);
              const hx = dx(hoverInfo.z);
              return (
                <g pointerEvents="none">
                  <line x1={hx} y1={cy - LANE_PIX_HEIGHT / 2} x2={hx} y2={cy + LANE_PIX_HEIGHT / 2} stroke="hsl(var(--primary))" strokeWidth="0.5" strokeDasharray="2 2" />
                  {/* Gegenskalierung wie bei den runden Markern, sonst wirkt die Pille bei langen/gezoomten Profilen gestaucht */}
                  <g transform={`translate(${hx} ${cy - LANE_PIX_HEIGHT / 2 - 6}) scale(${circleScaleX} 1) translate(${-hx} ${-(cy - LANE_PIX_HEIGHT / 2 - 6)})`}>
                    <rect x={hx - 16} y={cy - LANE_PIX_HEIGHT / 2 - 11} width="32" height="10" rx="2" fill="hsl(var(--primary))" />
                    <text x={hx} y={cy - LANE_PIX_HEIGHT / 2 - 3} textAnchor="middle" fontSize="7" fill="white" fontFamily="ui-monospace, monospace" fontWeight="600">
                      {Math.round(hoverInfo.z)} mm
                    </text>
                  </g>
                </g>
              );
            })()}

            {/* Connectors — start (Anfang) jetzt RECHTS, end (Ende) LINKS */}
            {connectors.map((c) => {
              const laneIdx = side.lanes.findIndex((l) => l.moduleIndex === (c.moduleIndex ?? 0));
              if (laneIdx < 0) return null;
              const cy = laneCy(laneIdx);
              const isSel = selectedId === c.id;
              const w = CONNECTOR_FOOTPRINT;
              const x = c.end === 'start' ? length - w : 0;
              return (
                <g
                  key={c.id}
                  data-role="marker"
                  onPointerDown={(e) => { e.stopPropagation(); onDragStart(c.id); (e.target as Element).setPointerCapture?.(e.pointerId); }}
                  onClick={(e) => { e.stopPropagation(); onSelectMarker(c.id); }}
                  style={{ cursor: 'grab' }}
                >
                  <rect data-role="marker" x={x} y={cy - 7} width={w} height={14} fill="#94a3b8" stroke={isSel ? 'hsl(var(--primary))' : '#475569'} strokeWidth={isSel ? 1.4 : 0.6} rx="2" />
                  <text data-role="marker" x={x + w / 2} y={cy + 3} textAnchor="middle" fontSize="7" fill="white" fontWeight="600" pointerEvents="none">
                    {c.type === 'tnut-m6' || c.type === 'tnut-m8' ? 'NS' : c.type === 'angle-8' ? 'WV' : 'AV'}
                  </text>
                </g>
              );
            })}

            {/* Geister-Bohrungen von der gegenüberliegenden Seite (durchsichtig, gestrichelt) */}
            {ghostHoles.map((h) => {
              // Gleiche Spur (modulIndex), gleiche z-Position
              const laneIdx = side.lanes.findIndex((l) => l.moduleIndex === (h.moduleIndex ?? 0));
              if (laneIdx < 0) return null;
              const cy = laneCy(laneIdx);
              const r = Math.max(3, Math.min(8, h.diameter * 0.6));
              const color = holeColor(h.type);
              const hx = dx(h.zPosition);
              return (
                <g key={`ghost-${h.id}`} pointerEvents="none" opacity={0.55}>
                  <g transform={`translate(${hx} ${cy}) scale(${circleScaleX} 1) translate(${-hx} ${-cy})`}>
                    <circle cx={hx} cy={cy} r={r + 1} fill="none" stroke={color} strokeWidth="0.8" strokeDasharray="2 1.5" />
                  </g>
                  <line x1={hx - r * 0.7} y1={cy - r * 0.7} x2={hx + r * 0.7} y2={cy + r * 0.7} stroke={color} strokeWidth="0.6" strokeDasharray="1 1" />
                </g>
              );
            })}

            {/* Holes */}
            {holes.map((h) => {
              const laneIdx = side.lanes.findIndex((l) => l.moduleIndex === (h.moduleIndex ?? 0));
              if (laneIdx < 0) return null;
              const cy = laneCy(laneIdx);
              const isSel = selectedId === h.id;
              const isDragging = draggingId === h.id;
              const r = Math.max(3, Math.min(8, h.diameter * 0.6));
              const distStart = h.zPosition;
              const distEnd = length - h.zPosition;
              const tooClose = distStart < MIN_EDGE_DISTANCE || distEnd < MIN_EDGE_DISTANCE;
              const color = tooClose ? '#dc2626' : holeColor(h.type);
              const ringColor = tooClose ? '#dc2626' : isSel ? 'hsl(var(--primary))' : '#cbd5e1';
              const hx = dx(h.zPosition);
              return (
                <g
                  key={h.id}
                  data-role="marker"
                  onPointerDown={(e) => { e.stopPropagation(); onDragStart(h.id); (e.target as Element).setPointerCapture?.(e.pointerId); }}
                  onClick={(e) => { e.stopPropagation(); onSelectMarker(h.id); }}
                  style={{ cursor: 'grab' }}
                >
                  {/* Echtzeit-Maßlinien während Drag: Abstand zu Anfang und Ende */}
                  {isDragging && (
                    <g pointerEvents="none">
                      {/* Linie zum Anfang (rechts) */}
                      <line x1={hx} y1={cy} x2={length} y2={cy} stroke="hsl(var(--primary))" strokeWidth="0.4" strokeDasharray="2 2" opacity="0.7" />
                      {/* Linie zum Ende (links) */}
                      <line x1={hx} y1={cy} x2={0} y2={cy} stroke="hsl(var(--primary))" strokeWidth="0.4" strokeDasharray="2 2" opacity="0.7" />
                      {/* Label zum Anfang — Gegenskalierung wie bei den runden Markern */}
                      <g transform={`translate(${(hx + length) / 2} ${cy - 7.5}) scale(${circleScaleX} 1) translate(${-(hx + length) / 2} ${-(cy - 7.5)})`}>
                        <rect x={(hx + length) / 2 - 18} y={cy - 12} width="36" height="9" rx="2" fill="hsl(var(--primary))" />
                        <text x={(hx + length) / 2} y={cy - 5} textAnchor="middle" fontSize="6.5" fill="white" fontFamily="ui-monospace, monospace" fontWeight="700">{Math.round(distStart)} mm</text>
                      </g>
                      {/* Label zum Ende */}
                      <g transform={`translate(${hx / 2} ${cy - 7.5}) scale(${circleScaleX} 1) translate(${-hx / 2} ${-(cy - 7.5)})`}>
                        <rect x={hx / 2 - 18} y={cy - 12} width="36" height="9" rx="2" fill="hsl(var(--primary))" />
                        <text x={hx / 2} y={cy - 5} textAnchor="middle" fontSize="6.5" fill="white" fontFamily="ui-monospace, monospace" fontWeight="700">{Math.round(distEnd)} mm</text>
                      </g>
                    </g>
                  )}
                  {(isSel || isDragging) && (
                    <g transform={`translate(${hx} ${cy + LANE_PIX_HEIGHT / 2 - 1}) scale(${circleScaleX} 1) translate(${-hx} ${-(cy + LANE_PIX_HEIGHT / 2 - 1)})`}>
                      <text x={hx} y={cy + LANE_PIX_HEIGHT / 2 - 1} textAnchor="middle" fontSize="7" fill={tooClose ? '#dc2626' : 'hsl(var(--primary))'} fontFamily="ui-monospace, monospace" fontWeight="600" pointerEvents="none">
                        {Math.round(h.zPosition)} mm
                      </text>
                    </g>
                  )}
                  {/* Runde Marker: Gegenskalierung, damit sie bei langen Profilen (nicht-uniform gestauchte Ansicht) als Kreis statt Schlitz erscheinen */}
                  <g transform={`translate(${hx} ${cy}) scale(${circleScaleX} 1) translate(${-hx} ${-cy})`}>
                    {/* Warn-Glow bei Mindestabstand-Verletzung */}
                    {tooClose && (
                      <circle cx={hx} cy={cy} r={r + 4} fill="none" stroke="#dc2626" strokeWidth="0.6" opacity="0.45">
                        <animate attributeName="r" values={`${r + 3};${r + 6};${r + 3}`} dur="1.4s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.6;0.15;0.6" dur="1.4s" repeatCount="indefinite" />
                      </circle>
                    )}
                    <circle data-role="marker" cx={hx} cy={cy} r={r + 1.5} fill="white" stroke={ringColor} strokeWidth={isSel || tooClose ? 1.4 : 0.6} />
                    <circle data-role="marker" cx={hx} cy={cy} r={r} fill={color} />
                  </g>
                  {tooClose && (
                    <title>Mindestabstand zum Rand unterschritten ({MIN_EDGE_DISTANCE} mm)</title>
                  )}
                </g>
              );
            })}
          </g>

          {/* End labels (EU 1st-angle: Ende links, Anfang rechts) — Gegenskalierung wie die Ruler-Ziffern */}
          <text x={PAD_X} y={VB_H - 1} fontSize="7" fill="#94a3b8" transform={`translate(${PAD_X} 0) scale(${circleScaleX} 1) translate(${-PAD_X} 0)`}>Ende ←</text>
          <text x={PAD_X + length} y={VB_H - 1} textAnchor="end" fontSize="7" fill="#94a3b8" transform={`translate(${PAD_X + length} 0) scale(${circleScaleX} 1) translate(${-(PAD_X + length)} 0)`}>→ Anfang</text>
        </svg>
      </div>
    </div>
  );
}


// ---------------------------------------------------------------------------
// Übersichtsstreifen: zeigt das ganze Profil, markiert den aktuell gezoomten
// Ausschnitt, Klick/Ziehen navigiert dorthin. Bewusst eigenständig (Prozent-
// Positionierung statt SVG-viewBox) statt die Lane-Logik von SideRow zu teilen.
// ---------------------------------------------------------------------------

interface ProfileOverviewStripProps {
  length: number;
  panMm: number;
  visibleWidthMm: number;
  holes: ProfileHole[];
  onNavigate: (mm: number) => void;
}

function ProfileOverviewStrip({ length, panMm, visibleWidthMm, holes, onNavigate }: ProfileOverviewStripProps) {
  const ref = useRef<HTMLDivElement>(null);

  const navigateFromClientX = (clientX: number) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    const fraction = (clientX - rect.left) / rect.width;
    // Gespiegelt wie die Hauptansicht: Anfang (z=0) rechts, Ende (z=length) links.
    const z = length - fraction * length;
    onNavigate(Math.min(Math.max(z, 0), length));
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    navigateFromClientX(e.clientX);
    try {
      (e.target as Element).setPointerCapture?.(e.pointerId);
    } catch {
      // Capture ist nur eine Komfortfunktion fürs Ziehen außerhalb des Streifens;
      // ein Fehlschlag darf die Navigation selbst nicht verhindern.
    }
  };
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.buttons !== 1) return;
    navigateFromClientX(e.clientX);
  };

  const windowStartPct = ((length - (panMm + visibleWidthMm)) / length) * 100;
  const windowWidthPct = (visibleWidthMm / length) * 100;

  return (
    <div
      ref={ref}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      className="relative h-7 rounded border border-slate-200 bg-gradient-to-b from-slate-100 to-slate-200 cursor-pointer overflow-hidden select-none"
      title="Klicken oder ziehen, um im Profil zu navigieren"
    >
      {holes.map((h) => (
        <div
          key={h.id}
          className="absolute top-0.5 bottom-0.5 w-px bg-slate-500/70"
          style={{ left: `${((length - h.zPosition) / length) * 100}%` }}
        />
      ))}
      <div
        className="absolute top-0 bottom-0 bg-primary/15 border-x-2 border-primary pointer-events-none"
        style={{ left: `${windowStartPct}%`, width: `${Math.max(windowWidthPct, 1.5)}%` }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// End face panel (Stirnseite Anfang / Ende)
// ---------------------------------------------------------------------------

interface EndFacePanelProps {
  label: 'Anfang' | 'Ende';
  section: ProfileSection;
  treatment?: EndTreatment;
  onChange: (t: EndTreatment) => void;
}

function EndFacePanel({ label, section, treatment, onChange }: EndFacePanelProps) {
  const t: EndTreatment = treatment ?? { thread: false, scope: 'all' };
  const allBoreNums = useMemo(() => getBorePositions(section).map((p) => p.number), [section]);

  const activeBores = useMemo(() => {
    if (!t.thread) return new Set<number>();
    if (t.scope === 'custom' && t.bores) return new Set(t.bores);
    if (t.scope === 'all' || t.scope === undefined) return new Set(allBoreNums);
    if (t.scope === 'center') {
      const mid = Math.ceil(allBoreNums.length / 2);
      return new Set([mid]);
    }
    return new Set(allBoreNums);
  }, [t.thread, t.scope, t.bores, allBoreNums]);

  const toggleBore = (num: number) => {
    const next = new Set(activeBores);
    if (next.has(num)) next.delete(num); else next.add(num);
    if (next.size === 0) {
      onChange({ ...t, thread: false, scope: 'custom', bores: [] });
    } else if (next.size === allBoreNums.length) {
      onChange({ ...t, thread: true, scope: 'all', bores: undefined });
    } else {
      onChange({ ...t, thread: true, scope: 'custom', bores: Array.from(next).sort((a, b) => a - b) });
    }
  };

  return (
    <div className="bg-white rounded-md border border-slate-200 p-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-semibold text-foreground">{label}</span>
        {activeBores.size > 0 && (
          <button
            onClick={() => onChange({ thread: false })}
            className="text-[9px] text-muted-foreground hover:text-red-600 underline"
          >
            leer
          </button>
        )}
      </div>
      <div className="flex items-center justify-center bg-slate-50 rounded p-1 border border-slate-100">
        <ProfileCrossSection2D
          section={section}
          activeSlot="A"
          activeModuleIndex={0}
          noSlotHighlight
          onSelectSlot={() => { /* keine Nutwahl hier */ }}
          onSelectBore={toggleBore}
          activeBores={activeBores}
          size={140}
          showLabels
          rotate90={section.w > section.h}
        />
      </div>
      <div className="text-[9px] text-muted-foreground text-center mt-1">
        {t.thread ? `M8 in ${activeBores.size}/${allBoreNums.length}` : 'kein Gewinde'}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Bulk-Holes Dialog: Bohrungen als Liste eingeben
// ---------------------------------------------------------------------------

interface BulkHolesDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  section: ProfileSection;
  length: number;
  activeKey: SlotKey;
  defaultType: ProfileHole['type'];
  onApply: (newHoles: ProfileHole[]) => void;
}

/**
 * Parst eine Eingabe wie:
 *   "100, 200, 300"
 *   "100\n200\n300"
 *   "100-500/100"   (Range mit Schrittweite: 100, 200, 300, 400, 500)
 *   "100..500/50"   (alternative Schreibweise)
 * Liefert sortierte, deduplizierte Positionen im gültigen Bereich.
 */
function parsePositions(input: string, length: number): { positions: number[]; errors: string[] } {
  const errors: string[] = [];
  const out = new Set<number>();
  // Trenner: Komma, Semikolon, Zeilenumbruch
  const tokens = input.split(/[,;\n]+/).map((t) => t.trim()).filter(Boolean);
  for (const tok of tokens) {
    // Range: a-b/step  oder  a..b/step
    const rangeMatch = tok.match(/^(-?\d+(?:[.,]\d+)?)\s*(?:-|\.\.)\s*(-?\d+(?:[.,]\d+)?)\s*(?:\/\s*(\d+(?:[.,]\d+)?))?$/);
    if (rangeMatch) {
      const a = parseFloat(rangeMatch[1].replace(',', '.'));
      const b = parseFloat(rangeMatch[2].replace(',', '.'));
      const step = rangeMatch[3] ? parseFloat(rangeMatch[3].replace(',', '.')) : 50;
      if (!isFinite(a) || !isFinite(b) || !isFinite(step) || step <= 0) { errors.push(`Ungültiger Bereich: "${tok}"`); continue; }
      const lo = Math.min(a, b), hi = Math.max(a, b);
      for (let v = lo; v <= hi + 1e-6; v += step) {
        const z = Math.round(v);
        if (z >= 1 && z <= length - 1) out.add(z);
      }
      continue;
    }
    const num = parseFloat(tok.replace(',', '.'));
    if (!isFinite(num)) { errors.push(`Ungültige Zahl: "${tok}"`); continue; }
    const z = Math.round(num);
    if (z < 1 || z > length - 1) { errors.push(`Außerhalb 1–${length - 1} mm: ${z}`); continue; }
    out.add(z);
  }
  return { positions: Array.from(out).sort((a, b) => a - b), errors };
}

function BulkHolesDialog({ open, onOpenChange, section, length, activeKey, defaultType, onApply }: BulkHolesDialogProps) {
  const HOLE_TYPES = useHoleTypes();
  const [text, setText] = useState('');
  const [type, setType] = useState<ProfileHole['type']>(defaultType);
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(() => new Set([keyOf(activeKey.slot, activeKey.moduleIndex)]));

  // Reset, wenn Dialog frisch geöffnet wird
  useEffect(() => {
    if (open) {
      setType(defaultType);
      setSelectedSlots(new Set([keyOf(activeKey.slot, activeKey.moduleIndex)]));
    }
  }, [open, defaultType, activeKey]);

  const allSlots = useMemo(() => {
    const counts = getSlotCounts(section);
    const list: { key: string; slot: SlotId; moduleIndex: number; number: number }[] = [];
    SLOT_ORDER.forEach((slot) => {
      for (let mi = 0; mi < counts[slot]; mi++) {
        list.push({ key: keyOf(slot, mi), slot, moduleIndex: mi, number: getSlotNumber(section, slot, mi) });
      }
    });
    return list;
  }, [section]);

  const parsed = useMemo(() => parsePositions(text, length), [text, length]);
  const totalCount = parsed.positions.length * selectedSlots.size;
  const typeDef = HOLE_TYPES.find((t) => t.id === type)!;

  const toggleSlot = (k: string) => {
    setSelectedSlots((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k); else next.add(k);
      return next;
    });
  };

  const handleApply = () => {
    if (parsed.positions.length === 0 || selectedSlots.size === 0) return;
    const newHoles: ProfileHole[] = [];
    selectedSlots.forEach((k) => {
      const [s, mi] = k.split(':');
      parsed.positions.forEach((z) => {
        newHoles.push({
          id: crypto.randomUUID(),
          zPosition: z,
          diameter: typeDef.diameter,
          slot: s as SlotId,
          moduleIndex: Number(mi),
          type,
          label: typeDef.label,
        });
      });
    });
    onApply(newHoles);
    setText('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bohrungen als Liste eingeben</DialogTitle>
          <DialogDescription>
            Tippe Positionen (mm vom Anfang) ein – getrennt durch Komma, Strichpunkt oder Zeilenumbruch.
            Bereiche mit Schrittweite sind möglich, z.&nbsp;B. <code className="px-1 bg-slate-100 rounded">100-500/50</code>.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          {/* Linke Spalte: Eingabe */}
          <div className="space-y-2">
            <Label className="text-xs">Positionen (1 – {length - 1} mm)</Label>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={8}
              placeholder={'z.B.\n100, 200, 300\n500\n800-2000/100'}
              className="font-mono text-xs"
            />
            <div className="text-[10px] text-muted-foreground">
              {parsed.positions.length > 0
                ? `${parsed.positions.length} gültige Position${parsed.positions.length === 1 ? '' : 'en'}: ${parsed.positions.slice(0, 12).join(', ')}${parsed.positions.length > 12 ? ', …' : ''}`
                : 'Noch keine gültigen Positionen.'}
            </div>
            {parsed.errors.length > 0 && (
              <div className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                {parsed.errors.slice(0, 3).map((e, i) => <div key={i}>⚠ {e}</div>)}
                {parsed.errors.length > 3 && <div>… und {parsed.errors.length - 3} weitere</div>}
              </div>
            )}
          </div>

          {/* Rechte Spalte: Typ + Nutwahl */}
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Bohrungstyp</Label>
              <Select value={type} onValueChange={(v) => setType(v as ProfileHole['type'])}>
                <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {HOLE_TYPES.map((t) => (
                    <SelectItem key={t.id} value={t.id} className="text-xs">{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-xs">Nuten ({selectedSlots.size} ausgewählt)</Label>
                <div className="flex gap-2 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setSelectedSlots(new Set(allSlots.map((s) => s.key)))}
                    className="text-primary hover:underline"
                  >
                    alle
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedSlots(new Set())}
                    className="text-muted-foreground hover:underline"
                  >
                    keine
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-1 max-h-44 overflow-y-auto p-2 rounded border border-slate-200 bg-slate-50">
                {allSlots.map((s) => {
                  const checked = selectedSlots.has(s.key);
                  return (
                    <label
                      key={s.key}
                      className={`flex items-center gap-1 px-1.5 py-1 rounded text-[11px] cursor-pointer ${checked ? 'bg-primary/10 text-primary font-semibold' : 'text-foreground hover:bg-white'}`}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggleSlot(s.key)}
                        className="h-3 w-3"
                      />
                      <span>Nut {s.number}</span>
                      <span className="text-[9px] text-muted-foreground ml-auto">{s.slot}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="sm:justify-between items-center gap-2">
          <div className="text-xs text-muted-foreground">
            {totalCount > 0
              ? <>Es werden <span className="font-semibold text-foreground">{totalCount}</span> Bohrung{totalCount === 1 ? '' : 'en'} erzeugt ({parsed.positions.length} × {selectedSlots.size} Nut{selectedSlots.size === 1 ? '' : 'en'}).</>
              : 'Bitte Positionen und mind. eine Nut wählen.'}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Abbrechen</Button>
            <Button onClick={handleApply} disabled={totalCount === 0}>Hinzufügen</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
