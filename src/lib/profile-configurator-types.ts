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
  slotWidth: number;    // T-slot opening width mm (4.5 for Profil 8)
  slotDepth: number;    // total slot depth mm (8 for Profil 8)
  grooveWidth: number;  // T-slot inner width mm (12.25 for Profil 8)
  cornerR: number;      // outer corner radius mm (R4 for Profil 8)
  boreRadius: number;   // center bore radius mm (3.4 = Ø6.8 for Profil 8)
  webThickness: number; // inner wall/web thickness mm (varies by variant)
  pricePerMeter: number; // EUR / m
}

export interface ProfileHole {
  id: string;
  zPosition: number;  // mm from start
  diameter: number;   // mm (5.5 = D5.5, 8.5 = D8.5)
  face: 'top' | 'bottom' | 'left' | 'right';
  type: 'd55' | 'd85' | 'core-m6' | 'core-m8' | 'm6-thread' | 'm8-thread' | 'step-m6' | 'step-m8';
  label: string;
}

export type ConnectorType = 'tnut-m6' | 'tnut-m8' | 'angle-8' | 'auto-connector-8';

export interface ProfileConnector {
  id: string;
  type: ConnectorType;
  zPosition: number;  // mm from start
  face: 'top' | 'bottom' | 'left' | 'right';
  module: number;     // 0-based index of T-slot on that face
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
  connectors: ProfileConnector[];
  quantity: number;
}

// ---------------------------------------------------------------------------
// Catalogue
// ---------------------------------------------------------------------------

/** Available sizes (for the size-picker step) */
export const PROFILE_SIZES: ProfileSize[] = [
  { key: '40x40',  label: '40 × 40',  w: 40, h: 40,  variants: ['eco', 'leicht', 'schwer'] },
  { key: '80x40',  label: '80 × 40',  w: 80, h: 40,  variants: ['eco', 'leicht', 'schwer'] },
  { key: '80x80',  label: '80 × 80',  w: 80, h: 80,  variants: ['leicht', 'schwer'] },
  { key: '80x160', label: '80 × 160', w: 80, h: 160, variants: ['leicht', 'schwer'] },
];

// All Profil 8 sections share the same slot geometry (Nut 8 system):
// slotWidth=4.5 mm, slotDepth=8 mm, grooveWidth=12.25 mm, cornerR=R4, boreRadius=3.4 (Ø6.8)
// Only webThickness differs between ECO / Leicht / Standard variants.
/** All concrete section variants */
export const PROFILE_SECTIONS: ProfileSection[] = [
  // ─── 40 × 40 (Nut 8) ────────────────────────────────────────────────────
  {
    id: '40x40-eco',    sizeKey: '40x40', variant: 'eco',
    label: '40 × 40 · ECO',
    w: 40, h: 40, slotWidth: 4.5, slotDepth: 8, grooveWidth: 12.25, cornerR: 4, boreRadius: 3.4, webThickness: 2.5, pricePerMeter: 6.20,
  },
  {
    id: '40x40-leicht', sizeKey: '40x40', variant: 'leicht',
    label: '40 × 40 · Leicht',
    w: 40, h: 40, slotWidth: 4.5, slotDepth: 8, grooveWidth: 12.25, cornerR: 4, boreRadius: 3.4, webThickness: 3.5, pricePerMeter: 8.90,
  },
  {
    id: '40x40-schwer', sizeKey: '40x40', variant: 'schwer',
    label: '40 × 40 · Standard',
    w: 40, h: 40, slotWidth: 4.5, slotDepth: 8, grooveWidth: 12.25, cornerR: 4, boreRadius: 3.4, webThickness: 5.0, pricePerMeter: 12.40,
  },
  // ─── 80 × 40 (Nut 8) ────────────────────────────────────────────────────
  {
    id: '80x40-eco',    sizeKey: '80x40', variant: 'eco',
    label: '80 × 40 · ECO',
    w: 80, h: 40, slotWidth: 4.5, slotDepth: 8, grooveWidth: 12.25, cornerR: 4, boreRadius: 3.4, webThickness: 2.5, pricePerMeter: 11.50,
  },
  {
    id: '80x40-leicht', sizeKey: '80x40', variant: 'leicht',
    label: '80 × 40 · Leicht',
    w: 80, h: 40, slotWidth: 4.5, slotDepth: 8, grooveWidth: 12.25, cornerR: 4, boreRadius: 3.4, webThickness: 3.5, pricePerMeter: 14.20,
  },
  {
    id: '80x40-schwer', sizeKey: '80x40', variant: 'schwer',
    label: '80 × 40 · Standard',
    w: 80, h: 40, slotWidth: 4.5, slotDepth: 8, grooveWidth: 12.25, cornerR: 4, boreRadius: 3.4, webThickness: 5.0, pricePerMeter: 19.80,
  },
  // ─── 80 × 80 (Nut 8) ────────────────────────────────────────────────────
  {
    id: '80x80-leicht', sizeKey: '80x80', variant: 'leicht',
    label: '80 × 80 · Leicht',
    w: 80, h: 80, slotWidth: 4.5, slotDepth: 8, grooveWidth: 12.25, cornerR: 4, boreRadius: 3.4, webThickness: 3.5, pricePerMeter: 22.40,
  },
  {
    id: '80x80-schwer', sizeKey: '80x80', variant: 'schwer',
    label: '80 × 80 · Standard',
    w: 80, h: 80, slotWidth: 4.5, slotDepth: 8, grooveWidth: 12.25, cornerR: 4, boreRadius: 3.4, webThickness: 5.0, pricePerMeter: 32.50,
  },
  // ─── 80 × 160 (Nut 8) ───────────────────────────────────────────────────
  {
    id: '80x160-leicht', sizeKey: '80x160', variant: 'leicht',
    label: '80 × 160 · Leicht',
    w: 80, h: 160, slotWidth: 4.5, slotDepth: 8, grooveWidth: 12.25, cornerR: 4, boreRadius: 3.4, webThickness: 3.5, pricePerMeter: 38.50,
  },
  {
    id: '80x160-schwer', sizeKey: '80x160', variant: 'schwer',
    label: '80 × 160 · Standard',
    w: 80, h: 160, slotWidth: 4.5, slotDepth: 8, grooveWidth: 12.25, cornerR: 4, boreRadius: 3.4, webThickness: 5.0, pricePerMeter: 56.00,
  },
];

