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
    drum: {
      left: ModelVariant[];
      right: ModelVariant[];
    };
  };
  floorElements: {
    feet: FloorElementDefinition;
    castors: FloorElementDefinition;
    floorBolts?: FloorElementDefinition;
  };
  accessories?: {
    sideGuide?: ModelVariant[];
    sensors?: ModelVariant[];
  };
  profiles?: {
    sideRails?: ModelVariant[];
  };
  components?: {
    deflectionUnit?: ModelVariant[];
    drives?: {
      direct?: ModelVariant[];
      indirect?: ModelVariant[];
      center?: ModelVariant[];
      drum?: ModelVariant[];
    };
  };
}

export interface ModelPlacement extends ModelAssetDefinition {
  position: Vec3;
  frameWidthMm?: number;
  targetLengthMm?: number;
}

export interface ModelInstances extends ModelAssetDefinition {
  positions: Vec3[];
  targetLengthMm?: number;
}

export interface Conveyor3DResolvedAssets {
  indirectMount?: ModelPlacement;
  centerMount?: ModelPlacement;
  motor?: ModelPlacement;
  drumMotor?: ModelPlacement;
  feet?: ModelInstances;
  castors?: ModelInstances;
  floorBolts?: ModelInstances;
  sideRails?: ModelInstances;
  deflectionUnit?: ModelPlacement;
}

const defaultLibrary: Conveyor3DLibrary = {
  motors: {
    direct: {
      left: [
        { id: 'direct-left', url: '/models/motors/motor.glb?v=3', rotationDeg: [90, 90, 0], scale: [1, 1, 1] },
      ],
      right: [
        { id: 'direct-right', url: '/models/motors/motor.glb?v=3', rotationDeg: [90, 90, 0], scale: [1, 1, 1] },
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
      { id: 'center-compact', url: '/models/motors/center_motor.glb', rotationDeg: [90, 90, 0], scale: [1000, 1000, 1000], rules: { maxFrameWidth: 500 } },
      { id: 'center-large', url: '/models/motors/center_motor.glb', rotationDeg: [90, 90, 0], scale: [1000, 1000, 1000], rules: { minFrameWidth: 501 } },
    ],
    drum: {
      left: [
        { id: 'drum-left', url: '/models/motors/drum-motor.glb', rotationDeg: [0, 0, 0], scale: [1, 1, 1] },
      ],
      right: [
        { id: 'drum-right', url: '/models/motors/drum-motor.glb', rotationDeg: [0, 0, 0], scale: [1, 1, 1] },
      ],
    },
  },
  floorElements: {
    feet: {
      variants: [
        { id: 'foot', url: '/models/floor-elements/foot.glb?v=4', rotationDeg: [-90, 0, 0], scale: [1, 1, 1], rules: {} },
      ],
      positionOffset: [0, -12, 0],
    },
    castors: {
      variants: [
        { id: 'castor', url: '/models/floor-elements/castor.glb?v=2', rotationDeg: [0, 180, 0], scale: [1000, 1000, 1000], rules: {} },
      ],
      positionOffset: [0, 0, 0],
    },
    floorBolts: {
      variants: [
        { id: 'floor-bolt', url: '/models/floor-elements/floor-bolt.glb?v=2', rotationDeg: [-90, 0, 0], scale: [1000, 1000, 1000], rules: {} },
      ],
      positionOffset: [0, -12, 0],
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
  components: {
    deflectionUnit: [],
    drives: {
      direct: [],
      indirect: [],
      center: [],
      drum: [],
    },
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
  const drum = isObject(value.motors.drum)
    ? {
        left: parseVariantArray(value.motors.drum.left),
        right: parseVariantArray(value.motors.drum.right),
      }
    : null;
  const feet = toFloorElement(value.floorElements.feet);
  const castors = toFloorElement(value.floorElements.castors);
  const floorBolts = toFloorElement(value.floorElements.floorBolts);
  const accessories = isObject(value.accessories) ? {
    sideGuide: parseVariantArray(value.accessories.sideGuide) ?? undefined,
    sensors: parseVariantArray(value.accessories.sensors) ?? undefined,
  } : undefined;
  const profiles = isObject(value.profiles)
    ? {
        sideRails: parseVariantArray(value.profiles.sideRails) ?? undefined,
      }
    : undefined;
  const components = isObject(value.components)
    ? {
        deflectionUnit: parseVariantArray(value.components.deflectionUnit) ?? undefined,
        drives: isObject(value.components.drives)
          ? {
              direct: parseVariantArray(value.components.drives.direct) ?? undefined,
              indirect: parseVariantArray(value.components.drives.indirect) ?? undefined,
              center: parseVariantArray(value.components.drives.center) ?? undefined,
              drum: parseVariantArray(value.components.drives.drum) ?? undefined,
            }
          : undefined,
      }
    : undefined;

  const resolvedIndirect =
    indirect?.left && indirect?.right
      ? { left: indirect.left, right: indirect.right }
      : indirectLegacy
        ? { left: indirectLegacy, right: indirectLegacy }
        : null;

  const resolvedDrum = drum?.left && drum?.right
    ? { left: drum.left, right: drum.right }
    : defaultLibrary.motors.drum;

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
      drum: resolvedDrum,
    },
    floorElements: {
      feet,
      castors,
      floorBolts: floorBolts ?? defaultLibrary.floorElements.floorBolts,
    },
    accessories,
    profiles,
    components,
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

function rotateAroundLocalYAxis(rotation: Vec3 | undefined, angleRad: number): Vec3 {
  const [x, y, z] = rotation ?? [0, 0, 0];
  const baseQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z, 'XYZ'));
  const localQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), angleRad);
  const finalQuat = baseQuat.clone().multiply(localQuat);
  const finalEuler = new THREE.Euler().setFromQuaternion(finalQuat, 'XYZ');

  return [finalEuler.x, finalEuler.y, finalEuler.z];
}

