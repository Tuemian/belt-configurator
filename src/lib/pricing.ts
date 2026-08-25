import * as XLSX from '@e965/xlsx';
import { supabase } from '@/integrations/supabase/client';
import type { ConveyorConfig } from '@/lib/configurator-types';
import { evalCondition, evalNumber, type FormulaContext } from '@/lib/formula-engine';

export type PriceStatus = 'complete' | 'partial' | 'unavailable';

export type PriceItem = {
  key: string;
  label: string;
  labelDe: string;
  labelEn: string;
  labelIt: string;
  quantity: number;
  unit: string;
  unitPrice?: number;
  total?: number;
  available: boolean;
};

export type PriceCalculationResult = {
  status: PriceStatus;
  total?: number;
  breakdown: PriceItem[];
  missingKeys: string[];
};

type PricingComponent = {
  id: string;
  tool: string;
  key: string;
  label_de: string;
  label_en: string;
  label_it: string;
  unit: string;
  price_eur: number | null;
  active: boolean;
};

type PricingRule = {
  id: string;
  component_id: string;
  tool: string;
  condition: Record<string, unknown> | null;
  quantity_formula: string;
  priority: number;
};

type PricingTable = {
  components: Map<string, PricingComponent>; // key -> component
  rules: PricingRule[];
};

let cache: { data: PricingTable | null; expires: number } | null = null;
let pricingOverride: PricingTable | null = null;
const CACHE_MS = 5 * 60 * 1000;

function labelFromKey(key: string): string {
  return key.split('_').map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
}

async function loadPricingTable(tool: string): Promise<PricingTable | null> {
  if (pricingOverride) return pricingOverride;
  if (cache && cache.expires > Date.now()) return cache.data;

  try {
    const [compsRes, rulesRes] = await Promise.all([
      supabase.from('pricing_components').select('*').eq('tool', tool).eq('active', true),
      supabase.from('pricing_rules').select('*').eq('tool', tool).order('priority', { ascending: true }),
    ]);

    if (compsRes.error || rulesRes.error || !compsRes.data || !rulesRes.data) {
      cache = { data: null, expires: Date.now() + 30_000 };
      return null;
    }

    const components = new Map<string, PricingComponent>();
    for (const c of compsRes.data as unknown as PricingComponent[]) {
      components.set(c.id, c);
    }
    const data: PricingTable = { components, rules: rulesRes.data as unknown as PricingRule[] };
    cache = { data, expires: Date.now() + CACHE_MS };
    return data;
  } catch {
    return null;
  }
}

export function invalidatePricingCache(): void {
  cache = null;
}

function configToContext(config: ConveyorConfig): FormulaContext {
  return {
    length_m: config.beltLength / 1000,
    width_m: config.frameWidth / 1000,
    belt_length_mm: config.beltLength,
    frame_width_mm: config.frameWidth,
    belt_type: config.beltType,
    drive_type: config.driveType,
    with_stand: !!config.withStand,
    floor_element: config.floorElement ?? '',
    height_adjust: !!config.heightAdjust,
    floor_bolts: !!config.floorBolts,
    side_guide_height: config.sideGuideHeight,
  };
}

export async function calculatePrice(config: ConveyorConfig): Promise<PriceCalculationResult> {
  const table = await loadPricingTable('belt');
  if (!table) {
    return { status: 'unavailable', breakdown: [], missingKeys: [] };
  }

  const ctx = configToContext(config);
  const missingKeys: string[] = [];
  const breakdown: PriceItem[] = [];

  for (const rule of table.rules) {
    const comp = table.components.get(rule.component_id);
    if (!comp || !comp.active) continue;

    let matches = false;
    try {
      matches = evalCondition(rule.condition, ctx);
    } catch {
      matches = false;
    }
    if (!matches) continue;

    let quantity = 1;
    try {
      quantity = evalNumber(rule.quantity_formula, ctx);
    } catch {
      quantity = 1;
    }
    if (!Number.isFinite(quantity) || quantity <= 0) quantity = 1;

    const fallback = labelFromKey(comp.key);
    if (comp.price_eur === null || comp.price_eur === undefined || Number(comp.price_eur) <= 0) {
      missingKeys.push(comp.key);
      breakdown.push({
        key: comp.key,
        label: comp.label_en || fallback,
        labelDe: comp.label_de || fallback,
        labelEn: comp.label_en || fallback,
        labelIt: comp.label_it || fallback,
        quantity,
        unit: comp.unit,
        available: false,
      });
      continue;
    }

    const unitPrice = Number(comp.price_eur);
    breakdown.push({
      key: comp.key,
      label: comp.label_en,
      labelDe: comp.label_de,
      labelEn: comp.label_en,
      labelIt: comp.label_it,
      quantity,
      unit: comp.unit,
      unitPrice,
      total: unitPrice * quantity,
      available: true,
    });
  }

  if (missingKeys.length > 0) {
    return { status: 'partial', breakdown, missingKeys };
  }

  const total = breakdown.reduce((sum, item) => sum + (item.total ?? 0), 0);
  return { status: 'complete', total, breakdown, missingKeys };
}

