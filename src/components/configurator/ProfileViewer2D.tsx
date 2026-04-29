import { useMemo } from 'react';
import type { ProfileSection, ProfileHole, ProfileConnector } from '@/lib/profile-configurator-types';

const MODULE = 40;
const NECK = 1.5;

export interface ProfileViewer2DProps {
  section: ProfileSection;
  length: number;
  angleStart: number;
  angleEnd: number;
  holes: ProfileHole[];
  connectors: ProfileConnector[];
}

// -----------------------------------------------------------------------------
// Querschnitt (Front view) — exakte 2D-Darstellung des Profils mit T-Nuten
// -----------------------------------------------------------------------------

function buildCrossSectionPath(section: ProfileSection): string {
  const { w, h, slotWidth: sw, slotDepth: sd, grooveWidth: gw, cornerR } = section;
  const hw = w / 2;
  const hh = h / 2;
  const numW = Math.round(w / MODULE);
  const numH = Math.round(h / MODULE);
  const r = cornerR;

  // SVG path: y-Achse zeigt nach unten, daher invertieren wir Y
  // Wir bauen die Außenkontur (CW im SVG-Koordinatensystem)
  // und unterbrechen sie an jeder T-Nut, sodass die Nut "ausgeschnitten" wird.
  const parts: string[] = [];

  // Helfer: build top edge (-hw → +hw entlang y = -hh) mit Nuten
  // SVG y is screen-down, so original "top" (+hh) becomes y = -hh (vorzeichen swap am Ende)
  // Wir arbeiten in math-Koordinaten und spiegeln am Schluss.

  // Wir nutzen separate Pfade pro Kontur. Stattdessen einfacher: Außenrahmen
  // mit abgerundeten Ecken, dann pro Nut einen rect/path mit Hintergrundfarbe drüber.
  // → Wir geben hier nur die Außenkontur als Pfad zurück.

  parts.push(`M ${-hw + r} ${-hh}`);
  parts.push(`L ${hw - r} ${-hh}`);
  parts.push(`Q ${hw} ${-hh} ${hw} ${-hh + r}`);
  parts.push(`L ${hw} ${hh - r}`);
  parts.push(`Q ${hw} ${hh} ${hw - r} ${hh}`);
  parts.push(`L ${-hw + r} ${hh}`);
  parts.push(`Q ${-hw} ${hh} ${-hw} ${hh - r}`);
  parts.push(`L ${-hw} ${-hh + r}`);
  parts.push(`Q ${-hw} ${-hh} ${-hw + r} ${-hh}`);
  parts.push('Z');

  // Spiegelung an y-Achse (SVG y nach unten) erfolgt im umgebenden <g transform="scale(1,-1)">
  void numW; void numH; void sw; void sd; void gw;
  return parts.join(' ');
}

