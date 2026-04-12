import { ConveyorConfig } from '@/lib/configurator-types';
import * as THREE from 'three';

export type Vec3 = [number, number, number];

export interface Conveyor3DMeasurements {
  beltLength: number;
  frameWidth: number;
  frameHeight: number;
  frameSectionWidth: number;
  sideGuideHeight: number;
  inclineAngle: number;
  beltTopY: number;
  drumRadius: number;
  motorWidth: number;
  motorHeight: number;
  motorDepth: number;
  motorCylinderHeight: number;
  legLength: number;
  legInsetX: number;
  legInsetZ: number;
}

export interface ModelAssetDefinition {
  url: string;
  rotation?: Vec3;
  rotationDeg?: Vec3;
  scale?: Vec3;
}

interface VariantRule {
  minFrameWidth?: number;
  maxFrameWidth?: number;
}

interface ModelVariant extends ModelAssetDefinition {
  id: string;
  rules?: VariantRule;
}

interface FloorElementDefinition {
  variants: ModelVariant[];
  positionOffset: Vec3;
}

export interface Conveyor3DLibrary {
  motors: {
    direct: {
      left: ModelVariant[];
      right: ModelVariant[];
    };
    indirect: {
      left: ModelVariant[];
      right: ModelVariant[];
    };
    center: ModelVariant[];
  };
  floorElements: {
    feet: FloorElementDefinition;
    castors: FloorElementDefinition;
  };
  accessories?: {
    sideGuide?: ModelVariant[];
    sensors?: ModelVariant[];
  };
  profiles?: {
    sideRails?: ModelVariant[];
  };
}

export interface ModelPlacement extends ModelAssetDefinition {
  position: Vec3;
}

export interface ModelInstances extends ModelAssetDefinition {
  positions: Vec3[];
}

export interface Conveyor3DResolvedAssets {
  motor?: ModelPlacement;
  feet?: ModelInstances;
  castors?: ModelInstances;
  sideRails?: ModelInstances;
}

const defaultLibrary: Conveyor3DLibrary = {
  motors: {
    direct: {
      left: [
        { id: 'direct-left', url: '/models/motors/motor.glb', rotationDeg: [90, 90, 0], scale: [1, 1, 1] },
      ],
      right: [
        { id: 'direct-right', url: '/models/motors/motor.glb', rotationDeg: [90, 90, 0], scale: [1, 1, 1] },
      ],
    },
    indirect: {
      left: [
        { id: 'indirect-left-compact', url: '/models/motors/indirect_side.glb?v=2', rotationDeg: [90, 90, 0], scale: [1000, 1000, 1000], rules: { maxFrameWidth: 500 } },
        { id: 'indirect-left-large', url: '/models/motors/indirect_side.glb?v=2', rotationDeg: [90, 90, 0], scale: [1000, 1000, 1000], rules: { minFrameWidth: 501 } },
      ],
      right: [
        { id: 'indirect-right-compact', url: '/models/motors/indirect_side.glb?v=2', rotationDeg: [90, 90, 0], scale: [1000, 1000, 1000], rules: { maxFrameWidth: 500 } },
        { id: 'indirect-right-large', url: '/models/motors/indirect_side.glb?v=2', rotationDeg: [90, 90, 0], scale: [1000, 1000, 1000], rules: { minFrameWidth: 501 } },
      ],
    },
    center: [
      { id: 'center-compact', url: '/models/motors/motor.glb', rotationDeg: [90, 90, 0], rules: { maxFrameWidth: 500 } },
      { id: 'center-large', url: '/models/motors/motor.glb', rotationDeg: [90, 90, 0], rules: { minFrameWidth: 501 } },
    ],
  },
  floorElements: {
    feet: {
      variants: [
        { id: 'foot', url: '/models/floor-elements/foot.glb?v=2', rotationDeg: [-90, 0, 0], rules: {} },
      ],
      positionOffset: [0, -12, 0],
    },
    castors: {
      variants: [
        { id: 'castor', url: '/models/floor-elements/castor.glb?v=2', rotationDeg: [0, 180, 0], scale: [1000, 1000, 1000], rules: {} },
      ],
      positionOffset: [0, 0, 0],
    },
  },
  accessories: {
    sideGuide: [
      { id: 'side-guide-standard', url: '/models/accessories/side-guide.glb', rules: { maxFrameWidth: 700 } },
      { id: 'side-guide-heavy', url: '/models/accessories/side-guide-heavy.glb', rules: { minFrameWidth: 701 } },
    ],
    sensors: [
      { id: 'sensor-standard', url: '/models/accessories/sensor-standard.glb' },
    ],
  },
  profiles: {
    sideRails: [
      { id: 'profile-40x40-light', url: '/models/profiles/1108038_profil_a8_40x40_leicht.glb', rules: { maxFrameWidth: 500 } },
      { id: 'profile-80x40-light-high', url: '/models/profiles/1108055_profil_a8_80x40_leicht.glb', rules: { minFrameWidth: 501 } },
    ],
  },
};

