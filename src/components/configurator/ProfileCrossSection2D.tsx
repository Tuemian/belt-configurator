import {
  getModulePitch,
  getSlotCounts,
  getSlotNumber,
  getSlotXPositions,
  getBoreCounts,
  getBorePositions,
  type ProfileSection,
  type SlotId,
} from '@/lib/profile-configurator-types';
import { roundedRectPath, tSlotPathDown, tSlotPathUp, tSlotPathHorizontal, getCellStruts, getAlvarisImage, ALVARIS_PAD_MM } from '@/lib/profile-cross-section-shapes';

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
  /** Keine Nut als "aktiv" markieren, auch wenn sie zufällig activeSlot/activeModuleIndex entspricht
   *  (für Kontexte wie das Stirnseiten-Panel, wo activeSlot nur ein Pflicht-Prop ohne Bedeutung ist). */
  noSlotHighlight?: boolean;
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
  noSlotHighlight = false,
}: Props) {
  const { w, h, slotWidth, slotDepth, grooveWidth, cornerR, boreRadius, webThickness = 3 } = section;
  const MODULE = getModulePitch(section);
  const counts = getSlotCounts(section);
  const bores = getBoreCounts(section);
  // Reale Kernzug-Positionen (mm) — nutzt ein Layout-Override für Profile, deren Bohrbild
  // nicht dem generischen Modulraster entspricht (s. getBorePositions), sonst das Raster.
  const borePositions = getBorePositions(section);
  // 1:1-Referenzbild aus dem Alvaris-Profilbearbeitungscode-Blatt (falls vorhanden) statt
  // der schematischen Zeichnung. Dessen Rand (ALVARIS_PAD_MM) ersetzt die alte feste
  // Konstante, damit Bild und mm-basierte Hitbox-/Label-Geometrie exakt übereinstimmen.
  const alvarisImage = getAlvarisImage(section.sizeKey, section.nut ?? 'A8');
  const PAD = alvarisImage ? ALVARIS_PAD_MM : 14;
  // Bildbreite/-höhe (Bild + sein eigener dünner Rand) — die Nut-/Kernzug-Positionsformeln
  // unten (PAD + …) sind darauf kalibriert und bleiben unverändert.
  const IMG_W = w + PAD * 2;
  const IMG_H = h + PAD * 2;
  // Referenzbilder haben nur einen sehr schmalen Rand (ALVARIS_PAD_MM ≈ 2,3mm) — zu wenig,
  // um die Nutnummern außerhalb des Profils zu platzieren. LABEL_MARGIN schafft dafür extra
  // Platz rundherum, ohne die Bild-/Hitbox-Kalibrierung anzufassen (separater Wrapper-Offset).
  const LABEL_MARGIN = alvarisImage ? 8 : 0;
  const VB_W = IMG_W + LABEL_MARGIN * 2;
  const VB_H = IMG_H + LABEL_MARGIN * 2;

  const isSelected = (s: SlotId, mi: number): boolean => {
    if (noSlotHighlight) return false;
    if (selectedKeys && selectedKeys.size > 0) return selectedKeys.has(slotKey(s, mi));
    return s === activeSlot && mi === activeModuleIndex;
  };

  const outer = roundedRectPath(PAD, PAD, w, h, cornerR);
  // Hohle Wandung (wie beim Durchbiegungsrechner): Innenkontur per evenodd vom
  // Außenpfad abgezogen, damit die Mitte als Hohlraum statt Vollmaterial wirkt.
  const wall = Math.min(webThickness, Math.min(w, h) / 2 - 1);
  const inner = roundedRectPath(PAD + wall, PAD + wall, w - wall * 2, h - wall * 2, Math.max(0, cornerR - wall));
  // Innere Verstrebungen: echte Strangpressprofile sind nicht hohl, sondern haben Stege
  // von den Kernbohrungen zu den Modulzellen-Ecken (vgl. Alvaris-Referenzzeichnung).
  const struts = getCellStruts(w, h, bores.x, bores.y);
  const strutWidth = Math.max(0.8, wall * 0.55);

  const fs = Math.max(2.4, Math.min(5, MODULE / 8));
  const boreFs = Math.max(2.2, Math.min(4.5, boreRadius * 1.1));

  type SlotEntry = {
    slot: SlotId;
    moduleIndex: number;
    number: number;
    slotPath: string;
    label: { x: number; y: number };
    hit: { x: number; y: number; w: number; h: number };
  };
  const HIT = 5;
  const slots: SlotEntry[] = [];

  // Bei Referenzbild sitzen die Nutnummern außerhalb des Profils (im LABEL_MARGIN-Rand) statt
  // auf Basis der (beim echten Bild nicht mehr zutreffenden) Schema-Nuttiefe — sonst landen sie
  // je nach tatsächlicher Nuttiefe im Bild mitten auf der Zeichnung statt sauber daneben.
  const labelOutside = !!alvarisImage;
  // Nut-Mittelpunkte je Seite — nutzt ein Positions-Override für Profile, deren reales
  // Bohrbild nicht dem generischen Gleichverteilungsraster entspricht (s. getSlotXPositions),
  // sonst tatsächliche Breite/Höhe geteilt durch die Nutanzahl (NICHT das feste Rastermaß
  // MODULE — bei Profilen, deren Höhe/Breite kein Vielfaches des Rastermaßes ist, würde
  // MODULE die Position sonst außerhalb der Zeichnung schieben, derselbe Fehler wie bei
  // den Kernzügen).
  const xPositionsA = getSlotXPositions(section, 'A');
  const yPositionsB = getSlotXPositions(section, 'B');
  const xPositionsC = getSlotXPositions(section, 'C');
  const yPositionsD = getSlotXPositions(section, 'D');
  const cellW = w / counts.A;
  const cellH = h / Math.max(1, counts.B);
  xPositionsA.forEach((x, i) => {
    const cx = PAD + x;
    slots.push({
      slot: 'A', moduleIndex: i,
      number: getSlotNumber(section, 'A', i),
      slotPath: tSlotPathDown(cx, PAD, slotWidth, grooveWidth, slotDepth),
      label: { x: cx, y: labelOutside ? -2.5 : PAD + slotDepth + fs * 0.9 },
      hit: { x: cx - cellW / 2, y: PAD - HIT, w: cellW, h: HIT + slotDepth + fs * 1.4 },
    });
  });
  yPositionsB.forEach((y, j) => {
    const cy = PAD + y;
    slots.push({
      slot: 'B', moduleIndex: j,
      number: getSlotNumber(section, 'B', j),
      slotPath: tSlotPathHorizontal(cy, PAD + w, slotWidth, grooveWidth, slotDepth, true),
      label: { x: labelOutside ? IMG_W + 2 + fs * 0.8 : PAD + w - slotDepth - fs * 0.7, y: cy + fs * 0.35 },
      hit: { x: PAD + w - slotDepth - fs * 1.4, y: cy - cellH / 2, w: HIT + slotDepth + fs * 1.4, h: cellH },
    });
  });
  xPositionsC.forEach((x, i) => {
    const cx = PAD + x;
    slots.push({
      slot: 'C', moduleIndex: i,
      number: getSlotNumber(section, 'C', i),
      slotPath: tSlotPathUp(cx, PAD + h, slotWidth, grooveWidth, slotDepth),
      label: { x: cx, y: labelOutside ? IMG_H + fs * 1.0 + 1 : PAD + h - slotDepth - fs * 0.4 },
      hit: { x: cx - cellW / 2, y: PAD + h - slotDepth - fs * 0.4, w: cellW, h: HIT + slotDepth + fs * 0.6 },
    });
  });
  yPositionsD.forEach((y, j) => {
    const cy = PAD + y;
    slots.push({
      slot: 'D', moduleIndex: j,
      number: getSlotNumber(section, 'D', j),
      slotPath: tSlotPathHorizontal(cy, PAD, slotWidth, grooveWidth, slotDepth, false),
      label: { x: labelOutside ? -2 - fs * 0.8 : PAD + slotDepth + fs * 0.7, y: cy + fs * 0.35 },
      hit: { x: PAD - HIT, y: cy - cellH / 2, w: HIT + slotDepth + fs * 1.4, h: cellH },
    });
  });

  // Effektive Größe nach optionaler 90°-Rotation
  const dispW = rotate90 ? size * (VB_H / VB_W) : size;
  const dispH = rotate90 ? size : size * (VB_H / VB_W);

  // Bei rotate90 drehen wir den Inhalt (VB_W×VB_H) im Uhrzeigersinn in die neue
  // Viewbox (VB_H×VB_W): erst um den Ursprung drehen, dann um VB_H nach rechts
  // schieben. Funktioniert unabhängig vom Seitenverhältnis (kein Clipping bei
  // nicht-quadratischen Profilen).
  const innerTransform = rotate90 ? `translate(${VB_H} 0) rotate(90)` : undefined;

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
          <stop offset="0%" stopColor="#f1f5f9" />
          <stop offset="45%" stopColor="#cbd5e1" />
          <stop offset="100%" stopColor="#94a3b8" />
        </linearGradient>
        <radialGradient id={`slot-shadow-${section.id}`} cx="35%" cy="35%" r="75%">
          <stop offset="0%" stopColor="#64748b" />
          <stop offset="100%" stopColor="#334155" />
        </radialGradient>
      </defs>

      <g transform={innerTransform}>
      <g transform={`translate(${LABEL_MARGIN}, ${LABEL_MARGIN})`}>
        {alvarisImage ? (
          alvarisImage.rotated ? (
            // Alvaris zeichnet diese Größe im Querformat; wir drehen nur das Bild um 90°,
            // die Hitbox-/Label-Geometrie ist bereits korrekt im Hochformat berechnet.
            <g transform={`translate(${IMG_W}, 0) rotate(90)`}>
              <image href={alvarisImage.path} x="0" y="0" width={IMG_H} height={IMG_W} preserveAspectRatio="none" />
            </g>
          ) : (
            <image href={alvarisImage.path} x="0" y="0" width={IMG_W} height={IMG_H} preserveAspectRatio="none" />
          )
        ) : (
          <>
            {/* Fallback-Schema, falls kein Alvaris-Referenzbild vorliegt: Hohler Ring + Stege */}
            <path d={`${outer} ${inner}`} fillRule="evenodd" fill={`url(#alu-${section.id})`} stroke="#475569" strokeWidth="0.5" />
            <path d={outer} fill="none" stroke="#ffffff" strokeOpacity="0.5" strokeWidth="0.4" />
            {struts.map((s, i) => (
              <line
                key={`strut-${i}`}
                x1={PAD + s.x1} y1={PAD + s.y1}
                x2={PAD + s.x2} y2={PAD + s.y2}
                stroke={`url(#alu-${section.id})`}
                strokeWidth={strutWidth}
                strokeLinecap="round"
              />
            ))}
          </>
        )}

        {/* Kernzüge */}
        {borePositions.map((pos) => {
          const cx = PAD + pos.x;
          const cy = PAD + pos.y;
          const num = pos.number;
          const lblR = Math.max(boreRadius, boreFs * 0.95);
          const isActiveBore = activeBores?.has(num);
          const clickable = !!onSelectBore;
          return (
            <g
              key={`bore-${num}`}
              onClick={clickable ? (e) => { e.stopPropagation(); onSelectBore!(num); } : undefined}
              style={{ cursor: clickable ? 'pointer' : 'default' }}
            >
              {/* Bei Referenzbild ist die Bohrung schon im Bild sichtbar — nur unsichtbare Klickfläche */}
              <circle cx={cx} cy={cy} r={boreRadius} fill={alvarisImage ? 'transparent' : '#f1f5f9'} stroke={alvarisImage ? 'none' : '#94a3b8'} strokeWidth={0.3} />
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
        })}

        {/* Nut-Öffnungen: bei Referenzbild nur Auswahl-Hervorhebung (Textur kommt vom Bild) */}
        {slots.map((s, i) => {
          const sel = isSelected(s.slot, s.moduleIndex);
          if (alvarisImage && !sel) return null;
          return (
            <path
              key={`slot-${i}`}
              d={s.slotPath}
              fill={sel ? 'hsl(var(--primary))' : `url(#slot-shadow-${section.id})`}
              opacity={sel ? 0.55 : 0.92}
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

        {/* Seiten-Kürzel A/B/C/D außen */}
        {showSideLabels && (() => {
          const sfs = Math.max(3.5, Math.min(7, MODULE / 5));
          const off = sfs * 0.6;
          const sides: { txt: string; x: number; y: number; anchor: 'middle' | 'start' | 'end' }[] = [
            { txt: 'A', x: PAD + w / 2, y: PAD - off, anchor: 'middle' },
            { txt: 'B', x: PAD + w + off + sfs * 0.5, y: PAD + h / 2 + sfs * 0.35, anchor: 'middle' },
            { txt: 'C', x: PAD + w / 2, y: PAD + h + off + sfs * 0.9, anchor: 'middle' },
            { txt: 'D', x: PAD - off - sfs * 0.5, y: PAD + h / 2 + sfs * 0.35, anchor: 'middle' },
          ];
          return sides.map((s) => (
            <text
              key={`side-${s.txt}`}
              x={s.x}
              y={s.y}
              textAnchor={s.anchor}
              fontSize={sfs}
              fontWeight="800"
              fill="#0f172a"
              fontFamily="ui-sans-serif, system-ui"
              pointerEvents="none"
            >
              {s.txt}
            </text>
          ));
        })()}
      </g>
      </g>
    </svg>
  );
}
