import { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { Plus, Trash2, Copy, FlipHorizontal2, X, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  HOLE_TYPES,
  CONNECTOR_TYPES,
  SLOT_SIDE_DE,
  getModulePitch,
  getSlotCounts,
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
import { ProfileCrossSection2D } from './ProfileCrossSection2D';
import { NumericInput } from './NumericInput';

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
  holes,
  connectors,
  endStart,
  endEnd,
  onUpdateHoles,
  onUpdateConnectors,
  onUpdateEndStart,
  onUpdateEndEnd,
}: Props) {
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

  // Zoom für lange Profile
  const [zoom, setZoom] = useState(1);

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

            {/* Zoom */}
            <div className="flex items-center gap-1.5 bg-white rounded-md border border-slate-200 px-2 py-1">
              <span className="text-[10px] text-muted-foreground">Zoom</span>
              <input
                type="range"
                min={1}
                max={4}
                step={0.25}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-24 accent-primary"
              />
              <span className="text-[10px] font-mono text-muted-foreground w-8 text-right">{zoom.toFixed(2)}×</span>
              {zoom !== 1 && (
                <button onClick={() => setZoom(1)} className="text-[10px] text-primary hover:underline">reset</button>
              )}
            </div>
          </div>
        </div>


        {/* Main stage:
            EU 1st-angle layout:
              - Stirnseite "Ende"  links der Reihen
              - 4 Reihen je Profilseite (A/B/C/D), eine pro Seite
              - Stirnseite "Anfang" rechts der Reihen
        */}
        <div className="flex-1 min-h-0 flex overflow-hidden">
          {/* Left: end face "Ende" */}
          {onUpdateEndEnd && (
            <aside className="w-40 shrink-0 border-r border-slate-200 bg-slate-50 overflow-y-auto p-2 space-y-2">
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

          {/* Center: stacked side rows */}
          <div className="flex-1 min-w-0 overflow-auto p-3 space-y-2 relative">
            {overlapWarning && (
              <div className="sticky top-0 z-10 inline-flex items-center gap-1.5 bg-amber-50 border border-amber-300 text-amber-800 text-[10px] font-medium rounded-md px-2 py-1">
                <AlertTriangle className="h-3 w-3" />
                Bohrungen überlappen
              </div>
            )}

            <div style={{ width: `${zoom * 100}%`, minWidth: '100%' }} className="space-y-2">
            {sideRows.map((side) => {
              const sideHoles = holes.filter((h) => ensureSlot(h) === side.slot);
              const sideConns = connectors.filter((c) => c.slot === side.slot);
              const isActiveSide = side.slot === activeKey.slot;
              const isMultiSide = side.lanes.some((l) => multiSelected.has(keyOf(side.slot, l.moduleIndex)));
              return (
                <SideRow
                  key={side.slot}
                  section={section}
                  side={side}
                  length={length}
                  angleStart={angleStart}
                  angleEnd={angleEnd}
                  holes={sideHoles}
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
                Klicke auf eine Nut, um eine Bohrung zu setzen. Mit Shift-Klick zusätzliche Nuten gleichzeitig auswählen.
              </div>
            )}
          </div>

          {/* Right: end face "Anfang" */}
          {onUpdateEndStart && (
            <aside className="w-40 shrink-0 border-l border-slate-200 bg-slate-50 overflow-y-auto p-2 space-y-2">
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


        {/* Selected-item floating panel */}
        {(selectedHole || selectedConn) && (
          <div className="absolute right-52 bottom-20 w-[260px] bg-white border border-slate-200 rounded-lg shadow-lg p-3 space-y-2.5 z-20">
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
  angleStart: number;
  angleEnd: number;
  holes: ProfileHole[];
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
  section, side, length, angleStart, angleEnd, holes, connectors, tool,
  activeModuleIndex, multiSelected, selectedId, draggingId, hoverInfo,
  onHover, onClick, onDragStart, onDragMove, onDragEnd, onSelectMarker,
}: SideRowProps) {
  const svgRef = useRef<SVGSVGElement>(null);

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

  // Schrägschnitt — wegen der Spiegelung ist der "Anfang"-Schnitt jetzt rechts
  const tanS = Math.tan((angleStart * Math.PI) / 180);
  const tanE = Math.tan((angleEnd * Math.PI) / 180);
  const cutS = ROW_PIX_HEIGHT * tanS;
  const cutE = ROW_PIX_HEIGHT * tanE;
  const top = PAD_Y + RULER_H;
  const bot = top + ROW_PIX_HEIGHT;
  // links = Ende, rechts = Anfang. Schräge oben: links cutE rein, rechts cutS rein.
  const profilePath = `M ${cutE} ${top} L ${length - cutS} ${top} L ${length} ${bot} L 0 ${bot} Z`;

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

  const handleMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const loc = screenToLocal(e.clientX, e.clientY);
    if (!loc) return;
    if (loc.z >= 0 && loc.z <= length) onHover(loc.mi, loc.z); else onHover(loc.mi, null);
    if (draggingId) onDragMove(draggingId, loc.z);
  };

  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const target = e.target as SVGElement;
    if (target.dataset.role === 'marker') return;
    const loc = screenToLocal(e.clientX, e.clientY);
    if (!loc || loc.z < 0 || loc.z > length) return;
    onClick(loc.mi, loc.z, e.shiftKey || e.metaKey || e.ctrlKey);
  };

  // Ruler — Labels zeigen z-Wert, aber an gespiegelter X-Position
  const rulerStep = length <= 500 ? 50 : length <= 1500 ? 100 : length <= 3000 ? 250 : 500;
  const ticks: { z: number; major: boolean; label: string | null }[] = [];
  for (let z = 0; z <= length; z += rulerStep / 5) {
    const major = z % rulerStep === 0;
    ticks.push({ z, major, label: major ? `${z}` : null });
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
        <div className={`text-sm font-bold ${isAnyActive ? 'text-primary' : 'text-foreground'}`}>Seite {side.slot}</div>
        <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{SLOT_SIDE_DE[side.slot]}</div>
        <div className="text-[9px] text-muted-foreground mt-0.5">
          Nut {side.lanes.map((l) => l.number).join(', ')}
        </div>
        <div className="text-[9px] text-muted-foreground">{holes.length} B · {connectors.length} V</div>
      </div>

      {/* SVG */}
      <div className="flex-1 min-w-0 py-1 pr-2">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          preserveAspectRatio="none"
          className="w-full select-none"
          style={{ height: VB_H, cursor }}
          onPointerMove={handleMove}
          onPointerLeave={() => onHover(0, null)}
          onPointerUp={onDragEnd}
          onClick={handleClick}
        >
          <defs>
            <linearGradient id={`alu-${side.slot}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#e2e8f0" />
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
                  <text x={dx(tk.z)} y={RULER_H - 8} textAnchor="middle" fontSize="8" fill="#475569" fontFamily="ui-monospace, monospace">
                    {tk.label}
                  </text>
                )}
              </g>
            ))}
          </g>


          {/* Profile body */}
          <g transform={`translate(${PAD_X}, 0)`}>
            <path d={profilePath} fill={`url(#alu-${side.slot})`} stroke="#475569" strokeWidth="0.6" />

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
                  <rect x={hx - 16} y={cy - LANE_PIX_HEIGHT / 2 - 11} width="32" height="10" rx="2" fill="hsl(var(--primary))" />
                  <text x={hx} y={cy - LANE_PIX_HEIGHT / 2 - 3} textAnchor="middle" fontSize="7" fill="white" fontFamily="ui-monospace, monospace" fontWeight="600">
                    {Math.round(hoverInfo.z)} mm
                  </text>
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

            {/* Holes */}
            {holes.map((h) => {
              const laneIdx = side.lanes.findIndex((l) => l.moduleIndex === (h.moduleIndex ?? 0));
              if (laneIdx < 0) return null;
              const cy = laneCy(laneIdx);
              const isSel = selectedId === h.id;
              const r = Math.max(3, Math.min(8, h.diameter * 0.6));
              const color = holeColor(h.type);
              const hx = dx(h.zPosition);
              return (
                <g
                  key={h.id}
                  data-role="marker"
                  onPointerDown={(e) => { e.stopPropagation(); onDragStart(h.id); (e.target as Element).setPointerCapture?.(e.pointerId); }}
                  onClick={(e) => { e.stopPropagation(); onSelectMarker(h.id); }}
                  style={{ cursor: 'grab' }}
                >
                  {(isSel || draggingId === h.id) && (
                    <text x={hx} y={cy + LANE_PIX_HEIGHT / 2 - 1} textAnchor="middle" fontSize="7" fill="hsl(var(--primary))" fontFamily="ui-monospace, monospace" fontWeight="600" pointerEvents="none">
                      {Math.round(h.zPosition)} mm
                    </text>
                  )}
                  <circle data-role="marker" cx={hx} cy={cy} r={r + 1.5} fill="white" stroke={isSel ? 'hsl(var(--primary))' : '#cbd5e1'} strokeWidth={isSel ? 1.4 : 0.6} />
                  <circle data-role="marker" cx={hx} cy={cy} r={r} fill={color} />
                </g>
              );
            })}
          </g>

          {/* End labels (EU 1st-angle: Ende links, Anfang rechts) */}
          <text x={PAD_X} y={VB_H - 1} fontSize="7" fill="#94a3b8">Ende ←</text>
          <text x={PAD_X + length} y={VB_H - 1} textAnchor="end" fontSize="7" fill="#94a3b8">→ Anfang</text>
        </svg>
      </div>
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
          onSelectSlot={() => { /* keine Nutwahl hier */ }}
          onSelectBore={toggleBore}
          activeBores={activeBores}
          size={140}
          showLabels
        />
      </div>
      <div className="text-[9px] text-muted-foreground text-center mt-1">
        {t.thread ? `M8 in ${activeBores.size}/${allBoreNums.length}` : 'kein Gewinde'}
      </div>
    </div>
  );
}
