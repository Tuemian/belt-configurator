// ---------------------------------------------------------------------------
// Shared types for the Aluminium Profile Configurator (Profilzuschnitte)
// ---------------------------------------------------------------------------

export type ProfileVariantKey = 'eco' | 'leicht' | 'schwer';

/**
 * Slots are addressed A / B / C / D, going clockwise starting at the top.
 *   A = top
 *   B = right
 *   C = bottom
 *   D = left
 */
export type SlotId = 'A' | 'B' | 'C' | 'D';

export const SLOT_IDS: SlotId[] = ['A', 'B', 'C', 'D'];

export const SLOT_LABEL_DE: Record<SlotId, string> = {
  A: 'Nut A (oben)',
  B: 'Nut B (rechts)',
  C: 'Nut C (unten)',
  D: 'Nut D (links)',
};

export interface ProfileSize {
  key: string;
  label: string;
  w: number;
  h: number;
  variants: ProfileVariantKey[];
}

export interface ProfileSection {
  id: string;
  label: string;
  sizeKey: string;
  variant: ProfileVariantKey;
  w: number;
  h: number;
  slotWidth: number;
  slotDepth: number;
  grooveWidth: number;
  cornerR: number;
  boreRadius: number;
  webThickness: number;
  pricePerMeter: number;
  /** Bestellcode analog item24 (z. B. 0.0.026.03 für 40×40 Nut 8) */
  orderCode?: string;
  /** Massenpro-Meter (kg/m) – für PDF, Statik, Versand */
  massPerMeter?: number;
  /** Rastermaß / Modulteilung (mm). 30er-Reihe = 30, sonst 40. */
  modulePitch?: number;
}

export interface ProfileHole {
  id: string;
  zPosition: number;          // mm vom Start
  diameter: number;
  /** Backwards-compat: ältere Configs hatten 'face' (top|bottom|left|right) */
  face?: 'top' | 'bottom' | 'left' | 'right';
  /** Neu: Nut, auf der die Bohrung sitzt */
  slot: SlotId;
  type: 'd55' | 'd85' | 'm6-thread' | 'm8-thread' | 'step-m6' | 'step-m8';
  label: string;
}

export type ConnectorType = 'tnut-m6' | 'tnut-m8' | 'angle-8' | 'auto-connector-8';

export interface ProfileConnector {
  id: string;
  type: ConnectorType;
  /** Entweder 'start' oder 'end' – Verbinder sitzen nur an Profilenden */
  end: 'start' | 'end';
  slot: SlotId;
  label: string;
}

export interface EndTreatment {
  thread: boolean;
  /** Kernloch wird im UI nicht mehr angeboten, Feld bleibt für Backwards-Compat */
  coreHole?: boolean;
}

export interface ProfileConfig {
  sectionId: string;
  length: number;
  angleStart: number;
  angleEnd: number;
  endStart: EndTreatment;
  endEnd: EndTreatment;
  holes: ProfileHole[];
  connectors: ProfileConnector[];
  quantity: number;
}

// ---------------------------------------------------------------------------
// Catalogue – item24-orientiertes Nut-8-Sortiment
// ---------------------------------------------------------------------------

export const PROFILE_SIZES: ProfileSize[] = [
  { key: '30x30',  label: '30 × 30',  w: 30,  h: 30,  variants: ['leicht'] },
  { key: '30x60',  label: '30 × 60',  w: 30,  h: 60,  variants: ['leicht'] },
  { key: '40x40',  label: '40 × 40',  w: 40,  h: 40,  variants: ['eco', 'leicht', 'schwer'] },
  { key: '40x80',  label: '40 × 80',  w: 40,  h: 80,  variants: ['leicht', 'schwer'] },
  { key: '40x120', label: '40 × 120', w: 40,  h: 120, variants: ['leicht'] },
  { key: '40x160', label: '40 × 160', w: 40,  h: 160, variants: ['leicht'] },
  { key: '60x60',  label: '60 × 60',  w: 60,  h: 60,  variants: ['leicht'] },
  { key: '80x40',  label: '80 × 40',  w: 80,  h: 40,  variants: ['eco', 'leicht', 'schwer'] },
  { key: '80x80',  label: '80 × 80',  w: 80,  h: 80,  variants: ['leicht', 'schwer'] },
  { key: '80x120', label: '80 × 120', w: 80,  h: 120, variants: ['leicht'] },
  { key: '80x160', label: '80 × 160', w: 80,  h: 160, variants: ['leicht', 'schwer'] },
  { key: '80x240', label: '80 × 240', w: 80,  h: 240, variants: ['leicht'] },
];

const NUT8_GEO = {
  slotWidth: 4.5,
  slotDepth: 8,
  grooveWidth: 12.25,
  cornerR: 4,
  boreRadius: 3.4,
};

