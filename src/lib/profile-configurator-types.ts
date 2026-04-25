// ---------------------------------------------------------------------------
// Shared types for the Aluminium Profile Configurator
// ---------------------------------------------------------------------------

export interface ProfileSection {
  id: string;
  label: string;
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

export const PROFILE_SECTIONS: ProfileSection[] = [
  {
    id: '40x40',
    label: '40 × 40 mm (leicht)',
    w: 40, h: 40,
    slotWidth: 8, slotDepth: 6, cornerR: 2.5, webThickness: 3.5,
    pricePerMeter: 8.90,
  },
  {
    id: '40x80',
    label: '40 × 80 mm',
    w: 40, h: 80,
    slotWidth: 8, slotDepth: 6, cornerR: 2.5, webThickness: 3.5,
    pricePerMeter: 14.20,
  },
  {
    id: '80x80',
    label: '80 × 80 mm',
    w: 80, h: 80,
    slotWidth: 10, slotDepth: 8, cornerR: 3.5, webThickness: 5,
    pricePerMeter: 22.40,
  },
  {
    id: '80x160',
    label: '80 × 160 mm',
    w: 80, h: 160,
    slotWidth: 10, slotDepth: 8, cornerR: 3.5, webThickness: 5,
    pricePerMeter: 38.50,
  },
  {
    id: '45x45',
    label: '45 × 45 mm',
    w: 45, h: 45,
    slotWidth: 9, slotDepth: 7, cornerR: 3, webThickness: 4,
    pricePerMeter: 10.60,
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
