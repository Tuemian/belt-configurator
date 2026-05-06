import {
  clampInclineAngleForConfig,
  type ConveyorConfig,
  defaultConfig,
} from '@/lib/configurator-types';
import { supabase } from '@/integrations/supabase/client';

const STEP_MIN = 1;
const STEP_MAX = 5;
const CONFIG_PARAM = 'cfg';
const STEP_PARAM = 'step';
const CONFIG_ID_PARAM = 'configId';

const BELT_TYPES = new Set<ConveyorConfig['beltType']>(['standard', 'grip', 'heavy-grip', 'food-safe']);
const DRIVE_TYPES = new Set<ConveyorConfig['driveType']>(['direct', 'indirect', 'center', 'drum']);
const MOTOR_POSITIONS = new Set<ConveyorConfig['motorPosition']>(['left', 'right']);
const MOTOR_ANGLES = new Set<ConveyorConfig['motorAngle']>([0, 90, 180, 270]);
const FLOOR_ELEMENTS = new Set<ConveyorConfig['floorElement']>(['feet', 'castors']);

function encodeBase64Url(value: string): string {
  const base64 = typeof window !== 'undefined' && typeof window.btoa === 'function'
    ? window.btoa(value)
    : Buffer.from(value, 'utf8').toString('base64');

  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  const base64 = `${normalized}${padding}`;

  return typeof window !== 'undefined' && typeof window.atob === 'function'
    ? window.atob(base64)
    : Buffer.from(base64, 'base64').toString('utf8');
}

function readNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function readEnumValue<T extends string | number>(value: unknown, allowed: Set<T>, fallback: T): T {
  return allowed.has(value as T) ? (value as T) : fallback;
}

function sanitizeSharedConfig(raw: unknown): ConveyorConfig | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const candidate = raw as Partial<ConveyorConfig>;
  const config: ConveyorConfig = {
    frameWidth: readNumber(candidate.frameWidth, defaultConfig.frameWidth),
    beltLength: readNumber(candidate.beltLength, defaultConfig.beltLength),
    sideGuideHeight: readNumber(candidate.sideGuideHeight, defaultConfig.sideGuideHeight),
    inclineAngle: readNumber(candidate.inclineAngle, defaultConfig.inclineAngle),
    beltType: readEnumValue(candidate.beltType, BELT_TYPES, defaultConfig.beltType),
    speed: readNumber(candidate.speed, defaultConfig.speed),
    loadCapacity: readNumber(candidate.loadCapacity, defaultConfig.loadCapacity),
    driveType: readEnumValue(candidate.driveType, DRIVE_TYPES, defaultConfig.driveType),
    motorPosition: readEnumValue(candidate.motorPosition, MOTOR_POSITIONS, defaultConfig.motorPosition),
    motorAngle: readEnumValue(candidate.motorAngle, MOTOR_ANGLES, defaultConfig.motorAngle),
    centerDriveOffset: readNumber(candidate.centerDriveOffset, defaultConfig.centerDriveOffset),
    withStand: readBoolean(candidate.withStand, defaultConfig.withStand),
    standHeight: readNumber(candidate.standHeight, defaultConfig.standHeight),
    floorElement: readEnumValue(candidate.floorElement, FLOOR_ELEMENTS, defaultConfig.floorElement),
    heightAdjust: readBoolean(candidate.heightAdjust, defaultConfig.heightAdjust),
    floorBolts: readBoolean(candidate.floorBolts, defaultConfig.floorBolts),
  };

  config.inclineAngle = clampInclineAngleForConfig(config);
  return config;
}

export function buildSharedConfiguratorUrl(currentUrl: string, config: ConveyorConfig, step = STEP_MAX): string {
  const parsedUrl = new URL(currentUrl);
  const safeStep = Math.min(STEP_MAX, Math.max(STEP_MIN, Math.trunc(step)));
  const serializedConfig = encodeBase64Url(JSON.stringify(config));

  parsedUrl.searchParams.set(CONFIG_PARAM, serializedConfig);
  parsedUrl.searchParams.set(STEP_PARAM, String(safeStep));

  return parsedUrl.toString();
}

export function readSharedConfiguratorState(search: string): { config: ConveyorConfig; step: number } | null {
  const searchParams = new URLSearchParams(search);
  const encodedConfig = searchParams.get(CONFIG_PARAM);

  if (!encodedConfig) {
    return null;
  }

  try {
    const parsedConfig = JSON.parse(decodeBase64Url(encodedConfig));
    const config = sanitizeSharedConfig(parsedConfig);

    if (!config) {
      return null;
    }

    const rawStep = Number(searchParams.get(STEP_PARAM));
    const step = Number.isInteger(rawStep)
      ? Math.min(STEP_MAX, Math.max(STEP_MIN, rawStep))
      : STEP_MAX;

    return { config, step };
  } catch {
    return null;
  }
}

export function clearSharedConfiguratorStateFromUrl(): void {
  if (typeof window === 'undefined') {
    return;
  }

  const url = new URL(window.location.href);
  url.searchParams.delete(CONFIG_PARAM);
  url.searchParams.delete(STEP_PARAM);
  url.searchParams.delete(CONFIG_ID_PARAM);
  window.history.replaceState({}, '', url.toString());
}

function getDateStamp(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

/**
 * Reserve a fresh configurator reference (e.g. FT-20260506-007) at the moment
 * the user triggers PDF download or sends an inquiry. Atomic on the server.
 * Falls back to a deterministic local id (suffix -LOCAL) only if the call fails.
 */
export async function requestConfiguratorReference(
  tool: 'belt' | 'profile',
  config: unknown,
  lang: string,
): Promise<string> {
  try {
    const { data, error } = await supabase.functions.invoke('reserve-configurator-reference', {
      body: { action: 'reserve', tool, config, lang },
    });
    if (error) {
      throw error;
    }
    const ref = (data as { reference?: string } | null)?.reference;
    if (typeof ref === 'string' && ref.trim()) {
      return ref;
    }
  } catch (err) {
    console.error('reserve-configurator-reference failed:', err);
  }
  return `FT-${getDateStamp()}-LOCAL`;
}

/** Mark a previously reserved reference as having been used for PDF download / inquiry. */
export async function markConfiguratorReference(
  reference: string,
  mark: 'pdf' | 'inquiry',
): Promise<void> {
  if (!reference || reference.endsWith('-LOCAL')) {
    return;
  }
  try {
    await supabase.functions.invoke('reserve-configurator-reference', {
      body: { action: 'mark', reference, mark },
    });
  } catch (err) {
    console.warn('mark configurator reference failed:', err);
  }
}