export const PROFILE_SECTIONS: ProfileSection[] = [
  // 30 × 30
  { id: '30x30-leicht', sizeKey: '30x30', variant: 'leicht', label: '30 × 30 · Leicht',
    w: 30, h: 30, ...NUT8_GEO, webThickness: 2.5, pricePerMeter: 5.40,
    orderCode: '0.0.026.43', massPerMeter: 0.81, modulePitch: 30 },

  // 30 × 60
  { id: '30x60-leicht', sizeKey: '30x60', variant: 'leicht', label: '30 × 60 · Leicht',
    w: 30, h: 60, ...NUT8_GEO, webThickness: 2.5, pricePerMeter: 9.10,
    orderCode: '0.0.026.44', massPerMeter: 1.45, modulePitch: 30 },

  // 40 × 40
  { id: '40x40-eco',    sizeKey: '40x40', variant: 'eco',    label: '40 × 40 · ECO',
    w: 40, h: 40, ...NUT8_GEO, webThickness: 2.5, pricePerMeter: 6.20,
    orderCode: '0.0.026.04', massPerMeter: 1.18 },
  { id: '40x40-leicht', sizeKey: '40x40', variant: 'leicht', label: '40 × 40 · Leicht',
    w: 40, h: 40, ...NUT8_GEO, webThickness: 3.5, pricePerMeter: 8.90,
    orderCode: '0.0.026.03', massPerMeter: 1.55 },
  { id: '40x40-schwer', sizeKey: '40x40', variant: 'schwer', label: '40 × 40 · Schwer',
    w: 40, h: 40, ...NUT8_GEO, webThickness: 5.0, pricePerMeter: 12.40,
    orderCode: '0.0.026.05', massPerMeter: 2.10 },

  // 40 × 80
  { id: '40x80-leicht', sizeKey: '40x80', variant: 'leicht', label: '40 × 80 · Leicht',
    w: 40, h: 80, ...NUT8_GEO, webThickness: 3.5, pricePerMeter: 14.20,
    orderCode: '0.0.026.07', massPerMeter: 2.95 },
  { id: '40x80-schwer', sizeKey: '40x80', variant: 'schwer', label: '40 × 80 · Schwer',
    w: 40, h: 80, ...NUT8_GEO, webThickness: 5.0, pricePerMeter: 19.80,
    orderCode: '0.0.026.08', massPerMeter: 3.95 },

  // 40 × 120
  { id: '40x120-leicht', sizeKey: '40x120', variant: 'leicht', label: '40 × 120 · Leicht',
    w: 40, h: 120, ...NUT8_GEO, webThickness: 3.5, pricePerMeter: 19.80,
    orderCode: '0.0.026.10', massPerMeter: 4.30 },

  // 40 × 160
  { id: '40x160-leicht', sizeKey: '40x160', variant: 'leicht', label: '40 × 160 · Leicht',
    w: 40, h: 160, ...NUT8_GEO, webThickness: 3.5, pricePerMeter: 25.40,
    orderCode: '0.0.026.11', massPerMeter: 5.65 },

  // 60 × 60
  { id: '60x60-leicht', sizeKey: '60x60', variant: 'leicht', label: '60 × 60 · Leicht',
    w: 60, h: 60, ...NUT8_GEO, webThickness: 3.5, pricePerMeter: 13.40,
    orderCode: '0.0.026.45', massPerMeter: 2.45 },

  // 80 × 40
  { id: '80x40-eco',    sizeKey: '80x40', variant: 'eco',    label: '80 × 40 · ECO',
    w: 80, h: 40, ...NUT8_GEO, webThickness: 2.5, pricePerMeter: 11.50,
    orderCode: '0.0.026.21' },
  { id: '80x40-leicht', sizeKey: '80x40', variant: 'leicht', label: '80 × 40 · Leicht',
    w: 80, h: 40, ...NUT8_GEO, webThickness: 3.5, pricePerMeter: 14.20,
    orderCode: '0.0.026.22' },
  { id: '80x40-schwer', sizeKey: '80x40', variant: 'schwer', label: '80 × 40 · Schwer',
    w: 80, h: 40, ...NUT8_GEO, webThickness: 5.0, pricePerMeter: 19.80,
    orderCode: '0.0.026.23' },

  // 80 × 80
  { id: '80x80-leicht', sizeKey: '80x80', variant: 'leicht', label: '80 × 80 · Leicht',
    w: 80, h: 80, ...NUT8_GEO, webThickness: 3.5, pricePerMeter: 22.40,
    orderCode: '0.0.026.31', massPerMeter: 4.20 },
  { id: '80x80-schwer', sizeKey: '80x80', variant: 'schwer', label: '80 × 80 · Schwer',
    w: 80, h: 80, ...NUT8_GEO, webThickness: 5.0, pricePerMeter: 32.50,
    orderCode: '0.0.026.32', massPerMeter: 6.20 },

  // 80 × 120
  { id: '80x120-leicht', sizeKey: '80x120', variant: 'leicht', label: '80 × 120 · Leicht',
    w: 80, h: 120, ...NUT8_GEO, webThickness: 3.5, pricePerMeter: 32.80,
    orderCode: '0.0.026.36', massPerMeter: 6.10 },

  // 80 × 160
  { id: '80x160-leicht', sizeKey: '80x160', variant: 'leicht', label: '80 × 160 · Leicht',
    w: 80, h: 160, ...NUT8_GEO, webThickness: 3.5, pricePerMeter: 38.50,
    orderCode: '0.0.026.41', massPerMeter: 7.95 },
  { id: '80x160-schwer', sizeKey: '80x160', variant: 'schwer', label: '80 × 160 · Schwer',
    w: 80, h: 160, ...NUT8_GEO, webThickness: 5.0, pricePerMeter: 56.00,
    orderCode: '0.0.026.42', massPerMeter: 11.20 },

  // 80 × 240
  { id: '80x240-leicht', sizeKey: '80x240', variant: 'leicht', label: '80 × 240 · Leicht',
    w: 80, h: 240, ...NUT8_GEO, webThickness: 3.5, pricePerMeter: 56.00,
    orderCode: '0.0.026.46', massPerMeter: 11.80 },
];

