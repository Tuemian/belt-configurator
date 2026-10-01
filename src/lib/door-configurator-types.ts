// Tortechnik-Konfigurator (Schnelllauftore): Typen, Katalogdaten und Preisberechnung.
// Datenquelle: ALVÁRIS "Auswahlkonfigurator_intern.xlsm" (Kalkulationsstückliste_Folie/_Alu,
// zulaessige Werte). Werte 1:1 aus der Excel übernommen (programmatisch ausgelesen, nicht
// manuell abgetippt) — bei Änderungen an der Excel-Quelle hier nachziehen.

export type DoorType = 'folie' | 'alu';
export type MountingType = 'boden' | 'wand';
export type DriveOrientation = 'unten' | 'oben';
export type Voltage = '230V' | '400V';
export type CableLength = 'standard' | 'sonderlaenge';
export type LightBarrier = 'lichtgitter' | 'lichtschranke';
export type RailFinish = 'standard' | 'ral';
export type CurtainMaterial = 'standard' | 'monofil' | 'pvc_leicht' | 'pvc_transparent';
export type WindowVariant = 'standard' | 'zusatz' | 'sondergroesse' | 'ohne';
export type WindowFinish = 'klar' | 'schweisserschutz';

export interface DoorConfig {
  doorType: DoorType;
  widthMm: number;
  heightMm: number;
  quantity: number;
  mounting: MountingType;
  motorCover: boolean;
  driveOrientation: DriveOrientation;
  voltage: Voltage;
  cableLength: CableLength;
  cableExtraMeters: number;
  lightBarrier: LightBarrier;
  railFinish: RailFinish;
  /** Nur wenn railFinish/curtainColor 'RAL nach Wahl' ist: konkreter RAL-Code, z. B. "7016". */
  ralCode: string;
  /** Nur bei doorType === 'folie' relevant (Alu-Torbehang ist immer Hohlkammerlamellen). */
  curtainMaterial: CurtainMaterial;
  /** Freies Label — Folie: Blau/Grau/Orange; Alu: Weißaluminium/Anthrazitgrau/Verkehrsweiß/RAL nach Wunsch. */
  curtainColor: string;
  windowVariant: WindowVariant;
  windowFinish: WindowFinish;
  customWindowWidthMm: number;
  customWindowHeightMm: number;
  /** Nur bei doorType === 'alu' relevant. */
  lightLamellas: boolean;
  lamellaWindowHeightMm: number;
  /** IDs aus DOOR_EXTRA_OPTIONS, die der Nutzer zusätzlich angehakt hat. */
  extraOptionIds: string[];
}

export const DEFAULT_DOOR_CONFIG: DoorConfig = {
  doorType: 'folie',
  widthMm: 2500,
  heightMm: 3500,
  quantity: 1,
  mounting: 'boden',
  motorCover: true,
  driveOrientation: 'unten',
  voltage: '230V',
  cableLength: 'standard',
  cableExtraMeters: 0,
  lightBarrier: 'lichtgitter',
  railFinish: 'standard',
  ralCode: '7016',
  curtainMaterial: 'standard',
  curtainColor: 'Blau (ähnlich RAL 5010)',
  windowVariant: 'standard',
  windowFinish: 'klar',
  customWindowWidthMm: 600,
  customWindowHeightMm: 600,
  lightLamellas: true,
  lamellaWindowHeightMm: 308,
  extraOptionIds: [],
};

export interface BracketTable {
  widths: number[];
  prices: number[];
}

export interface GrundpreisGrid {
  widths: number[];
  heights: number[];
  matrix: (number | null)[][];
}

/**
 * Rundet auf die nächstgrößere in der Tabelle vorhandene Breite auf (dokumentierte Annahme:
 * die Original-Excel-Formel ist nicht einsehbar, "aufrunden" ist für ein Richtpreis-Tool die
 * risikoärmere Konvention als abrunden). Liefert null, wenn value über der größten Stufe liegt.
 */
function matchBracket(table: BracketTable, value: number): number | null {
  for (let i = 0; i < table.widths.length; i++) {
    if (value <= table.widths[i]) return table.prices[i];
  }
  return null;
}