function CrossSection({ section, holes, connectors }: { section: ProfileSection; holes: ProfileHole[]; connectors: ProfileConnector[] }) {
  const { w, h, slotWidth: sw, slotDepth: sd, grooveWidth: gw, boreRadius } = section;
  const numW = Math.round(w / MODULE);
  const numH = Math.round(h / MODULE);
  const hw = w / 2;
  const hh = h / 2;

  const padding = 30;
  const dimSpace = 30;
  const viewW = w + padding * 2 + dimSpace;
  const viewH = h + padding * 2 + dimSpace;

  const outer = useMemo(() => buildCrossSectionPath(section), [section]);

  // Build slot rectangles (on raw shape, then transformed)
  const slots: { x: number; y: number; w: number; h: number; type: 'top' | 'bottom' | 'left' | 'right' }[] = [];
  for (let i = 0; i < numW; i++) {
    const cx = -hw + MODULE * (i + 0.5);
    slots.push({ x: cx - sw / 2, y: hh - NECK, w: sw, h: NECK, type: 'top' });
    slots.push({ x: cx - gw / 2, y: hh - sd, w: gw, h: sd - NECK, type: 'top' });
    slots.push({ x: cx - sw / 2, y: -hh, w: sw, h: NECK, type: 'bottom' });
    slots.push({ x: cx - gw / 2, y: -hh + NECK, w: gw, h: sd - NECK, type: 'bottom' });
  }
  for (let j = 0; j < numH; j++) {
    const cy = -hh + MODULE * (j + 0.5);
    slots.push({ x: hw - NECK, y: cy - sw / 2, w: NECK, h: sw, type: 'right' });
    slots.push({ x: hw - sd, y: cy - gw / 2, w: sd - NECK, h: gw, type: 'right' });
    slots.push({ x: -hw, y: cy - sw / 2, w: NECK, h: sw, type: 'left' });
    slots.push({ x: -hw + NECK, y: cy - gw / 2, w: sd - NECK, h: gw, type: 'left' });
  }

  // Center bores
  const bores: { cx: number; cy: number }[] = [];
  for (let i = 0; i < numW; i++) {
    for (let j = 0; j < numH; j++) {
      bores.push({
        cx: -hw + MODULE * (i + 0.5),
        cy: -hh + MODULE * (j + 0.5),
      });
    }
  }

  // Connector indicators on cross-section: small markers on the active face/module
  const activeConnectors = connectors.map((c) => {
    if (c.face === 'top' || c.face === 'bottom') {
      const cx = -hw + MODULE * (c.module + 0.5);
      const cy = c.face === 'top' ? hh - sd / 2 : -hh + sd / 2;
      return { cx, cy };
    } else {
      const cy = -hh + MODULE * (c.module + 0.5);
      const cx = c.face === 'right' ? hw - sd / 2 : -hw + sd / 2;
      return { cx, cy };
    }
  });

  // Hole face indicators (Bohrungen werden im Querschnitt nur als kleiner Punkt
  // an der jeweiligen Fläche angedeutet — exakte Lage in Z gehört in die Seitenansicht)
  const holeMarkers = holes.map((hole) => {
    const r = hole.diameter / 2;
    // alle Bohrungen sitzen aktuell auf "top" (siehe addHole im Page-State)
    return { cx: 0, cy: hh - sd, r };
  });
  void holeMarkers;

  return (
    <svg
      viewBox={`${-viewW / 2} ${-viewH / 2} ${viewW} ${viewH}`}
      className="w-full h-full"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Hintergrund-Grid sehr dezent */}
      <defs>
        <pattern id="grid-cs" width="10" height="10" patternUnits="userSpaceOnUse">
          <path d="M 10 0 L 0 0 0 10" fill="none" stroke="hsl(199 30% 90%)" strokeWidth="0.3" />
        </pattern>
      </defs>
      <rect x={-viewW / 2} y={-viewH / 2} width={viewW} height={viewH} fill="url(#grid-cs)" opacity={0.5} />

      {/* Spiegelung: math-y nach oben → SVG-y nach unten */}
      <g transform="scale(1,-1)">
        {/* Außenkontur — gefüllt mit Aluminium-Look */}
        <path d={outer} fill="hsl(199 20% 82%)" stroke="hsl(199 60% 30%)" strokeWidth={0.6} />

        {/* T-Nut Aussparungen (mit Hintergrundfarbe übermalt) */}
        {slots.map((s, i) => (
          <rect
            key={`slot-${i}`}
            x={s.x}
            y={s.y}
            width={s.w}
            height={s.h}
            fill="white"
            stroke="hsl(199 60% 30%)"
            strokeWidth={0.4}
          />
        ))}

        {/* Zentralbohrungen */}
        {bores.map((b, i) => (
          <g key={`bore-${i}`}>
            <circle cx={b.cx} cy={b.cy} r={boreRadius} fill="white" stroke="hsl(199 60% 30%)" strokeWidth={0.4} />
            {/* Mittellinien-Kreuz */}
            <line x1={b.cx - boreRadius - 1.5} y1={b.cy} x2={b.cx + boreRadius + 1.5} y2={b.cy} stroke="hsl(199 60% 30%)" strokeWidth={0.25} strokeDasharray="1,1" />
            <line x1={b.cx} y1={b.cy - boreRadius - 1.5} x2={b.cx} y2={b.cy + boreRadius + 1.5} stroke="hsl(199 60% 30%)" strokeWidth={0.25} strokeDasharray="1,1" />
          </g>
        ))}

        {/* Verbinder-Marker (T-Nutensteine) */}
        {activeConnectors.map((c, i) => (
          <circle key={`conn-${i}`} cx={c.cx} cy={c.cy} r={2.2} fill="hsl(199 100% 40%)" stroke="white" strokeWidth={0.5} />
        ))}

        {/* Maßlinien Breite (unten) */}
        <g stroke="hsl(199 60% 25%)" strokeWidth={0.4} fill="none">
          <line x1={-hw} y1={-hh - 12} x2={hw} y2={-hh - 12} />
          <line x1={-hw} y1={-hh - 8} x2={-hw} y2={-hh - 16} />
          <line x1={hw} y1={-hh - 8} x2={hw} y2={-hh - 16} />
        </g>

        {/* Maßlinien Höhe (rechts) */}
        <g stroke="hsl(199 60% 25%)" strokeWidth={0.4} fill="none">
          <line x1={hw + 12} y1={-hh} x2={hw + 12} y2={hh} />
          <line x1={hw + 8} y1={-hh} x2={hw + 16} y2={-hh} />
          <line x1={hw + 8} y1={hh} x2={hw + 16} y2={hh} />
        </g>
      </g>

      {/* Maßtext (nicht gespiegelt, damit Schrift normal lesbar) */}
      <text x={0} y={hh + 26} textAnchor="middle" fontSize={7} fill="hsl(199 60% 25%)" fontFamily="ui-monospace, monospace">
        {w} mm
      </text>
      <text
        x={hw + 22}
        y={0}
        textAnchor="middle"
        fontSize={7}
        fill="hsl(199 60% 25%)"
        fontFamily="ui-monospace, monospace"
        transform={`rotate(-90 ${hw + 22} 0)`}
      >
        {h} mm
      </text>

      <text x={-viewW / 2 + 6} y={-viewH / 2 + 12} fontSize={7} fill="hsl(199 60% 25%)" fontFamily="ui-monospace, monospace" fontWeight={600}>
        QUERSCHNITT
      </text>
    </svg>
  );
}

