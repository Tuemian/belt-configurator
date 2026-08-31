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

/** Backwards-compat: Buchstaben-Bezeichnungen (intern weiter verwendet, im UI durch Alvaris-Nummern ersetzt) */
export const SLOT_LABEL_DE: Record<SlotId, string> = {
  A: 'Oben',
  B: 'Rechts',
  C: 'Unten',
  D: 'Links',
};

/** Klartext der Seite (für Tooltips / PDF) */
export const SLOT_SIDE_DE: Record<SlotId, string> = {
  A: 'oben',
  B: 'rechts',
  C: 'unten',
  D: 'links',
};

/** Alvaris-Profilreihe (Nutbreite). Fehlt das Feld, ist A8 gemeint (historischer Default —
 *  der Zuschnittskonfigurator kannte anfangs nur Nut 8). */
export type ProfileNut = 'A5' | 'A6' | 'A8';

export interface ProfileSize {
  key: string;
  label: string;
  w: number;
  h: number;
  variants: ProfileVariantKey[];
  nut?: ProfileNut;
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
  /** NOVAMOTIS-Artikelnummer (Schema NM-PRO-{Größe}-{Variante}) */
  orderCode?: string;
  /** Massenpro-Meter (kg/m) – für PDF, Statik, Versand */
  massPerMeter?: number;
  /** Rastermaß / Modulteilung (mm). 30er-Reihe = 30, sonst 40. */
  modulePitch?: number;
  nut?: ProfileNut;
}

export interface ProfileHole {
  id: string;
  zPosition: number;          // mm vom Anfang
  diameter: number;
  /** Backwards-compat: ältere Configs hatten 'face' (top|bottom|left|right) */
  face?: 'top' | 'bottom' | 'left' | 'right';
  /** Neu: Nut, auf der die Bohrung sitzt */
  slot: SlotId;
  /** Bei Multi-Modul-Profilen (z. B. 80×40 hat 2 Nuten auf A/C): welche Spur (0..n-1). Default 0. */
  moduleIndex?: number;
  type: 'd55' | 'd85' | 'm6-thread' | 'm8-thread' | 'step-m6' | 'step-m8' | 'custom';
  label: string;
}

export type ConnectorType = 'tnut-m6' | 'tnut-m8' | 'angle-8' | 'auto-connector-8';

export interface ProfileConnector {
  id: string;
  type: ConnectorType;
  /** Entweder 'start' oder 'end' – Verbinder sitzen nur an Profilenden */
  end: 'start' | 'end';
  slot: SlotId;
  /** Bei Multi-Modul-Profilen: Spur-Index (0..n-1). Default 0. */
  moduleIndex?: number;
  label: string;
}

/** Auswahl, wo das Stirnseiten-Gewinde sitzen soll. */
export type EndThreadScope = 'all' | 'center' | 'custom' | SlotId;

export interface EndTreatment {
  thread: boolean;
  /** Wo das Gewinde gesetzt wird: 'all' (alle Kernzüge), 'center', 'custom' (siehe `bores`) oder Nut A/B/C/D. Default 'all'. */
  scope?: EndThreadScope;
  /** Bei scope==='custom': Liste der aktiven Kernzug-Nummern (Alvaris-Nummerierung) */
  bores?: number[];
  /** Kernloch wird im UI nicht mehr angeboten, Feld bleibt für Backwards-Compat */
  coreHole?: boolean;
}

/** Um welche Achse der Schrägschnitt kippt: 'AC' (Standard) lässt Nut 1/3 (oben/unten)
 *  diagonal auslaufen, Nut 2/4 (rechts/links) bleiben gerade (mit Referenzlinie) — 'BD'
 *  vertauscht das. Welche Seite den Schrägschnitt zeigen soll, hängt vom Anschluss ab
 *  (z. B. welche Nut an ein anderes Profil stößt), daher wählbar statt fest verdrahtet. */
export type AngleAxis = 'AC' | 'BD';

