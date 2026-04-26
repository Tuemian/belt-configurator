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
  /** Aktuelle Auswahl (interne Slot-ID + Spurindex) */
  activeSlot: SlotId;
  activeModuleIndex?: number;
  onSelectSlot: (slot: SlotId, moduleIndex: number) => void;
  size?: number; // px
  /** Beschriftung anzeigen (rote Nutnummern, blaue Kernzug-Nummern) */
  showLabels?: boolean;
}

/**
 * Querschnitt analog Alvaris-Profilbearbeitungscode:
 *  – Nuten werden im Uhrzeigersinn fortlaufend rot nummeriert (1..n)
 *  – Kernzüge (Mittelbohrungen) tragen blaue Zahlen in Kreisen
 *  – jede einzelne Nut ist klickbar
 */
export function ProfileCrossSection2D({
  section,
  activeSlot,
  activeModuleIndex = 0,
  onSelectSlot,
  size = 96,
  showLabels = true,
}: Props) {
  const { w, h, slotWidth, slotDepth, cornerR, boreRadius } = section;
  const MODULE = getModulePitch(section);
  const counts = getSlotCounts(section);
  const bores = getBoreCounts(section);

  const PAD = 10;
  const VB_W = w + PAD * 2;
  const VB_H = h + PAD * 2;

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

  // Schriftgröße proportional zum Profil
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

  // A = oben (links → rechts)
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
  // B = rechts (oben → unten)
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
  // C = unten (rechts → links)
  for (let i = 0; i < counts.C; i++) {
    const cx = PAD + MODULE * (i + 0.5);
    slots.push({
      slot: 'C', moduleIndex: i,
      number: getSlotNumber(section, 'C', i),
      rect: { x: cx - slotWidth / 2, y: PAD + h - slotDepth, w: slotWidth, h: slotDepth },
      label: { x: cx, y: PAD + h - slotDepth - fs * 0.4 },
      hit: { x: cx - MODULE / 2, y: PAD + h - slotDepth - fs * 0.4, w: MODULE, h: HIT + slotDepth + fs * 0.6 },
    });
  }
  // D = links (unten → oben)
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

      {/* Profilkörper */}
      <path d={outer} fill={`url(#alu-${section.id})`} stroke="#475569" strokeWidth="0.5" />

      {/* Kernzüge (Mittelbohrungen) mit blauen Nummern in Kreisen */}
      {Array.from({ length: bores.x }).map((_, ix) =>
        Array.from({ length: bores.y }).map((_, iy) => {
          const cx = PAD + MODULE * (ix + 0.5);
          const cy = PAD + MODULE * (iy + 0.5);
          const num = getBoreNumber(section, ix, iy);
          const lblR = Math.max(boreRadius, boreFs * 0.95);
          return (
            <g key={`bore-${ix}-${iy}`}>
              <circle cx={cx} cy={cy} r={boreRadius} fill="#f1f5f9" stroke="#94a3b8" strokeWidth="0.3" />
              {showLabels && (
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
            </g>
          );
        }),
      )}

      {/* Nut-Öffnungen */}
      {slots.map((s, i) => {
        const isActive = s.slot === activeSlot && s.moduleIndex === activeModuleIndex;
        return (
          <rect
            key={`slot-${i}`}
            x={s.rect.x}
            y={s.rect.y}
            width={s.rect.w}
            height={s.rect.h}
            fill={isActive ? 'hsl(var(--primary))' : '#475569'}
            opacity={isActive ? 0.95 : 0.6}
          />
        );
      })}

      {/* Klick-Hitboxen + rote Nut-Nummern */}
      {slots.map((s) => {
        const isActive = s.slot === activeSlot && s.moduleIndex === activeModuleIndex;
        return (
          <g
            key={`hit-${s.slot}-${s.moduleIndex}`}
            onClick={(e) => { e.stopPropagation(); onSelectSlot(s.slot, s.moduleIndex); }}
            style={{ cursor: 'pointer' }}
          >
            <rect
              x={s.hit.x}
              y={s.hit.y}
              width={s.hit.w}
              height={s.hit.h}
              fill={isActive ? 'hsl(var(--primary))' : 'transparent'}
              opacity={isActive ? 0.1 : 0}
            />
            {showLabels && (
              <text
                x={s.label.x}
                y={s.label.y}
                textAnchor="middle"
                fontSize={fs}
                fontWeight="700"
                fill={isActive ? 'hsl(var(--primary))' : '#dc2626'}
                fontFamily="ui-sans-serif, system-ui"
                pointerEvents="none"
              >
                {s.number}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
