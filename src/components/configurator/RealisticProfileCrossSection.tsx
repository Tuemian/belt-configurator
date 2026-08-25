import { getModulePitch, getSlotCounts, getBoreCounts, type ProfileSection } from '@/lib/profile-configurator-types';

interface Props {
  section: ProfileSection;
  size?: number;
  rotate90?: boolean;
  className?: string;
}

/** Rounded-rect path, clockwise, starting top-left (after the corner). */
function roundedRectPath(x: number, y: number, w: number, h: number, r: number): string {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  return `M ${x + rr} ${y} L ${x + w - rr} ${y} Q ${x + w} ${y} ${x + w} ${y + rr} L ${x + w} ${y + h - rr} Q ${x + w} ${y + h} ${x + w - rr} ${y + h} L ${x + rr} ${y + h} Q ${x} ${y + h} ${x} ${y + h - rr} L ${x} ${y + rr} Q ${x} ${y} ${x + rr} ${y} Z`;
}

/** T-Nut-Kanal (Öffnung schmal, dahinter breiter Fangraum) für eine Nut auf der Oberseite (A). Andere Seiten via transform gespiegelt/gedreht. */
function tSlotPath(cx: number, yTop: number, slotWidth: number, grooveWidth: number, depth: number): string {
  const lip = Math.min(1.8, depth * 0.25);
  const wHalf = slotWidth / 2;
  const gHalf = grooveWidth / 2;
  return `M ${cx - wHalf} ${yTop} L ${cx - wHalf} ${yTop + lip} L ${cx - gHalf} ${yTop + lip} L ${cx - gHalf} ${yTop + depth} L ${cx + gHalf} ${yTop + depth} L ${cx + gHalf} ${yTop + lip} L ${cx + wHalf} ${yTop + lip} L ${cx + wHalf} ${yTop} Z`;
}

/**
 * Realistischere, nicht-interaktive Querschnittsgrafik für den Durchbiegungsrechner:
 * hohle Wandung (Ring statt Vollfläche), echte T-Nut-Kontur statt Rechteck-Kerbe,
 * dezente Bohrungs-Schattierung. Bewusst getrennt von `ProfileCrossSection2D`
 * (die interaktive Grafik des Zuschnittskonfigurators bleibt unverändert).
 */
export function RealisticProfileCrossSection({ section, size = 140, rotate90 = false, className }: Props) {
  const { w, h, slotWidth, slotDepth, grooveWidth, cornerR, boreRadius, webThickness = 3 } = section;
  const MODULE = getModulePitch(section);
  const counts = getSlotCounts(section);
  const bores = getBoreCounts(section);

  const PAD = 16;
  const VB_W = w + PAD * 2;
  const VB_H = h + PAD * 2;
  const wall = Math.min(webThickness, Math.min(w, h) / 2 - 1.5);

  const outer = roundedRectPath(PAD, PAD, w, h, cornerR);
  const inner = roundedRectPath(PAD + wall, PAD + wall, w - wall * 2, h - wall * 2, Math.max(0, cornerR - wall));

  const slots: string[] = [];
  for (let i = 0; i < counts.A; i++) {
    const cx = PAD + MODULE * (i + 0.5);
    slots.push(tSlotPath(cx, PAD, slotWidth, grooveWidth, slotDepth));
  }
  for (let i = 0; i < counts.C; i++) {
    const cx = PAD + MODULE * (i + 0.5);
    // Bodenseite: gleiche Kontur, senkrecht gespiegelt an y = PAD+h
    slots.push(tSlotPath(cx, PAD + h, slotWidth, grooveWidth, -slotDepth));
  }
  const vSlot = (cy: number, fromRight: boolean) => {
    const lip = Math.min(1.8, slotDepth * 0.25);
    const wHalf = slotWidth / 2;
    const gHalf = grooveWidth / 2;
    const x0 = fromRight ? PAD + w : PAD;
    const dir = fromRight ? -1 : 1;
    return `M ${x0} ${cy - wHalf} L ${x0 + dir * lip} ${cy - wHalf} L ${x0 + dir * lip} ${cy - gHalf} L ${x0 + dir * slotDepth} ${cy - gHalf} L ${x0 + dir * slotDepth} ${cy + gHalf} L ${x0 + dir * lip} ${cy + gHalf} L ${x0 + dir * lip} ${cy + wHalf} L ${x0} ${cy + wHalf} Z`;
  };
  for (let j = 0; j < counts.B; j++) {
    const cy = PAD + MODULE * (j + 0.5);
    slots.push(vSlot(cy, true));
  }
  for (let j = 0; j < counts.D; j++) {
    const cy = PAD + MODULE * (j + 0.5);
    slots.push(vSlot(cy, false));
  }

  const dispW = rotate90 ? size * (VB_H / VB_W) : size;
  const dispH = rotate90 ? size : size * (VB_H / VB_W);
  const innerTransform = rotate90 ? `translate(${VB_H} 0) rotate(90)` : undefined;
  const gradId = `alu-real-${section.id}`;
  const shadowId = `slot-shadow-${section.id}`;

  return (
    <svg
      width={dispW}
      height={dispH}
      viewBox={rotate90 ? `0 0 ${VB_H} ${VB_W}` : `0 0 ${VB_W} ${VB_H}`}
      preserveAspectRatio="xMidYMid meet"
      className={className}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f1f5f9" />
          <stop offset="45%" stopColor="#cbd5e1" />
          <stop offset="100%" stopColor="#94a3b8" />
        </linearGradient>
        <radialGradient id={shadowId} cx="35%" cy="35%" r="75%">
          <stop offset="0%" stopColor="#64748b" />
          <stop offset="100%" stopColor="#334155" />
        </radialGradient>
      </defs>

      <g transform={innerTransform}>
        {/* Hohler Ring: Außenkontur minus Innenkontur (Wanddicke geschätzt) */}
        <path d={`${outer} ${inner}`} fillRule="evenodd" fill={`url(#${gradId})`} stroke="#475569" strokeWidth="0.6" />
        {/* Zarter Glanz oben links */}
        <path d={outer} fill="none" stroke="#ffffff" strokeOpacity="0.5" strokeWidth="0.6" />

        {/* T-Nuten */}
        {slots.map((d, i) => (
          <path key={`slot-${i}`} d={d} fill={`url(#${shadowId})`} opacity={0.92} />
        ))}

        {/* Kernzüge / Bohrungen */}
        {Array.from({ length: bores.x }).map((_, ix) =>
          Array.from({ length: bores.y }).map((_, iy) => {
            const cx = PAD + MODULE * (ix + 0.5);
            const cy = PAD + MODULE * (iy + 0.5);
            return (
              <g key={`bore-${ix}-${iy}`}>
                <circle cx={cx} cy={cy} r={boreRadius + 1.1} fill={`url(#${gradId})`} stroke="#64748b" strokeWidth="0.4" />
                <circle cx={cx} cy={cy} r={boreRadius} fill={`url(#${shadowId})`} />
              </g>
            );
          }),
        )}
      </g>
    </svg>
  );
}
