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

/** Einfache schematische Darstellung — kein CAD-Modell verfügbar, nur Seitenverhältnis/Farbe/Sichtfenster live. */
export function DoorPreview({ config }: Props) {
  const { widthMm, heightMm } = config;
  const padding = 30;
  const maxW = 340;
  const maxH = 300;
  const ratio = Math.min(maxW / widthMm, maxH / heightMm);
  const w = widthMm * ratio;
  const h = heightMm * ratio;
  const x = (maxW - w) / 2 + padding / 2;
  const y = maxH - h + padding / 2;

  const curtainColor = resolveCurtainColor(config);
  const showWindow = config.windowVariant !== 'ohne';
  const windowCount = config.windowVariant === 'zusatz' ? 2 : 1;
  const isAlu = config.doorType === 'alu';

  const viewW = maxW + padding;
  const viewH = maxH + padding + 40;

  return (
    <svg viewBox={`0 0 ${viewW} ${viewH}`} className="h-full w-full" role="img" aria-label="Schematische Tor-Vorschau">
      <rect x={0} y={0} width={viewW} height={viewH} fill="none" />

      {/* Wickelwelle / Ballenverkleidung oben */}
      <rect x={x - 6} y={y - 22} width={w + 12} height={16} rx={6} fill="#94a3b8" />
      <text x={x + (w + 12) / 2 - 6} y={y - 26} fontSize={9} fill="#64748b" textAnchor="middle">
        Ballenverkleidung
      </text>

      {/* Führungsschienen */}
      <rect x={x - 6} y={y} width={6} height={h} fill={config.railFinish === 'ral' ? '#475569' : '#cbd5e1'} />
      <rect x={x + w} y={y} width={6} height={h} fill={config.railFinish === 'ral' ? '#475569' : '#cbd5e1'} />

      {/* Torbehang */}
      {isAlu ? (
        <g>
          {Array.from({ length: 12 }, (_, i) => {
            const lamH = h / 12;
            return (
              <rect
                key={i}
                x={x}
                y={y + i * lamH}
                width={w}
                height={lamH - 1.5}
                fill={curtainColor}
                stroke="#00000022"
              />
            );
          })}
        </g>
      ) : (
        <rect x={x} y={y} width={w} height={h} fill={curtainColor} />
      )}

      {/* Sichtfenster */}
      {showWindow &&
        Array.from({ length: windowCount }, (_, i) => {
          const winW = Math.min(w * 0.45, 90);
          const winH = Math.min(h * 0.22, 70);
          const gap = 10;
          const totalW = windowCount * winW + (windowCount - 1) * gap;
          const startX = x + (w - totalW) / 2 + i * (winW + gap);
          const winY = y + h * 0.35;
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
      <line x1={x - 20} y1={y + h} x2={x + w + 20} y2={y + h} stroke="#94a3b8" strokeWidth={2} />

      {/* Maße */}
      <text x={x + w / 2} y={viewH - 22} fontSize={11} fill="#334155" textAnchor="middle">
        {widthMm} × {heightMm} mm
      </text>
      <text x={x + w / 2} y={viewH - 8} fontSize={9} fill="#94a3b8" textAnchor="middle">
        {isAlu ? 'Aluminium-Lamellentor' : 'Folien-Schnelllauftor'} · schematisch
      </text>
    </svg>
  );
}