let activeLibrary: Conveyor3DLibrary = defaultLibrary;
let loadPromise: Promise<void> | null = null;

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

function isVec3(value: unknown): value is Vec3 {
  return Array.isArray(value) && value.length === 3 && value.every((n) => typeof n === 'number');
}

function degToRadVec3([x, y, z]: Vec3): Vec3 {
  const f = Math.PI / 180;
  return [x * f, y * f, z * f];
}

function toVariant(value: unknown): ModelVariant | null {
  if (!isObject(value)) {
    return null;
  }

  if (typeof value.id !== 'string' || typeof value.url !== 'string') {
    return null;
  }

  const rules = isObject(value.rules)
    ? {
        minFrameWidth:
          typeof value.rules.minFrameWidth === 'number' ? value.rules.minFrameWidth : undefined,
        maxFrameWidth:
          typeof value.rules.maxFrameWidth === 'number' ? value.rules.maxFrameWidth : undefined,
      }
    : undefined;

  const rotation = isVec3(value.rotation)
    ? value.rotation
    : isVec3(value.rotationDeg)
      ? degToRadVec3(value.rotationDeg)
      : undefined;

  return {
    id: value.id,
    url: value.url,
    rules,
    rotation,
    scale: Array.isArray(value.scale) ? (value.scale as Vec3) : undefined,
  };
}

function parseVariantArray(value: unknown): ModelVariant[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const parsed = value.map(toVariant).filter((entry): entry is ModelVariant => entry !== null);
  return parsed.length > 0 ? parsed : null;
}

function toFloorElement(value: unknown): FloorElementDefinition | null {
  if (!isObject(value)) {
    return null;
  }

  const variants = parseVariantArray(value.variants);
  if (!variants) {
    return null;
  }

  const positionOffset = Array.isArray(value.positionOffset)
    ? (value.positionOffset as Vec3)
    : ([0, 0, 0] as Vec3);

  return { variants, positionOffset };
}

function toLibrary(value: unknown): Conveyor3DLibrary | null {
  if (!isObject(value) || !isObject(value.motors) || !isObject(value.floorElements)) {
    return null;
  }

  if (!isObject(value.motors.direct)) {
    return null;
  }

  const directLeft = parseVariantArray(value.motors.direct.left);
  const directRight = parseVariantArray(value.motors.direct.right);
  const indirectLegacy = parseVariantArray(value.motors.indirect);
  const indirect = isObject(value.motors.indirect)
    ? {
        left: parseVariantArray(value.motors.indirect.left),
        right: parseVariantArray(value.motors.indirect.right),
      }
    : null;
  const center = parseVariantArray(value.motors.center);
  const feet = toFloorElement(value.floorElements.feet);
  const castors = toFloorElement(value.floorElements.castors);
  const accessories = isObject(value.accessories) ? {
    sideGuide: parseVariantArray(value.accessories.sideGuide) ?? undefined,
    sensors: parseVariantArray(value.accessories.sensors) ?? undefined,
  } : undefined;
  const profiles = isObject(value.profiles)
    ? {
        sideRails: parseVariantArray(value.profiles.sideRails) ?? undefined,
      }
    : undefined;

  const resolvedIndirect =
    indirect?.left && indirect?.right
      ? { left: indirect.left, right: indirect.right }
      : indirectLegacy
        ? { left: indirectLegacy, right: indirectLegacy }
        : null;

  if (!directLeft || !directRight || !resolvedIndirect || !center || !feet || !castors) {
    return null;
  }

  return {
    motors: {
      direct: {
        left: directLeft,
        right: directRight,
      },
      indirect: resolvedIndirect,
      center,
    },
    floorElements: {
      feet,
      castors,
    },
    accessories,
    profiles,
  };
}

export function getConveyor3DLibrary(): Conveyor3DLibrary {
  return activeLibrary;
}

