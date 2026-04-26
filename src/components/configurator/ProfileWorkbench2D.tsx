import { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { Plus, Trash2, Copy, FlipHorizontal2, X, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  HOLE_TYPES,
  CONNECTOR_TYPES,
  SLOT_IDS,
  SLOT_LABEL_DE,
  getFaceWidth,
  getModulePitch,
  getSlotCountPerFace,
  getSlotCenters,
  type ProfileSection,
  type ProfileHole,
  type ProfileConnector,
  type ConnectorType,
  type SlotId,
} from '@/lib/profile-configurator-types';
import { ProfileCrossSection2D } from './ProfileCrossSection2D';

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
  onUpdateHoles: (holes: ProfileHole[]) => void;
  onUpdateConnectors: (connectors: ProfileConnector[]) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SNAP_OPTIONS: { value: number; label: string; tooltip: string }[] = [
  { value: 1,  label: 'Genau',  tooltip: 'Position rastet auf jeden mm' },
  { value: 5,  label: 'Mittel', tooltip: 'Position rastet auf 5-mm-Raster' },
  { value: 10, label: 'Grob',   tooltip: 'Position rastet auf 10-mm-Raster' },
];

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
  onUpdateHoles,
  onUpdateConnectors,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [activeSlot, setActiveSlot] = useState<SlotId>('A');
  const [tool, setTool] = useState<Tool>('hole');
  const [snap, setSnap] = useState<number>(5);
  const [holeType, setHoleType] = useState<ProfileHole['type']>('d55');
  const [connType, setConnType] = useState<ConnectorType>('tnut-m8');
  const [hoverZ, setHoverZ] = useState<number | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const faceDepth = getFaceWidth(section, activeSlot);
  const MODULE = getModulePitch(section);
  const numModulesOnFace = Math.max(1, Math.round(faceDepth / MODULE));
  const slotCenters = getSlotCenters(section, activeSlot);

  // Filter visible items by slot (with backwards compat)
  const visibleHoles = useMemo(() => holes.filter((h) => ensureSlot(h) === activeSlot), [holes, activeSlot]);
  const visibleConnectors = useMemo(() => connectors.filter((c) => c.slot === activeSlot), [connectors, activeSlot]);

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
      // Compute nearest slot track for multi-module profiles
      const nearestModuleIndex = (() => {
        if (slotCenters.length <= 1) return 0;
        let best = 0;
        let bestDist = Infinity;
        slotCenters.forEach((c, i) => {
          const d = Math.abs(m.y - c);
          if (d < bestDist) { bestDist = d; best = i; }
        });
        return best;
      })();

      // Connector? Snap to nearest end + nearest track
      const conn = connectors.find((c) => c.id === draggingId);
      if (conn) {
        const newEnd: 'start' | 'end' = m.z < length / 2 ? 'start' : 'end';
        if (conn.end !== newEnd || (conn.moduleIndex ?? 0) !== nearestModuleIndex) {
          onUpdateConnectors(connectors.map((c) => c.id === draggingId ? { ...c, end: newEnd, moduleIndex: nearestModuleIndex } : c));
        }
        return;
      }
      // Hole — free positioning + nearest track
      const hole = holes.find((h) => h.id === draggingId);
      if (hole) {
        const z = snapValue(
          m.z,
          snap,
          snapPoints.filter((p) => Math.abs(p - hole.zPosition) > 0.1),
          length,
        );
        onUpdateHoles(holes.map((h) => h.id === draggingId ? { ...h, zPosition: z, moduleIndex: nearestModuleIndex } : h));
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

    // Determine which slot track the click belongs to (multi-module profiles)
    const nearestModuleIndex = (() => {
      if (slotCenters.length <= 1) return 0;
      let best = 0;
      let bestDist = Infinity;
      slotCenters.forEach((c, i) => {
        const d = Math.abs((m.y ?? faceDepth / 2) - c);
        if (d < bestDist) { bestDist = d; best = i; }
      });
      return best;
    })();

    if (tool === 'hole') {
      const z = snapValue(m.z, snap, snapPoints, length);
      const typeDef = HOLE_TYPES.find((t) => t.id === holeType)!;
      const newHole: ProfileHole = {
        id: crypto.randomUUID(),
        zPosition: z,
        diameter: typeDef.diameter,
        slot: activeSlot,
        moduleIndex: nearestModuleIndex,
        type: holeType,
        label: typeDef.label,
      };
      onUpdateHoles([...holes, newHole]);
      setSelectedId(newHole.id);
    } else if (tool === 'connector') {
      // Only one connector per end per slot per module
      const end: 'start' | 'end' = m.z < length / 2 ? 'start' : 'end';
      const taken = connectors.some((c) => c.slot === activeSlot && c.end === end && (c.moduleIndex ?? 0) === nearestModuleIndex);
      if (taken) {
        setSelectedId(null);
        return;
      }
      const typeDef = CONNECTOR_TYPES.find((t) => t.id === connType)!;
      const newConn: ProfileConnector = {
        id: crypto.randomUUID(),
        type: connType,
        end,
        slot: activeSlot,
        moduleIndex: nearestModuleIndex,
        label: typeDef.label,
      };
      onUpdateConnectors([...connectors, newConn]);
      setSelectedId(newConn.id);
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

  const slotGuides: number[] = slotCenters;

  const showConnectorMagnets = tool === 'connector' || draggingId !== null;

  // ───────────────────────────────────────────────────────────────────────
  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex flex-col h-full bg-white rounded-lg border border-slate-200 overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3 px-3 py-2 border-b border-slate-200 bg-slate-50 flex-wrap">
          {/* Slot tabs A B C D */}
          <div className="flex items-center gap-1">
            {SLOT_IDS.map((s) => (
              <button
                key={s}
                onClick={() => { setActiveSlot(s); setSelectedId(null); }}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors border ${
                  activeSlot === s
                    ? 'bg-white border-primary text-primary shadow-sm font-semibold'
                    : 'bg-transparent border-transparent text-muted-foreground hover:text-foreground hover:bg-white/60'
                }`}
              >
                {SLOT_LABEL_DE[s]}
              </button>
            ))}
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

          {/* Snap (renamed) */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground mr-1">Raster</span>
            {SNAP_OPTIONS.map((opt) => (
              <Tooltip key={opt.value}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setSnap(opt.value)}
                    className={`px-2 py-1 text-xs rounded border transition-colors ${
                      snap === opt.value
                        ? 'bg-primary/10 border-primary text-primary font-semibold'
                        : 'bg-white border-slate-200 text-muted-foreground hover:border-primary/50'
                    }`}
                  >
                    {opt.label}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">{opt.tooltip}</TooltipContent>
              </Tooltip>
            ))}
          </div>
        </div>

        {/* SVG stage */}
        <div className="flex-1 relative overflow-auto bg-gradient-to-br from-slate-50 to-slate-100">
          {/* Mini cross-section overlay */}
          <div className="absolute top-3 left-3 z-10 bg-white/95 backdrop-blur border border-slate-200 rounded-lg shadow-sm p-2">
            <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 text-center">
              Querschnitt
            </div>
            <ProfileCrossSection2D
              section={section}
              activeSlot={activeSlot}
              onSelectSlot={(s) => { setActiveSlot(s); setSelectedId(null); }}
              size={96}
            />
          </div>

          {/* Overlap warning */}
          {overlapWarning && (
            <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 bg-amber-50 border border-amber-300 text-amber-800 text-[10px] font-medium rounded-md px-2 py-1">
              <AlertTriangle className="h-3 w-3" />
              Bohrungen überlappen
            </div>
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
                  {slotGuides.length > 1 && (
                    <text x={-6} y={y + 3} textAnchor="end" fontSize="8" fill="#64748b" fontWeight="600">
                      {i + 1}
                    </text>
                  )}
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
                  {selectedHole ? 'Bohrung' : 'Verbinder'} · {SLOT_LABEL_DE[activeSlot]}
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
                      Position (mm vom Anfang) · Schritt {snap} mm
                    </Label>
                    <Input
                      type="number"
                      min={snap}
                      max={length - 1}
                      step={snap}
                      value={selectedHole.zPosition}
                      onChange={(e) => {
                        const raw = Number(e.target.value);
                        const z = Math.max(snap, Math.min(length - 1, Math.round(raw / snap) * snap));
                        updateHole({ zPosition: z });
                      }}
                      className="h-8 text-xs"
                    />
                  </div>
                  {slotCenters.length > 1 && (
                    <div>
                      <Label className="text-[10px] text-muted-foreground mb-1 block">Nut-Spur</Label>
                      <Select
                        value={String(selectedHole.moduleIndex ?? 0)}
                        onValueChange={(v) => updateHole({ moduleIndex: Number(v) })}
                      >
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {slotCenters.map((_, i) => (
                            <SelectItem key={i} value={String(i)} className="text-xs">Spur {i + 1}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
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
                  {slotCenters.length > 1 && (
                    <div>
                      <Label className="text-[10px] text-muted-foreground mb-1 block">Nut-Spur</Label>
                      <Select
                        value={String(selectedConn.moduleIndex ?? 0)}
                        onValueChange={(v) => updateConn({ moduleIndex: Number(v) })}
                      >
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {slotCenters.map((_, i) => (
                            <SelectItem key={i} value={String(i)} className="text-xs">Spur {i + 1}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
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
                ? `Klicke an einen Profilende-Bereich, um einen Verbinder auf ${SLOT_LABEL_DE[activeSlot]} zu setzen`
                : `Klicke auf das Profil, um eine Bohrung auf ${SLOT_LABEL_DE[activeSlot]} zu setzen`}
            </div>
          )}
        </div>

        {/* Status bar */}
        <div className="flex items-center justify-between px-3 py-1.5 border-t border-slate-200 bg-slate-50 text-[10px] text-muted-foreground">
          <div>
            {visibleHoles.length} Bohrung{visibleHoles.length !== 1 ? 'en' : ''} · {visibleConnectors.length} Verbinder auf {SLOT_LABEL_DE[activeSlot]}
          </div>
          <div className="flex items-center gap-3">
            <span>Raster: {SNAP_OPTIONS.find((o) => o.value === snap)?.label}</span>
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
