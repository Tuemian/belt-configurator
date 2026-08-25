// ---------------------------------------------------------------------------
// Durchbiegungsrechner — Profilkatalog
//
// Basiert auf der NOVAMOTIS-Artikelliste (Reihen A5/A6/A8/A10, Nutbreite
// 5/6/8/10 mm). Trägheitsmomente/Flächen stammen aus dem ITEM24-Katalog
// "Profile 5/6/8/10" (MB9), da für die eigenen NOVAMOTIS-Profile noch keine
// Herstellerstatik vorliegt. Nur gerade Vollprofile mit gesicherter
// ITEM24-Entsprechung sind gelistet.
//
// Bewusst NICHT enthalten (siehe Rückmeldung an den Nutzer):
//  - Deckel-, Kanal-, Rollenschienen-, Klemm-, Führungs- und sonstige
//    Funktionsprofile (keine allgemeinen Biegeträger)
//  - Rundrohre/Profilrohre (anderer Querschnitt, andere Formel)
//  - Trägerprofil/Wandprofil (kein ITEM24-Gegenstück gefunden)
//  - Nutungs-/45°-/Schwarz-/Kurzlängen-Varianten (gleicher Querschnitt wie
//    die Basisvariante, daher nicht separat gelistet)
// ---------------------------------------------------------------------------

import type { ProfileSection } from '@/lib/profile-configurator-types';

export const E_MODULUS_ALU_N_MM2 = 70_000;

export type Orientation = 'upright' | 'flat';
export type ProfileSeries = 'A5' | 'A6' | 'A8' | 'A10';

export interface DeflectionProfile {
  /** NOVAMOTIS-Artikelnummer */
  articleNumber: string;
  label: string;
  series: ProfileSeries;
  /** Breite [mm], wie im Artikelstamm benannt (erste Zahl) */
  w: number;
  /** Höhe [mm], wie im Artikelstamm benannt (zweite Zahl) */
  h: number;
  areaMm2: number;
  massPerMeterKg: number;
  /** Flächenträgheitsmoment [mm⁴], Profil hochkant (schmale Seite unten, große Ausdehnung steht) */
  iUprightMm4: number;
  /** Flächenträgheitsmoment [mm⁴], Profil flach (wie im Artikelnamen gelistet) */
  iFlatMm4: number;
}

