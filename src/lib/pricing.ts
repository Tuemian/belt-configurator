import * as XLSX from 'xlsx';
import type { ConveyorConfig } from '@/lib/configurator-types';

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

type PricingRow = {
  key: string;
  labelDe: string;
  labelEn: string;
  labelIt: string;
  priceEur: number | null;
  unit: string;
};

type ComponentDemand = {
  key: string;
  quantity: number;
};

let pricingTablePromise: Promise<Map<string, PricingRow> | null> | null = null;
let pricingTableOverride: Map<string, PricingRow> | null = null;

function normalizeKey(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeLabel(value: unknown, fallback: string): string {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }
  return fallback;
}

function normalizeUnit(value: unknown): string {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }
  return 'per_unit';
}

function normalizePrice(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value.replace(',', '.'));
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return null;
}

function labelFromKey(key: string): string {
  return key
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

async function loadPricingTable(): Promise<Map<string, PricingRow> | null> {
  if (pricingTableOverride) {
    return pricingTableOverride;
  }

  if (pricingTablePromise) {
    return pricingTablePromise;
  }

  pricingTablePromise = (async () => {
    try {
      const response = await fetch('/pricing/price-list.xlsx', { cache: 'no-store' });
      if (!response.ok) {
        return null;
      }

      const arrayBuffer = await response.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheet = workbook.Sheets.Components;
      if (!sheet) {
        return null;
      }

      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
      if (!rows.length) {
        return null;
      }

      const table = new Map<string, PricingRow>();
      rows.forEach((rawRow) => {
        const key = normalizeKey(rawRow.key);
        if (!key) {
          return;
        }

        const fallbackLabel = labelFromKey(key);
        table.set(key, {
          key,
          labelDe: normalizeLabel(rawRow.label_de, fallbackLabel),
          labelEn: normalizeLabel(rawRow.label_en, fallbackLabel),
          labelIt: normalizeLabel(rawRow.label_it, fallbackLabel),
          priceEur: normalizePrice(rawRow.price_eur),
          unit: normalizeUnit(rawRow.unit),
        });
      });

      return table.size > 0 ? table : null;
    } catch {
      return null;
    }
  })();

  return pricingTablePromise;
}

function getDemandedComponents(config: ConveyorConfig): ComponentDemand[] {
  const demands: ComponentDemand[] = [];

  demands.push({ key: config.frameWidth > 500 ? 'frame_motis80' : 'frame_motis40', quantity: config.beltLength / 1000 });
  demands.push({
    key:
      config.beltType === 'standard'
        ? 'belt_standard'
        : config.beltType === 'grip'
          ? 'belt_grip'
          : config.beltType === 'heavy-grip'
            ? 'belt_heavy_grip'
            : 'belt_food_safe',
    quantity: (config.beltLength / 1000) * (config.frameWidth / 1000),
  });
  demands.push({ key: `drive_${config.driveType}`, quantity: 1 });

  if (config.withStand) {
    demands.push({ key: 'stand_basic', quantity: 1 });
    demands.push({ key: config.floorElement === 'feet' ? 'feet_set' : 'castor_set', quantity: 1 });

    if (config.heightAdjust) {
      demands.push({ key: 'height_adjust', quantity: 1 });
    }

    if (config.floorBolts) {
      demands.push({ key: 'floor_bolt_set', quantity: 1 });
    }
  }

  if (config.sideGuideHeight > 0) {
    demands.push({ key: 'side_guide', quantity: config.beltLength / 1000 });
  }

  return demands;
}

function normalizeQuantity(quantity: number): number {
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return 1;
  }
  return quantity;
}

export async function calculatePrice(config: ConveyorConfig): Promise<PriceCalculationResult> {
  const table = await loadPricingTable();
  if (!table) {
    return {
      status: 'unavailable',
      breakdown: [],
      missingKeys: [],
    };
  }

  const demands = getDemandedComponents(config);
  const missingKeys: string[] = [];

  const breakdown = demands.map((demand) => {
    const row = table.get(demand.key);
    const quantity = normalizeQuantity(demand.quantity);

    if (!row || row.priceEur === null) {
      missingKeys.push(demand.key);
      const fallback = labelFromKey(demand.key);
      return {
        key: demand.key,
        label: row?.labelEn ?? fallback,
        labelDe: row?.labelDe ?? fallback,
        labelEn: row?.labelEn ?? fallback,
        labelIt: row?.labelIt ?? fallback,
        quantity,
        unit: row?.unit ?? 'per_unit',
        available: false,
      } satisfies PriceItem;
    }

    const total = row.priceEur * quantity;
    return {
      key: demand.key,
      label: row.labelEn,
      labelDe: row.labelDe,
      labelEn: row.labelEn,
      labelIt: row.labelIt,
      quantity,
      unit: row.unit,
      unitPrice: row.priceEur,
      total,
      available: true,
    } satisfies PriceItem;
  });

  if (missingKeys.length > 0) {
    return {
      status: 'partial',
      breakdown,
      missingKeys,
    };
  }

  const total = breakdown.reduce((sum, item) => sum + (item.total ?? 0), 0);

  return {
    status: 'complete',
    total,
    breakdown,
    missingKeys,
  };
}

export function __setPricingTableForTests(rows: Array<{
  key: string;
  labelDe?: string;
  labelEn?: string;
  labelIt?: string;
  priceEur?: number | null;
  unit?: string;
}> | null): void {
  pricingTablePromise = null;

  if (!rows) {
    pricingTableOverride = null;
    return;
  }

  const table = new Map<string, PricingRow>();
  rows.forEach((row) => {
    const key = normalizeKey(row.key);
    if (!key) {
      return;
    }

    const fallback = labelFromKey(key);
    table.set(key, {
      key,
      labelDe: row.labelDe ?? fallback,
      labelEn: row.labelEn ?? fallback,
      labelIt: row.labelIt ?? fallback,
      priceEur: row.priceEur ?? null,
      unit: row.unit ?? 'per_unit',
    });
  });

  pricingTableOverride = table;
}
