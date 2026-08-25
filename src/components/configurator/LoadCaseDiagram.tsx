import type { LoadCase } from '@/lib/deflection-calculator';

interface Props {
  loadCase: LoadCase;
  className?: string;
  /** Position der Einzellast als Anteil der Spannweite (0..1). Ohne Wirkung bei Streckenlast. */
  positionRatio?: number;
  /** Durchgebogene Kontur zusätzlich zur Lagerung/Last zeichnen (nicht maßstäblich, nur zur Anschauung). */
  deflected?: boolean;
  /** Beschriftung an der tiefsten Stelle der Biegelinie, z. B. "2.81 mm". */
  deflectionLabel?: string;
}

const BEAM_X1 = 30;
const BEAM_X2 = 210;
const BEAM_Y = 50;
const WALL_X = 26;

function DownArrow({ x, yTop, yTip }: { x: number; yTop: number; yTip: number }) {
  return (
    <g stroke="currentColor" strokeWidth="2" fill="currentColor">
      <line x1={x} y1={yTop} x2={x} y2={yTip} />
      <polygon points={`${x - 4},${yTip - 6} ${x + 4},${yTip - 6} ${x},${yTip}`} />
    </g>
  );
}

function SupportTriangle({ x }: { x: number }) {
  return (
    <g stroke="currentColor" strokeWidth="2" fill="none">
      <polygon points={`${x},52 ${x - 9},68 ${x + 9},68`} />
      <line x1={x - 14} y1="68" x2={x + 14} y2="68" />
      <line x1={x - 10} y1="74" x2={x - 15} y2="80" />
      <line x1={x - 2} y1="74" x2={x - 7} y2="80" />
      <line x1={x + 6} y1="74" x2={x + 1} y2="80" />
      <line x1={x + 14} y1="74" x2={x + 9} y2="80" />
    </g>
  );
}

/** Schematisches Balkendiagramm: Lagerung + Lastangriff (+ optional Biegelinie) für den gewählten Lastfall. */
export function LoadCaseDiagram({ loadCase, className, positionRatio, deflected = false, deflectionLabel }: Props) {
  const ratio = Math.min(Math.max(positionRatio ?? (loadCase === 'point-cantilever' ? 1 : 0.5), 0), 1);
  const SAG = 16;

  let loadX = (BEAM_X1 + BEAM_X2) / 2;
  if (loadCase === 'point-simple') loadX = BEAM_X1 + ratio * (BEAM_X2 - BEAM_X1);
  if (loadCase === 'point-cantilever') loadX = WALL_X + ratio * (BEAM_X2 - WALL_X);

  let sagPath = '';
  if (deflected && loadCase === 'point-simple') {
    sagPath = `M ${BEAM_X1} ${BEAM_Y} Q ${(BEAM_X1 + loadX) / 2} ${BEAM_Y + SAG * 0.9} ${loadX} ${BEAM_Y + SAG} Q ${(loadX + BEAM_X2) / 2} ${BEAM_Y + SAG * 0.9} ${BEAM_X2} ${BEAM_Y}`;
  } else if (deflected && loadCase === 'udl-simple') {
    sagPath = `M ${BEAM_X1} ${BEAM_Y} Q ${(BEAM_X1 + BEAM_X2) / 2} ${BEAM_Y + SAG} ${BEAM_X2} ${BEAM_Y}`;
  } else if (deflected && loadCase === 'point-cantilever') {
    const tailY = BEAM_Y + SAG * (0.55 + 0.45 * ratio);
    sagPath = `M ${WALL_X} ${BEAM_Y} Q ${(WALL_X + loadX) / 2} ${BEAM_Y + SAG * 0.5 * ratio} ${loadX} ${BEAM_Y + SAG * ratio} L ${BEAM_X2} ${tailY}`;
  }

  return (
    <svg viewBox="0 0 240 100" className={className} aria-hidden="true">
      {loadCase === 'point-cantilever' ? (
        <g stroke="currentColor" strokeWidth="2" fill="none">
          {/* Einspannung links */}
          <line x1={WALL_X} y1="18" x2={WALL_X} y2="82" strokeWidth="3" />
          {[24, 32, 40, 48, 56, 64, 72].map((y) => (
            <line key={y} x1="18" y1={y} x2={WALL_X} y2={y + 8} />
          ))}
          <line x1={BEAM_X1 - 4} y1={BEAM_Y} x2={BEAM_X2} y2={BEAM_Y} strokeWidth="3" opacity={deflected ? 0.35 : 1} />
        </g>
      ) : (
        <>
          <line x1={BEAM_X1} y1={BEAM_Y} x2={BEAM_X2} y2={BEAM_Y} stroke="currentColor" strokeWidth="3" opacity={deflected ? 0.35 : 1} />
          <SupportTriangle x={BEAM_X1} />
          <SupportTriangle x={BEAM_X2} />
        </>
      )}

      {sagPath && <path d={sagPath} fill="none" stroke="currentColor" strokeWidth="2.5" strokeDasharray="0" opacity="0.9" />}

      {loadCase === 'point-simple' && <DownArrow x={loadX} yTop={14} yTip={BEAM_Y - 2} />}
      {loadCase === 'point-cantilever' && <DownArrow x={loadX} yTop={14} yTip={BEAM_Y - 2} />}

      {loadCase === 'udl-simple' && (
        <>
          <line x1={BEAM_X1 + 8} y1="20" x2={BEAM_X2 - 8} y2="20" stroke="currentColor" strokeWidth="1.5" />
          {[BEAM_X1 + 8, BEAM_X1 + 44, BEAM_X1 + 80, BEAM_X1 + 116, BEAM_X1 + 152, BEAM_X2 - 8].map((x) => (
            <DownArrow key={x} x={x} yTop={20} yTip={BEAM_Y - 2} />
          ))}
        </>
      )}

      {deflected && deflectionLabel && (
        <text x={loadCase === 'udl-simple' ? (BEAM_X1 + BEAM_X2) / 2 : loadX} y={BEAM_Y + SAG + 14} textAnchor="middle" fontSize="11" fontWeight="700" fill="currentColor">
          {deflectionLabel}
        </text>
      )}
    </svg>
  );
}