export const CONNECTOR_TYPES = [
  { id: 'tnut-m6',          label: 'Nutenstein M6',         description: 'T-Nut M6 für Nut 8' },
  { id: 'tnut-m8',          label: 'Nutenstein M8',         description: 'T-Nut M8 für Nut 8' },
  { id: 'angle-8',          label: 'Winkelverbinder 40',    description: 'Innen-Winkel, Nut 8' },
  { id: 'auto-connector-8', label: 'Automatikverbinder 8',  description: 'Schnellverbinder ohne Werkzeug' },
] as const;

export const HOLE_TYPES = [
  { id: 'd55',        label: 'D5,5 mm (Standardbohrung)',     diameter: 5.5  },
  { id: 'd85',        label: 'D8,5 mm (Verbinderbohrung)',    diameter: 8.5  },
  { id: 'core-m6',   label: 'Kernloch M6 (Ø5,0)',            diameter: 5.0  },
  { id: 'core-m8',   label: 'Kernloch M8 (Ø6,8)',            diameter: 6.8  },
  { id: 'm6-thread', label: 'Gewinde M6',                    diameter: 6.0  },
  { id: 'm8-thread', label: 'Gewinde M8',                    diameter: 8.0  },
  { id: 'step-m6',   label: 'Stufenbohrung M6 (Ø11/5,0)',   diameter: 11.0 },
  { id: 'step-m8',   label: 'Stufenbohrung M8 (Ø14/6,8)',   diameter: 14.0 },
] as const;

// ---------------------------------------------------------------------------
// Pricing
// ---------------------------------------------------------------------------

export const PRICE_MITER_CUT = 4.50;   // per miter cut (angle ≠ 0)
export const PRICE_HOLE = 1.80;         // per hole / treatment
export const PRICE_CONNECTOR = 3.50;   // per connector

export function calculateProfilePrice(config: ProfileConfig): {
  material: number;
  miterCuts: number;
  holes: number;
  connectors: number;
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
  const connectors = config.connectors.length * PRICE_CONNECTOR * config.quantity;
  return {
    material: +material.toFixed(2),
    miterCuts: +miterCuts.toFixed(2),
    holes: +holes.toFixed(2),
    connectors: +connectors.toFixed(2),
    total: +(material + miterCuts + holes + connectors).toFixed(2),
  };
}