export async function loadConveyor3DLibraryFromPublic(): Promise<void> {
  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = (async () => {
    try {
      const response = await fetch('/models/library.json', { cache: 'no-store' });
      if (!response.ok) {
        return;
      }

      const json = await response.json();
      const parsed = toLibrary(json);
      if (parsed) {
        activeLibrary = parsed;
      }
    } catch {
      // Keep defaults when custom file is missing or invalid.
    }
  })();

  return loadPromise;
}

function matchesRule(frameWidth: number, rule?: VariantRule): boolean {
  if (!rule) {
    return true;
  }

  if (rule.minFrameWidth !== undefined && frameWidth < rule.minFrameWidth) {
    return false;
  }

  if (rule.maxFrameWidth !== undefined && frameWidth > rule.maxFrameWidth) {
    return false;
  }

  return true;
}

function selectVariant(frameWidth: number, variants: readonly ModelVariant[]): ModelVariant {
  return variants.find((variant) => matchesRule(frameWidth, variant.rules)) ?? variants[0];
}

function rotateAroundConveyorAxis(rotation: Vec3 | undefined, angleRad: number): Vec3 {
  const [x, y, z] = rotation ?? [0, 0, 0];
  const baseQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z, 'XYZ'));

  // Drive roller axis in the conveyor scene is Z.
  const axisQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), angleRad);
  const finalQuat = axisQuat.multiply(baseQuat);
  const finalEuler = new THREE.Euler().setFromQuaternion(finalQuat, 'XYZ');

  return [finalEuler.x, finalEuler.y, finalEuler.z];
}

function snapIndirectMotorAngle(angleDeg: number): number {
  const normalized = ((angleDeg % 360) + 360) % 360;
  const allowed = [0, 90, 270] as const;
  return allowed.reduce((best, candidate) => {
    const delta = Math.min(
      Math.abs(normalized - candidate),
      360 - Math.abs(normalized - candidate),
    );
    const bestDelta = Math.min(
      Math.abs(normalized - best),
      360 - Math.abs(normalized - best),
    );
    return delta < bestDelta ? candidate : best;
  }, allowed[0]);
}

export function getSelectedConveyorAssetUrls(config: ConveyorConfig): string[] {
  const library = getConveyor3DLibrary();
  const urls: string[] = [];

  if (config.driveType === 'direct') {
    urls.push(selectVariant(config.frameWidth, library.motors.direct[config.motorPosition]).url);
  }

  if (config.driveType === 'indirect') {
    urls.push(selectVariant(config.frameWidth, library.motors.indirect[config.motorPosition]).url);
  }

  if (config.driveType === 'center') {
    urls.push(selectVariant(config.frameWidth, library.motors.center).url);
  }

  if (config.withStand) {
    if (config.floorElement === 'feet') {
      urls.push(selectVariant(config.frameWidth, library.floorElements.feet.variants).url);
    }

    if (config.floorElement === 'castors') {
      urls.push(selectVariant(config.frameWidth, library.floorElements.castors.variants).url);
    }
  }

  if ((config.sideGuideHeight ?? 0) > 0 && library.accessories?.sideGuide?.length) {
    urls.push(selectVariant(config.frameWidth, library.accessories.sideGuide).url);
  }

  if (library.profiles?.sideRails?.length) {
    urls.push(selectVariant(config.frameWidth, library.profiles.sideRails).url);
  }

  return Array.from(new Set(urls));
}

function legBasePositions(measurements: Conveyor3DMeasurements): Vec3[] {
  const { legInsetX, legInsetZ, frameHeight, legLength } = measurements;

  return [
    [-legInsetX, -(frameHeight / 2 + legLength), -legInsetZ],
    [-legInsetX, -(frameHeight / 2 + legLength), legInsetZ],
    [legInsetX, -(frameHeight / 2 + legLength), -legInsetZ],
    [legInsetX, -(frameHeight / 2 + legLength), legInsetZ],
  ];
}

