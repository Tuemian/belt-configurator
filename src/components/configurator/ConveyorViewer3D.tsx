import { Suspense, useEffect, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { ConveyorConfig } from '@/lib/configurator-types';

// ─── colours ────────────────────────────────────────────────────────────────
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

// ─── tiny helpers ────────────────────────────────────────────────────────────
type V3 = [number, number, number];

function Box({
  pos,
  size,
  color,
  opacity = 1,
  metalness = 0.6,
  roughness = 0.35,
}: {
  pos: V3;
  size: V3;
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
  rot = [0, 0, 0] as V3,
  r,
  h,
  color,
  segs = 24,
}: {
  pos: V3;
  rot?: V3;
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

// ─── Camera auto-fit ─────────────────────────────────────────────────────────
function CameraRig({ config }: { config: ConveyorConfig }) {
  const { camera, invalidate } = useThree();
  const prev = useRef({ L: 0, W: 0, S: 0 });

  useEffect(() => {
    const L = config.beltLength;
    const W = config.frameWidth;
    const S = config.withStand ? config.standHeight : 0;
    if (
      prev.current.L === L &&
      prev.current.W === W &&
      prev.current.S === S
    )
      return;
    prev.current = { L, W, S };

    const diag = Math.sqrt(L * L + W * W);
    const dist = diag * 0.9 + S * 0.5;
    camera.position.set(dist * 0.7, S + dist * 0.55, dist * 0.8);
    camera.lookAt(0, S * 0.5, 0);
    (camera as THREE.PerspectiveCamera).near = diag * 0.002;
    (camera as THREE.PerspectiveCamera).far = diag * 12;
    (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
    invalidate();
  }, [camera, config.beltLength, config.frameWidth, config.withStand, config.standHeight, invalidate]);

  return null;
}

// ─── Parametric conveyor model ────────────────────────────────────────────────
function ConveyorModel({ config }: { config: ConveyorConfig }) {
  const {
    beltLength: L,
    frameWidth: W,
    inclineAngle,
    sideGuideHeight: SG,
    withStand,
    standHeight,
    driveType,
    motorPosition,
    floorElement,
  } = config;

  // Derived geometry (all in mm)
  const FH = Math.max(70, W * 0.1);          // frame rail height
  const FW = Math.min(35, Math.max(20, W * 0.06)); // frame rail section width
  const DR = Math.max(25, Math.min(55, W * 0.07)); // drum radius
  const BT = 6;                               // belt top-surface slab thickness
  const beltTopY = FH / 2 + BT;             // Y of belt upper face (local)

  // Motor box dimensions (proportional)
  const mW = Math.max(90, W * 0.18);
  const mH = Math.max(80, FH * 0.85);
  const mD = Math.max(120, W * 0.22);
  const mCylR = mH * 0.32;
  const mCylH = mH * 1.3;

  const inclineRad = -(inclineAngle * Math.PI) / 180; // neg: tilt up on head side
  const legLen = withStand ? standHeight : 0;
  const groupY = legLen; // place frame so its underside rests above stand

  // Leg corner offsets (inset from frame ends)
  const LX = L / 2 - Math.min(150, L * 0.08);
  const LZ = W / 2 - Math.max(FW, 15);

  return (
    <group rotation={[0, 0, inclineRad]} position={[0, groupY, 0]}>
      {/* ── FRAME: two longitudinal rails ── */}
      <Box pos={[0, 0, -(W / 2 - FW / 2)]} size={[L, FH, FW]} color={C.frame} />
      <Box pos={[0, 0,  (W / 2 - FW / 2)]} size={[L, FH, FW]} color={C.frame} />

      {/* Cross-members (evenly spaced, max 18) */}
      {(() => {
        const count = Math.min(18, Math.max(2, Math.floor(L / 500)));
        const span = W - 2 * FW;
        return Array.from({ length: count }, (_, i) => {
          const x = -L / 2 + ((i + 1) * L) / (count + 1);
          return (
            <Box
              key={i}
              pos={[x, -FH * 0.2, 0]}
              size={[FW * 0.5, FH * 0.55, span]}
              color={C.frameDark}
            />
          );
        });
      })()}

      {/* ── DRUMS ── */}
      {/* Head drum (exit, +X) */}
      <Cyl pos={[L / 2, 0, 0]} rot={[Math.PI / 2, 0, 0]} r={DR} h={W + 24} color={C.drum} />
      {/* Tail drum (drive, -X) */}
      <Cyl pos={[-L / 2, 0, 0]} rot={[Math.PI / 2, 0, 0]} r={DR} h={W + 24} color={C.drum} />

      {/* ── BELT SURFACE (top run) ── */}
      <Box
        pos={[0, beltTopY - BT / 2, 0]}
        size={[L * 0.99, BT, W * 0.86]}
        color={C.beltSurface}
        metalness={0.05}
        roughness={0.92}
      />
      {/* Return belt (underside, thin) */}
      <Box
        pos={[0, -(FH / 2 + 2), 0]}
        size={[L * 0.99, 4, W * 0.82]}
        color={C.belt}
        metalness={0.05}
        roughness={0.92}
      />

      {/* ── SIDE GUIDES ── */}
      {SG > 0 && (
        <>
          <Box
            pos={[0, beltTopY + SG / 2, -(W / 2 - 3)]}
            size={[L * 0.96, SG, 5]}
            color={C.guide}
            opacity={0.88}
          />
          <Box
            pos={[0, beltTopY + SG / 2,  (W / 2 - 3)]}
            size={[L * 0.96, SG, 5]}
            color={C.guide}
            opacity={0.88}
          />
        </>
      )}

      {/* ── MOTOR + GEARBOX ── */}
      {driveType === 'direct' && (() => {
        const side = motorPosition === 'left' ? -1 : 1;
        const mZ = side * (W / 2 + mD / 2 + 12);
        return (
          <group position={[-L / 2, 0, mZ]}>
            {/* Gearbox */}
            <Box pos={[0, 0, 0]} size={[mW, mH, mD]} color={C.motor} metalness={0.55} roughness={0.4} />
            {/* Motor cylinder — sticks further out */}
            <Cyl
              pos={[0, 0, side * (mD / 2 + mCylH / 2 + 8)]}
              rot={[Math.PI / 2, 0, 0]}
              r={mCylR}
              h={mCylH}
              color={C.motorBody}
            />
            {/* Ventilation fins hint */}
            {[-20, 0, 20].map((dx) => (
              <Box
                key={dx}
                pos={[dx, -mH * 0.35, side * (mD / 2 + 10)]}
                size={[8, mH * 0.2, 6]}
                color={C.motorBody}
              />
            ))}
          </group>
        );
      })()}

      {driveType === 'indirect' && (
        <group position={[-L / 2, -(FH / 2 + mH / 2 + 15), 0]}>
          <Box pos={[0, 0, 0]} size={[mW, mH, mD]} color={C.motor} metalness={0.55} roughness={0.4} />
          <Cyl
            pos={[0, 0, mD / 2 + mCylH / 2 + 8]}
            rot={[Math.PI / 2, 0, 0]}
            r={mCylR}
            h={mCylH}
            color={C.motorBody}
          />
        </group>
      )}

      {driveType === 'center' && (
        <group position={[0, -(FH / 2 + mH / 2 + 15), 0]}>
          <Box pos={[0, 0, 0]} size={[mW, mH, mD]} color={C.motor} metalness={0.55} roughness={0.4} />
          <Cyl
            pos={[0, 0, mD / 2 + mCylH / 2 + 8]}
            rot={[Math.PI / 2, 0, 0]}
            r={mCylR}
            h={mCylH}
            color={C.motorBody}
          />
        </group>
      )}

      {/* ── STAND ── */}
      {withStand && legLen > 0 && (
        <>
          {([[-LX, -LZ], [-LX, LZ], [LX, -LZ], [LX, LZ]] as [number, number][]).map(
            ([lx, lz], i) => (
              <group key={i} position={[lx, -(FH / 2 + legLen / 2), lz]}>
                {/* Leg post */}
                <Box pos={[0, 0, 0]} size={[38, legLen, 38]} color={C.leg} metalness={0.7} roughness={0.3} />
                {/* Height-adjust slot hint */}
                <Box pos={[0, legLen * 0.15, 0]} size={[12, legLen * 0.25, 12]} color="#1f2937" />
                {/* Floor element */}
                {floorElement === 'feet' ? (
                  <Box pos={[0, -(legLen / 2 + 12), 0]} size={[60, 24, 60]} color={C.frameDark} />
                ) : (
                  /* Castor wheel silhouette */
                  <>
                    <Cyl
                      pos={[0, -(legLen / 2 + 28), 0]}
                      rot={[0, 0, Math.PI / 2]}
                      r={28}
                      h={22}
                      color={C.castor}
                      segs={20}
                    />
                    <Box pos={[0, -(legLen / 2 + 5), 0]} size={[20, 10, 20]} color="#374151" />
                  </>
                )}
              </group>
            )
          )}

          {/* Horizontal crossbars (lower + upper) */}
          <Box
            pos={[0, -(FH / 2 + legLen * 0.72), 0]}
            size={[L - 2 * Math.min(150, L * 0.08) - 38, 28, W - 2 * Math.max(FW, 15) - 38]}
            color={C.crossbar}
          />
        </>
      )}
    </group>
  );
}

// ─── Ground grid ─────────────────────────────────────────────────────────────
function FloorGrid({ config }: { config: ConveyorConfig }) {
  const standH = config.withStand ? config.standHeight : 0;
  const groundY = -(standH + 60);
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

// ─── Public export ────────────────────────────────────────────────────────────
export function ConveyorViewer3D({ config }: { config: ConveyorConfig }) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: false }}
      camera={{ fov: 45, position: [3000, 2000, 3000], near: 1, far: 100000 }}
    >
      <color attach="background" args={['#f1f5f9']} />

      {/* Lighting */}
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