// -----------------------------------------------------------------------------
// Seitenansicht (Side view) — Länge × Höhe, Schrägschnitte, Bohrungen, Verbinder
// -----------------------------------------------------------------------------

function SideView({ section, length, angleStart, angleEnd, holes, connectors }: ProfileViewer2DProps) {
  const { h } = section;
  const padding = 30;
  const dimSpace = 30;
  const viewW = length + padding * 2 + dimSpace;
  const viewH = h + padding * 2 + dimSpace * 2;

  // Schrägschnitt-Versatz oben/unten (Hypotenusenprojektion)
  const offS = h * Math.tan((angleStart * Math.PI) / 180);
  const offE = h * Math.tan((angleEnd * Math.PI) / 180);

  // Profil-Polygon (math-Koordinaten, +y nach oben)
  const xL = 0;
  const xR = length;
  const yT = h / 2;
  const yB = -h / 2;

  const profilePath = [
    `M ${xL + offS} ${yB}`,
    `L ${xR - offE} ${yB}`,
    `L ${xR} ${yT}`,
    `L ${xL} ${yT}`,
    'Z',
  ].join(' ');

  return (
    <svg
      viewBox={`${-padding - dimSpace / 2} ${-viewH / 2} ${viewW} ${viewH}`}
      className="w-full h-full"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <pattern id="grid-side" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="hsl(199 30% 90%)" strokeWidth="0.3" />
        </pattern>
      </defs>
      <rect x={-padding - dimSpace / 2} y={-viewH / 2} width={viewW} height={viewH} fill="url(#grid-side)" opacity={0.5} />

      <g transform="scale(1,-1)">
        {/* Profilkörper */}
        <path d={profilePath} fill="hsl(199 25% 85%)" stroke="hsl(199 60% 30%)" strokeWidth={0.8} />

        {/* T-Nut Andeutungen oben/unten als feine Linien */}
        <line x1={xL + offS} y1={yT - 2} x2={xR - offE} y2={yT - 2} stroke="hsl(199 60% 40%)" strokeWidth={0.4} strokeDasharray="3,2" />
        <line x1={xL + offS} y1={yB + 2} x2={xR - offE} y2={yB + 2} stroke="hsl(199 60% 40%)" strokeWidth={0.4} strokeDasharray="3,2" />

        {/* Mittellinie */}
        <line x1={xL} y1={0} x2={xR} y2={0} stroke="hsl(199 60% 30%)" strokeWidth={0.3} strokeDasharray="6,2,1,2" />

        {/* Bohrungen — als Kreise auf der Oberseite */}
        {holes.map((hole) => {
          const r = hole.diameter / 2;
          const isThread = hole.type === 'm6-thread' || hole.type === 'm8-thread';
          const isStep = hole.type === 'step-m6' || hole.type === 'step-m8';
          const fill = isThread ? 'hsl(35 70% 55%)' : isStep ? 'hsl(220 50% 55%)' : 'hsl(220 15% 25%)';
          return (
            <g key={hole.id}>
              <circle cx={hole.zPosition} cy={yT - r - 0.5} r={r} fill={fill} stroke="white" strokeWidth={0.4} />
              <line x1={hole.zPosition} y1={yT + 1} x2={hole.zPosition} y2={yT + 6} stroke="hsl(199 60% 30%)" strokeWidth={0.3} />
            </g>
          );
        })}

        {/* Verbinder — als kleine Rechtecke */}
        {connectors.map((c) => {
          const tL = 22;
          let y = 0;
          if (c.face === 'top') y = yT - 3;
          else if (c.face === 'bottom') y = yB + 1;
          else y = 0; // links/rechts in Seitenansicht nur als Mittellinien-Marker
          return (
            <rect
              key={c.id}
              x={c.zPosition - tL / 2}
              y={y}
              width={tL}
              height={2}
              fill="hsl(199 100% 40%)"
              stroke="white"
              strokeWidth={0.3}
            />
          );
        })}

        {/* Maßlinie Länge (unten) */}
        <g stroke="hsl(199 60% 25%)" strokeWidth={0.4} fill="none">
          <line x1={0} y1={yB - 14} x2={length} y2={yB - 14} />
          <line x1={0} y1={yB - 10} x2={0} y2={yB - 18} />
          <line x1={length} y1={yB - 10} x2={length} y2={yB - 18} />
        </g>

        {/* Winkel-Markierungen */}
        {angleStart > 0 && (
          <text
            x={xL + offS / 2 + 4}
            y={-(yT - 4)}
            fontSize={6}
            fill="hsl(35 70% 40%)"
            fontFamily="ui-monospace, monospace"
            transform={`scale(1,-1)`}
          >
            {angleStart}°
          </text>
        )}
        {angleEnd > 0 && (
          <text
            x={xR - offE / 2 - 12}
            y={-(yT - 4)}
            fontSize={6}
            fill="hsl(35 70% 40%)"
            fontFamily="ui-monospace, monospace"
            transform={`scale(1,-1)`}
          >
            {angleEnd}°
          </text>
        )}
      </g>

      {/* Längen-Maßtext */}
      <text
        x={length / 2}
        y={h / 2 + 28}
        textAnchor="middle"
        fontSize={8}
        fill="hsl(199 60% 25%)"
        fontFamily="ui-monospace, monospace"
        fontWeight={600}
      >
        {length} mm
      </text>

      <text x={-padding - dimSpace / 2 + 6} y={-viewH / 2 + 12} fontSize={7} fill="hsl(199 60% 25%)" fontFamily="ui-monospace, monospace" fontWeight={600}>
        SEITENANSICHT
      </text>
    </svg>
  );
}

// -----------------------------------------------------------------------------
// Public component
// -----------------------------------------------------------------------------

export function ProfileViewer2D(props: ProfileViewer2DProps) {
  return (
    <div className="w-full h-full flex flex-col bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="flex-1 grid grid-rows-[1fr_1fr] gap-2 p-3 min-h-0">
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden min-h-0">
          <CrossSection section={props.section} holes={props.holes} connectors={props.connectors} />
        </div>
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden min-h-0">
          <SideView {...props} />
        </div>
      </div>
    </div>
  );
}
