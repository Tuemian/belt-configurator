export interface ConveyorConfig {
  // Step 1 - Dimensions
  frameWidth: number;
  beltLength: number;
  sideGuideHeight: number;
  inclineAngle: number;

  // Step 2 - Belt & Speed
  beltType: 'standard' | 'grip' | 'heavy-grip' | 'food-safe';
  speed: number;
  loadCapacity: number;

  // Step 3 - Drive
  driveType: 'direct' | 'indirect' | 'center' | 'drum';
  motorPosition: 'left' | 'right';
  motorAngle: 0 | 90 | 180 | 270;
  centerDriveOffset: number;

  // Step 4 - Stand
  withStand: boolean;
  standHeight: number;
  floorElement: 'feet' | 'castors';
  heightAdjust: boolean;
  floorBolts: boolean;
}

export const MIN_INFEED_OUTFEED_CLEARANCE_MM = 400;
export const MAX_INCLINE_ABS_DEG = 10;

export function getInclineLimitDegrees(beltLength: number, referenceHeight: number): number {
  const safeLength = Number.isFinite(beltLength) && beltLength > 0 ? beltLength : 1;
  const safeReferenceHeight = Number.isFinite(referenceHeight) ? referenceHeight : MIN_INFEED_OUTFEED_CLEARANCE_MM;
  const availableRiseHalf = Math.max(0, safeReferenceHeight - MIN_INFEED_OUTFEED_CLEARANCE_MM);

  if (availableRiseHalf <= 0) {
    return 0;
  }

  const maxRadians = Math.atan((2 * availableRiseHalf) / safeLength);
  const maxDegrees = (maxRadians * 180) / Math.PI;
  return Math.min(MAX_INCLINE_ABS_DEG, maxDegrees);
}

export function clampInclineAngleForConfig(config: Pick<ConveyorConfig, 'beltLength' | 'inclineAngle' | 'standHeight' | 'withStand'>): number {
  const referenceHeight = config.withStand
    ? config.standHeight
    : MIN_INFEED_OUTFEED_CLEARANCE_MM;
  const limit = getInclineLimitDegrees(config.beltLength, referenceHeight);
  return Math.max(-limit, Math.min(limit, config.inclineAngle));
}

export const defaultConfig: ConveyorConfig = {
  frameWidth: 400,
  beltLength: 2000,
  sideGuideHeight: 30,
  inclineAngle: 0,
  beltType: 'standard',
  speed: 15,
  loadCapacity: 50,
  driveType: 'direct',
  motorPosition: 'right',
  motorAngle: 0,
  centerDriveOffset: 0,
  withStand: true,
  standHeight: 850,
  floorElement: 'feet',
  heightAdjust: false,
  floorBolts: false,
};
