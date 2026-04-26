import {
  getModulePitch,
  getSlotCounts,
  getSlotNumber,
  getBoreCounts,
  getBoreNumber,
  type ProfileSection,
  type SlotId,
} from '@/lib/profile-configurator-types';

interface Props {
  section: ProfileSection;
  /** Aktuelle Auswahl (interne Slot-ID + Spurindex) – einzelne aktive */
  activeSlot: SlotId;
  activeModuleIndex?: number;
  /** Optional: zusätzlich aktive Slots (Multi-Select). Format "A:0", "B:1" … */
  selectedKeys?: Set<string>;
  onSelectSlot: (slot: SlotId, moduleIndex: number, additive?: boolean) => void;
  /** Klick auf Kernzug (für Stirngewinde-Auswahl). Optional. */
  onSelectBore?: (boreNumber: number) => void;
  /** Hervorgehobene Kernzüge (z. B. Stirngewinde aktiv) */
  activeBores?: Set<number>;
  size?: number; // px
  /** Beschriftung anzeigen (rote Nutnummern, blaue Kernzug-Nummern) */
  showLabels?: boolean;
  /** Querschnitt um 90° im Uhrzeigersinn drehen (kompakter wenn Profil hoch ist) */
  rotate90?: boolean;
  /** Seitenkürzel A/B/C/D außen am Profil anzeigen */
  showSideLabels?: boolean;
}

export function slotKey(slot: SlotId, moduleIndex: number) {
  return `${slot}:${moduleIndex}`;
}

/**
 * Querschnitt analog Alvaris-Profilbearbeitungscode:
 *  – Nuten werden im Uhrzeigersinn fortlaufend rot nummeriert (1..n)
 *  – Kernzüge (Mittelbohrungen) tragen blaue Zahlen in Kreisen
 *  – jede einzelne Nut ist klickbar (mit Shift = additiv)
 */
