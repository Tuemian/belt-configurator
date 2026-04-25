// ---------------------------------------------------------------------------
// Shared types for the Aluminium Profile Configurator
// ---------------------------------------------------------------------------

export type ProfileVariantKey = 'eco' | 'leicht' | 'schwer';

export interface ProfileSize {
  key: string;             // e.g. '40x40'
  label: string;           // e.g. '40 × 40 mm'
  w: number;
  h: number;
  variants: ProfileVariantKey[];
}

export interface ProfileSection {
  id: string;
  label: string;           // full label e.g. '40 × 40 · Leicht'
  sizeKey: string;         // references ProfileSize.key
  variant: ProfileVariantKey;
  w: number;           // width in mm
  h: number;           // height in mm
  slotWidth: number;   // T-slot opening width mm
  slotDepth: number;   // T-slot depth mm
  cornerR: number;     // outer corner radius mm
  webThickness: number;// wall/web thickness mm
  pricePerMeter: number; // EUR / m
}

export interface ProfileHole {
  id: string;
  zPosition: number;  // mm from start
  diameter: number;   // mm (5.5 = D5.5, 8.5 = D8.5)
  face: 'top' | 'bottom' | 'left' | 'right';
  type: 'd55' | 'd85' | 'm8-thread' | 'core-m8';
  label: string;
}

export interface EndTreatment {
  thread: boolean;    // M8 Gewinde
  coreHole: boolean;  // Kernloch M8
}

export interface ProfileConfig {
  sectionId: string;
  length: number;       // mm, 50–3000
  angleStart: number;   // degrees 0–45
  angleEnd: number;     // degrees 0–45
  endStart: EndTreatment;
  endEnd: EndTreatment;
  holes: ProfileHole[];
  quantity: number;
}

// ---------------------------------------------------------------------------
// Catalogue
// ---------------------------------------------------------------------------

/** Available sizes (for the size-picker step) */
export const PROFILE_SIZES: ProfileSize[] = [
  { key: '40x40',  label: '40 × 40',  w: 40,  h: 40,  variants: ['eco', 'leicht', 'schwer'] },
  { key: '40x80',  label: '40 × 80',  w: 40,  h: 80,  variants: ['eco', 'leicht', 'schwer'] },
  { key: '80x80',  label: '80 × 80',  w: 80,  h: 80,  variants: ['leicht', 'schwer'] },
  { key: '80x160', label: '80 × 160', w: 80,  h: 160, variants: ['leicht', 'schwer'] },
];

/** All concrete section variants */
export const PROFILE_SECTIONS: ProfileSection[] = [
  // ─── 40 × 40 ────────────────────────────────────────────────────────────
  {
    id: '40x40-eco',    sizeKey: '40x40',  variant: 'eco',
    label: '40 × 40 · ECO',
    w: 40, h: 40, slotWidth: 6,  slotDepth: 5,   cornerR: 1.5, webThickness: 2,   pricePerMeter: 6.20,
  },
  {
    id: '40x40-leicht', sizeKey: '40x40',  variant: 'leicht',
    label: '40 × 40 · Leicht',
    w: 40, h: 40, slotWidth: 8,  slotDepth: 6,   cornerR: 2.5, webThickness: 3.5, pricePerMeter: 8.90,
  },
  {
    id: '40x40-schwer', sizeKey: '40x40',  variant: 'schwer',
    label: '40 × 40 · Schwer',
    w: 40, h: 40, slotWidth: 8,  slotDepth: 7,   cornerR: 3,   webThickness: 5,   pricePerMeter: 12.40,
  },
  // ─── 40 × 80 ────────────────────────────────────────────────────────────
  {
    id: '40x80-eco',    sizeKey: '40x80',  variant: 'eco',
    label: '40 × 80 · ECO',
    w: 40, h: 80, slotWidth: 8,  slotDepth: 6,   cornerR: 2.5, webThickness: 3,   pricePerMeter: 11.50,
  },
  {
    id: '40x80-leicht', sizeKey: '40x80',  variant: 'leicht',
    label: '40 × 80 · Leicht',
    w: 40, h: 80, slotWidth: 8,  slotDepth: 6,   cornerR: 2.5, webThickness: 3.5, pricePerMeter: 14.20,
  },
  {
    id: '40x80-schwer', sizeKey: '40x80',  variant: 'schwer',
    label: '40 × 80 · Schwer',
    w: 40, h: 80, slotWidth: 8,  slotDepth: 7.5, cornerR: 3,   webThickness: 5,   pricePerMeter: 19.80,
  },
  // ─── 80 × 80 ────────────────────────────────────────────────────────────
  {
    id: '80x80-leicht', sizeKey: '80x80',  variant: 'leicht',
    label: '80 × 80 · Leicht',
    w: 80, h: 80, slotWidth: 10, slotDepth: 8,   cornerR: 3.5, webThickness: 4,   pricePerMeter: 22.40,
  },
  {
    id: '80x80-schwer', sizeKey: '80x80',  variant: 'schwer',
    label: '80 × 80 · Schwer',
    w: 80, h: 80, slotWidth: 10, slotDepth: 9,   cornerR: 4,   webThickness: 6,   pricePerMeter: 32.50,
  },
  // ─── 80 × 160 ───────────────────────────────────────────────────────────
  {
    id: '80x160-leicht', sizeKey: '80x160', variant: 'leicht',
    label: '80 × 160 · Leicht',
    w: 80, h: 160, slotWidth: 10, slotDepth: 8, cornerR: 3.5, webThickness: 4,   pricePerMeter: 38.50,
  },
  {
    id: '80x160-schwer', sizeKey: '80x160', variant: 'schwer',
    label: '80 × 160 · Schwer',
    w: 80, h: 160, slotWidth: 10, slotDepth: 9, cornerR: 4,   webThickness: 6,   pricePerMeter: 56.00,
  },
];

export const HOLE_TYPES = [
  { id: 'd55',      label: 'D5,5 mm (Standardbohrung)',  diameter: 5.5 },
  { id: 'd85',      label: 'D8,5 mm (Verbinderbohrung)', diameter: 8.5 },
  { id: 'core-m8',  label: 'Kernloch M8 (Ø6,8)',          diameter: 6.8 },
  { id: 'm8-thread',label: 'Gewinde M8',                  diameter: 8   },
] as const;

// ---------------------------------------------------------------------------
// Pricing
// ---------------------------------------------------------------------------

export const PRICE_MITER_CUT = 4.50;   // per miter cut (angle ≠ 0)
export const PRICE_HOLE = 1.80;         // per hole / treatment

export function calculateProfilePrice(config: ProfileConfig): {
  material: number;
  miterCuts: number;
  holes: number;
  total: number;
} {
  const section = PROFILE_SECTIONS.find((s) => s.id === config.sectionId)!;
  const material = (config.length / 1000) * section.pricePerMeter * config.quantity;
  const cuts =
    (config.angleStart !== 0 ? 1 : 0) + (config.angleEnd !== 0 ? 1 : 0);
  const treatments =
    (config.endStart.thread ? 1 : 0) +
    (config.endStart.coreHole ? 1 : 0) +
    (config.endEnd.thread ? 1 : 0) +
    (config.endEnd.coreHole ? 1 : 0);
  const miterCuts = cuts * PRICE_MITER_CUT * config.quantity;
  const holes = (config.holes.length + treatments) * PRICE_HOLE * config.quantity;
  return {
    material: +material.toFixed(2),
    miterCuts: +miterCuts.toFixed(2),
    holes: +holes.toFixed(2),
    total: +(material + miterCuts + holes).toFixed(2),
  };
}
