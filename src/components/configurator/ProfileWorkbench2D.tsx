import { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { Plus, Trash2, Copy, FlipHorizontal2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  HOLE_TYPES,
  CONNECTOR_TYPES,
  type ProfileSection,
  type ProfileHole,
  type ProfileConnector,
  type ConnectorType,
} from '@/lib/profile-configurator-types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Face = 'top' | 'bottom' | 'left' | 'right';
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

const SNAP_OPTIONS = [1, 5, 10] as const;
const MODULE = 40;

function holeColor(type: ProfileHole['type']): string {
  if (type === 'm6-thread' || type === 'm8-thread') return '#b78628';
  if (type === 'step-m6' || type === 'step-m8') return '#3b67a8';
  if (type === 'core-m6' || type === 'core-m8') return '#64748b';
  return '#1e293b';
}

function snapValue(raw: number, snap: number, snapPoints: number[], length: number): number {
  // Snap to nearby points first (tolerance 3mm)
  for (const p of snapPoints) {
    if (Math.abs(raw - p) <= 3) return p;
  }
  const v = Math.round(raw / snap) * snap;
  return Math.max(1, Math.min(length - 1, v));
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
  const [face, setFace] = useState<Face>('top');
  const [tool, setTool] = useState<Tool>('hole');
  const [snap, setSnap] = useState<number>(5);
  const [holeType, setHoleType] = useState<ProfileHole['type']>('d55');
  const [connType, setConnType] = useState<ConnectorType>('tnut-m8');
  const [hoverZ, setHoverZ] = useState<number | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Profile dimension on the visible face
  const faceDepth = (face === 'top' || face === 'bottom') ? section.h : section.w;
  const numModulesOnFace = (face === 'top' || face === 'bottom')
    ? Math.round(section.w / MODULE)
    : Math.round(section.h / MODULE);

  // Items visible on this face (holes are stored with face='top' historically; show all)
  const visibleHoles = holes.filter((h) => h.face === face);
  const visibleConnectors = connectors.filter((c) => c.face === face);

  // Padding around the SVG content (mm)
  const PAD_X = 40;
  const PAD_Y = 30;
  const VB_W = length + PAD_X * 2;
  const VB_H = faceDepth + PAD_Y * 2 + 40; // +40 for ruler

  // Snap points (logical)
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
    if (m.z >= 0 && m.z <= length) {
      setHoverZ(m.z);
    } else {
      setHoverZ(null);
    }

    if (draggingId) {
      const z = snapValue(m.z, snap, snapPoints.filter((p) => {
        // exclude the dragged hole itself
        const h = visibleHoles.find((x) => x.id === draggingId);
        return !h || Math.abs(p - h.zPosition) > 0.1;
      }), length);
      // Update on the fly
      const hole = holes.find((h) => h.id === draggingId);
      if (hole) {
        onUpdateHoles(holes.map((h) => h.id === draggingId ? { ...h, zPosition: z } : h));
        return;
      }
      const conn = connectors.find((c) => c.id === draggingId);
      if (conn) {
        onUpdateConnectors(connectors.map((c) => c.id === draggingId ? { ...c, zPosition: z } : c));
      }
    }
  };

  const handlePointerLeave = () => {
    setHoverZ(null);
  };

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (draggingId) return;
    const target = e.target as SVGElement;
    // Click on background only (not on a marker)
    if (target.dataset.role === 'marker') return;
    const m = screenToMm(e.clientX, e.clientY);
    if (!m || m.z < 0 || m.z > length) {
      setSelectedId(null);
      return;
    }
    const z = snapValue(m.z, snap, snapPoints, length);

    if (tool === 'hole') {
      const typeDef = HOLE_TYPES.find((t) => t.id === holeType)!;
      const newHole: ProfileHole = {
        id: crypto.randomUUID(),
        zPosition: z,
        diameter: typeDef.diameter,
        face,
        type: holeType,
        label: typeDef.label,
      };
      onUpdateHoles([...holes, newHole]);
      setSelectedId(newHole.id);
    } else if (tool === 'connector') {
      const typeDef = CONNECTOR_TYPES.find((t) => t.id === connType)!;
      const newConn: ProfileConnector = {
        id: crypto.randomUUID(),
        type: connType,
        zPosition: z,
        face,
        module: 0,
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

  const endDrag = () => {
    setDraggingId(null);
  };

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
    } else if (selectedConn) {
      const copy = { ...selectedConn, id: crypto.randomUUID(), zPosition: Math.min(length - 5, selectedConn.zPosition + 40) };
      onUpdateConnectors([...connectors, copy]);
      setSelectedId(copy.id);
    }
  };
  const mirrorSelected = () => {
    if (selectedHole) {
      const z = Math.max(1, Math.min(length - 1, length - selectedHole.zPosition));
      updateHole({ zPosition: z });
    } else if (selectedConn) {
      const z = Math.max(1, Math.min(length - 1, length - selectedConn.zPosition));
      updateConn({ zPosition: z });
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

  // ─── Profile face geometry (with miter cuts) ──────────────────────────
  // Side-view of the face: rectangle from z=0 to z=length, y from 0 to faceDepth
  // Miter cuts shorten the top edge of the rectangle.
  const tanS = Math.tan((angleStart * Math.PI) / 180);
  const tanE = Math.tan((angleEnd * Math.PI) / 180);
  const cutS = faceDepth * tanS;
  const cutE = faceDepth * tanE;

  const profilePath = `M 0 ${faceDepth} L ${length} ${faceDepth} L ${length - cutE} 0 L ${cutS} 0 Z`;

  // T-slot guide lines along z (per module on this face)
  const slotGuides: number[] = [];
  for (let i = 0; i < numModulesOnFace; i++) {
    slotGuides.push(MODULE * (i + 0.5));
  }

  // ───────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-white rounded-lg border border-slate-200 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 px-3 py-2 border-b border-slate-200 bg-slate-50">
        {/* Face tabs */}
        <div className="flex items-center gap-1">
          {(['top', 'bottom', 'left', 'right'] as Face[]).map((f) => (
            <button
              key={f}
              onClick={() => { setFace(f); setSelectedId(null); }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                face === f
                  ? 'bg-white border border-primary text-primary shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {f === 'top' ? 'Oben' : f === 'bottom' ? 'Unten' : f === 'left' ? 'Links' : 'Rechts'}
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

        {/* Snap */}
        <div className="flex items-center gap-1">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground mr-1">Snap</span>
          {SNAP_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setSnap(s)}
              className={`px-2 py-1 text-xs rounded border transition-colors ${
                snap === s
                  ? 'bg-primary/10 border-primary text-primary font-semibold'
                  : 'bg-white border-slate-200 text-muted-foreground hover:border-primary/50'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* SVG stage */}
      <div className="flex-1 relative overflow-auto bg-gradient-to-br from-slate-50 to-slate-100">
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
          {/* Defs: subtle aluminum gradient */}
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
            {/* Background */}
            <path d={profilePath} fill="url(#alu)" stroke="#475569" strokeWidth="0.8" />
            {/* T-slot hatch overlay */}
            <path d={profilePath} fill="url(#slotHatch)" />

            {/* T-slot guide lines (centerlines of slots along z) */}
            {slotGuides.map((y, i) => (
              <line
                key={i}
                x1="0"
                y1={y}
                x2={length}
                y2={y}
                stroke="#64748b"
                strokeWidth="0.4"
                strokeDasharray="3 3"
                opacity="0.4"
              />
            ))}

            {/* Center line of profile (for symmetry) */}
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

            {/* Connectors as silver squares */}
            {visibleConnectors.map((c) => {
              const isSel = selectedId === c.id;
              const cy = faceDepth / 2;
              const w = 12;
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
                    x={c.zPosition - w / 2}
                    y={cy - w / 2}
                    width={w}
                    height={w}
                    fill="#94a3b8"
                    stroke={isSel ? 'hsl(var(--primary))' : '#475569'}
                    strokeWidth={isSel ? 1.4 : 0.6}
                    rx="1.5"
                  />
                </g>
              );
            })}

            {/* Holes as colored circles */}
            {visibleHoles.map((h) => {
              const isSel = selectedId === h.id;
              const cy = faceDepth / 2;
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
                  {/* Drag-Bemaßungslinien */}
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

          {/* Z=0 / Z=length labels */}
          <text x={PAD_X} y={VB_H - 4} fontSize="9" fill="#94a3b8">Start</text>
          <text x={PAD_X + length} y={VB_H - 4} textAnchor="end" fontSize="9" fill="#94a3b8">Ende ({length} mm)</text>
        </svg>

        {/* Selected-item floating panel */}
        {(selectedHole || selectedConn) && (
          <div className="absolute top-3 right-3 w-[260px] bg-white border border-slate-200 rounded-lg shadow-lg p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">
                {selectedHole ? 'Bohrung' : 'Verbinder'}
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
                {numModulesOnFace > 1 && (
                  <div>
                    <Label className="text-[10px] text-muted-foreground mb-1 block">Nut-Position</Label>
                    <Select
                      value={String(selectedConn.module)}
                      onValueChange={(v) => updateConn({ module: Number(v) })}
                    >
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: numModulesOnFace }, (_, i) => (
                          <SelectItem key={i} value={String(i)} className="text-xs">Nut {i + 1}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}

            <div>
              <Label className="text-[10px] text-muted-foreground mb-1 block">Position (mm)</Label>
              <Input
                type="number"
                min={1}
                max={length - 1}
                step={1}
                value={selectedHole ? selectedHole.zPosition : selectedConn?.zPosition ?? 0}
                onChange={(e) => {
                  const z = Math.max(1, Math.min(length - 1, Number(e.target.value)));
                  if (selectedHole) updateHole({ zPosition: z });
                  else if (selectedConn) updateConn({ zPosition: z });
                }}
                className="h-8 text-xs"
              />
            </div>

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
            Klicke auf das Profil, um eine {tool === 'connector' ? 'Verbinder-Position' : 'Bohrung'} zu setzen
          </div>
        )}
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-t border-slate-200 bg-slate-50 text-[10px] text-muted-foreground">
        <div>
          {visibleHoles.length} Bohrung{visibleHoles.length !== 1 ? 'en' : ''} · {visibleConnectors.length} Verbinder auf {face === 'top' ? 'Oben' : face === 'bottom' ? 'Unten' : face === 'left' ? 'Links' : 'Rechts'}
        </div>
        <div className="flex items-center gap-3">
          <span>Snap: {snap} mm</span>
          <span>Tastenkürzel: <kbd className="px-1 bg-white border border-slate-200 rounded">B</kbd> Bohrung · <kbd className="px-1 bg-white border border-slate-200 rounded">V</kbd> Verbinder · <kbd className="px-1 bg-white border border-slate-200 rounded">Esc</kbd> Auswahl · <kbd className="px-1 bg-white border border-slate-200 rounded">Del</kbd> Löschen</span>
        </div>
      </div>
    </div>
  );
}