export const DEFLECTION_PROFILES: DeflectionProfile[] = [
  // --- A5 · Nut 5 -----------------------------------------------------------
  { articleNumber: '1105002', label: 'Profil A5 16x8,5', series: 'A5', w: 16, h: 8.5, areaMm2: 82, massPerMeterKg: 0.22, iUprightMm4: 2_300, iFlatMm4: 600 },
  { articleNumber: '1105003', label: 'Profil A5 20x10', series: 'A5', w: 20, h: 10, areaMm2: 129, massPerMeterKg: 0.35, iUprightMm4: 5_300, iFlatMm4: 1_200 },
  { articleNumber: '1105004', label: 'Profil A5 20x20', series: 'A5', w: 20, h: 20, areaMm2: 180, massPerMeterKg: 0.48, iUprightMm4: 7_200, iFlatMm4: 7_200 },
  { articleNumber: '1105011', label: 'Profil A5 40x10', series: 'A5', w: 40, h: 10, areaMm2: 239, massPerMeterKg: 0.65, iUprightMm4: 36_300, iFlatMm4: 2_400 },
  { articleNumber: '1105012', label: 'Profil A5 40x20', series: 'A5', w: 40, h: 20, areaMm2: 332, massPerMeterKg: 0.89, iUprightMm4: 51_400, iFlatMm4: 14_100 },
  { articleNumber: '1105016', label: 'Profil A5 40x40', series: 'A5', w: 40, h: 40, areaMm2: 514, massPerMeterKg: 1.39, iUprightMm4: 93_000, iFlatMm4: 93_000 },
  { articleNumber: '1105017', label: 'Profil A5 60x20', series: 'A5', w: 60, h: 20, areaMm2: 476, massPerMeterKg: 1.28, iUprightMm4: 160_900, iFlatMm4: 20_600 },
  { articleNumber: '1105018', label: 'Profil A5 80x20', series: 'A5', w: 80, h: 20, areaMm2: 619, massPerMeterKg: 1.67, iUprightMm4: 360_800, iFlatMm4: 27_200 },

  // --- A6 · Nut 6 -----------------------------------------------------------
  { articleNumber: '1106009', label: 'Profil A6 30x12 leicht', series: 'A6', w: 30, h: 12, areaMm2: 158, massPerMeterKg: 0.43, iUprightMm4: 14_600, iFlatMm4: 2_500 },
  { articleNumber: '1106017', label: 'Profil A6 60x12 leicht', series: 'A6', w: 60, h: 12, areaMm2: 298, massPerMeterKg: 0.81, iUprightMm4: 100_000, iFlatMm4: 5_300 },
  { articleNumber: '1106011', label: 'Profil A6 30x30 leicht', series: 'A6', w: 30, h: 30, areaMm2: 343, massPerMeterKg: 0.93, iUprightMm4: 29_000, iFlatMm4: 29_000 },
  { articleNumber: '1106010', label: 'Profil A6 30x30', series: 'A6', w: 30, h: 30, areaMm2: 467, massPerMeterKg: 1.26, iUprightMm4: 41_500, iFlatMm4: 41_500 },
  { articleNumber: '1106019', label: 'Profil A6 60x30 leicht', series: 'A6', w: 60, h: 30, areaMm2: 613, massPerMeterKg: 1.65, iUprightMm4: 212_200, iFlatMm4: 55_400 },
  { articleNumber: '1106018', label: 'Profil A6 60x30', series: 'A6', w: 60, h: 30, areaMm2: 847, massPerMeterKg: 2.29, iUprightMm4: 293_000, iFlatMm4: 79_200 },
  { articleNumber: '1106022', label: 'Profil A6 60x60 leicht', series: 'A6', w: 60, h: 60, areaMm2: 1001, massPerMeterKg: 2.70, iUprightMm4: 394_700, iFlatMm4: 394_700 },
  { articleNumber: '1106021', label: 'Profil A6 60x60', series: 'A6', w: 60, h: 60, areaMm2: 1333, massPerMeterKg: 3.60, iUprightMm4: 537_700, iFlatMm4: 537_700 },
  { articleNumber: '1106006', label: 'Profil A6 120x30 leicht', series: 'A6', w: 120, h: 30, areaMm2: 1153, massPerMeterKg: 3.11, iUprightMm4: 1_526_500, iFlatMm4: 108_200 },
  { articleNumber: '1106005', label: 'Profil A6 120x30', series: 'A6', w: 120, h: 30, areaMm2: 1600, massPerMeterKg: 4.32, iUprightMm4: 2_109_400, iFlatMm4: 154_200 },
  { articleNumber: '1106008', label: 'Profil A6 120x60 leicht', series: 'A6', w: 120, h: 60, areaMm2: 1870, massPerMeterKg: 5.05, iUprightMm4: 2_596_500, iFlatMm4: 766_100 },
  { articleNumber: '1106007', label: 'Profil A6 120x60', series: 'A6', w: 120, h: 60, areaMm2: 2484, massPerMeterKg: 6.71, iUprightMm4: 3_476_200, iFlatMm4: 1_027_100 },

  // --- A8 · Nut 8 -------------------------------------------------------------
  { articleNumber: '1108035', label: 'Profil A8 40x40 eco', series: 'A8', w: 40, h: 40, areaMm2: 507, massPerMeterKg: 1.37, iUprightMm4: 73_800, iFlatMm4: 73_800 },
  { articleNumber: '1108038', label: 'Profil A8 40x40 leicht', series: 'A8', w: 40, h: 40, areaMm2: 646, massPerMeterKg: 1.74, iUprightMm4: 90_000, iFlatMm4: 90_000 },
  { articleNumber: '1108034', label: 'Profil A8 40x40', series: 'A8', w: 40, h: 40, areaMm2: 916, massPerMeterKg: 2.47, iUprightMm4: 139_600, iFlatMm4: 139_600 },

  { articleNumber: '1108029', label: 'Profil A8 40x16', series: 'A8', w: 40, h: 16, areaMm2: 424, massPerMeterKg: 1.13, iUprightMm4: 68_900, iFlatMm4: 10_500 },
  { articleNumber: '1108031', label: 'Profil A8 40x16 eco', series: 'A8', w: 40, h: 16, areaMm2: 224, massPerMeterKg: 0.60, iUprightMm4: 33_400, iFlatMm4: 6_400 },

  { articleNumber: '1108051', label: 'Profil A8 80x40 eco', series: 'A8', w: 80, h: 40, areaMm2: 893, massPerMeterKg: 2.42, iUprightMm4: 578_100, iFlatMm4: 151_500 },
  { articleNumber: '1108055', label: 'Profil A8 80x40 leicht', series: 'A8', w: 80, h: 40, areaMm2: 1138, massPerMeterKg: 3.04, iUprightMm4: 695_400, iFlatMm4: 166_000 },
  { articleNumber: '1108050', label: 'Profil A8 80x40', series: 'A8', w: 80, h: 40, areaMm2: 1676, massPerMeterKg: 4.53, iUprightMm4: 1_011_900, iFlatMm4: 268_700 },

  { articleNumber: '1108047', label: 'Profil A8 80x16', series: 'A8', w: 80, h: 16, areaMm2: 813, massPerMeterKg: 2.20, iUprightMm4: 507_600, iFlatMm4: 21_500 },
  { articleNumber: '1108048', label: 'Profil A8 80x16 eco', series: 'A8', w: 80, h: 16, areaMm2: 486, massPerMeterKg: 1.31, iUprightMm4: 268_000, iFlatMm4: 14_900 },

  { articleNumber: '1108062', label: 'Profil A8 80x80 eco', series: 'A8', w: 80, h: 80, areaMm2: 1486, massPerMeterKg: 4.01, iUprightMm4: 1_006_900, iFlatMm4: 1_006_900 },
  { articleNumber: '1108063', label: 'Profil A8 80x80 leicht', series: 'A8', w: 80, h: 80, areaMm2: 1975, massPerMeterKg: 5.33, iUprightMm4: 1_340_600, iFlatMm4: 1_340_600 },
  { articleNumber: '1108061', label: 'Profil A8 80x80', series: 'A8', w: 80, h: 80, areaMm2: 2666, massPerMeterKg: 7.19, iUprightMm4: 1_877_000, iFlatMm4: 1_877_000 },

  { articleNumber: '1108012', label: 'Profil A8 120x40 leicht', series: 'A8', w: 120, h: 40, areaMm2: 1612, massPerMeterKg: 4.35, iUprightMm4: 2_205_400, iFlatMm4: 242_200 },
  { articleNumber: '1108011', label: 'Profil A8 120x40', series: 'A8', w: 120, h: 40, areaMm2: 2438, massPerMeterKg: 6.58, iUprightMm4: 3_226_600, iFlatMm4: 398_000 },
  { articleNumber: '1108016', label: 'Profil A8 120x80 leicht', series: 'A8', w: 120, h: 80, areaMm2: 3013, massPerMeterKg: 8.13, iUprightMm4: 4_216_700, iFlatMm4: 2_018_900 },
  { articleNumber: '1108014', label: 'Profil A8 120x80', series: 'A8', w: 120, h: 80, areaMm2: 4023, massPerMeterKg: 11.07, iUprightMm4: 5_776_100, iFlatMm4: 2_756_200 },

  { articleNumber: '1108020', label: 'Profil A8 160x40 leicht', series: 'A8', w: 160, h: 40, areaMm2: 2090, massPerMeterKg: 5.64, iUprightMm4: 5_003_200, iFlatMm4: 318_100 },
  { articleNumber: '1108019', label: 'Profil A8 160x40', series: 'A8', w: 160, h: 40, areaMm2: 3200, massPerMeterKg: 8.64, iUprightMm4: 7_396_200, iFlatMm4: 527_200 },
  { articleNumber: '1108018', label: 'Profil A8 160x28', series: 'A8', w: 160, h: 28, areaMm2: 3107, massPerMeterKg: 8.39, iUprightMm4: 7_268_200, iFlatMm4: 204_900 },
  { articleNumber: '1108024', label: 'Profil A8 160x80 leicht', series: 'A8', w: 160, h: 80, areaMm2: 3780, massPerMeterKg: 10.21, iUprightMm4: 9_078_800, iFlatMm4: 2_670_700 },
  { articleNumber: '1108022', label: 'Profil A8 160x80', series: 'A8', w: 160, h: 80, areaMm2: 5007, massPerMeterKg: 13.52, iUprightMm4: 12_283_300, iFlatMm4: 3_608_900 },

  // --- A10 · Nut 10 -----------------------------------------------------------
  { articleNumber: '1110001', label: 'Profil A10 50x50 eco', series: 'A10', w: 50, h: 50, areaMm2: 847, massPerMeterKg: 2.29, iUprightMm4: 203_400, iFlatMm4: 203_400 },
  { articleNumber: '1110002', label: 'Profil A10 50x50', series: 'A10', w: 50, h: 50, areaMm2: 1331, massPerMeterKg: 3.59, iUprightMm4: 306_800, iFlatMm4: 306_800 },
  { articleNumber: '1110003', label: 'Profil A10 100x50 eco', series: 'A10', w: 100, h: 50, areaMm2: 1340, massPerMeterKg: 3.62, iUprightMm4: 1_437_500, iFlatMm4: 364_000 },
  { articleNumber: '1110004', label: 'Profil A10 100x50', series: 'A10', w: 100, h: 50, areaMm2: 2470, massPerMeterKg: 6.67, iUprightMm4: 2_274_700, iFlatMm4: 612_800 },
  { articleNumber: '1110005', label: 'Profil A10 100x100 eco', series: 'A10', w: 100, h: 100, areaMm2: 2174, massPerMeterKg: 5.87, iUprightMm4: 2_379_800, iFlatMm4: 2_379_800 },
  { articleNumber: '1110006', label: 'Profil A10 100x100', series: 'A10', w: 100, h: 100, areaMm2: 3957, massPerMeterKg: 10.68, iUprightMm4: 4_314_100, iFlatMm4: 4_314_100 },
];