export const CONNECTOR_TYPES = [
  { id: 'tnut-m6',          label: 'Nutenstein M6',         description: 'T-Nut M6 für Nut 8' },
  { id: 'tnut-m8',          label: 'Nutenstein M8',         description: 'T-Nut M8 für Nut 8' },
  { id: 'angle-8',          label: 'Winkelverbinder 40',    description: 'Innen-Winkel, Nut 8' },
  { id: 'auto-connector-8', label: 'Automatikverbinder 8',  description: 'Schnellverbinder ohne Werkzeug' },
] as const;

// Kernloch wurde absichtlich entfernt (siehe Plan).
export const HOLE_TYPES = [
  { id: 'd55',       label: 'D5,5 mm (Standardbohrung)',   diameter: 5.5  },
  { id: 'd85',       label: 'D8,5 mm (Verbinderbohrung)',  diameter: 8.5  },
  { id: 'm6-thread', label: 'Gewinde M6',                   diameter: 6.0  },
  { id: 'm8-thread', label: 'Gewinde M8',                   diameter: 8.0  },
  { id: 'step-m6',   label: 'Stufenbohrung M6 (Ø11/5,0)',  diameter: 11.0 },
  { id: 'step-m8',   label: 'Stufenbohrung M8 (Ø14/6,8)',  diameter: 14.0 },
] as const;

// ---------------------------------------------------------------------------
// Helpers für Slot-Geometrie
// ---------------------------------------------------------------------------

/** Sichtbare Profilbreite (mm), wenn man die gewählte Nut frontal anschaut */
export function getFaceWidth(section: ProfileSection, slot: SlotId): number {
  // A/C → wir schauen auf die Oberseite/Unterseite, sichtbare Breite = section.w
  // B/D → wir schauen auf rechte/linke Seite, sichtbare Breite = section.h
  return slot === 'A' || slot === 'C' ? section.w : section.h;
}

/** Bei Mehrfach-Modul-Profilen (z. B. 80×40) liegen mehrere Nuten parallel */
export function getSlotCountPerFace(section: ProfileSection, slot: SlotId): number {
  const visibleWidth = getFaceWidth(section, slot);
  return Math.max(1, Math.round(visibleWidth / 40));
}

// ---------------------------------------------------------------------------
// Pricing (Fallback, wenn Excel nicht geladen)
// ---------------------------------------------------------------------------

export const PRICE_MITER_CUT = 4.50;
export const PRICE_HOLE = 1.80;
export const PRICE_CONNECTOR = 3.50;

export function calculateProfilePrice(config: ProfileConfig): {
  material: number;
  miterCuts: number;
  holes: number;
  connectors: number;
  total: number;
} {
  const section = PROFILE_SECTIONS.find((s) => s.id === config.sectionId)!;
  const material = (config.length / 1000) * section.pricePerMeter * config.quantity;
  const cuts = (config.angleStart !== 0 ? 1 : 0) + (config.angleEnd !== 0 ? 1 : 0);
  const treatments =
    (config.endStart.thread ? 1 : 0) +
    (config.endEnd.thread ? 1 : 0);
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