// Test-API behalten — Tabelle direkt setzen
export function __setPricingTableForTests(rows: Array<{
  key: string;
  labelDe?: string;
  labelEn?: string;
  labelIt?: string;
  priceEur?: number | null;
  unit?: string;
}> | null): void {
  cache = null;
  if (!rows) {
    pricingOverride = null;
    return;
  }
  // Mappt die alte XLSX-Struktur auf die neue Logik mit fest verdrahteten Regeln (für Tests)
  const components = new Map<string, PricingComponent>();
  const rules: PricingRule[] = [];
  rows.forEach((r) => {
    const fallback = labelFromKey(r.key);
    const id = r.key;
    components.set(id, {
      id,
      tool: 'belt',
      key: r.key,
      label_de: r.labelDe ?? fallback,
      label_en: r.labelEn ?? fallback,
      label_it: r.labelIt ?? fallback,
      unit: r.unit ?? 'per_unit',
      price_eur: r.priceEur ?? null,
      active: true,
    });
  });
  // Mengenregeln wie in der Original-Logik
  const ruleSpecs: Array<[string, Record<string, unknown>, string, number]> = [
    ['frame_motis40',   { _expr: 'frame_width_mm <= 500' }, 'length_m', 10],
    ['frame_motis80',   { _expr: 'frame_width_mm > 500' },  'length_m', 10],
    ['belt_standard',   { belt_type: 'standard' },          'length_m * width_m', 20],
    ['belt_grip',       { belt_type: 'grip' },              'length_m * width_m', 20],
    ['belt_heavy_grip', { belt_type: 'heavy-grip' },        'length_m * width_m', 20],
    ['belt_food_safe',  { belt_type: 'food-safe' },         'length_m * width_m', 20],
    ['drive_direct',    { drive_type: 'direct' },           '1', 30],
    ['drive_indirect',  { drive_type: 'indirect' },         '1', 30],
    ['drive_center',    { drive_type: 'center' },           '1', 30],
    ['drive_drum',      { drive_type: 'drum' },             '1', 30],
    ['stand_basic',     { with_stand: true },               '1', 40],
    ['feet_set',        { with_stand: true, floor_element: 'feet' }, '1', 41],
    ['castor_set',      { with_stand: true, _expr: 'floor_element != "feet"' }, '1', 41],
    ['height_adjust',   { with_stand: true, height_adjust: true }, '1', 42],
    ['floor_bolt_set',  { with_stand: true, floor_bolts: true }, '1', 43],
    ['side_guide',      { _expr: 'side_guide_height > 0' }, 'length_m', 50],
  ];
  for (const [key, cond, qty, prio] of ruleSpecs) {
    if (!components.has(key)) continue;
    rules.push({ id: key + '_rule', component_id: key, tool: 'belt', condition: cond, quantity_formula: qty, priority: prio });
  }
  pricingOverride = { components, rules };
}

// XLSX-Hilfsfunktionen für den Admin-Bereich (Import / Export)
export type ExcelComponentRow = {
  key: string;
  label_de: string;
  label_en: string;
  label_it: string;
  unit: string;
  price_eur: number | '';
  article_number: string;
  active: boolean;
};

export type ExcelRuleRow = {
  component_key: string;
  condition: string;
  quantity_formula: string;
  priority: number;
};

export function buildPricingWorkbook(
  components: Array<{ key: string; label_de: string; label_en: string; label_it: string; unit: string; price_eur: number | null; article_number: string | null; active: boolean }>,
  rules: Array<{ component_key: string; condition: Record<string, unknown> | null; quantity_formula: string; priority: number }>,
): ArrayBuffer {
  const wb = XLSX.utils.book_new();
  const compSheet = XLSX.utils.json_to_sheet(components.map((c) => ({
    key: c.key,
    label_de: c.label_de,
    label_en: c.label_en,
    label_it: c.label_it,
    unit: c.unit,
    price_eur: c.price_eur ?? '',
    article_number: c.article_number ?? '',
    active: c.active ? 'TRUE' : 'FALSE',
  })));
  XLSX.utils.book_append_sheet(wb, compSheet, 'Components');
  const ruleSheet = XLSX.utils.json_to_sheet(rules.map((r) => ({
    component_key: r.component_key,
    condition: r.condition ? JSON.stringify(r.condition) : '{}',
    quantity_formula: r.quantity_formula,
    priority: r.priority,
  })));
  XLSX.utils.book_append_sheet(wb, ruleSheet, 'Rules');
  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return out as ArrayBuffer;
}

export function parsePricingWorkbook(arrayBuffer: ArrayBuffer): { components: ExcelComponentRow[]; rules: ExcelRuleRow[] } {
  const wb = XLSX.read(arrayBuffer, { type: 'array' });
  const compSheet = wb.Sheets['Components'];
  const ruleSheet = wb.Sheets['Rules'];
  if (!compSheet) throw new Error('Sheet "Components" fehlt');
  const compRaw = XLSX.utils.sheet_to_json<Record<string, unknown>>(compSheet, { defval: '' });
  const components: ExcelComponentRow[] = compRaw.map((r) => ({
    key: String(r.key ?? '').trim(),
    label_de: String(r.label_de ?? '').trim(),
    label_en: String(r.label_en ?? '').trim(),
    label_it: String(r.label_it ?? '').trim(),
    unit: String(r.unit ?? 'per_unit').trim(),
    price_eur: r.price_eur === '' || r.price_eur === null || r.price_eur === undefined
      ? '' as const
      : Number(String(r.price_eur).replace(',', '.')),
    article_number: String(r.article_number ?? '').trim(),
    active: String(r.active ?? 'TRUE').toUpperCase() !== 'FALSE',
  })).filter((r) => r.key);

  const rules: ExcelRuleRow[] = ruleSheet
    ? XLSX.utils.sheet_to_json<Record<string, unknown>>(ruleSheet, { defval: '' }).map((r) => ({
        component_key: String(r.component_key ?? '').trim(),
        condition: String(r.condition ?? '{}').trim() || '{}',
        quantity_formula: String(r.quantity_formula ?? '1').trim() || '1',
        priority: Number(r.priority ?? 100) || 100,
      })).filter((r) => r.component_key)
    : [];

  return { components, rules };
}
