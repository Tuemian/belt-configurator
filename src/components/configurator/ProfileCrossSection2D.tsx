import { SLOT_IDS, getModulePitch, type ProfileSection, type SlotId } from '@/lib/profile-configurator-types';

interface Props {
  section: ProfileSection;
  activeSlot: SlotId;
  onSelectSlot: (slot: SlotId) => void;
  size?: number; // px
}

/**
 * Compact, clickable cross-section of the profile.
 * Each side renders the actual T-slot openings; clicking a slot zone
 * activates that slot in the workbench.
 *
 * Slot convention (clockwise from top): A=top, B=right, C=bottom, D=left
 */
export function ProfileCrossSection2D({ section, activeSlot, onSelectSlot, size = 96 }: Props) {
  const { w, h, slotWidth, slotDepth, cornerR, boreRadius } = section;
  const MODULE = getModulePitch(section);

  // Layout: viewBox in mm with small padding
  const PAD = 6;
  const VB_W = w + PAD * 2;
  const VB_H = h + PAD * 2;

  const numW = Math.max(1, Math.round(w / MODULE));
  const numH = Math.max(1, Math.round(h / MODULE));

  // Outer rounded rect path
  const outer = `
    M ${PAD + cornerR} ${PAD}
    L ${PAD + w - cornerR} ${PAD}
    Q ${PAD + w} ${PAD} ${PAD + w} ${PAD + cornerR}
    L ${PAD + w} ${PAD + h - cornerR}
    Q ${PAD + w} ${PAD + h} ${PAD + w - cornerR} ${PAD + h}
    L ${PAD + cornerR} ${PAD + h}
    Q ${PAD} ${PAD + h} ${PAD} ${PAD + h - cornerR}
    L ${PAD} ${PAD + cornerR}
    Q ${PAD} ${PAD} ${PAD + cornerR} ${PAD}
    Z
  `;

  // T-slot rectangles (cosmetic only, drawn on top of fill)
  type SlotRect = { id: SlotId; x: number; y: number; w: number; h: number };
  const slotRects: SlotRect[] = [];

  // A = top
  for (let i = 0; i < numW; i++) {
    const cx = PAD + MODULE * (i + 0.5);
    slotRects.push({ id: 'A', x: cx - slotWidth / 2, y: PAD, w: slotWidth, h: slotDepth });
  }
  // C = bottom
  for (let i = 0; i < numW; i++) {
    const cx = PAD + MODULE * (i + 0.5);
    slotRects.push({ id: 'C', x: cx - slotWidth / 2, y: PAD + h - slotDepth, w: slotWidth, h: slotDepth });
  }
  // B = right
  for (let j = 0; j < numH; j++) {
    const cy = PAD + MODULE * (j + 0.5);
    slotRects.push({ id: 'B', x: PAD + w - slotDepth, y: cy - slotWidth / 2, w: slotDepth, h: slotWidth });
  }
  // D = left
  for (let j = 0; j < numH; j++) {
    const cy = PAD + MODULE * (j + 0.5);
    slotRects.push({ id: 'D', x: PAD, y: cy - slotWidth / 2, w: slotDepth, h: slotWidth });
  }

  // Hit zones – wider than the slot itself for easy clicking.
  // Each zone covers the entire side strip.
  const HIT = 7;
  const hitZones: { id: SlotId; x: number; y: number; w: number; h: number; label: string }[] = [
    { id: 'A', x: PAD, y: PAD - HIT,           w: w,    h: HIT + slotDepth, label: 'A' },
    { id: 'C', x: PAD, y: PAD + h - slotDepth, w: w,    h: HIT + slotDepth, label: 'C' },
    { id: 'B', x: PAD + w - slotDepth, y: PAD, w: HIT + slotDepth, h: h,    label: 'B' },
    { id: 'D', x: PAD - HIT,           y: PAD, w: HIT + slotDepth, h: h,    label: 'D' },
  ];

  return (
    <svg
      width={size}
      height={size * (VB_H / VB_W)}
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      preserveAspectRatio="xMidYMid meet"
      className="block"
    >
      <defs>
        <linearGradient id={`alu-${section.id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e2e8f0" />
          <stop offset="100%" stopColor="#94a3b8" />
        </linearGradient>
      </defs>

      {/* Outer profile */}
      <path d={outer} fill={`url(#alu-${section.id})`} stroke="#475569" strokeWidth="0.5" />

      {/* Center bores per module */}
      {Array.from({ length: numW }).map((_, i) =>
        Array.from({ length: numH }).map((_, j) => (
          <circle
            key={`bore-${i}-${j}`}
            cx={PAD + MODULE * (i + 0.5)}
            cy={PAD + MODULE * (j + 0.5)}
            r={boreRadius}
            fill="#f1f5f9"
            stroke="#94a3b8"
            strokeWidth="0.3"
          />
        )),
      )}

      {/* T-slot openings */}
      {slotRects.map((r, i) => (
        <rect
          key={`slot-${i}`}
          x={r.x}
          y={r.y}
          width={r.w}
          height={r.h}
          fill={r.id === activeSlot ? 'hsl(var(--primary))' : '#475569'}
          opacity={r.id === activeSlot ? 0.9 : 0.55}
        />
      ))}

      {/* Click hit zones */}
      {hitZones.map((z) => (
        <g key={`hit-${z.id}`} onClick={() => onSelectSlot(z.id)} style={{ cursor: 'pointer' }}>
          <rect
            x={z.x}
            y={z.y}
            width={z.w}
            height={z.h}
            fill={z.id === activeSlot ? 'hsl(var(--primary))' : 'transparent'}
            opacity={z.id === activeSlot ? 0.12 : 0}
            stroke={z.id === activeSlot ? 'hsl(var(--primary))' : 'transparent'}
            strokeDasharray="2 2"
            strokeWidth="0.5"
          />
        </g>
      ))}

      {/* Slot letter labels A/B/C/D in the corners */}
      <text x={PAD + w / 2} y={PAD - 1.5}      textAnchor="middle" fontSize="4" fontWeight="700" fill={activeSlot === 'A' ? 'hsl(var(--primary))' : '#64748b'}>A</text>
      <text x={PAD + w + 4} y={PAD + h / 2 + 1.5} textAnchor="middle" fontSize="4" fontWeight="700" fill={activeSlot === 'B' ? 'hsl(var(--primary))' : '#64748b'}>B</text>
      <text x={PAD + w / 2} y={PAD + h + 4}    textAnchor="middle" fontSize="4" fontWeight="700" fill={activeSlot === 'C' ? 'hsl(var(--primary))' : '#64748b'}>C</text>
      <text x={PAD - 4}     y={PAD + h / 2 + 1.5} textAnchor="middle" fontSize="4" fontWeight="700" fill={activeSlot === 'D' ? 'hsl(var(--primary))' : '#64748b'}>D</text>
    </svg>
  );
}