export function ProfileCrossSection2D({
  section,
  activeSlot,
  activeModuleIndex = 0,
  selectedKeys,
  onSelectSlot,
  onSelectBore,
  activeBores,
  size = 96,
  showLabels = true,
  rotate90 = false,
  showSideLabels = false,
}: Props) {
  const { w, h, slotWidth, slotDepth, cornerR, boreRadius } = section;
  const MODULE = getModulePitch(section);
  const counts = getSlotCounts(section);
  const bores = getBoreCounts(section);

  const PAD = 14;
  const VB_W = w + PAD * 2;
  const VB_H = h + PAD * 2;

  const isSelected = (s: SlotId, mi: number): boolean => {
    if (selectedKeys && selectedKeys.size > 0) return selectedKeys.has(slotKey(s, mi));
    return s === activeSlot && mi === activeModuleIndex;
  };

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

  const fs = Math.max(2.4, Math.min(5, MODULE / 8));
  const boreFs = Math.max(2.2, Math.min(4.5, boreRadius * 1.1));

  type SlotEntry = {
    slot: SlotId;
    moduleIndex: number;
    number: number;
    rect: { x: number; y: number; w: number; h: number };
    label: { x: number; y: number };
    hit: { x: number; y: number; w: number; h: number };
  };
  const HIT = 5;
  const slots: SlotEntry[] = [];

  for (let i = 0; i < counts.A; i++) {
    const cx = PAD + MODULE * (i + 0.5);
    slots.push({
      slot: 'A', moduleIndex: i,
      number: getSlotNumber(section, 'A', i),
      rect: { x: cx - slotWidth / 2, y: PAD, w: slotWidth, h: slotDepth },
      label: { x: cx, y: PAD + slotDepth + fs * 0.9 },
      hit: { x: cx - MODULE / 2, y: PAD - HIT, w: MODULE, h: HIT + slotDepth + fs * 1.4 },
    });
  }
  for (let j = 0; j < counts.B; j++) {
    const cy = PAD + MODULE * (j + 0.5);
    slots.push({
      slot: 'B', moduleIndex: j,
      number: getSlotNumber(section, 'B', j),
      rect: { x: PAD + w - slotDepth, y: cy - slotWidth / 2, w: slotDepth, h: slotWidth },
      label: { x: PAD + w - slotDepth - fs * 0.7, y: cy + fs * 0.35 },
      hit: { x: PAD + w - slotDepth - fs * 1.4, y: cy - MODULE / 2, w: HIT + slotDepth + fs * 1.4, h: MODULE },
    });
  }
  for (let i = 0; i < counts.C; i++) {
    const cx = PAD + MODULE * (i + 0.5);
    slots.push({
      slot: 'C', moduleIndex: i,
      number: getSlotNumber(section, 'C', i),
      rect: { x: cx - slotWidth / 2, y: PAD + h - slotDepth, w: slotDepth, h: slotDepth },
      label: { x: cx, y: PAD + h - slotDepth - fs * 0.4 },
      hit: { x: cx - MODULE / 2, y: PAD + h - slotDepth - fs * 0.4, w: MODULE, h: HIT + slotDepth + fs * 0.6 },
    });
  }
  for (let j = 0; j < counts.D; j++) {
    const cy = PAD + MODULE * (j + 0.5);
    slots.push({
      slot: 'D', moduleIndex: j,
      number: getSlotNumber(section, 'D', j),
      rect: { x: PAD, y: cy - slotWidth / 2, w: slotDepth, h: slotWidth },
      label: { x: PAD + slotDepth + fs * 0.7, y: cy + fs * 0.35 },
      hit: { x: PAD - HIT, y: cy - MODULE / 2, w: HIT + slotDepth + fs * 1.4, h: MODULE },
    });
  }

  // Effektive Größe nach optionaler 90°-Rotation
  const dispW = rotate90 ? size * (VB_H / VB_W) : size;
  const dispH = rotate90 ? size : size * (VB_H / VB_W);

  // Bei rotate90 drehen wir den gesamten Inhalt im SVG via transform um VB-Mitte
  const innerTransform = rotate90
    ? `rotate(90 ${VB_W / 2} ${VB_H / 2}) translate(${(VB_W - VB_H) / 2} ${(VB_H - VB_W) / 2})`
    : undefined;

  return (
    <svg
      width={dispW}
      height={dispH}
      viewBox={rotate90 ? `0 0 ${VB_H} ${VB_W}` : `0 0 ${VB_W} ${VB_H}`}
      preserveAspectRatio="xMidYMid meet"
      className="block"
    >
      <defs>
        <linearGradient id={`alu-${section.id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e2e8f0" />
          <stop offset="100%" stopColor="#94a3b8" />
        </linearGradient>
      </defs>

      <g transform={innerTransform}>
        <path d={outer} fill={`url(#alu-${section.id})`} stroke="#475569" strokeWidth="0.5" />

        {/* Kernzüge */}
        {Array.from({ length: bores.x }).map((_, ix) =>
          Array.from({ length: bores.y }).map((_, iy) => {
            const cx = PAD + MODULE * (ix + 0.5);
            const cy = PAD + MODULE * (iy + 0.5);
            const num = getBoreNumber(section, ix, iy);
            const lblR = Math.max(boreRadius, boreFs * 0.95);
            const isActiveBore = activeBores?.has(num);
            const clickable = !!onSelectBore;
            return (
              <g
                key={`bore-${ix}-${iy}`}
                onClick={clickable ? (e) => { e.stopPropagation(); onSelectBore!(num); } : undefined}
                style={{ cursor: clickable ? 'pointer' : 'default' }}
              >
                <circle cx={cx} cy={cy} r={boreRadius} fill="#f1f5f9" stroke="#94a3b8" strokeWidth={0.3} />
                {showLabels && !isActiveBore && (
                  <>
                    <circle cx={cx} cy={cy} r={lblR} fill="white" stroke="#1d4ed8" strokeWidth="0.4" opacity="0.95" />
                    <text
                      x={cx}
                      y={cy + boreFs * 0.36}
                      textAnchor="middle"
                      fontSize={boreFs}
                      fontWeight="700"
                      fill="#1d4ed8"
                      fontFamily="ui-sans-serif, system-ui"
                    >
                      {num}
                    </text>
                  </>
                )}
                {showLabels && isActiveBore && (
                  <>
                    {/* X-Markierung für aktives Gewinde */}
                    <circle cx={cx} cy={cy} r={lblR} fill="white" stroke="#dc2626" strokeWidth="0.6" />
                    <line x1={cx - lblR * 0.6} y1={cy - lblR * 0.6} x2={cx + lblR * 0.6} y2={cy + lblR * 0.6} stroke="#dc2626" strokeWidth="0.9" strokeLinecap="round" />
                    <line x1={cx + lblR * 0.6} y1={cy - lblR * 0.6} x2={cx - lblR * 0.6} y2={cy + lblR * 0.6} stroke="#dc2626" strokeWidth="0.9" strokeLinecap="round" />
                  </>
                )}
              </g>
            );
          }),
        )}

        {/* Nut-Öffnungen */}
        {slots.map((s, i) => {
          const sel = isSelected(s.slot, s.moduleIndex);
          return (
            <rect
              key={`slot-${i}`}
              x={s.rect.x}
              y={s.rect.y}
              width={s.rect.w}
              height={s.rect.h}
              fill={sel ? 'hsl(var(--primary))' : '#475569'}
              opacity={sel ? 0.95 : 0.6}
            />
          );
        })}

        {/* Hitboxes + Beschriftung */}
        {slots.map((s) => {
          const sel = isSelected(s.slot, s.moduleIndex);
          return (
            <g
              key={`hit-${s.slot}-${s.moduleIndex}`}
              onClick={(e) => { e.stopPropagation(); onSelectSlot(s.slot, s.moduleIndex, e.shiftKey || e.metaKey || e.ctrlKey); }}
              style={{ cursor: 'pointer' }}
            >
              <rect
                x={s.hit.x}
                y={s.hit.y}
                width={s.hit.w}
                height={s.hit.h}
                fill={sel ? 'hsl(var(--primary))' : 'transparent'}
                opacity={sel ? 0.1 : 0}
              />
              {showLabels && (
                <text
                  x={s.label.x}
                  y={s.label.y}
                  textAnchor="middle"
                  fontSize={fs}
                  fontWeight="700"
                  fill={sel ? 'hsl(var(--primary))' : '#dc2626'}
                  fontFamily="ui-sans-serif, system-ui"
                  pointerEvents="none"
                >
                  {s.number}
                </text>
              )}
            </g>
          );
        })}
      </g>
    </svg>
  );
}