export function resolveConveyor3DAssets(
  config: ConveyorConfig,
  measurements: Conveyor3DMeasurements,
): Conveyor3DResolvedAssets {
  const library = getConveyor3DLibrary();
  const resolved: Conveyor3DResolvedAssets = {};

  // Motor angle convention:
  //   0°  = shaft pointing down (toward floor)
  //   90° = shaft pointing toward belt (inward)
  //  180° = shaft pointing up
  //  270° = shaft pointing away from belt (outward)
  // The asset's natural pose has the shaft pointing outward (+Z for right side).
  // We rotate around the X-axis (conveyor longitudinal axis) by the mount angle.
  // For left side the motor is mirrored in Z so the same angle convention holds.
  const motorAngleRad = (config.motorAngle * Math.PI) / 180;

  if (config.driveType === 'direct') {
    const side = config.motorPosition === 'left' ? -1 : 1;
    const variant = selectVariant(measurements.frameWidth, library.motors.direct[config.motorPosition]);
    const mirrorScaleZ = config.motorPosition === 'left' ? -1 : 1;
    const directAngleDeg = config.motorPosition === 'right'
      ? (90 - config.motorAngle + 360) % 360
      : (config.motorAngle + 90) % 360;
    const directAngleRad = directAngleDeg * (Math.PI / 180);
    const baseRot = variant.rotation ?? [0, 0, 0];
    const finalRot = rotateAroundConveyorAxis(baseRot, directAngleRad);
    resolved.motor = {
      url: variant.url,
      position: [
        measurements.beltLength / 2 - measurements.motorWidth * 0.3,
        0,
        side * (measurements.frameWidth / 2 + measurements.motorDepth / 2 + 12),
      ],
      rotation: finalRot,
      scale: variant.scale ?? [1, 1, mirrorScaleZ],
    };
  }

  if (config.driveType === 'indirect') {
    const side = config.motorPosition === 'left' ? -1 : 1;
    const variant = selectVariant(measurements.frameWidth, library.motors.indirect[config.motorPosition]);
    const mirrorScaleZ = config.motorPosition === 'left' ? -1 : 1;
    const indirectAngleDeg = config.motorPosition === 'right'
      ? (90 - config.motorAngle + 360) % 360
      : (config.motorAngle + 90) % 360;
    const indirectAngleRad = indirectAngleDeg * (Math.PI / 180);
    const baseRot = variant.rotation ?? [0, 0, 0];
    const finalRot = rotateAroundConveyorAxis(baseRot, indirectAngleRad);
    resolved.motor = {
      url: variant.url,
      position: [
        measurements.beltLength / 2 - measurements.frameSectionWidth * 0.4,
        -(measurements.frameHeight / 2 + 6),
        side * (measurements.frameWidth / 2 + 4),
      ],
      rotation: finalRot,
      scale: variant.scale ?? [1, 1, mirrorScaleZ],
    };
  }

  if (config.driveType === 'center') {
    const variant = selectVariant(measurements.frameWidth, library.motors.center);
    const maxOffset = Math.max(0, measurements.beltLength / 2 - 300);
    const clampedOffset = Math.max(-maxOffset, Math.min(maxOffset, config.centerDriveOffset));
    resolved.motor = {
      url: variant.url,
      position: [clampedOffset, -(measurements.frameHeight / 2 + measurements.motorHeight / 2 + 15), 0],
      rotation: rotateAroundConveyorAxis(variant.rotation ?? [0, 0, 0], motorAngleRad),
      scale: variant.scale ?? [1, 1, 1],
    };
  }

  if (library.profiles?.sideRails?.length) {
    const profileVariant = selectVariant(measurements.frameWidth, library.profiles.sideRails);
    const frameSectionWidth = measurements.frameSectionWidth;
    const railZ = measurements.frameWidth / 2 - frameSectionWidth / 2;
    const lengthScale = Math.max(measurements.beltLength / 100, 0.1);

    resolved.sideRails = {
      url: profileVariant.url,
      rotation: profileVariant.rotation ?? [0, 0, 0],
      scale: profileVariant.scale ?? [lengthScale, 1, 1],
      positions: [
        [0, 0, -railZ],
        [0, 0, railZ],
      ],
    };
  }

  if (!config.withStand || measurements.legLength <= 0) {
    return resolved;
  }

  const legPositions = legBasePositions(measurements);

  if (config.floorElement === 'feet') {
    const def = library.floorElements.feet;
    const variant = selectVariant(measurements.frameWidth, def.variants);
    resolved.feet = {
      url: variant.url,
      rotation: variant.rotation ?? [0, 0, 0],
      scale: variant.scale ?? [1, 1, 1],
      positions: legPositions.map(([x, y, z]) => [x, y + def.positionOffset[1], z]),
    };
  }

  if (config.floorElement === 'castors') {
    const def = library.floorElements.castors;
    const variant = selectVariant(measurements.frameWidth, def.variants);
    resolved.castors = {
      url: variant.url,
      rotation: variant.rotation ?? [0, 0, 0],
      scale: variant.scale ?? [1, 1, 1],
      positions: legPositions.map(([x, y, z]) => [x, y + def.positionOffset[1], z]),
    };
  }

  return resolved;
}
