import { afterEach, describe, expect, it, vi } from 'vitest';
import { calculatePrice, __setPricingTableForTests } from '@/lib/pricing';
import { defaultConfig } from '@/lib/configurator-types';

afterEach(() => {
  __setPricingTableForTests(null);
  vi.restoreAllMocks();
});

describe('pricing calculation', () => {
  it('returns complete when all required keys are priced', async () => {
    __setPricingTableForTests([
      { key: 'frame_motis40', priceEur: 120, unit: 'per_meter' },
      { key: 'belt_standard', priceEur: 35, unit: 'per_m2' },
      { key: 'drive_direct', priceEur: 480, unit: 'per_unit' },
      { key: 'stand_basic', priceEur: 260, unit: 'per_unit' },
      { key: 'feet_set', priceEur: 90, unit: 'per_unit' },
      { key: 'side_guide', priceEur: 28, unit: 'per_meter' },
    ]);

    const result = await calculatePrice(defaultConfig);

    expect(result.status).toBe('complete');
    expect(result.total).toBeGreaterThan(0);
    expect(result.missingKeys).toHaveLength(0);
    expect(result.breakdown.every((item) => item.available)).toBe(true);
  });

  it('returns partial when at least one key is missing', async () => {
    __setPricingTableForTests([
      { key: 'frame_motis40', priceEur: 120, unit: 'per_meter' },
      { key: 'belt_standard', priceEur: 35, unit: 'per_m2' },
      { key: 'drive_direct', priceEur: null, unit: 'per_unit' },
      { key: 'stand_basic', priceEur: 260, unit: 'per_unit' },
      { key: 'feet_set', priceEur: 90, unit: 'per_unit' },
      { key: 'side_guide', priceEur: 28, unit: 'per_meter' },
    ]);

    const result = await calculatePrice(defaultConfig);

    expect(result.status).toBe('partial');
    expect(result.total).toBeUndefined();
    expect(result.missingKeys).toContain('drive_direct');
    expect(result.breakdown.some((item) => !item.available)).toBe(true);
  });

  it('returns unavailable when price source cannot be loaded', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('missing file')));

    const result = await calculatePrice(defaultConfig);

    expect(result.status).toBe('unavailable');
    expect(result.total).toBeUndefined();
    expect(result.breakdown).toEqual([]);
  });
});
