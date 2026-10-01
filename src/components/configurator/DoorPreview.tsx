import { DoorConfig } from '@/lib/door-configurator-types';

interface Props {
  config: DoorConfig;
}

const CURTAIN_COLORS: Record<string, string> = {
  blau: '#2b5faa',
  grau: '#6b7280',
  orange: '#e8622c',
  weiss: '#e8e9eb',
  anthrazit: '#3f4448',
  verkehrsweiss: '#f2f3f4',
};

function resolveCurtainColor(config: DoorConfig): string {
  const label = config.curtainColor.toLowerCase();
  if (config.doorType === 'folie' && config.curtainMaterial === 'pvc_transparent') return '#cfe0ea';
  if (label.includes('orange')) return CURTAIN_COLORS.orange;
  if (label.includes('grau') && !label.includes('anthrazit')) return CURTAIN_COLORS.grau;
  if (label.includes('anthrazit')) return CURTAIN_COLORS.anthrazit;
  if (label.includes('weiß') || label.includes('weiss')) return CURTAIN_COLORS.weiss;
  if (label.includes('blau')) return CURTAIN_COLORS.blau;
  return CURTAIN_COLORS.blau;
}

// Layout-Konstanten für den Zeichenbereich — Ränder bewusst großzügig, damit Wickelwelle,
// Motor und Maßangabe bei jeder Tor-Proportion innerhalb des viewBox bleiben (vorher kam es
// bei sehr hohen Toren zu Überschneidungen mit dem Rahmen).
const VIEW_W = 480;
const VIEW_H = 320;
const SIDE_MARGIN = 44;
const TOP_MARGIN = 60;
const BOTTOM_MARGIN = 60;
const AVAIL_W = VIEW_W - SIDE_MARGIN * 2;
const AVAIL_H = VIEW_H - TOP_MARGIN - BOTTOM_MARGIN;
const GROUND_Y = TOP_MARGIN + AVAIL_H;

/** Schematische Darstellung — kein CAD-Modell verfügbar. Zeigt Proportion, Behangfarbe,
 * Sichtfenster, Motorposition (Antriebsausrichtung) und Boden-/Wandbefestigung live. */