function combineRotations(base: Vec3, delta: Vec3): Vec3 {
  const baseQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(base[0], base[1], base[2], 'XYZ'));
  const deltaQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(delta[0], delta[1], delta[2], 'XYZ'));
  const finalQuat = deltaQuat.multiply(baseQuat);
  const finalEuler = new THREE.Euler().setFromQuaternion(finalQuat, 'XYZ');
  return [finalEuler.x, finalEuler.y, finalEuler.z];
}

function transformLocalPoint(point: Vec3, rotation: Vec3, scale: Vec3): Vec3 {
  const vec = new THREE.Vector3(point[0] * scale[0], point[1] * scale[1], point[2] * scale[2]);
  vec.applyEuler(new THREE.Euler(rotation[0], rotation[1], rotation[2], 'XYZ'));
  return [vec.x, vec.y, vec.z];
}

function snapIndirectMotorAngle(
  angleDeg: number,
  motorPosition: ConveyorConfig['motorPosition'],
): number {
  const normalized = ((angleDeg % 360) + 360) % 360;
  const allowed = motorPosition === 'right'
    ? ([0, 90] as const)
    : ([0, 270] as const);
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

function clampCenterDriveOffset(beltLength: number, centerDriveOffset: number): number {
  const maxOffset = Math.max(0, beltLength / 2 - 300);
  return Math.max(-maxOffset, Math.min(maxOffset, centerDriveOffset));
}

function getCenterDriveSupportExclusion(
  config: Pick<ConveyorConfig, 'driveType' | 'withStand' | 'beltLength' | 'centerDriveOffset'>,
): { centerX: number; halfWidth: number } | null {
  if (config.driveType !== 'center' || !config.withStand) {
    return null;
  }

  return {
    centerX: clampCenterDriveOffset(config.beltLength, config.centerDriveOffset),
    halfWidth: 320,
  };
}

export function getSelectedConveyorAssetUrls(config: ConveyorConfig): string[] {
  const library = getConveyor3DLibrary();
  const urls: string[] = [];

  if (config.driveType === 'direct') {
    urls.push(selectVariant(config.frameWidth, library.motors.direct[config.motorPosition]).url);
  }

  if (config.driveType === 'indirect') {
    urls.push(selectVariant(config.frameWidth, library.motors.indirect[config.motorPosition]).url);
    urls.push(selectVariant(config.frameWidth, library.motors.direct[config.motorPosition]).url);
  }

  if (config.driveType === 'center') {
    urls.push(selectVariant(config.frameWidth, library.motors.center).url);
  }

  if (config.driveType === 'drum') {
    urls.push(selectVariant(config.frameWidth, library.motors.drum[config.motorPosition]).url);
  }

  if (config.withStand) {
    if (config.floorElement === 'feet') {
      urls.push(selectVariant(config.frameWidth, library.floorElements.feet.variants).url);

      if (config.floorBolts) {
        const boltDef = library.floorElements.floorBolts ?? defaultLibrary.floorElements.floorBolts;
        if (boltDef) {
          urls.push(selectVariant(config.frameWidth, boltDef.variants).url);
        }
      }
    }

    if (config.floorElement === 'castors') {
      urls.push(selectVariant(config.frameWidth, library.floorElements.castors.variants).url);
    }
  }

  if (library.profiles?.sideRails?.length) {
    urls.push(selectVariant(config.frameWidth, library.profiles.sideRails).url);
  }

  return Array.from(new Set(urls));
}

function getLegAxisPositions(
  measurements: Conveyor3DMeasurements,
  exclusion?: { centerX: number; halfWidth: number } | null,
): number[] {
  const { beltLength, legInsetX } = measurements;
  const extraPairs = Math.floor(beltLength / 2000);

  if (extraPairs <= 0) {
    return [-legInsetX, legInsetX];
  }

  const firstExtraX = -((extraPairs - 1) * 2000) / 2;
  const extraXs = Array.from({ length: extraPairs }, (_, idx) => firstExtraX + idx * 2000)
    .filter((x) => x > -legInsetX + 1 && x < legInsetX - 1);
  const axisXs = [-legInsetX, ...extraXs, legInsetX];

  if (!exclusion) {
    return axisXs;
  }

  const innerMin = -legInsetX + 1;
  const innerMax = legInsetX - 1;

  return axisXs.map((x, index) => {
    const isEndSupport = index === 0 || index === axisXs.length - 1;
    if (isEndSupport || Math.abs(x - exclusion.centerX) > exclusion.halfWidth) {
      return x;
    }

    const leftCandidate = exclusion.centerX - exclusion.halfWidth;
    const rightCandidate = exclusion.centerX + exclusion.halfWidth;

    if (x < exclusion.centerX) {
      return Math.max(innerMin, Math.min(innerMax, leftCandidate));
    }

    if (x > exclusion.centerX) {
      return Math.max(innerMin, Math.min(innerMax, rightCandidate));
    }

    const canMoveRight = rightCandidate <= innerMax;
    const canMoveLeft = leftCandidate >= innerMin;
    if (canMoveRight && canMoveLeft) {
      return rightCandidate;
    }
    if (canMoveRight) {
      return rightCandidate;
    }
    return Math.max(innerMin, Math.min(innerMax, leftCandidate));
  });
}

function legBasePositions(
  measurements: Conveyor3DMeasurements,
  exclusion?: { centerX: number; halfWidth: number } | null,
): Vec3[] {
  const { legInsetZ, frameHeight, legLength } = measurements;
  const axisXs = getLegAxisPositions(measurements, exclusion);
  const baseY = -(frameHeight / 2 + legLength);

  return axisXs.flatMap((x) => [
    [x, baseY, -legInsetZ] as Vec3,
    [x, baseY, legInsetZ] as Vec3,
  ]);
}

export function resolveConveyor3DAssets(
  config: ConveyorConfig,
  measurements: Conveyor3DMeasurements,
): Conveyor3DResolvedAssets {
  const library = getConveyor3DLibrary();
  const resolved: Conveyor3DResolvedAssets = {};
  const centerDriveSupportExclusion = getCenterDriveSupportExclusion(config);

  if (config.driveType === 'direct') {
    const side = config.motorPosition === 'left' ? -1 : 1;
    const variant = selectVariant(measurements.frameWidth, library.motors.direct[config.motorPosition]);
    const mirrorScaleZ = config.motorPosition === 'left' ? -1 : 1;
    const dScale = variant.scale ?? [1, 1, 1];
    const directAngleDeg = config.motorPosition === 'right'
      ? (270 - config.motorAngle + 360) % 360
      : (config.motorAngle + 270) % 360;
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
      scale: [dScale[0], dScale[1], dScale[2] * mirrorScaleZ],
    };
  }

  if (config.driveType === 'indirect') {
    const side = config.motorPosition === 'left' ? -1 : 1;
    const mountVariant = selectVariant(measurements.frameWidth, library.motors.indirect[config.motorPosition]);
    const motorVariant = selectVariant(measurements.frameWidth, library.motors.direct[config.motorPosition]);
    const mirrorScaleZ = config.motorPosition === 'left' ? -1 : 1;
    const mountScale = mountVariant.scale ?? [1, 1, 1];
    const motorScale = motorVariant.scale ?? [1, 1, 1];
    const snappedAngle = snapIndirectMotorAngle(config.motorAngle, config.motorPosition);
    const indirectAngleDeg = config.motorPosition === 'right'
      ? (90 - snappedAngle + 360) % 360
      : (snappedAngle + 270) % 360;
    const indirectAngleRad = indirectAngleDeg * (Math.PI / 180);
    const baseX = measurements.beltLength / 2 - measurements.motorWidth * 0.3;
    const baseY = 0;
    const baseZ = side * (measurements.frameWidth / 2 + measurements.motorDepth / 2 + 12);

    // Indirect side component stays fixed; motor angle control rotates only the motor.
    // Keep component vertical and oriented away from the belt (CAD-like reference view).
    const mountBaseRot = mountVariant.rotation ?? [0, 0, 0];
    const mountRotBase = combineRotations(mountBaseRot, [Math.PI / 2, Math.PI, Math.PI / 2]);
    const mountRot = config.motorPosition === 'left'
      ? combineRotations(mountRotBase, [0, Math.PI, 0])
      : mountRotBase;
    const motorRotBase = rotateAroundConveyorAxis(motorVariant.rotation ?? [0, 0, 0], indirectAngleRad);
    let motorRot = combineRotations(motorRotBase, [0, Math.PI, 0]);
    // For right side, apply additional 180° rotation around local Y-axis
    if (config.motorPosition === 'right') {
      motorRot = rotateAroundLocalYAxis(motorRot, Math.PI);
    }
    const mountFinalScale: Vec3 = [mountScale[0], mountScale[1], mountScale[2]];

    resolved.indirectMount = {
      url: mountVariant.url,
      position: [
        config.motorPosition === 'left'
          ? baseX - side * 50 + 660
          : baseX - side * 50 - 740,
        baseY,
        config.motorPosition === 'left' ? baseZ - side * 300 + 15 : baseZ - side * 300 - 15,
      ],
      rotation: mountRot,
      scale: mountFinalScale,
    };

    resolved.motor = {
      url: motorVariant.url,
      position: [
        baseX,
        -(measurements.frameHeight / 2 + measurements.motorHeight * 0.85 + 30),
        baseZ - side * 120,
      ],
      rotation: motorRot,
      scale: [motorScale[0], motorScale[1], motorScale[2] * mirrorScaleZ],
    };
  }

  if (config.driveType === 'center') {
    const mountVariant = selectVariant(measurements.frameWidth, library.motors.center);
    const motorVariant = selectVariant(measurements.frameWidth, library.motors.direct.right);
    const clampedOffset = clampCenterDriveOffset(measurements.beltLength, config.centerDriveOffset);
    const centerSide = config.motorPosition === 'left' ? -1 : 1;
    const normalizedCenterAngle = config.motorAngle === 0
      ? 180
      : config.motorAngle === 180
        ? 0
        : config.motorAngle === 90
          ? 270
          : config.motorAngle === 270
            ? 90
            : config.motorAngle;
    const centerMountRot = combineRotations(mountVariant.rotation ?? [0, 0, 0], [0, Math.PI * 1.5, Math.PI * 1.5]);
    const centerMotorRotBase = rotateAroundConveyorAxis(
      motorVariant.rotation ?? [0, 0, 0],
      ((normalizedCenterAngle + 90) * Math.PI) / 180,
    );
    const centerMotorRotY = config.motorPosition === 'left'
      ? combineRotations(centerMotorRotBase, [0, Math.PI, 0])
      : centerMotorRotBase;
    const centerMotorRot = combineRotations(centerMotorRotY, [Math.PI, 0, 0]);
    resolved.centerMount = {
      url: mountVariant.url,
      position: [clampedOffset, -100 - 45, 0],
      rotation: centerMountRot,
      scale: mountVariant.scale ?? [1, 1, 1],
      frameWidthMm: measurements.frameWidth,
    };
    resolved.motor = {
      url: motorVariant.url,
      position: [
        clampedOffset,
        -(measurements.frameHeight / 2 + measurements.motorHeight / 2 + 15) - 40 - 45,
        centerSide * (measurements.frameWidth / 2 + measurements.motorDepth / 2 + 12),
      ],
      rotation: centerMotorRot,
      scale: motorVariant.scale ?? [1, 1, 1],
    };
  }

  if (config.driveType === 'drum') {
    const variant = selectVariant(measurements.frameWidth, library.motors.drum[config.motorPosition]);
    resolved.drumMotor = {
      url: variant.url,
      // An der Antriebsseite (Bandende positiv) als Umlenktrommel
      position: [measurements.beltLength / 2, 0, 0],
      rotation: variant.rotation ?? [0, 0, 0],
      scale: variant.scale ?? [1, 1, 1],
      frameWidthMm: measurements.frameWidth,
    };
  }

  if (library.profiles?.sideRails?.length) {
    const profileVariant = selectVariant(measurements.frameWidth, library.profiles.sideRails);
    const frameSectionWidth = measurements.frameSectionWidth;
    const railZ = measurements.frameWidth / 2 - frameSectionWidth / 2;

    resolved.sideRails = {
      url: profileVariant.url,
      rotation: profileVariant.rotation ?? [0, 0, 0],
      scale: profileVariant.scale ?? [1, 1, 1],
      targetLengthMm: measurements.beltLength,
      positions: [
        [0, 0, -railZ],
        [0, 0, railZ],
      ],
    };
  }

  if (!config.withStand || measurements.legLength <= 0) {
    return resolved;
  }

  const legPositions = legBasePositions(measurements, centerDriveSupportExclusion);

  if (config.floorElement === 'feet') {
    const def = library.floorElements.feet;
    const variant = selectVariant(measurements.frameWidth, def.variants);
    const footPositions = legPositions.map(([x, y, z]) => [x, y + def.positionOffset[1], z] as Vec3);
    resolved.feet = {
      url: variant.url,
      rotation: variant.rotation ?? [0, 0, 0],
      scale: variant.scale ?? [1, 1, 1],
      positions: footPositions,
    };

    if (config.floorBolts) {
      const boltDef = library.floorElements.floorBolts ?? defaultLibrary.floorElements.floorBolts;
      if (boltDef) {
        const boltVariant = selectVariant(measurements.frameWidth, boltDef.variants);
        resolved.floorBolts = {
          url: boltVariant.url,
          rotation: boltVariant.rotation ?? [0, 0, 0],
          scale: boltVariant.scale ?? [1, 1, 1],
          // Clamp plates are centered on the existing foot element positions.
          positions: footPositions.map(([x, y, z]) => [x, y + boltDef.positionOffset[1] - def.positionOffset[1], z]),
        };
      }
    }
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
