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
  driveType: 'direct' | 'indirect' | 'center';
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
