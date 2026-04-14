import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { GizmoHelper, GizmoViewport, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { ConveyorConfig } from '@/lib/configurator-types';
import {
  Conveyor3DMeasurements,
  ModelInstances,
  ModelPlacement,
  Vec3,
  loadConveyor3DLibraryFromPublic,
  resolveConveyor3DAssets,
} from '@/lib/conveyor-3d-library';

const C = {
  frame: '#3f4752',
  frameDark: '#2f3640',
  drum: '#64748b',
  belt: '#1b3b2c',
  beltSurface: '#244b37',
  guide: '#cbd5df',
  motor: '#7a0f18',
  motorBody: '#5b0b12',
  leg: '#8d99a8',
  castor: '#6f7b8a',
  crossbar: '#8d99a8',
  floorPlane: '#e6eefc',
  arrow: '#ef4444',
} as const;

const sceneCache = new Map<string, THREE.Object3D>();
const unavailableAssets = new Set<string>();
const CENTER_DRIVE_BASE_WIDTH_MM = 500;
const CENTER_DRIVE_SPAN_PARTS = new Set(['10-00-0021-2', '10-00-0030-1', '10-00-0021-3']);
const CENTER_DRIVE_SIDE_PART_PATTERNS = [
  /seitenpl_mittena_80/i,
  /einstellplatte_mittenantrieb/i,
  /pendelkugellgaer/i,
];

function applyCenterDriveWidth(object: THREE.Object3D, frameWidthMm: number) {
  const widthScaleFactor = frameWidthMm / CENTER_DRIVE_BASE_WIDTH_MM;
  const halfDeltaMeters = (frameWidthMm - CENTER_DRIVE_BASE_WIDTH_MM) / 2000;

  if (Math.abs(widthScaleFactor - 1) < 0.0001) {
    return;
  }

  object.traverse((child) => {
    if (CENTER_DRIVE_SPAN_PARTS.has(child.name)) {
      child.scale.x = widthScaleFactor;
    }

    if (!CENTER_DRIVE_SIDE_PART_PATTERNS.some((pattern) => pattern.test(child.name))) {
      return;
    }

    if (child.position.x > 0) {
      child.position.x += halfDeltaMeters;
    } else if (child.position.x < 0) {
      child.position.x -= halfDeltaMeters;
    }
  });
}

function applyMotorAppearance(object: THREE.Object3D) {
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) {
      return;
    }

    const applyMaterial = (material: THREE.Material) => {
      if (!(material instanceof THREE.MeshStandardMaterial) && !(material instanceof THREE.MeshPhysicalMaterial)) {
        return material;
      }

      const nextMaterial = material.clone();
      nextMaterial.color = new THREE.Color(C.motor);
      nextMaterial.emissive = new THREE.Color('#000000');
      nextMaterial.map = null;
      nextMaterial.metalness = 0.12;
      nextMaterial.roughness = 0.9;
      nextMaterial.envMapIntensity = 0.2;
      nextMaterial.needsUpdate = true;
      return nextMaterial;
    };

    if (Array.isArray(child.material)) {
      child.material = child.material.map(applyMaterial);
      return;
    }

    child.material = applyMaterial(child.material);
  });
}

function normalizeFloorBoltScene(object: THREE.Object3D) {
  const box = new THREE.Box3().setFromObject(object);

  if (box.isEmpty()) {
    return;
  }

  const center = box.getCenter(new THREE.Vector3());
  object.position.x -= center.x;
  object.position.z -= center.z;
}

function Box({
  pos,
  size,
  color,
  opacity = 1,
  metalness = 0.6,
  roughness = 0.35,
}: {
  pos: Vec3;
  size: Vec3;
  color: string;
  opacity?: number;
  metalness?: number;
  roughness?: number;
}) {
  return (
    <mesh position={pos}>
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={color}
        metalness={metalness}
        roughness={roughness}
        transparent={opacity < 1}
        opacity={opacity}
      />
    </mesh>
  );
}

function Cyl({
  pos,
  rot = [0, 0, 0] as Vec3,
  r,
  h,
  color,
  segs = 24,
}: {
  pos: Vec3;
  rot?: Vec3;
  r: number;
  h: number;
  color: string;
  segs?: number;
}) {
  return (
    <mesh position={pos} rotation={rot}>
      <cylinderGeometry args={[r, r, h, segs]} />
      <meshStandardMaterial color={color} metalness={0.75} roughness={0.2} />
    </mesh>
  );
}