export function DoorPreview({ config }: Props) {
  const { widthMm, heightMm } = config;
  const ratio = Math.min(AVAIL_W / widthMm, AVAIL_H / heightMm);
  const w = widthMm * ratio;
  const h = heightMm * ratio;
  const x = SIDE_MARGIN + (AVAIL_W - w) / 2;
  const y = GROUND_Y - h;

  const curtainColor = resolveCurtainColor(config);
  const showWindow = config.windowVariant !== 'ohne';
  const windowCount = config.windowVariant === 'zusatz' ? 2 : 1;
  const isAlu = config.doorType === 'alu';
  const isBodenbefestigung = config.mounting === 'boden';
  const railColor = config.railFinish === 'ral' ? '#475569' : '#cbd5e1';

  // Sichtfenster: bei Sondergröße die echte gewählte Abmessung (skaliert) zeigen, sonst feste
  // 500x700mm-Proportion.
  const winWmm = config.windowVariant === 'sondergroesse' ? config.customWindowWidthMm : 500;
  const winHmm = config.windowVariant === 'sondergroesse' ? config.customWindowHeightMm : 700;
  const winW = Math.min(w * 0.5, Math.max(30, winWmm * ratio));
  const winH = Math.min(h * 0.3, Math.max(24, winHmm * ratio));

  // Motor: sitzt seitlich am Ende der Wickelwelle (wie bei echten Rolltoren üblich), nicht
  // mittig. Immer sichtbar, auch ohne Motorverkleidung — die ist nur eine Abdeckung, kein
  // Ein/Aus für den Motor selbst. "nach unten" = Standard (hängt unter der Welle), "nach oben"
  // = gespiegelt (sitzt über der Welle) — entspricht der "Antrieb um 180° schwenkbar"-Kopplung
  // in der Preislogik. Mit Verkleidung = geschlossener Kasten, ohne = offene Kontur.
  const motorDown = config.driveOrientation === 'unten';
  const motorW = 30;
  const motorH = 20;
  const motorX = x + w - motorW - 8;
  const motorY = motorDown ? y - 6 : y - 26 - motorH + 6;

  return (
    <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="h-full w-full" role="img" aria-label="Schematische Tor-Vorschau">
      {/* Wickelwelle / Ballenverkleidung oben */}
      <rect x={x - 8} y={y - 26} width={w + 16} height={16} rx={6} fill="#94a3b8" />
      <text x={x + w / 2} y={y - 32} fontSize={9} fill="#64748b" textAnchor="middle">
        Ballenverkleidung
      </text>

      {/* Motor — immer sichtbar; mit Verkleidung als geschlossener Kasten, ohne als offene
          Kontur (Motorverkleidung ist nur eine Abdeckung, kein Ein/Aus für den Motor selbst). */}
      <g>
        <rect
          x={motorX}
          y={motorY}
          width={motorW}
          height={motorH}
          rx={3}
          fill={config.motorCover ? '#334155' : 'none'}
          stroke="#334155"
          strokeWidth={config.motorCover ? 0 : 1.5}
          strokeDasharray={config.motorCover ? undefined : '3 2'}
        />
        <circle cx={motorX + motorW / 2} cy={motorY + motorH / 2} r={3} fill="#64748b" />
      </g>

      {/* Führungsschienen */}
      <rect x={x - 8} y={y} width={6} height={h} fill={railColor} />
      <rect x={x + w + 2} y={y} width={6} height={h} fill={railColor} />

      {/* Befestigung: Bodenplatte bei Bodenbefestigung, Wandhalter bei Wandbefestigung */}
      {isBodenbefestigung ? (
        <g>
          <rect x={x - 16} y={GROUND_Y - 6} width={22} height={8} rx={2} fill="#64748b" />
          <rect x={x + w - 6} y={GROUND_Y - 6} width={22} height={8} rx={2} fill="#64748b" />
        </g>
      ) : (
        <g>
          <rect x={x - 20} y={y + h * 0.15} width={14} height={8} rx={2} fill="#64748b" />
          <rect x={x + w + 6} y={y + h * 0.15} width={14} height={8} rx={2} fill="#64748b" />
        </g>
      )}

      {/* Torbehang */}
      {isAlu ? (
        <g>
          {Array.from({ length: 12 }, (_, i) => {
            const lamH = h / 12;
            return (
              <rect key={i} x={x} y={y + i * lamH} width={w} height={lamH - 1.5} fill={curtainColor} stroke="#00000022" />
            );
          })}
        </g>
      ) : (
        <rect x={x} y={y} width={w} height={h} fill={curtainColor} />
      )}

      {/* Sichtfenster */}
      {showWindow &&
        Array.from({ length: windowCount }, (_, i) => {
          const gap = 10;
          const totalW = windowCount * winW + (windowCount - 1) * gap;
          const startX = x + (w - totalW) / 2 + i * (winW + gap);
          const winY = y + (h - winH) / 2;
          return (
            <rect
              key={i}
              x={startX}
              y={winY}
              width={winW}
              height={winH}
              rx={4}
              fill={config.windowFinish === 'schweisserschutz' ? '#c23b3b99' : '#e0f2fe'}
              stroke="#94a3b8"
            />
          );
        })}

      {/* Bodenlinie */}
      <line x1={SIDE_MARGIN - 24} y1={GROUND_Y} x2={VIEW_W - SIDE_MARGIN + 24} y2={GROUND_Y} stroke="#94a3b8" strokeWidth={2} />

      {/* Maße */}
      <text x={VIEW_W / 2} y={VIEW_H - 24} fontSize={12} fill="#334155" textAnchor="middle">
        {widthMm} × {heightMm} mm
      </text>
      <text x={VIEW_W / 2} y={VIEW_H - 9} fontSize={10} fill="#94a3b8" textAnchor="middle">
        {isAlu ? 'Aluminium-Lamellentor' : 'Folien-Schnelllauftor'} · schematisch
      </text>
    </svg>
  );
}
