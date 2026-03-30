import { ConveyorConfig } from '@/lib/configurator-types';

export interface AssistantResponse {
  answer: string;
  suggestions?: Partial<ConveyorConfig>;
}

const ALLOWED_FRAME_WIDTHS = [40, 80, 120, ...Array.from({ length: 88 }, (_, i) => 130 + i * 10)];

function nearestFrameWidth(value: number): number {
  return ALLOWED_FRAME_WIDTHS.reduce((prev, curr) => {
    return Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev;
  }, ALLOWED_FRAME_WIDTHS[0]);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') {
      return true;
    }
    if (value.toLowerCase() === 'false') {
      return false;
    }
  }
  return null;
}

export function sanitizeSuggestions(
  raw: unknown,
  current: ConveyorConfig,
): Partial<ConveyorConfig> | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const input = raw as Record<string, unknown>;
  const out: Partial<ConveyorConfig> = {};

  const frameWidthInput = toNumber(input.frameWidth);
  if (frameWidthInput !== null) {
    const width = nearestFrameWidth(clamp(Math.round(frameWidthInput), 40, 1000));
    out.frameWidth = width;
  }

  const minLength = Math.max(500, Math.ceil((out.frameWidth ?? current.frameWidth) * 1.5));
  const beltLengthInput = toNumber(input.beltLength);
  if (beltLengthInput !== null) {
    const snapped = Math.round(beltLengthInput / 5) * 5;
    out.beltLength = clamp(snapped, minLength, 12000);
  }

  const sideGuideHeightInput = toNumber(input.sideGuideHeight);
  if (sideGuideHeightInput !== null) {
    const snapped = Math.round(sideGuideHeightInput / 5) * 5;
    out.sideGuideHeight = clamp(snapped, 10, 50);
  }

  const inclineInput = toNumber(input.inclineAngle);
  if (inclineInput !== null) {
    out.inclineAngle = clamp(Math.round(inclineInput), -10, 10);
  }

  const speedInput = toNumber(input.speed);
  if (speedInput !== null) {
    out.speed = clamp(Math.round(speedInput), 3, 65);
  }

  const loadInput = toNumber(input.loadCapacity);
  if (loadInput !== null) {
    out.loadCapacity = clamp(Math.round(loadInput), 1, 500);
  }

  if (input.beltType === 'standard' || input.beltType === 'grip' || input.beltType === 'heavy-grip' || input.beltType === 'food-safe') {
    out.beltType = input.beltType;
  }

  if (input.driveType === 'direct' || input.driveType === 'indirect' || input.driveType === 'center') {
    out.driveType = input.driveType;
  }

  if (input.motorPosition === 'left' || input.motorPosition === 'right') {
    out.motorPosition = input.motorPosition;
  }

  const angleInput = toNumber(input.motorAngle);
  if (angleInput !== null) {
    const candidates: ConveyorConfig['motorAngle'][] = [0, 90, 180, 270];
    const nearest = candidates.reduce((prev, curr) => {
      return Math.abs(curr - angleInput) < Math.abs(prev - angleInput) ? curr : prev;
    }, candidates[0]);
    out.motorAngle = nearest;
  }

  const withStandInput = toBoolean(input.withStand);
  if (withStandInput !== null) {
    out.withStand = withStandInput;
  }

  const standInput = toNumber(input.standHeight);
  if (standInput !== null) {
    out.standHeight = clamp(Math.round(standInput / 10) * 10, 400, 2000);
  }

  if (input.floorElement === 'feet' || input.floorElement === 'castors') {
    out.floorElement = input.floorElement;
  }

  const heightAdjustInput = toBoolean(input.heightAdjust);
  if (heightAdjustInput !== null) {
    out.heightAdjust = heightAdjustInput;
  }

  const floorBoltsInput = toBoolean(input.floorBolts);
  if (floorBoltsInput !== null) {
    out.floorBolts = floorBoltsInput;
  }

  return Object.keys(out).length > 0 ? out : null;
}

export function localAssistantFallback(message: string, lang: 'de' | 'en'): AssistantResponse {
  const m = message.toLowerCase();

  if (m.includes('wenig platz') || m.includes('klein') || m.includes('compact')) {
    return {
      answer: lang === 'de'
        ? 'Für wenig Platz empfehle ich eine kompakte Konfiguration mit kleiner Breite, kurzer Länge und Direktantrieb.'
        : 'For limited space, I recommend a compact setup with smaller width, shorter length, and direct drive.',
      suggestions: {
        frameWidth: 400,
        beltLength: 1200,
        driveType: 'direct',
        motorPosition: 'right',
        motorAngle: 0,
        withStand: true,
        standHeight: 850,
      },
    };
  }

  if (m.includes('steigung') || m.includes('incline')) {
    return {
      answer: lang === 'de'
        ? 'Für Steigung ist meist ein Grip-Band sinnvoll. Ich habe eine passende Standardkonfiguration vorgeschlagen.'
        : 'For incline transport, a grip belt is usually a good choice. I added a fitting baseline suggestion.',
      suggestions: {
        beltType: 'grip',
        inclineAngle: 8,
        speed: 12,
        sideGuideHeight: 40,
      },
    };
  }

  if (m.includes('schwer') || m.includes('heavy') || m.includes('zuladung')) {
    return {
      answer: lang === 'de'
        ? 'Für höhere Zuladung würde ich Breite und Untergestell robuster auslegen.'
        : 'For higher payload, I would choose a wider conveyor and a more robust stand setup.',
      suggestions: {
        frameWidth: 700,
        loadCapacity: 180,
        floorElement: 'feet',
        withStand: true,
        standHeight: 900,
      },
    };
  }

  return {
    answer: lang === 'de'
      ? 'Ich kann dir bei Auslegung und Feldauswahl helfen. Beschreibe kurz Einsatzzweck, Platz, Last und gewünschte Geschwindigkeit, dann schlage ich konkrete Werte vor.'
      : 'I can help you with sizing and field selection. Share use case, space limits, payload, and target speed, and I will suggest concrete values.',
  };
}