export interface ProfileConfig {
  sectionId: string;
  length: number;
  angleStart: number;
  angleEnd: number;
  /** Default 'AC', wenn nicht gesetzt (bisheriges Verhalten). */
  angleAxis?: AngleAxis;
  endStart: EndTreatment;
  endEnd: EndTreatment;
  holes: ProfileHole[];
  connectors: ProfileConnector[];
  quantity: number;
}

// ---------------------------------------------------------------------------
// Catalogue – item24-orientiertes Nut-8-Sortiment
// ---------------------------------------------------------------------------

// Nur Größen, die auf dem Alvaris-Profilbearbeitungscode-Blatt bestätigt sind:
// Profilreihe 8_40 (40er/80er/160er) sowie die 30er-Untervariante aus Profilreihe
// 8_30 (30×30/30×60/60×60 — gleiche Nutbreite 8, kleineres Rastermaß 30 statt 40).
// 80×240 entfernt (nicht auf dem Blatt). 40×16/80×16 ergänzt (PRO4016E/PRO8016).
export const PROFILE_SIZES: ProfileSize[] = [
  { key: '30x30',  label: '30 × 30',  w: 30,  h: 30,  variants: ['leicht'] },
  { key: '30x60',  label: '30 × 60',  w: 30,  h: 60,  variants: ['leicht'] },
  { key: '40x16',  label: '40 × 16',  w: 40,  h: 16,  variants: ['leicht'] },
  { key: '40x40',  label: '40 × 40',  w: 40,  h: 40,  variants: ['eco', 'leicht', 'schwer'] },
  { key: '40x80',  label: '40 × 80',  w: 40,  h: 80,  variants: ['leicht', 'schwer'] },
  { key: '40x120', label: '40 × 120', w: 40,  h: 120, variants: ['leicht'] },
  { key: '40x160', label: '40 × 160', w: 40,  h: 160, variants: ['leicht'] },
  { key: '60x60',  label: '60 × 60',  w: 60,  h: 60,  variants: ['leicht'] },
  { key: '80x16',  label: '80 × 16',  w: 80,  h: 16,  variants: ['leicht'] },
  { key: '80x40',  label: '80 × 40',  w: 80,  h: 40,  variants: ['eco', 'leicht', 'schwer'] },
  { key: '80x80',  label: '80 × 80',  w: 80,  h: 80,  variants: ['leicht', 'schwer'] },
  { key: '80x120', label: '80 × 120', w: 80,  h: 120, variants: ['leicht'] },
  { key: '80x160', label: '80 × 160', w: 80,  h: 160, variants: ['leicht', 'schwer'] },
  { key: '160x16', label: '160 × 16', w: 160, h: 16,  variants: ['leicht'] },
  { key: '160x28', label: '160 × 28', w: 160, h: 28,  variants: ['leicht'] },

  // --- Nut 5 (Alvaris "Profilreihe 5") — eigene, kleinere Nut-Geometrie ---------
  { key: '20x20', label: '20 × 20', w: 20, h: 20, variants: ['leicht'], nut: 'A5' },
  { key: '40x20', label: '40 × 20', w: 40, h: 20, variants: ['leicht'], nut: 'A5' },
  { key: '20x10', label: '20 × 10', w: 20, h: 10, variants: ['leicht'], nut: 'A5' },
  { key: '40x40', label: '40 × 40', w: 40, h: 40, variants: ['leicht'], nut: 'A5' },
  { key: '40x10', label: '40 × 10', w: 40, h: 10, variants: ['leicht'], nut: 'A5' },
  { key: '80x20', label: '80 × 20', w: 80, h: 20, variants: ['leicht'], nut: 'A5' },
];

const NUT8_GEO = {
  slotWidth: 4.5,
  slotDepth: 8,
  grooveWidth: 12.25,
  cornerR: 4,
  boreRadius: 3.4,
};

