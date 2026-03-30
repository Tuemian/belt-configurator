import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Grid, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
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
  frame: '#4b5563',
  frameDark: '#374151',
  drum: '#9ca3af',
  belt: '#1a1a1a',
  beltSurface: '#27272a',
  guide: '#6b7280',
  motor: '#f59e0b',
  motorBody: '#d97706',
  leg: '#374151',
  castor: '#1f2937',
  crossbar: '#4b5563',
} as const;

const sceneCache = new Map<string, THREE.Object3D>();
const unavailableAssets = new Set<string>();

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
    if (!url || unavailableAssets.has(url)) {
      return;
    }

    if (sceneCache.has(url)) {
      setScene(sceneCache.get(url) ?? null);
      return;
    }

    let cancelled = false;
    const loader = new GLTFLoader();

    const loadScene = async () => {
      try {
        const headResponse = await fetch(url, { method: 'HEAD' });
        if (!headResponse.ok) {
          unavailableAssets.add(url);
          return;
        }

        loader.load(
          url,
          (gltf) => {
            if (cancelled) {
              return;
            }
            sceneCache.set(url, gltf.scene);
            setScene(gltf.scene);
          },
          undefined,
          () => {
            unavailableAssets.add(url);
          },
        );
      } catch {
        unavailableAssets.add(url);
      }
    };

    void loadScene();

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
    return scene.clone(true);
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
    return asset.positions.map(() => scene.clone(true));
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

function CameraRig({ config }: { config: ConveyorConfig }) {
  const { camera, invalidate } = useThree();
  const prev = useRef({ length: 0, width: 0, standHeight: 0 });

  useEffect(() => {
    const length = config.beltLength;
    const width = config.frameWidth;
    const standHeight = config.withStand ? config.standHeight : 0;

    if (
      prev.current.length === length &&
      prev.current.width === width &&
      prev.current.standHeight === standHeight
    ) {
      return;
    }

    prev.current = { length, width, standHeight };

    const diagonal = Math.sqrt(length * length + width * width);
    const distance = diagonal * 0.9 + standHeight * 0.5;

    camera.position.set(distance * 0.7, standHeight + distance * 0.55, distance * 0.8);
    camera.lookAt(0, standHeight * 0.5, 0);
    (camera as THREE.PerspectiveCamera).near = diagonal * 0.002;
    (camera as THREE.PerspectiveCamera).far = diagonal * 12;
    (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
    invalidate();
  }, [camera, config.beltLength, config.frameWidth, config.standHeight, config.withStand, invalidate]);

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
}: {
  length: number;
  width: number;
  motorWidth: number;
  motorHeight: number;
  motorDepth: number;
  motorCylinderHeight: number;
  motorCylinderRadius: number;
  motorPosition: ConveyorConfig['motorPosition'];
}) {
  const side = motorPosition === 'left' ? -1 : 1;
  const motorZ = side * (width / 2 + motorDepth / 2 + 12);

  return (
    <group position={[-length / 2, 0, motorZ]}>
      <Box pos={[0, 0, 0]} size={[motorWidth, motorHeight, motorDepth]} color={C.motor} metalness={0.55} roughness={0.4} />
      <Cyl
        pos={[0, 0, side * (motorDepth / 2 + motorCylinderHeight / 2 + 8)]}
        rot={[Math.PI / 2, 0, 0]}
        r={motorCylinderRadius}
        h={motorCylinderHeight}
        color={C.motorBody}
      />
      {[-20, 0, 20].map((offsetX) => (
        <Box
          key={offsetX}
          pos={[offsetX, -motorHeight * 0.35, side * (motorDepth / 2 + 10)]}
          size={[8, motorHeight * 0.2, 6]}
          color={C.motorBody}
        />
      ))}
    </group>
  );
}

