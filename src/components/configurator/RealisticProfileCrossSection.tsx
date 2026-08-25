import { getModulePitch, getSlotCounts, getBoreCounts, type ProfileSection } from '@/lib/profile-configurator-types';
import { roundedRectPath, tSlotPathDown, tSlotPathHorizontal, getCellStruts, getAlvarisImage, ALVARIS_PAD_MM } from '@/lib/profile-cross-section-shapes';

interface Props {
  section: ProfileSection;
  size?: number;
  rotate90?: boolean;
  className?: string;
  /** Alvaris-Profilreihe für die Bild-Zuordnung (s. getAlvarisImage). Default 'A8'. */
  series?: 'A5' | 'A6' | 'A8' | 'A10';
}

/**
 * Realistischere, nicht-interaktive Querschnittsgrafik für den Durchbiegungsrechner:
 * hohle Wandung (Ring statt Vollfläche), echte T-Nut-Kontur statt Rechteck-Kerbe,
 * dezente Bohrungs-Schattierung. Bewusst getrennt von `ProfileCrossSection2D`
 * (die interaktive Grafik des Zuschnittskonfigurators bleibt unverändert).
 */
export function RealisticProfileCrossSection({ section, size = 140, rotate90 = false, className, series = 'A8' }: Props) {
  const { w, h, slotWidth, slotDepth, grooveWidth, cornerR, boreRadius, webThickness = 3 } = section;
  const MODULE = getModulePitch(section);
  const counts = getSlotCounts(section);
  const bores = getBoreCounts(section);

  const alvarisImage = getAlvarisImage(section.sizeKey, series);
  const PAD = alvarisImage ? ALVARIS_PAD_MM : 16;
  const VB_W = w + PAD * 2;
  const VB_H = h + PAD * 2;
  const wall = Math.min(webThickness, Math.min(w, h) / 2 - 1.5);

  const outer = roundedRectPath(PAD, PAD, w, h, cornerR);
  const inner = roundedRectPath(PAD + wall, PAD + wall, w - wall * 2, h - wall * 2, Math.max(0, cornerR - wall));
  const struts = getCellStruts(w, h, bores.x, bores.y);
  const strutWidth = Math.max(0.8, wall * 0.55);

  const slots: string[] = [];
  for (let i = 0; i < counts.A; i++) {
    const cx = PAD + MODULE * (i + 0.5);
    slots.push(tSlotPathDown(cx, PAD, slotWidth, grooveWidth, slotDepth));
  }
  for (let i = 0; i < counts.C; i++) {
    const cx = PAD + MODULE * (i + 0.5);
    // Bodenseite: gleiche Kontur, senkrecht gespiegelt an y = PAD+h
    slots.push(tSlotPathDown(cx, PAD + h, slotWidth, grooveWidth, -slotDepth));
  }
  for (let j = 0; j < counts.B; j++) {
    const cy = PAD + MODULE * (j + 0.5);
    slots.push(tSlotPathHorizontal(cy, PAD + w, slotWidth, grooveWidth, slotDepth, true));
  }
  for (let j = 0; j < counts.D; j++) {
    const cy = PAD + MODULE * (j + 0.5);
    slots.push(tSlotPathHorizontal(cy, PAD, slotWidth, grooveWidth, slotDepth, false));
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
        {alvarisImage ? (
          alvarisImage.rotated ? (
            <g transform={`translate(${VB_W}, 0) rotate(90)`}>
              <image href={alvarisImage.path} x="0" y="0" width={VB_H} height={VB_W} preserveAspectRatio="none" />
            </g>
          ) : (
            <image href={alvarisImage.path} x="0" y="0" width={VB_W} height={VB_H} preserveAspectRatio="none" />
          )
        ) : (
          <>
            {/* Hohler Ring: Außenkontur minus Innenkontur (Wanddicke geschätzt) */}
            <path d={`${outer} ${inner}`} fillRule="evenodd" fill={`url(#${gradId})`} stroke="#475569" strokeWidth="0.6" />
            {/* Zarter Glanz oben links */}
            <path d={outer} fill="none" stroke="#ffffff" strokeOpacity="0.5" strokeWidth="0.6" />

            {/* Innere Stege (Kernbohrung → Modulzellen-Ecken) */}
            {struts.map((s, i) => (
              <line
                key={`strut-${i}`}
                x1={PAD + s.x1} y1={PAD + s.y1}
                x2={PAD + s.x2} y2={PAD + s.y2}
                stroke={`url(#${gradId})`}
                strokeWidth={strutWidth}
                strokeLinecap="round"
              />
            ))}

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
          </>
        )}
      </g>
    </svg>
  );
}