function findBracketIndex(steps: number[], value: number): number | null {
  for (let i = 0; i < steps.length; i++) {
    if (value <= steps[i]) return i;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Grundpreis-Matrizen (Breite × Höhe, 1000–5000mm in 250er-Schritten)
// ---------------------------------------------------------------------------

export const GRUNDPREIS_FOLIE: GrundpreisGrid = {
  widths: [1000, 1250, 1500, 1750, 2000, 2250, 2500, 2750, 3000, 3250, 3500, 3750, 4000, 4250, 4500, 4750, 5000],
  heights: [1000, 1250, 1500, 1750, 2000, 2250, 2500, 2750, 3000, 3250, 3500, 3750, 4000, 4250, 4500, 4750, 5000],
  matrix: [
    [2950, 2990, 3030, 3070, 3110, 3150, 3190, 3230, 3270, 3310, 3350, 3390, 3430, 3470, 3510, 3550, 3590],
    [2990, 3030, 3070, 3110, 3150, 3190, 3230, 3270, 3310, 3350, 3390, 3430, 3470, 3510, 3550, 3590, 3630],
    [3030, 3070, 3110, 3150, 3190, 3230, 3270, 3310, 3350, 3390, 3430, 3470, 3510, 3550, 3590, 3630, 3670],
    [3070, 3110, 3150, 3190, 3230, 3270, 3310, 3350, 3390, 3430, 3470, 3510, 3550, 3590, 3630, 3670, 3710],
    [3110, 3150, 3190, 3230, 3270, 3310, 3350, 3390, 3430, 3470, 3510, 3550, 3590, 3630, 3670, 3710, 3750],
    [3150, 3190, 3230, 3270, 3310, 3350, 3390, 3430, 3470, 3510, 3550, 3590, 3630, 3670, 3710, 3750, 3790],
    [3190, 3230, 3270, 3310, 3350, 3390, 3430, 3470, 3510, 3550, 3590, 3630, 3670, 3710, 3750, 3790, 3830],
    [3230, 3270, 3310, 3350, 3390, 3430, 3470, 3510, 3550, 3590, 3630, 3670, 3710, 3750, 3790, 3830, 3870],
    [3270, 3310, 3350, 3390, 3430, 3470, 3510, 3550, 3590, 3630, 3670, 3710, 3750, 3790, 3830, 3870, 3990],
    [3310, 3350, 3390, 3430, 3470, 3510, 3550, 3590, 3630, 3670, 3710, 3750, 3790, 3830, 3870, 3990, 4110],
    [3350, 3390, 3430, 3470, 3510, 3550, 3590, 3630, 3670, 3710, 3750, 3790, 3830, 3870, 3990, 4110, 4230],
    [3390, 3430, 3470, 3510, 3550, 3590, 3630, 3670, 3710, 3750, 3790, 3830, 3870, 3990, 4110, 4230, 4350],
    [3430, 3470, 3510, 3550, 3590, 3630, 3670, 3710, 3750, 3790, 3830, 3870, 3985, 4110, 4230, 4350, 4470],
    [3470, 3510, 3550, 3590, 3630, 3670, 3710, 3750, 3790, 3830, 3870, 3990, 4105, 4230, 4350, 4470, 4590],
    [3510, 3550, 3590, 3630, 3670, 3710, 3750, 3790, 3830, 3870, 3990, 4110, 4225, 4350, 4470, 4590, 4710],
    [3550, 3590, 3630, 3670, 3710, 3750, 3790, 3830, 3870, 3990, 4110, 4230, 4345, 4470, 4590, 4710, 4830],
    [3590, 3630, 3670, 3710, 3750, 3790, 3830, 3870, 3990, 4110, 4230, 4350, 4465, 4590, 4710, 4830, 4950],
  ],
};

export const GRUNDPREIS_ALU: GrundpreisGrid = {
  widths: [1000, 1250, 1500, 1750, 2000, 2250, 2500, 2750, 3000, 3250, 3500, 3750, 4000, 4250, 4500, 4750, 5000],
  heights: [1000, 1250, 1500, 1750, 2000, 2250, 2500, 2750, 3000, 3250, 3500, 3750, 4000, 4250, 4500, 4750, 5000],
  matrix: [
    [3150, 3200, 3250, 3300, 3350, 3400, 3450, 3500, 3550, 3600, 3650, 3700, 3750, 3800, 3850, 3900, 3950],
    [3200, 3250, 3300, 3350, 3400, 3450, 3500, 3550, 3600, 3650, 3700, 3750, 3800, 3850, 3900, 3950, 4000],
    [3250, 3300, 3350, 3400, 3450, 3500, 3550, 3600, 3650, 3700, 3750, 3800, 3850, 3900, 3950, 4000, 4050],
    [3300, 3350, 3400, 3450, 3500, 3550, 3600, 3650, 3700, 3750, 3800, 3850, 3900, 3950, 4000, 4050, 4100],
    [3350, 3400, 3450, 3500, 3550, 3600, 3650, 3700, 3750, 3800, 3850, 3900, 3950, 4000, 4050, 4100, 4225],
    [3400, 3450, 3500, 3550, 3600, 3650, 3700, 3750, 3800, 3850, 3900, 3950, 4000, 4050, 4100, 4225, 4355],
    [3450, 3500, 3550, 3600, 3650, 3700, 3750, 3800, 3850, 3900, 3950, 4000, 4050, 4100, 4225, 4355, 4485],
    [3500, 3550, 3600, 3650, 3700, 3750, 3800, 3850, 3900, 3950, 4000, 4050, 4100, 4225, 4355, 4485, 4615],
    [3550, 3600, 3650, 3700, 3750, 3800, 3850, 3900, 3950, 4000, 4050, 4100, 4200, 4355, 4485, 4615, 4745],
    [3600, 3650, 3700, 3750, 3800, 3850, 3900, 3950, 4000, 4050, 4100, 4150, 4300, 4485, 4615, 4745, 4875],
    [3650, 3700, 3750, 3800, 3850, 3900, 3950, 4000, 4050, 4100, 4150, 4200, 4400, 4615, 4825, 4955, 5005],
    [3700, 3750, 3800, 3850, 3900, 3950, 4000, 4050, 4100, 4150, 4200, 4250, 4530, 4825, 5035, 5085, null],
    [3750, 3800, 3850, 3900, 3950, 4000, 4050, 4100, 4150, 4200, 4300, 4450, 4735, 5035, 5165, null, null],
    [3800, 3850, 3900, 3950, 4000, 4050, 4100, 4150, 4200, 4250, 4425, 4580, 4865, null, null, null, null],
    [3850, 3900, 3950, 4000, 4050, 4100, 4150, 4200, 4250, 4300, 4555, 4710, 4995, null, null, null, null],
    [3900, 3950, 4000, 4050, 4100, 4150, 4200, 4250, 4300, 4430, 4685, 4840, null, null, null, null, null],
    [3950, 4000, 4050, 4100, 4150, 4200, 4250, 4300, 4430, 4560, 4815, null, null, null, null, null, null],
  ],
};

/**
 * Grundpreis für Breite/Höhe. Liefert null (→ "Preis auf Anfrage"), wenn:
 * - Breite/Höhe unter der Gitter-Untergrenze (1000mm) liegt — laut "zulaessige Werte" sind
 *   technisch 500mm erlaubt, dafür existieren in der Kalkulation aber keine Grundpreise.
 * - Breite/Höhe über 5000mm liegt.
 * - die Breite/Höhe-Kombination bei Alu gesperrt ist ("Sp." in der Excel — sehr große Tore).
 */
export function lookupGrundpreis(type: DoorType, widthMm: number, heightMm: number): number | null {
  const grid = type === 'folie' ? GRUNDPREIS_FOLIE : GRUNDPREIS_ALU;
  if (widthMm < grid.widths[0] || heightMm < grid.heights[0]) return null;
  const wIdx = findBracketIndex(grid.widths, widthMm);
  const hIdx = findBracketIndex(grid.heights, heightMm);
  if (wIdx === null || hIdx === null) return null;
  return grid.matrix[hIdx][wIdx];
}

// ---------------------------------------------------------------------------
// Aufpreis-Tabellen (nach Breite gestaffelt)
// ---------------------------------------------------------------------------

export const BALLENVERKLEIDUNG_FOLIE: BracketTable = {
  widths: [1000, 1250, 1500, 1750, 2000, 2250, 2500, 2750, 3000, 3250, 3500, 3750, 4000, 4250, 4500, 4750, 5000],
  prices: [71.69, 89.88, 107, 125.19, 143.38, 160.5, 178.69, 196.88, 260, 270, 280, 290, 300, 310, 320, 330, 340],
};
export const BALLENVERKLEIDUNG_ALU: BracketTable = {
  widths: [1000, 1250, 1500, 1750, 2000, 2250, 2500, 2750, 3000, 3250, 3500, 3750, 4000, 4250, 4500, 4750, 5000],
  prices: [120, 135, 150, 165, 180, 195, 210, 280, 292, 304, 316, 328, 340, 352, 364, 376, 388],
};
// Identisch für beide Tortypen laut Excel.
export const STEHER_NIVELLIER: BracketTable = {
  widths: [1000, 1250, 1500, 1750, 2000, 2250, 2500, 2750, 3000, 3250, 3500, 3750, 4000, 4250, 4500, 4750, 5000],
  prices: [180, 180, 180, 180, 180, 180, 180, 220, 220, 220, 220, 220, 260, 260, 260, 260, 260],
};
export const VERPACKUNGSKISTE_FOLIE: BracketTable = {
  widths: [1200, 2400, 3600, 5000],
  prices: [100, 140, 180, 220],
};
export const VERPACKUNGSKISTE_ALU: BracketTable = {
  widths: [1200, 2400, 3600, 5000],
  prices: [120, 160, 200, 240],
};

// ---------------------------------------------------------------------------
// Transportkosten je Tor, gestaffelt nach Bestellmenge (identisch für beide Tortypen).
// Werte 1–10 direkt aus der Excel ("Richtpreis Transport bis zur Anlieferung bei Alvaris").
// Ab 11 Toren: lineare Fortführung mit dem ab Menge 3 durchgehend beobachteten Schritt von
// +172,50 € Gesamtkosten pro zusätzlichem Tor (nicht von Alvaris bestätigt, aus dem Muster
// der vorhandenen 10 Werte abgeleitet).
// ---------------------------------------------------------------------------

const TRANSPORT_PRO_TOR_BIS_10 = [460.0, 333.5, 276.0, 250.13, 234.6, 224.25, 216.86, 211.31, 207.0, 203.55];

export function transportGesamtkosten(quantity: number): number {
  if (quantity <= 0) return 0;
  if (quantity <= 10) return TRANSPORT_PRO_TOR_BIS_10[quantity - 1] * quantity;
  const gesamtBei10 = TRANSPORT_PRO_TOR_BIS_10[9] * 10;
  return gesamtBei10 + 172.5 * (quantity - 10);
}

// ---------------------------------------------------------------------------
// Standardaufschlag auf den Tor-Grundpreis (Grundpreis + Aufpreise + Optionen).
// Verpackung & Transport bleiben Durchlaufposten ohne Aufschlag (mit Nutzer abgestimmt).
// ---------------------------------------------------------------------------

export const STANDARDAUFSCHLAG: Record<DoorType, number> = { folie: 1.7, alu: 1.8 };

// ---------------------------------------------------------------------------
// Zusatzoptionen ohne Kopplung an ein Konfigurationsfeld (freie Checkliste, Step 4).
// ---------------------------------------------------------------------------

export interface ExtraOptionDef {
  id: string;
  label: string;
  price: number;
  unit: 'stk' | 'kiste';
}

export const DOOR_EXTRA_OPTIONS: Record<DoorType, ExtraOptionDef[]> = {
  folie: [
    { id: 'tst_rfid', label: 'TST RFUxIO-E-LL10 Feig Karte', price: 125, unit: 'stk' },
    { id: 'pilz_750103', label: 'Pilz 750103', price: 120, unit: 'stk' },
    { id: 'pilz_psen_cs31', label: 'Pilz PSEN cs 3.1 – 541003 Set & 630312 Extra-Kabel-Set (anstatt 2.1)', price: 70, unit: 'stk' },
    { id: 'zusatzklemmen', label: 'Zusatzklemmen', price: 5, unit: 'stk' },
    { id: 'stahlgehaeuse', label: 'Stahlgehäuse Sonder 400×600×200 mm', price: 45, unit: 'stk' },
    { id: 'osb_verpackung', label: 'Verpackung: OSB-Zuschlag anstatt Holzkiste', price: 30, unit: 'kiste' },
  ],
  alu: [
    { id: 'tst_rfid', label: 'TST RFUxIO-E-LL10 Feig Karte', price: 125, unit: 'stk' },
    { id: 'pilz_750103', label: 'Pilz 750103', price: 120, unit: 'stk' },
    { id: 'pilz_psen_cs31', label: 'Pilz PSEN cs 3.1 – 541003 Set & 630312 Extra-Kabel-Set (anstatt 2.1)', price: 70, unit: 'stk' },
    { id: 'zusatzklemmen', label: 'Zusatzklemmen', price: 5, unit: 'stk' },
    { id: 'stahlgehaeuse', label: 'Stahlgehäuse Sonder 400×600×200 mm', price: 45, unit: 'stk' },
    { id: 'osb_verpackung', label: 'Verpackung: OSB-Zuschlag anstatt Holzkiste', price: 30, unit: 'kiste' },
  ],
};

// ---------------------------------------------------------------------------
// Preisberechnung
// ---------------------------------------------------------------------------

export interface DoorPriceItem {
  label: string;
  amount: number;
}

export type DoorPriceStatus = 'complete' | 'unavailable';

export interface DoorPriceResult {
  status: DoorPriceStatus;
  /** Grundpreis + Aufpreise + Optionen je Tor, vor Aufschlag. */
  aufschlagsbasisProTor?: number;
  aufschlagFaktor?: number;
  /** (Grundpreis + Aufpreise + Optionen) × Aufschlag, je Tor. */
  torpreisProTor?: number;
  breakdown?: DoorPriceItem[];
  verpackungGesamt?: number;
  transportGesamt?: number;
  gesamt?: number;
}

function area(widthMm: number, heightMm: number): number {
  return (widthMm / 1000) * (heightMm / 1000);
}

export function calculateDoorPrice(config: DoorConfig): DoorPriceResult {
  const { doorType, widthMm, heightMm, quantity } = config;
  const grundpreis = lookupGrundpreis(doorType, widthMm, heightMm);
  if (grundpreis === null || quantity <= 0) {
    return { status: 'unavailable' };
  }

  const ballenTable = doorType === 'folie' ? BALLENVERKLEIDUNG_FOLIE : BALLENVERKLEIDUNG_ALU;
  const verpackungTable = doorType === 'folie' ? VERPACKUNGSKISTE_FOLIE : VERPACKUNGSKISTE_ALU;
  const options = doorType === 'folie' ? RAW_OPTIONS_FOLIE : RAW_OPTIONS_ALU;

  // Ballenverkleidung ist laut beiden Musterkalkulationen immer inkludiert (kein Toggle).
  const ballenverkleidung = matchBracket(ballenTable, widthMm) ?? 0;
  const steherNivellierplatte = config.mounting === 'boden' ? matchBracket(STEHER_NIVELLIER, widthMm) ?? 0 : 0;

  const breakdown: DoorPriceItem[] = [
    { label: 'Grundpreis', amount: grundpreis },
    { label: 'Ballenverkleidung', amount: ballenverkleidung },
  ];
  if (steherNivellierplatte > 0) {
    breakdown.push({ label: 'Steher mit Fuß und Nivellierplatte', amount: steherNivellierplatte });
  }

  const heightM = heightMm / 1000;
  const widthM = widthMm / 1000;
  const flaeche = area(widthMm, heightMm);

  const addIf = (active: boolean, label: string, amount: number) => {
    if (active && amount !== 0) breakdown.push({ label, amount });
  };

  addIf(config.motorCover, options.antriebsverkleidung.label, options.antriebsverkleidung.price);
  addIf(config.driveOrientation === 'oben', options.schwenkbar.label, options.schwenkbar.price);
  addIf(config.voltage === '400V', options.steuerung400v.label, options.steuerung400v.price);
  addIf(
    config.cableLength === 'sonderlaenge' && config.cableExtraMeters > 0,
    options.kabelverlaengerung.label,
    options.kabelverlaengerung.price * config.cableExtraMeters,
  );
  addIf(config.lightBarrier === 'lichtschranke', options.lichtschranke.label, -options.lichtschranke.price);
  addIf(config.railFinish === 'ral', options.fuehrungsschieneRal.label, options.fuehrungsschieneRal.price * heightM);
  addIf(config.railFinish === 'ral', options.abschlussschieneRal.label, options.abschlussschieneRal.price * widthM);
  addIf(config.railFinish === 'ral', options.ballenverkleidungRal.label, options.ballenverkleidungRal.price * widthM);
  addIf(
    config.railFinish === 'ral' && config.motorCover,
    options.antriebsverkleidungRal.label,
    options.antriebsverkleidungRal.price,
  );

  if (doorType === 'folie') {
    addIf(
      config.windowVariant === 'sondergroesse',
      options.fensterSonder!.label,
      options.fensterSonder!.price * area(config.customWindowWidthMm, config.customWindowHeightMm),
    );
    addIf(config.windowVariant !== 'ohne' && config.windowFinish === 'schweisserschutz', options.fensterSchweisser!.label, options.fensterSchweisser!.price);
    addIf(config.windowVariant === 'zusatz', options.fensterZusatz!.label, options.fensterZusatz!.price);
    addIf(config.curtainMaterial === 'monofil', options.behangMonofil!.label, options.behangMonofil!.price * flaeche);
    addIf(config.curtainMaterial === 'pvc_leicht', options.behangPvcLeicht!.label, -options.behangPvcLeicht!.price * flaeche);
    addIf(config.curtainMaterial === 'pvc_transparent', options.behangPvcTransparent!.label, options.behangPvcTransparent!.price * flaeche);
    addIf(config.curtainColor.toLowerCase().includes('orange'), 'Zusatzaufschlag Orange', 20 * flaeche);
  } else {
    addIf(config.lightLamellas, options.lichtlamellen!.label, options.lichtlamellen!.price * heightM);
    // "+5" laut Excel-Kommentar: Annahme, dass für die Lamellen-Pulverbeschichtung mehr Laufmeter
    // als nur die lichte Höhe benötigt werden.
    addIf(config.railFinish === 'ral', options.lamellenRal!.label, options.lamellenRal!.price * (heightM + 5));
  }

  const extraDefs = DOOR_EXTRA_OPTIONS[doorType];
  for (const id of config.extraOptionIds) {
    const def = extraDefs.find((d) => d.id === id);
    if (def) breakdown.push({ label: def.label, amount: def.price });
  }

  const aufschlagsbasisProTor = breakdown.reduce((sum, item) => sum + item.amount, 0);
  const aufschlagFaktor = STANDARDAUFSCHLAG[doorType];
  const torpreisProTor = aufschlagsbasisProTor * aufschlagFaktor;

  const verpackungProTor = matchBracket(verpackungTable, widthMm) ?? verpackungTable.prices[verpackungTable.prices.length - 1];
  const verpackungGesamt = verpackungProTor * quantity;
  const transportGesamt = transportGesamtkosten(quantity);

  const gesamt = torpreisProTor * quantity + verpackungGesamt + transportGesamt;

  return {
    status: 'complete',
    aufschlagsbasisProTor: round2(aufschlagsbasisProTor),
    aufschlagFaktor,
    torpreisProTor: round2(torpreisProTor),
    breakdown: breakdown.map((b) => ({ label: b.label, amount: round2(b.amount) })),
    verpackungGesamt: round2(verpackungGesamt),
    transportGesamt: round2(transportGesamt),
    gesamt: round2(gesamt),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ---------------------------------------------------------------------------
// Rohdaten der "Optionen"-Tabelle je Tortyp, benannt zugänglich für calculateDoorPrice.
// ---------------------------------------------------------------------------

interface NamedOption {
  label: string;
  price: number;
}

const RAW_OPTIONS_FOLIE: Record<string, NamedOption> = {
  antriebsverkleidung: { label: 'Antriebsverkleidung', price: 75 },
  schwenkbar: { label: 'Antrieb um 180° schwenkbar', price: 50 },
  steuerung400v: { label: 'Steuerung & Antrieb 400V – Etme/Feig (3 Ph)', price: 1350 },
  kabelverlaengerung: { label: 'Kabelverlängerung zwischen Steuerung & Antrieb', price: 10 },
  lichtschranke: { label: 'Lichtschranke & Sicherheitskontaktleiste anstelle Lichtgitter', price: 50 },
  fuehrungsschieneRal: { label: 'Führungsschiene pulverbeschichtet in RAL nach Wahl', price: 150 },
  abschlussschieneRal: { label: 'Abschlussschiene pulverbeschichtet in RAL nach Wahl', price: 80 },
  ballenverkleidungRal: { label: 'Ballenverkleidung pulverbeschichtet in RAL nach Wahl', price: 13 },
  antriebsverkleidungRal: { label: 'Antriebsverkleidung pulverbeschichtet in RAL nach Wahl', price: 14 },
  fensterSonder: { label: 'Sichtfenster mit Sonderabmessungen', price: 110 },
  fensterSchweisser: { label: 'Sichtfenster 500×700mm als Schweißerschutz', price: 85 },
  fensterZusatz: { label: 'Zusätzliches Standard-Sichtfenster 500×700mm', price: 45 },
  behangMonofil: { label: 'Monofilament-Material 2mm – Orange/Blau/Grau', price: 60 },
  behangPvcLeicht: { label: 'PVC-Behang ca. 1mm/900gr. mit Sichtfenster 500×700mm', price: 25 },
  behangPvcTransparent: { label: 'PVC transparent ca. 2mm mit senkrechten Gewebestreifen', price: 15 },
};

const RAW_OPTIONS_ALU: Record<string, NamedOption> = {
  antriebsverkleidung: { label: 'Antriebsverkleidung', price: 85 },
  schwenkbar: { label: 'Antrieb um 180° schwenkbar', price: 50 },
  steuerung400v: { label: 'Steuerung & Antrieb 400V – Etme/Feig (3 Ph)', price: 1350 },
  kabelverlaengerung: { label: 'Kabelverlängerung zwischen Steuerung & Antrieb', price: 10 },
  lichtschranke: { label: 'Lichtschranke & Sicherheitskontaktleiste anstelle Lichtgitter', price: 50 },
  fuehrungsschieneRal: { label: 'Führungsschiene pulverbeschichtet in RAL nach Wahl', price: 160 },
  abschlussschieneRal: { label: 'Abschlussschiene pulverbeschichtet in RAL nach Wahl', price: 90 },
  ballenverkleidungRal: { label: 'Ballenverkleidung pulverbeschichtet in RAL nach Wahl', price: 14 },
  antriebsverkleidungRal: { label: 'Antriebsverkleidung pulverbeschichtet in RAL nach Wahl', price: 15 },
  lichtlamellen: { label: 'Lichtlamellen mit einseitigem Polycarbonat & Gummi integriert', price: 10 },
  lamellenRal: { label: 'Lamellen pulverbeschichtet beidseitig in RAL nach Wahl', price: 8 },
};

/** Anzahl Sichtlamellen aus der gewünschten Fensterhöhe (77mm je Lamelle, rein informativ). */
export function lamellenAnzahlAusHoehe(fensterHoeheMm: number): number {
  return Math.max(1, Math.round(fensterHoeheMm / 77));
}