export const PROFILE_SECTIONS: ProfileSection[] = [
  // 30 × 30 (Alvaris PRO8.3030, Profilreihe 8_30 — Rastermaß 30 statt 40).
  { id: '30x30-leicht', sizeKey: '30x30', variant: 'leicht', label: '30 × 30 · Leicht',
    w: 30, h: 30, ...NUT8_GEO, webThickness: 2.5, pricePerMeter: 5.40,
    orderCode: 'NM-PRO-30x30-L', massPerMeter: 0.81, modulePitch: 30 },

  // 30 × 60 (Alvaris PRO8.6030, im Querformat gezeichnet — Bild wird gedreht).
  { id: '30x60-leicht', sizeKey: '30x60', variant: 'leicht', label: '30 × 60 · Leicht',
    w: 30, h: 60, ...NUT8_GEO, webThickness: 2.5, pricePerMeter: 9.10,
    orderCode: 'NM-PRO-30x60-L', massPerMeter: 1.45, modulePitch: 30 },

  // 40 × 16 (Alvaris PRO4016E). Preis/Masse geschätzt (siehe Hinweis bei 160×16/160×28 unten).
  { id: '40x16-leicht', sizeKey: '40x16', variant: 'leicht', label: '40 × 16 · Leicht',
    w: 40, h: 16, ...NUT8_GEO, webThickness: 3.5, pricePerMeter: 5.00,
    orderCode: 'NM-PRO-40x16-L', massPerMeter: 0.90 },

  // 40 × 40
  { id: '40x40-eco',    sizeKey: '40x40', variant: 'eco',    label: '40 × 40 · ECO',
    w: 40, h: 40, ...NUT8_GEO, webThickness: 2.5, pricePerMeter: 6.20,
    orderCode: 'NM-PRO-40x40-E', massPerMeter: 1.18 },
  { id: '40x40-leicht', sizeKey: '40x40', variant: 'leicht', label: '40 × 40 · Leicht',
    w: 40, h: 40, ...NUT8_GEO, webThickness: 3.5, pricePerMeter: 8.90,
    orderCode: 'NM-PRO-40x40-L', massPerMeter: 1.55 },
  { id: '40x40-schwer', sizeKey: '40x40', variant: 'schwer', label: '40 × 40 · Schwer',
    w: 40, h: 40, ...NUT8_GEO, webThickness: 5.0, pricePerMeter: 12.40,
    orderCode: 'NM-PRO-40x40-S', massPerMeter: 2.10 },

  // 40 × 80
  { id: '40x80-leicht', sizeKey: '40x80', variant: 'leicht', label: '40 × 80 · Leicht',
    w: 40, h: 80, ...NUT8_GEO, webThickness: 3.5, pricePerMeter: 14.20,
    orderCode: 'NM-PRO-40x80-L', massPerMeter: 2.95 },
  { id: '40x80-schwer', sizeKey: '40x80', variant: 'schwer', label: '40 × 80 · Schwer',
    w: 40, h: 80, ...NUT8_GEO, webThickness: 5.0, pricePerMeter: 19.80,
    orderCode: 'NM-PRO-40x80-S', massPerMeter: 3.95 },

  // 40 × 120
  { id: '40x120-leicht', sizeKey: '40x120', variant: 'leicht', label: '40 × 120 · Leicht',
    w: 40, h: 120, ...NUT8_GEO, webThickness: 3.5, pricePerMeter: 19.80,
    orderCode: 'NM-PRO-40x120-L', massPerMeter: 4.30 },

  // 40 × 160
  { id: '40x160-leicht', sizeKey: '40x160', variant: 'leicht', label: '40 × 160 · Leicht',
    w: 40, h: 160, ...NUT8_GEO, webThickness: 3.5, pricePerMeter: 25.40,
    orderCode: 'NM-PRO-40x160-L', massPerMeter: 5.65 },

  // 60 × 60 (Alvaris PRO8.6060, Profilreihe 8_30).
  { id: '60x60-leicht', sizeKey: '60x60', variant: 'leicht', label: '60 × 60 · Leicht',
    w: 60, h: 60, ...NUT8_GEO, webThickness: 3.5, pricePerMeter: 13.40,
    orderCode: 'NM-PRO-60x60-L', massPerMeter: 2.45, modulePitch: 30 },

  // 80 × 16 (Alvaris PRO8016). Preis/Masse geschätzt.
  { id: '80x16-leicht', sizeKey: '80x16', variant: 'leicht', label: '80 × 16 · Leicht',
    w: 80, h: 16, ...NUT8_GEO, webThickness: 3.5, pricePerMeter: 9.80,
    orderCode: 'NM-PRO-80x16-L', massPerMeter: 1.76 },

  // 80 × 40
  { id: '80x40-eco',    sizeKey: '80x40', variant: 'eco',    label: '80 × 40 · ECO',
    w: 80, h: 40, ...NUT8_GEO, webThickness: 2.5, pricePerMeter: 11.50,
    orderCode: 'NM-PRO-80x40-E' },
  { id: '80x40-leicht', sizeKey: '80x40', variant: 'leicht', label: '80 × 40 · Leicht',
    w: 80, h: 40, ...NUT8_GEO, webThickness: 3.5, pricePerMeter: 14.20,
    orderCode: 'NM-PRO-80x40-L' },
  { id: '80x40-schwer', sizeKey: '80x40', variant: 'schwer', label: '80 × 40 · Schwer',
    w: 80, h: 40, ...NUT8_GEO, webThickness: 5.0, pricePerMeter: 19.80,
    orderCode: 'NM-PRO-80x40-S' },

  // 80 × 80
  { id: '80x80-leicht', sizeKey: '80x80', variant: 'leicht', label: '80 × 80 · Leicht',
    w: 80, h: 80, ...NUT8_GEO, webThickness: 3.5, pricePerMeter: 22.40,
    orderCode: 'NM-PRO-80x80-L', massPerMeter: 4.20 },
  { id: '80x80-schwer', sizeKey: '80x80', variant: 'schwer', label: '80 × 80 · Schwer',
    w: 80, h: 80, ...NUT8_GEO, webThickness: 5.0, pricePerMeter: 32.50,
    orderCode: 'NM-PRO-80x80-S', massPerMeter: 6.20 },

  // 80 × 120
  { id: '80x120-leicht', sizeKey: '80x120', variant: 'leicht', label: '80 × 120 · Leicht',
    w: 80, h: 120, ...NUT8_GEO, webThickness: 3.5, pricePerMeter: 32.80,
    orderCode: 'NM-PRO-80x120-L', massPerMeter: 6.10 },

  // 80 × 160
  { id: '80x160-leicht', sizeKey: '80x160', variant: 'leicht', label: '80 × 160 · Leicht',
    w: 80, h: 160, ...NUT8_GEO, webThickness: 3.5, pricePerMeter: 38.50,
    orderCode: 'NM-PRO-80x160-L', massPerMeter: 7.95 },
  { id: '80x160-schwer', sizeKey: '80x160', variant: 'schwer', label: '80 × 160 · Schwer',
    w: 80, h: 160, ...NUT8_GEO, webThickness: 5.0, pricePerMeter: 56.00,
    orderCode: 'NM-PRO-80x160-S', massPerMeter: 11.20 },

  // 160 × 16 / 160 × 28 (Alvaris PRO16016 / PRO16028, aus Profilbearbeitungscode-Blatt).
  // ACHTUNG: pricePerMeter/massPerMeter sind nicht von Alvaris bestätigt, sondern aus dem
  // Preis/Umfang-Verhältnis der übrigen Nut-8-Größen linear interpoliert (vorläufiger
  // Platzhalter) — vor Live-Einsatz mit echten Einkaufspreisen abgleichen.
  { id: '160x16-leicht', sizeKey: '160x16', variant: 'leicht', label: '160 × 16 · Leicht',
    w: 160, h: 16, ...NUT8_GEO, webThickness: 3.5, pricePerMeter: 22.50,
    orderCode: 'NM-PRO-160x16-L', massPerMeter: 4.05 },
  { id: '160x28-leicht', sizeKey: '160x28', variant: 'leicht', label: '160 × 28 · Leicht',
    w: 160, h: 28, ...NUT8_GEO, webThickness: 3.5, pricePerMeter: 24.90,
    orderCode: 'NM-PRO-160x28-L', massPerMeter: 4.61 },

  // --- Nut 5 (Alvaris "Profilreihe 5") -----------------------------------------
  // Nut-/Steg-Geometrie (slotWidth/grooveWidth/…) ist mangels echter Maßangaben von
  // Alvaris ein Platzhalter (NUT8_GEO wiederverwendet) — betrifft nur unsichtbare
  // Klick-Hitboxen, die sichtbare Zeichnung kommt vom echten a5-*.png-Referenzbild.
  // pricePerMeter/massPerMeter sind ebenfalls nur grob geschätzt (aus dem Preis/Umfang-
  // Verhältnis der Nut-8-Größen, mit Faktor 0.85 für die leichtere Nut-5-Bauweise) —
  // vor Live-Einsatz mit echten Einkaufspreisen abgleichen.
  { id: 'a5-20x20-leicht', sizeKey: '20x20', variant: 'leicht', label: '20 × 20 · Leicht',
    w: 20, h: 20, ...NUT8_GEO, webThickness: 2.0, pricePerMeter: 2.80,
    orderCode: 'NM-PRO-A5-20x20-L', massPerMeter: 0.50, modulePitch: 20, nut: 'A5' },
  { id: 'a5-40x20-leicht', sizeKey: '40x20', variant: 'leicht', label: '40 × 20 · Leicht',
    w: 40, h: 20, ...NUT8_GEO, webThickness: 2.0, pricePerMeter: 4.60,
    orderCode: 'NM-PRO-A5-40x20-L', massPerMeter: 0.83, modulePitch: 20, nut: 'A5' },
  { id: 'a5-20x10-leicht', sizeKey: '20x10', variant: 'leicht', label: '20 × 10 · Leicht',
    w: 20, h: 10, ...NUT8_GEO, webThickness: 2.0, pricePerMeter: 2.00,
    orderCode: 'NM-PRO-A5-20x10-L', massPerMeter: 0.36, modulePitch: 20, nut: 'A5' },
  { id: 'a5-40x40-leicht', sizeKey: '40x40', variant: 'leicht', label: '40 × 40 · Leicht',
    w: 40, h: 40, ...NUT8_GEO, webThickness: 2.0, pricePerMeter: 6.50,
    orderCode: 'NM-PRO-A5-40x40-L', massPerMeter: 1.17, modulePitch: 20, nut: 'A5' },
  { id: 'a5-40x10-leicht', sizeKey: '40x10', variant: 'leicht', label: '40 × 10 · Leicht',
    w: 40, h: 10, ...NUT8_GEO, webThickness: 2.0, pricePerMeter: 3.70,
    orderCode: 'NM-PRO-A5-40x10-L', massPerMeter: 0.67, modulePitch: 20, nut: 'A5' },
  { id: 'a5-80x20-leicht', sizeKey: '80x20', variant: 'leicht', label: '80 × 20 · Leicht',
    w: 80, h: 20, ...NUT8_GEO, webThickness: 2.0, pricePerMeter: 8.80,
    orderCode: 'NM-PRO-A5-80x20-L', massPerMeter: 1.58, modulePitch: 20, nut: 'A5' },
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
  { id: 'custom',    label: 'Benutzerdefiniert (Ø frei wählbar)', diameter: 6.0 },
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

/** Rastermaß / Modulteilung in mm — 30 für 30er-Reihe, sonst 40 */
export function getModulePitch(section: ProfileSection): number {
  return section.modulePitch ?? 40;
}

/** Bei Mehrfach-Modul-Profilen (z. B. 80×40) liegen mehrere Nuten parallel */
export function getSlotCountPerFace(section: ProfileSection, slot: SlotId): number {
  const visibleWidth = getFaceWidth(section, slot);
  const pitch = getModulePitch(section);
  return Math.max(1, Math.round(visibleWidth / pitch));
}

/** Y-Mitten der Nuten (mm) entlang der sichtbaren Frontalansicht */
export function getSlotCenters(section: ProfileSection, slot: SlotId): number[] {
  const fw = getFaceWidth(section, slot);
  const pitch = getModulePitch(section);
  const n = Math.max(1, Math.round(fw / pitch));
  return Array.from({ length: n }, (_, i) => pitch * (i + 0.5));
}

/**
 * Gültiger z-Bereich (mm) für eine Bohrung auf einer bestimmten Nut/Spur, unter
 * Berücksichtigung des Schrägschnitts (angleStart/angleEnd/angleAxis) — jenseits davon
 * ist an dieser Spur kein Material mehr vorhanden (weggeschnitten). Nutzt dieselbe
 * Referenzkanten-Logik wie ProfileViewer3D.applyMiterCut/SideRow.profilePath (muss mit
 * beiden exakt übereinstimmen, sonst weicht die sichtbare Schnittkante von der
 * tatsächlich erlaubten Bohrungsposition ab).
 */
export function getMaterialZRange(
  section: ProfileSection,
  length: number,
  angleStart: number,
  angleEnd: number,
  angleAxis: AngleAxis | undefined,
  slot: SlotId,
  moduleIndex: number,
): { min: number; max: number } {
  const axis = angleAxis ?? 'AC';
  const tanS = Math.tan((angleStart * Math.PI) / 180);
  const tanE = Math.tan((angleEnd * Math.PI) / 180);
  const isDiagonal = axis === 'BD' ? (slot === 'B' || slot === 'D') : (slot === 'A' || slot === 'C');
  const refCoord = (axis === 'BD' ? section.h : section.w) / 2;
  const movingCoord = -refCoord;

  let c: number;
  if (isDiagonal) {
    const pitch = getModulePitch(section);
    const dim = axis === 'BD' ? section.h : section.w;
    const lanes = Math.max(1, Math.round(dim / pitch));
    const cell = dim / lanes;
    c = movingCoord + cell * (moduleIndex + 0.5);
  } else {
    const refSlot: SlotId = axis === 'BD' ? 'A' : 'B';
    c = slot === refSlot ? refCoord : movingCoord;
  }

  const pivotS = tanS >= 0 ? refCoord : movingCoord;
  const pivotE = tanE >= 0 ? refCoord : movingCoord;
  const recedeS = Math.max(0, (pivotS - c) * tanS);
  const recedeE = Math.max(0, (pivotE - c) * tanE);
  return { min: recedeS, max: length - recedeE };
}

// ---------------------------------------------------------------------------
// Alvaris-Nummerierung (Profilbearbeitungscode 10404-11-0000-00)
// ---------------------------------------------------------------------------
//
// Nuten (rote Zahlen, im Uhrzeigersinn beginnend oben links):
//   Seite A (oben):   1 .. nA           (links → rechts)
//   Seite B (rechts): nA+1 .. nA+nB     (oben → unten)
//   Seite C (unten):  nA+nB+1 .. ...    (rechts → links)
//   Seite D (links):  ... bis n_total   (unten → oben)
//
// Kernzüge / Mittelbohrungen (blaue Zahlen in Kreisen):
//   zeilenweise von oben-links nach unten-rechts (Spalte i, Zeile j)

/** Sehr flache Profile, bei denen laut Alvaris-Referenzbild auf der schmalen Seite (B/D)
 *  GAR KEINE Nut sitzt (die generische Rasterformel unten würde dort sonst fälschlich
 *  mindestens 1 Nut annehmen — vermessen anhand der Referenzbilder: kein Nut-Ausschnitt
 *  auf der linken/rechten Kante, nur die glatte, abgerundete Profilseite). */
const NO_SIDE_SLOTS_A8 = new Set(['40x16', '80x16', '160x16', '160x28']);
const NO_SIDE_SLOTS_A5 = new Set(['20x10', '40x10']);

/** Anzahl Nuten je Seite (basierend auf modulePitch) */
export function getSlotCounts(section: ProfileSection): { A: number; B: number; C: number; D: number } {
  const pitch = getModulePitch(section);
  const nW = Math.max(1, Math.round(section.w / pitch));
  const noSideSlots = section.nut === 'A5' ? NO_SIDE_SLOTS_A5.has(section.sizeKey) : NO_SIDE_SLOTS_A8.has(section.sizeKey);
  const nH = noSideSlots ? 0 : Math.max(1, Math.round(section.h / pitch));
  return { A: nW, B: nH, C: nW, D: nH };
}

/** Liefert die fortlaufende Alvaris-Nutnummer (1-basiert) */
export function getSlotNumber(section: ProfileSection, slot: SlotId, moduleIndex = 0): number {
  const counts = getSlotCounts(section);
  const idx = Math.max(0, Math.min(moduleIndex, counts[slot] - 1));
  switch (slot) {
    case 'A': return 1 + idx;                                              // links → rechts
    case 'B': return counts.A + 1 + idx;                                   // oben → unten
    case 'C': return counts.A + counts.B + 1 + (counts.C - 1 - idx);       // rechts → links
    case 'D': return counts.A + counts.B + counts.C + 1 + (counts.D - 1 - idx); // unten → oben
  }
}

/** Gesamtanzahl Nuten am Profil */
export function getTotalSlotCount(section: ProfileSection): number {
  const c = getSlotCounts(section);
  return c.A + c.B + c.C + c.D;
}

/** Alle Nuten in Alvaris-Reihenfolge (für Auswahl-Listen) */
export function getAllSlots(section: ProfileSection): { slot: SlotId; moduleIndex: number; number: number }[] {
  const counts = getSlotCounts(section);
  const out: { slot: SlotId; moduleIndex: number; number: number }[] = [];
  (['A', 'B', 'C', 'D'] as SlotId[]).forEach((slot) => {
    for (let i = 0; i < counts[slot]; i++) {
      out.push({ slot, moduleIndex: i, number: getSlotNumber(section, slot, i) });
    }
  });
  return out.sort((a, b) => a.number - b.number);
}

/** Anzahl Kernzüge (Bohrungsspur in der Profilmitte) je Achse */
export function getBoreCounts(section: ProfileSection): { x: number; y: number } {
  const pitch = getModulePitch(section);
  return {
    x: Math.max(1, Math.round(section.w / pitch)),
    y: Math.max(1, Math.round(section.h / pitch)),
  };
}

/** Fortlaufende Kernzug-Nummer (links → rechts, dann oben → unten), 1-basiert */
export function getBoreNumber(section: ProfileSection, ix: number, iy: number): number {
  const { x } = getBoreCounts(section);
  return iy * x + ix + 1;
}

// ---------------------------------------------------------------------------
// Kernzug-Layout-Overrides für Profile, deren reales Bohrbild NICHT dem
// generischen Modulraster (ein Kernzug pro Nut-Modulzelle) entspricht — v. a.
// sehr flache Profile (16/28/10mm hoch), bei denen die Kernzüge unabhängig vom
// Nut-Rastermaß sitzen. Koordinaten (mm) relativ zur Profil-Box (0,0)–(w,h),
// aus dem realen Alvaris-Referenzbild vermessen (s. getAlvarisImage). '160x16'
// hat laut Referenzbild GAR KEINE Kernzüge (nur Stegverbindungen zwischen den
// Nuten, kein Gewindekanal) — daher bewusst eine leere Liste statt eines Rasters.
const BORE_LAYOUT_OVERRIDE_A8: Record<string, { x: number; y: number }[]> = {
  '40x16': [{ x: 6, y: 8 }, { x: 34, y: 8 }],
  '80x16': [{ x: 6, y: 8 }, { x: 74, y: 8 }],
  '160x16': [],
  '160x28': [
    { x: 40, y: 8 }, { x: 80, y: 8 }, { x: 120, y: 8 },
    { x: 20, y: 20 }, { x: 60, y: 20 }, { x: 100, y: 20 }, { x: 140, y: 20 },
  ],
};
const BORE_LAYOUT_OVERRIDE_A5: Record<string, { x: number; y: number }[]> = {
  '20x10': [{ x: 3.5, y: 6.5 }, { x: 16.5, y: 6.5 }],
  '40x10': [{ x: 3.5, y: 6.5 }, { x: 36.5, y: 6.5 }],
};

/** Liefert die tatsächlichen Kernzug-Positionen (mm, relativ zur Profil-Box) samt
 *  fortlaufender Alvaris-Nummer — nutzt ein Layout-Override, falls für diese Größe
 *  hinterlegt, sonst das generische Modulraster (Zellgröße = w/x bzw. h/y, NICHT
 *  das Nut-Rastermaß — sonst landen die Kreise bei Profilen, deren Höhe/Breite
 *  nicht durch den Rastermaß-Wert teilbar ist, außerhalb der Zeichnung). */
export function getBorePositions(section: ProfileSection): { x: number; y: number; number: number }[] {
  const override = section.nut === 'A5' ? BORE_LAYOUT_OVERRIDE_A5[section.sizeKey] : BORE_LAYOUT_OVERRIDE_A8[section.sizeKey];
  if (override) return override.map((p, i) => ({ x: p.x, y: p.y, number: i + 1 }));
  const bores = getBoreCounts(section);
  const cellW = section.w / bores.x;
  const cellH = section.h / bores.y;
  const out: { x: number; y: number; number: number }[] = [];
  for (let iy = 0; iy < bores.y; iy++) {
    for (let ix = 0; ix < bores.x; ix++) {
      out.push({ x: cellW * (ix + 0.5), y: cellH * (iy + 0.5), number: iy * bores.x + ix + 1 });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Pricing (Fallback, wenn Excel nicht geladen)
// ---------------------------------------------------------------------------

/** Mindestabstand vom Bohrungs-Mittelpunkt zur Profilkante (mm) */
export const MIN_EDGE_DISTANCE = 15;

export const PRICE_MITER_CUT = 4.50;
export const PRICE_HOLE = 1.80;
export const PRICE_CONNECTOR = 3.50;
/** Preis pro Stirnseiten-Gewinde (M8 in Kernzug) */
export const PRICE_END_THREAD = 1.90;

/** Liefert die Anzahl tatsächlich gesetzter Kernzug-Gewinde an einer Stirnseite. */
export function countActiveEndThreads(section: ProfileSection, t: EndTreatment | undefined): number {
  if (!t || !t.thread) return 0;
  const total = getBorePositions(section).length;
  if (t.scope === 'custom') return t.bores?.length ?? 0;
  if (t.scope === 'center') return 1;
  return total;
}

export function calculateProfilePrice(config: ProfileConfig): {
  material: number;
  miterCuts: number;
  holes: number;
  connectors: number;
  endThreads: number;
  total: number;
} {
  const section = PROFILE_SECTIONS.find((s) => s.id === config.sectionId)!;
  const material = (config.length / 1000) * section.pricePerMeter * config.quantity;
  const cuts = (config.angleStart !== 0 ? 1 : 0) + (config.angleEnd !== 0 ? 1 : 0);
  const endThreadCount =
    countActiveEndThreads(section, config.endStart) +
    countActiveEndThreads(section, config.endEnd);
  const miterCuts = cuts * PRICE_MITER_CUT * config.quantity;
  const holes = config.holes.length * PRICE_HOLE * config.quantity;
  const connectors = config.connectors.length * PRICE_CONNECTOR * config.quantity;
  const endThreads = endThreadCount * PRICE_END_THREAD * config.quantity;
  return {
    material: +material.toFixed(2),
    miterCuts: +miterCuts.toFixed(2),
    holes: +holes.toFixed(2),
    connectors: +connectors.toFixed(2),
    endThreads: +endThreads.toFixed(2),
    total: +(material + miterCuts + holes + connectors + endThreads).toFixed(2),
  };
}