function ParametricIndirectMotor({
  length,
  frameHeight,
  motorWidth,
  motorHeight,
  motorDepth,
  motorCylinderHeight,
  motorCylinderRadius,
  centerMounted,
}: {
  length: number;
  frameHeight: number;
  motorWidth: number;
  motorHeight: number;
  motorDepth: number;
  motorCylinderHeight: number;
  motorCylinderRadius: number;
  centerMounted: boolean;
}) {
  return (
    <group position={[centerMounted ? 0 : -length / 2, -(frameHeight / 2 + motorHeight / 2 + 15), 0]}>
      <Box pos={[0, 0, 0]} size={[motorWidth, motorHeight, motorDepth]} color={C.motor} metalness={0.55} roughness={0.4} />
      <Cyl
        pos={[0, 0, motorDepth / 2 + motorCylinderHeight / 2 + 8]}
        rot={[Math.PI / 2, 0, 0]}
        r={motorCylinderRadius}
        h={motorCylinderHeight}
        color={C.motorBody}
      />
    </group>
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

  const frameHeight = Math.max(70, frameWidth * 0.1);
  const frameSectionWidth = Math.min(35, Math.max(20, frameWidth * 0.06));
  const drumRadius = Math.max(25, Math.min(55, frameWidth * 0.07));
  const beltThickness = 6;
  const beltTopY = frameHeight / 2 + beltThickness;

  const motorWidth = Math.max(90, frameWidth * 0.18);
  const motorHeight = Math.max(80, frameHeight * 0.85);
  const motorDepth = Math.max(120, frameWidth * 0.22);
  const motorCylinderRadius = motorHeight * 0.32;
  const motorCylinderHeight = motorHeight * 1.3;

  const inclineRadians = -(inclineAngle * Math.PI) / 180;
  const legLength = withStand ? standHeight : 0;
  const groupY = legLength;
  const legInsetX = beltLength / 2 - Math.min(150, beltLength * 0.08);
  const legInsetZ = frameWidth / 2 - Math.max(frameSectionWidth, 15);

  const legPostPositions: Vec3[] = [
    [-legInsetX, -(frameHeight / 2 + legLength / 2), -legInsetZ],
    [-legInsetX, -(frameHeight / 2 + legLength / 2), legInsetZ],
    [legInsetX, -(frameHeight / 2 + legLength / 2), -legInsetZ],
    [legInsetX, -(frameHeight / 2 + legLength / 2), legInsetZ],
  ];

  const footPositions: Vec3[] = legPostPositions.map(([x, y, z]) => [x, y - legLength / 2 - 12, z]);
  const castorPositions: Vec3[] = legPostPositions.map(([x, y, z]) => [x, y - legLength / 2 - 28, z]);

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
    <group rotation={[0, 0, inclineRadians]} position={[0, groupY, 0]}>
      <Box pos={[0, 0, -(frameWidth / 2 - frameSectionWidth / 2)]} size={[beltLength, frameHeight, frameSectionWidth]} color={C.frame} />
      <Box pos={[0, 0, frameWidth / 2 - frameSectionWidth / 2]} size={[beltLength, frameHeight, frameSectionWidth]} color={C.frame} />

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
        size={[beltLength * 0.99, beltThickness, frameWidth * 0.86]}
        color={C.beltSurface}
        metalness={0.05}
        roughness={0.92}
      />
      <Box
        pos={[0, -(frameHeight / 2 + 2), 0]}
        size={[beltLength * 0.99, 4, frameWidth * 0.82]}
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
            />
          }
        />
      )}

      {driveType === 'indirect' && (
        <ExternalAsset
          asset={resolvedAssets.motor}
          fallback={
            <ParametricIndirectMotor
              length={beltLength}
              frameHeight={frameHeight}
              motorWidth={motorWidth}
              motorHeight={motorHeight}
              motorDepth={motorDepth}
              motorCylinderHeight={motorCylinderHeight}
              motorCylinderRadius={motorCylinderRadius}
              centerMounted={false}
            />
          }
        />
      )}

      {driveType === 'center' && (
        <ExternalAsset
          asset={resolvedAssets.motor}
          fallback={
            <ParametricIndirectMotor
              length={beltLength}
              frameHeight={frameHeight}
              motorWidth={motorWidth}
              motorHeight={motorHeight}
              motorDepth={motorDepth}
              motorCylinderHeight={motorCylinderHeight}
              motorCylinderRadius={motorCylinderRadius}
              centerMounted
            />
          }
        />
      )}

      {withStand && legLength > 0 && (
        <>
          {legPostPositions.map((position, index) => (
            <group key={`leg-${index}`} position={position}>
              <Box pos={[0, 0, 0]} size={[38, legLength, 38]} color={C.leg} metalness={0.7} roughness={0.3} />
              <Box pos={[0, legLength * 0.15, 0]} size={[12, legLength * 0.25, 12]} color="#1f2937" />
            </group>
          ))}

          {floorElement === 'feet' && (
            <ExternalAssetInstances
              asset={resolvedAssets.feet}
              fallback={<ParametricFeet positions={footPositions} />}
            />
          )}

          {floorElement === 'castors' && (
            <ExternalAssetInstances
              asset={resolvedAssets.castors}
              fallback={<ParametricCastors positions={castorPositions} />}
            />
          )}

          <Box
            pos={[0, -(frameHeight / 2 + legLength * 0.72), 0]}
            size={[
              beltLength - 2 * Math.min(150, beltLength * 0.08) - 38,
              28,
              frameWidth - 2 * Math.max(frameSectionWidth, 15) - 38,
            ]}
            color={C.crossbar}
          />
        </>
      )}
    </group>
  );
}

function FloorGrid({ config }: { config: ConveyorConfig }) {
  const standHeight = config.withStand ? config.standHeight : 0;
  const groundY = -(standHeight + 60);
  const size = Math.max(config.beltLength, 4000) * 2.5;
  const cell = Math.round(size / 60 / 100) * 100 || 100;
  const section = cell * 5;

  return (
    <Grid
      position={[0, groundY, 0]}
      args={[size, size] as unknown as [number]}
      cellSize={cell}
      sectionSize={section}
      cellColor="#e2e8f0"
      sectionColor="#94a3b8"
      fadeDistance={size * 1.2}
      fadeStrength={1}
      infiniteGrid
    />
  );
}

export function ConveyorViewer3D({ config }: { config: ConveyorConfig }) {
  useEffect(() => {
    void loadConveyor3DLibraryFromPublic();
  }, []);

  return (
    <Canvas
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: false }}
      camera={{ fov: 45, position: [3000, 2000, 3000], near: 1, far: 100000 }}
    >
      <color attach="background" args={['#f1f5f9']} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[5000, 9000, 4000]} intensity={1.6} />
      <directionalLight position={[-4000, 3000, -3000]} intensity={0.4} />
      <directionalLight position={[0, -2000, 0]} intensity={0.15} />

      <Suspense fallback={null}>
        <ConveyorModel config={config} />
        <FloorGrid config={config} />
      </Suspense>

      <CameraRig config={config} />
      <OrbitControls
        makeDefault
        enablePan
        minPolarAngle={0.1}
        maxPolarAngle={Math.PI / 2.05}
        zoomSpeed={0.8}
      />
    </Canvas>
  );
}