function useExternalScene(url?: string) {
  const [scene, setScene] = useState<THREE.Object3D | null>(() => {
    if (url && sceneCache.has(url)) {
      return sceneCache.get(url) ?? null;
    }
    return null;
  });

  useEffect(() => {
    if (!url) {
      setScene(null);
      return;
    }

    if (unavailableAssets.has(url)) {
      setScene(null);
      return;
    }

    if (sceneCache.has(url)) {
      setScene(sceneCache.get(url) ?? null);
      return;
    }

    setScene(null);

    let cancelled = false;
    const loader = new GLTFLoader();

    const commitScene = (cacheKey: string, loadedScene: THREE.Object3D) => {
      if (cancelled) {
        return;
      }
      sceneCache.set(cacheKey, loadedScene);
      setScene(loadedScene);
    };

    loader.load(
      url,
      (gltf) => {
        commitScene(url, gltf.scene);
      },
      undefined,
      (error) => {
        const fallbackUrl = url.includes('?') ? url.split('?')[0] : undefined;

        if (fallbackUrl) {
          loader.load(
            fallbackUrl,
            (gltf) => {
              // Keep cache entries for both keys so future lookups are instant.
              sceneCache.set(fallbackUrl, gltf.scene);
              commitScene(url, gltf.scene);
            },
            undefined,
            (fallbackError) => {
              unavailableAssets.add(url);
              unavailableAssets.add(fallbackUrl);
              console.warn('Failed to load external 3D asset', { url, fallbackUrl, error, fallbackError });
              if (!cancelled) {
                setScene(null);
              }
            },
          );
          return;
        }

        unavailableAssets.add(url);
        console.warn('Failed to load external 3D asset', { url, error });
        if (!cancelled) {
          setScene(null);
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [url]);

  return scene;
}

function ExternalAsset({ asset, fallback }: { asset?: ModelPlacement; fallback: JSX.Element | null }) {
  const scene = useExternalScene(asset?.url);

  const clonedScene = useMemo(() => {
    if (!scene || !asset) {
      return null;
    }

    const nextScene = scene.clone(true);
    if (asset.url.includes('/models/motors/motor.glb')) {
      applyMotorAppearance(nextScene);
    }
    if (asset.url.includes('/models/motors/center_motor.glb') && asset.frameWidthMm) {
      applyCenterDriveWidth(nextScene, asset.frameWidthMm);
    }
    if (asset.url.includes('/models/floor-elements/floor-bolt.glb')) {
      normalizeFloorBoltScene(nextScene);
    }
    return nextScene;
  }, [asset, scene]);

  if (!asset || !clonedScene) {
    return fallback;
  }

  return (
    <primitive
      object={clonedScene}
      position={asset.position}
      rotation={asset.rotation ?? [0, 0, 0]}
      scale={asset.scale ?? [1, 1, 1]}
    />
  );
}

function ExternalAssetInstances({
  asset,
  fallback,
}: {
  asset?: ModelInstances;
  fallback: JSX.Element | null;
}) {
  const scene = useExternalScene(asset?.url);

  const clonedScenes = useMemo(() => {
    if (!scene || !asset) {
      return [];
    }
    return asset.positions.map(() => {
      const nextScene = scene.clone(true);
      if (asset.url.includes('/models/floor-elements/floor-bolt.glb')) {
        normalizeFloorBoltScene(nextScene);
      }
      return nextScene;
    });
  }, [asset, scene]);

  if (!asset || clonedScenes.length === 0) {
    return fallback;
  }

  return (
    <>
      {clonedScenes.map((clonedScene, index) => (
        <primitive
          key={`${asset.url}-${index}`}
          object={clonedScene}
          position={asset.positions[index]}
          rotation={asset.rotation ?? [0, 0, 0]}
          scale={asset.scale ?? [1, 1, 1]}
        />
      ))}
    </>
  );
}

function CameraRig({ config, resetCameraTick }: { config: ConveyorConfig; resetCameraTick: number }) {
  const { camera, invalidate } = useThree();
  const initialised = useRef(false);

  // Only reposition camera on first mount or explicit reset (resetCameraTick change).
  // Changing beltLength, motorPosition etc. must NOT move the camera.
  useEffect(() => {
    if (initialised.current) {
      return;
    }
    initialised.current = true;

    const length = config.beltLength;
    const width = config.frameWidth;
    const standHeight = config.withStand ? config.standHeight : 0;

    const diagonal = Math.sqrt(length * length + width * width);
    const distance = diagonal * 0.9 + standHeight * 0.5;

    camera.position.set(distance * 0.7, standHeight + distance * 0.55, distance * 0.8);
    camera.lookAt(0, standHeight * 0.5, 0);
    (camera as THREE.PerspectiveCamera).near = diagonal * 0.002;
    (camera as THREE.PerspectiveCamera).far = diagonal * 12;
    (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
    invalidate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // On explicit reset: re-initialise and reposition.
  useEffect(() => {
    if (resetCameraTick === 0) {
      return;
    }
    initialised.current = false;

    const length = config.beltLength;
    const width = config.frameWidth;
    const standHeight = config.withStand ? config.standHeight : 0;

    const diagonal = Math.sqrt(length * length + width * width);
    const distance = diagonal * 0.9 + standHeight * 0.5;

    camera.position.set(distance * 0.7, standHeight + distance * 0.55, distance * 0.8);
    camera.lookAt(0, standHeight * 0.5, 0);
    (camera as THREE.PerspectiveCamera).near = diagonal * 0.002;
    (camera as THREE.PerspectiveCamera).far = diagonal * 12;
    (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
    invalidate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetCameraTick]);

  return null;
}

function ControlsRig({
  config,
  resetCameraTick,
}: {
  config: ConveyorConfig;
  resetCameraTick: number;
}) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);

  useEffect(() => {
    const standHeight = config.withStand ? config.standHeight : 0;
    if (!controlsRef.current) {
      return;
    }

    controlsRef.current.target.set(0, standHeight * 0.5, 0);
    controlsRef.current.update();
  }, [config.standHeight, config.withStand, resetCameraTick]);

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enablePan
      minPolarAngle={0.1}
      maxPolarAngle={Math.PI / 2.05}
      zoomSpeed={0.8}
    />
  );
}

function SnapshotRig({
  requestId,
  onSnapshotReady,
}: {
  requestId?: number;
  onSnapshotReady?: (dataUrl: string) => void;
}) {
  const { gl, invalidate } = useThree();

  useEffect(() => {
    if (!requestId || !onSnapshotReady) {
      return;
    }

    let cancelled = false;

    invalidate();

    const timeoutId = window.setTimeout(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (cancelled) {
            return;
          }

          try {
            onSnapshotReady(gl.domElement.toDataURL('image/png'));
          } catch (error) {
            console.error('3D snapshot error:', error);
            onSnapshotReady('');
          }
        });
      });
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [gl, invalidate, onSnapshotReady, requestId]);

  return null;
}

function ParametricDirectMotor({
  length,
  width,
  motorWidth,
  motorHeight,
  motorDepth,
  motorCylinderHeight,
  motorCylinderRadius,
  motorPosition,
  motorAngle,
}: {
  length: number;
  width: number;
  motorWidth: number;
  motorHeight: number;
  motorDepth: number;
  motorCylinderHeight: number;
  motorCylinderRadius: number;
  motorPosition: ConveyorConfig['motorPosition'];
  motorAngle: ConveyorConfig['motorAngle'];
}) {
  const side = motorPosition === 'left' ? -1 : 1;
  const motorZ = side * (width / 2 + motorDepth / 2 + 12);
  const motorX = length / 2 - motorWidth * 0.3;
  const directAngleDeg = motorPosition === 'right'
    ? (90 - motorAngle + 360) % 360
    : (motorAngle + 270) % 360;
  const directAngleRad = directAngleDeg * (Math.PI / 180);

  return (
    <group position={[motorX, 0, motorZ]}>
      <group rotation={[0, 0, directAngleRad]}>
        <Box pos={[0, 0, 0]} size={[motorWidth, motorHeight, motorDepth]} color={C.motor} metalness={0.15} roughness={0.88} />
        <Cyl
          pos={[0, 0, side * (motorDepth / 2 + motorCylinderHeight / 2 + 8)]}
          rot={[Math.PI / 2, 0, 0]}
          r={motorCylinderRadius}
          h={motorCylinderHeight}
          color={C.motorBody}
          metalness={0.15}
          roughness={0.9}
        />
        {[-20, 0, 20].map((offsetX) => (
          <Box
            key={offsetX}
            pos={[offsetX, -motorHeight * 0.35, side * (motorDepth / 2 + 10)]}
            size={[8, motorHeight * 0.2, 6]}
            color={C.motorBody}
            metalness={0.15}
            roughness={0.9}
          />
        ))}
      </group>
    </group>
  );
}

function ParametricIndirectMotor({
  length,
  width,
  frameHeight,
  drumRadius,
  motorWidth,
  motorHeight,
  motorDepth,
  motorCylinderHeight,
  motorCylinderRadius,
  motorPosition,
  motorAngle,
  centerMounted,
  centerOffset = 0,
}: {
  length: number;
  width: number;
  frameHeight: number;
  drumRadius: number;
  motorWidth: number;
  motorHeight: number;
  motorDepth: number;
  motorCylinderHeight: number;
  motorCylinderRadius: number;
  motorPosition: ConveyorConfig['motorPosition'];
  motorAngle: ConveyorConfig['motorAngle'];
  centerMounted: boolean;
  centerOffset?: number;
}) {
  const snappedAngle = [0, 90, 270].reduce((best, candidate) => {
    const normalized = ((motorAngle % 360) + 360) % 360;
    const delta = Math.min(Math.abs(normalized - candidate), 360 - Math.abs(normalized - candidate));
    const bestDelta = Math.min(Math.abs(normalized - best), 360 - Math.abs(normalized - best));
    return delta < bestDelta ? candidate : best;
  }, 0);
  const side = motorPosition === 'left' ? -1 : 1;
  const indirectAngleDeg = motorPosition === 'right'
    ? (90 - snappedAngle + 360) % 360
    : (snappedAngle + 270) % 360;
  const indirectAngleRad = indirectAngleDeg * (Math.PI / 180);
  const effectiveAngleRad = centerMounted ? 0 : indirectAngleRad;
  const effectiveSide = centerMounted ? 1 : side;
  const xPos = centerMounted ? centerOffset : length / 2 - motorWidth * 0.25;
  const lowerShaftY = -(frameHeight / 2 + 2);
  const yPos = centerMounted
    ? -(frameHeight / 2 + motorHeight / 2 + 15)
    : lowerShaftY;
  const zPos = centerMounted ? 0 : side * (width / 2 + 4);

  if (!centerMounted) {
    const motorW = Math.max(90, motorWidth * 0.8);
    const motorH = Math.max(70, motorHeight * 0.65);
    const motorT = Math.max(60, motorDepth * 0.5);

    return (
      <group position={[xPos, yPos, zPos]}>
        <group rotation={[0, 0, effectiveAngleRad]}>
          <Box
            pos={[0, 0, effectiveSide * (motorT / 2 + 6)]}
            size={[motorW, motorH, motorT]}
            color={C.motor}
            metalness={0.15}
            roughness={0.88}
          />

          <Cyl
            pos={[0, -Math.max(6, drumRadius * 0.15), effectiveSide * (motorT + 20)]}
            rot={[Math.PI / 2, 0, 0]}
            r={Math.max(14, motorCylinderRadius * 0.55)}
            h={Math.max(22, motorCylinderHeight * 0.45)}
            color={C.motor}
            metalness={0.15}
            roughness={0.9}
          />
        </group>
      </group>
    );
  }

  return (
    <group position={[xPos, yPos, zPos]}>
      <group rotation={[0, 0, effectiveAngleRad]}>
        <Box pos={[0, 0, 0]} size={[motorWidth, motorHeight, motorDepth]} color={C.motor} metalness={0.15} roughness={0.88} />
        <Cyl
          pos={[0, 0, effectiveSide * (motorDepth / 2 + motorCylinderHeight / 2 + 8)]}
          rot={[Math.PI / 2, 0, 0]}
          r={motorCylinderRadius}
          h={motorCylinderHeight}
          color={C.motorBody}
          metalness={0.15}
          roughness={0.9}
        />
      </group>
    </group>
  );
}

function DirectionArrow({
  beltLength,
  beltTopY,
  frameWidth,
}: {
  beltLength: number;
  beltTopY: number;
  frameWidth: number;
}) {
  const arrowY = beltTopY + 0.15;
  const arrowLength = Math.max(180, Math.min(420, beltLength * 0.22));
  const arrowWidth = Math.max(24, Math.min(72, frameWidth * 0.2));

  const arrowTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 256;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return null;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const pad = 18;
    const h = canvas.height - pad * 2;
    const y = pad;
    const bodyH = h * 0.5;
    const bodyY = y + (h - bodyH) / 2;
    const bodyStart = canvas.width * 0.08;
    const bodyEnd = canvas.width * 0.72;
    const headBaseX = bodyEnd;
    const tipX = canvas.width * 0.95;
    const centerY = y + h / 2;
    const headH = h * 1.02;
    const headTop = centerY - headH / 2;
    const headBottom = centerY + headH / 2;

    // White underlay improves contrast on dark belts.
    const o = 7;

    // Body underlay.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(bodyStart - o, bodyY - o, bodyEnd - bodyStart + o * 2, bodyH + o * 2);

    // Head underlay.
    ctx.beginPath();
    ctx.moveTo(headBaseX - o, headTop - o);
    ctx.lineTo(tipX + o, centerY);
    ctx.lineTo(headBaseX - o, headBottom + o);
    ctx.closePath();
    ctx.fill();

    // Red body.
    ctx.fillStyle = C.arrow;
    ctx.fillRect(bodyStart, bodyY, bodyEnd - bodyStart, bodyH);

    // Red mounted tip (separate head with visible shoulders).
    ctx.beginPath();
    ctx.moveTo(headBaseX, headTop);
    ctx.lineTo(tipX, centerY);
    ctx.lineTo(headBaseX, headBottom);
    ctx.closePath();
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    return texture;
  }, []);

  useEffect(() => {
    return () => {
      arrowTexture?.dispose();
    };
  }, [arrowTexture]);

  if (!arrowTexture) {
    return null;
  }

  return (
    <mesh position={[0, arrowY, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={8}>
      <planeGeometry args={[arrowLength, arrowWidth]} />
      <meshBasicMaterial
        map={arrowTexture}
        transparent
        depthWrite={false}
        polygonOffset
        polygonOffsetFactor={-2}
      />
    </mesh>
  );
}

function ParametricFeet({ positions }: { positions: Vec3[] }) {
  return (
    <>
      {positions.map((position, index) => (
        <Box key={`foot-${index}`} pos={position} size={[60, 24, 60]} color={C.frameDark} />
      ))}
    </>
  );
}

function ParametricCastors({ positions }: { positions: Vec3[] }) {
  return (
    <>
      {positions.map((position, index) => (
        <group key={`castor-${index}`} position={position}>
          <Cyl pos={[0, 0, 0]} rot={[0, 0, Math.PI / 2]} r={28} h={22} color={C.castor} segs={20} />
          <Box pos={[0, 23, 0]} size={[20, 10, 20]} color="#374151" />
        </group>
      ))}
    </>
  );
}

function ParametricFloorBolts({ positions }: { positions: Vec3[] }) {
  return (
    <>
      {positions.map((position, index) => (
        <group key={`floor-bolt-${index}`} position={position}>
          <Box pos={[0, -4, 0]} size={[80, 8, 54]} color="#9ca3af" />
          <Box pos={[0, 7, 0]} size={[22, 14, 22]} color="#6b7280" />
        </group>
      ))}
    </>
  );
}

function getLegAxisPositions(beltLength: number, legInsetX: number): number[] {
  const extraPairs = Math.floor(beltLength / 2000);

  if (extraPairs <= 0) {
    return [-legInsetX, legInsetX];
  }

  const firstExtraX = -((extraPairs - 1) * 2000) / 2;
  const extraXs = Array.from({ length: extraPairs }, (_, idx) => firstExtraX + idx * 2000)
    .filter((x) => x > -legInsetX + 1 && x < legInsetX - 1);

  return [-legInsetX, ...extraXs, legInsetX];
}

function ConveyorModel({ config }: { config: ConveyorConfig }) {
  const {
    beltLength,
    frameWidth,
    inclineAngle,
    sideGuideHeight,
    withStand,
    standHeight,
    driveType,
    motorPosition,
    floorElement,
  } = config;

  const usesWideProfile = frameWidth > 500;
  const frameHeight = usesWideProfile ? 80 : 40;
  const frameSectionWidth = 40;
  const drumRadius = Math.max(25, Math.min(55, frameWidth * 0.07));
  const beltThickness = 6;
  const beltTopY = frameHeight / 2 + beltThickness;

  const motorWidth = Math.max(90, frameWidth * 0.18);
  const motorHeight = Math.max(80, frameHeight * 0.85);
  const motorDepth = Math.max(120, frameWidth * 0.22);
  const motorCylinderRadius = motorHeight * 0.32;
  const motorCylinderHeight = motorHeight * 1.3;

  const inclineRadians = (inclineAngle * Math.PI) / 180;
  const castorLegTrim = withStand && floorElement === 'castors' ? frameHeight / 2 + 53 : 0;
  const legLength = withStand ? Math.max(standHeight - castorLegTrim, 0) : 0;
  const noStandLift = 400;
  const groupY = withStand ? standHeight : noStandLift;
  const legInsetX = beltLength / 2 - Math.min(150, beltLength * 0.08);
  const legInsetZ = frameWidth / 2 - Math.max(frameSectionWidth, 15);
  const legBottomY = -(frameHeight / 2 + legLength);
  const supportClearance = 2;
  const frameBottomYAtX = (x: number) => x * Math.sin(inclineRadians) - (frameHeight / 2) * Math.cos(inclineRadians);
  const legAxisXs = getLegAxisPositions(beltLength, legInsetX);

  const legSpecs = legAxisXs.flatMap((x) => [{ x, z: -legInsetZ }, { x, z: legInsetZ }]).map(({ x, z }) => {
    const topY = frameBottomYAtX(x) - supportClearance;
    const currentLegLength = Math.max(topY - legBottomY, 80);
    return {
      x,
      z,
      topY,
      bottomY: legBottomY,
      length: currentLegLength,
      centerY: legBottomY + currentLegLength / 2,
    };
  });

  const footPositions: Vec3[] = legSpecs.map(({ x, bottomY, z }) => [x, bottomY - 12, z]);
  const castorPositions: Vec3[] = legSpecs.map(({ x, bottomY, z }) => [x, bottomY, z]);
  const shortestLegLength = legSpecs.reduce((minLength, spec) => Math.min(minLength, spec.length), legLength);

  const measurements: Conveyor3DMeasurements = {
    beltLength,
    frameWidth,
    frameHeight,
    frameSectionWidth,
    sideGuideHeight,
    inclineAngle,
    beltTopY,
    drumRadius,
    motorWidth,
    motorHeight,
    motorDepth,
    motorCylinderHeight,
    legLength,
    legInsetX,
    legInsetZ,
  };

  const resolvedAssets = resolveConveyor3DAssets(config, measurements);

  return (
    <group position={[0, groupY, 0]}>
      {/* Belt + frame — tilts with incline */}
      <group rotation={[0, 0, inclineRadians]}>
        <ExternalAssetInstances
          asset={resolvedAssets.sideRails}
          fallback={(
            <>
              <Box pos={[0, 0, -(frameWidth / 2 - frameSectionWidth / 2)]} size={[beltLength, frameHeight, frameSectionWidth]} color={C.frame} />
              <Box pos={[0, 0, frameWidth / 2 - frameSectionWidth / 2]} size={[beltLength, frameHeight, frameSectionWidth]} color={C.frame} />
            </>
          )}
        />

        {Array.from({ length: Math.min(18, Math.max(2, Math.floor(beltLength / 500))) }, (_, index) => {
          const x = -beltLength / 2 + ((index + 1) * beltLength) / (Math.min(18, Math.max(2, Math.floor(beltLength / 500))) + 1);
          return (
            <Box
              key={`cross-member-${index}`}
              pos={[x, -frameHeight * 0.2, 0]}
              size={[frameSectionWidth * 0.5, frameHeight * 0.55, frameWidth - 2 * frameSectionWidth]}
              color={C.frameDark}
            />
          );
        })}

        <Cyl pos={[beltLength / 2, 0, 0]} rot={[Math.PI / 2, 0, 0]} r={drumRadius} h={frameWidth + 24} color={C.drum} />
        <Cyl pos={[-beltLength / 2, 0, 0]} rot={[Math.PI / 2, 0, 0]} r={drumRadius} h={frameWidth + 24} color={C.drum} />

        <Box
          pos={[0, beltTopY - beltThickness / 2, 0]}
          size={[beltLength * 0.99, beltThickness, Math.max(frameWidth - 5, 1)]}
          color={C.beltSurface}
          metalness={0.05}
          roughness={0.92}
        />
        <Box
          pos={[0, -(frameHeight / 2 + 2), 0]}
          size={[beltLength * 0.99, 4, Math.max(frameWidth - 5, 1)]}
          color={C.belt}
          metalness={0.05}
          roughness={0.92}
        />

        {sideGuideHeight > 0 && (
          <>
            <Box
              pos={[0, beltTopY + sideGuideHeight / 2, -(frameWidth / 2 - 3)]}
              size={[beltLength * 0.96, sideGuideHeight, 5]}
              color={C.guide}
              opacity={0.88}
            />
            <Box
              pos={[0, beltTopY + sideGuideHeight / 2, frameWidth / 2 - 3]}
              size={[beltLength * 0.96, sideGuideHeight, 5]}
              color={C.guide}
              opacity={0.88}
            />
          </>
        )}

        {driveType === 'direct' && (
          <ExternalAsset
            asset={resolvedAssets.motor}
            fallback={
              <ParametricDirectMotor
                length={beltLength}
                width={frameWidth}
                motorWidth={motorWidth}
                motorHeight={motorHeight}
                motorDepth={motorDepth}
                motorCylinderHeight={motorCylinderHeight}
                motorCylinderRadius={motorCylinderRadius}
                motorPosition={motorPosition}
                motorAngle={config.motorAngle}
              />
            }
          />
        )}

        {driveType === 'indirect' && (
          <>
            <ExternalAsset
              asset={resolvedAssets.indirectMount}
              fallback={null}
            />
            <ExternalAsset
              asset={resolvedAssets.motor}
              fallback={
                <ParametricIndirectMotor
                  length={beltLength}
                  width={frameWidth}
                  frameHeight={frameHeight}
                  drumRadius={drumRadius}
                  motorWidth={motorWidth}
                  motorHeight={motorHeight}
                  motorDepth={motorDepth}
                  motorCylinderHeight={motorCylinderHeight}
                  motorCylinderRadius={motorCylinderRadius}
                  motorPosition={motorPosition}
                  motorAngle={config.motorAngle}
                  centerMounted={false}
                  centerOffset={0}
                />
              }
            />
          </>
        )}

        {driveType === 'center' && (
          <>
            <ExternalAsset
              asset={resolvedAssets.centerMount}
              fallback={null}
            />
            <ExternalAsset
              asset={resolvedAssets.motor}
              fallback={
                <ParametricIndirectMotor
                  length={beltLength}
                  width={frameWidth}
                  frameHeight={frameHeight}
                  drumRadius={drumRadius}
                  motorWidth={motorWidth}
                  motorHeight={motorHeight}
                  motorDepth={motorDepth}
                  motorCylinderHeight={motorCylinderHeight}
                  motorCylinderRadius={motorCylinderRadius}
                  motorPosition={motorPosition}
                  motorAngle={config.motorAngle}
                  centerMounted
                  centerOffset={config.centerDriveOffset}
                />
              }
            />
          </>
        )}

        <DirectionArrow beltLength={beltLength} beltTopY={beltTopY} frameWidth={frameWidth} />
      </group>

      {/* Stand — always vertical, not tilted */}
      {withStand && legLength > 0 && (
        <>
          {legSpecs.map((spec, index) => (
            <group key={`leg-${index}`} position={[spec.x, spec.centerY, spec.z]}>
              <Box pos={[0, 0, 0]} size={[38, spec.length, 38]} color={C.leg} metalness={0.7} roughness={0.3} />
              <Box pos={[0, spec.length * 0.15, 0]} size={[12, spec.length * 0.25, 12]} color="#1f2937" />
            </group>
          ))}

          {floorElement === 'feet' && (
            <>
              <ExternalAssetInstances
                asset={resolvedAssets.feet}
                fallback={<ParametricFeet positions={footPositions} />}
              />
              {config.floorBolts && (
                <ExternalAssetInstances
                  asset={resolvedAssets.floorBolts}
                  fallback={<ParametricFloorBolts positions={footPositions} />}
                />
              )}
            </>
          )}

          {floorElement === 'castors' && (
            <ExternalAssetInstances
              asset={resolvedAssets.castors}
              fallback={<ParametricCastors positions={castorPositions} />}
            />
          )}

          <UnderframeBracing
            frameWidth={frameWidth}
            legAxisXs={legAxisXs}
            legInsetZ={legInsetZ}
            y={legBottomY + shortestLegLength * 0.28}
          />
        </>
      )}
    </group>
  );
}

function UnderframeBracing({
  frameWidth,
  legAxisXs,
  legInsetZ,
  y,
}: {
  frameWidth: number;
  legAxisXs: number[];
  legInsetZ: number;
  y: number;
}) {
  const barHeight = 22;
  const barThickness = 24;
  const spanX = Math.max(0, legAxisXs[legAxisXs.length - 1] - legAxisXs[0]);
  const spanZ = legInsetZ * 2;
  const sideZ = legInsetZ;
  const transverseBraceXs = legAxisXs;

  return (
    <>
      {frameWidth > 500 ? (
        <>
          <Box pos={[0, y, -sideZ]} size={[spanX, barHeight, barThickness]} color={C.crossbar} />
          <Box pos={[0, y, sideZ]} size={[spanX, barHeight, barThickness]} color={C.crossbar} />
          {transverseBraceXs.map((x, index) => (
            <Box key={`wide-transverse-brace-${index}`} pos={[x, y, 0]} size={[barThickness, barHeight, spanZ]} color={C.crossbar} />
          ))}
        </>
      ) : (
        <>
          {transverseBraceXs.map((x, index) => (
            <Box key={`compact-transverse-brace-${index}`} pos={[x, y, 0]} size={[barThickness, barHeight, spanZ]} color={C.crossbar} />
          ))}
          <Box pos={[0, y, 0]} size={[spanX, barHeight, barThickness]} color={C.crossbar} />
        </>
      )}
    </>
  );
}

function FloorPlane({ config }: { config: ConveyorConfig }) {
  const groundY = -45;
  const size = Math.max(config.beltLength, 4000) * 2.5;

  return (
    <mesh position={[0, groundY, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[size, size]} />
      <meshStandardMaterial color={C.floorPlane} side={THREE.DoubleSide} />
    </mesh>
  );
}

export function ConveyorViewer3D({
  config,
  resetCameraTick = 0,
  snapshotRequest = 0,
  onSnapshotReady,
}: {
  config: ConveyorConfig;
  resetCameraTick?: number;
  snapshotRequest?: number;
  onSnapshotReady?: (dataUrl: string) => void;
}) {
  useEffect(() => {
    void loadConveyor3DLibraryFromPublic();
  }, []);

  return (
    <Canvas
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: false, preserveDrawingBuffer: Boolean(onSnapshotReady) }}
      camera={{ fov: 45, position: [3000, 2000, 3000], near: 1, far: 100000 }}
    >
      <color attach="background" args={['#eaf3ff']} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[5000, 9000, 4000]} intensity={1.6} />
      <directionalLight position={[-4000, 3000, -3000]} intensity={0.4} />
      <directionalLight position={[0, -2000, 0]} intensity={0.15} />

      <Suspense fallback={null}>
        <ConveyorModel config={config} />
        <FloorPlane config={config} />
      </Suspense>

      <CameraRig config={config} resetCameraTick={resetCameraTick} />
      <ControlsRig config={config} resetCameraTick={resetCameraTick} />
      <GizmoHelper alignment="bottom-left" margin={[70, 70]}>
        <GizmoViewport axisColors={['#ef4444', '#22c55e', '#3b82f6']} labelColor="#0f172a" />
      </GizmoHelper>
      <SnapshotRig requestId={snapshotRequest} onSnapshotReady={onSnapshotReady} />
    </Canvas>
  );
}