/**
 * Nutgeometrie je Baureihe (Nutbreite = Namensgeber). Für A8 aus dem
 * NOVAMOTIS-Zuschnittskonfigurator übernommen (bestätigte Werte). A5/A6/A10
 * sind proportional zur Nutgröße geschätzt — nur für die Querschnittsgrafik
 * relevant, nicht für die Trägheitsmoment-Berechnung.
 */
const SERIES_GEO: Record<ProfileSeries, { slotWidth: number; slotDepth: number; grooveWidth: number; cornerR: number; boreRadius: number }> = {
  A5: { slotWidth: 3.0, slotDepth: 5, grooveWidth: 7.5, cornerR: 2, boreRadius: 2.2 },
  A6: { slotWidth: 3.3, slotDepth: 6, grooveWidth: 9, cornerR: 2.5, boreRadius: 2.6 },
  A8: { slotWidth: 4.5, slotDepth: 8, grooveWidth: 12.25, cornerR: 4, boreRadius: 3.4 },
  A10: { slotWidth: 5.5, slotDepth: 10, grooveWidth: 15, cornerR: 5, boreRadius: 4.2 },
};

/**
 * Schätzt die Wandstärke [mm] aus Außenmaß und Querschnittsfläche (Modell:
 * einfaches Hohlrechteck). Nur zur Veranschaulichung in der Querschnittsgrafik,
 * reale Profile haben zusätzliche Innenstege.
 */
export function estimateWallThicknessMm(profile: DeflectionProfile): number {
  const { w, h, areaMm2 } = profile;
  const sum = w + h;
  const disc = sum * sum - 4 * areaMm2;
  if (disc <= 0) return 3;
  const t = (sum - Math.sqrt(disc)) / 4;
  return Math.min(Math.max(t, 1.5), Math.min(w, h) / 2 - 1);
}

/**
 * Baut ein `ProfileSection`-kompatibles Objekt für die Querschnittsgrafik
 * (ProfileCrossSection2D). Die Ausrichtung (hochkant/flach) wird über die
 * `rotate90`-Prop der Grafik gesteuert, nicht über getauschte w/h hier.
 */
export function toProfileSection(profile: DeflectionProfile): ProfileSection {
  return {
    id: profile.articleNumber,
    label: profile.label,
    sizeKey: `${profile.w}x${profile.h}`,
    variant: 'leicht',
    w: profile.w,
    h: profile.h,
    ...SERIES_GEO[profile.series],
    webThickness: estimateWallThicknessMm(profile),
    pricePerMeter: 0,
    massPerMeter: profile.massPerMeterKg,
  };
}
