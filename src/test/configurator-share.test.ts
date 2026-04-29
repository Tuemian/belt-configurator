import { describe, expect, it } from 'vitest';
import {
  buildSharedConfiguratorUrl,
  createNewCurrentConfiguratorId,
  readSharedConfiguratorState,
} from '@/lib/configurator-share';
import { defaultConfig } from '@/lib/configurator-types';

describe('configurator share helpers', () => {
  it('restores a shared configuration and summary step from the generated URL', () => {
    const sharedUrl = buildSharedConfiguratorUrl('https://konfigurator.novamotis.com/belt-conveyor', {
      ...defaultConfig,
      frameWidth: 520,
      beltLength: 3400,
      driveType: 'center',
      centerDriveOffset: 650,
    }, 5);

    const parsed = new URL(sharedUrl);
    const sharedState = readSharedConfiguratorState(parsed.search);

    expect(sharedState).not.toBeNull();
    expect(sharedState?.step).toBe(5);
    expect(sharedState?.config.frameWidth).toBe(520);
    expect(sharedState?.config.beltLength).toBe(3400);
    expect(sharedState?.config.driveType).toBe('center');
    expect(sharedState?.config.centerDriveOffset).toBe(650);
  });

  it('returns null for malformed share payloads', () => {
    expect(readSharedConfiguratorState('?cfg=this-is-not-valid')).toBeNull();
  });

  it('creates a new incremented configurator ID when explicitly requested', () => {
    const firstId = createNewCurrentConfiguratorId();
    const secondId = createNewCurrentConfiguratorId();

    expect(firstId).toMatch(/^FT-\d{8}-\d{3}$/);
    expect(secondId).toMatch(/^FT-\d{8}-\d{3}$/);
    expect(secondId).not.toBe(firstId);
  });
});