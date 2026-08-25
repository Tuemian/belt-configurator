import { useRef, useMemo, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { getModulePitch, type ProfileSection, type ProfileHole, type ProfileConnector, type SlotId } from '@/lib/profile-configurator-types';

// Slot direction vectors in cross-section space (X right, Y up).
// Slot A=top, B=right, C=bottom, D=left. We need both an outward normal
// (where the slot opens) and the through-axis used for drilling holes.
const SLOT_DIR: Record<SlotId, { nx: number; ny: number }> = {
  A: { nx:  0, ny:  1 },
  B: { nx:  1, ny:  0 },
  C: { nx:  0, ny: -1 },
  D: { nx: -1, ny:  0 },
};

// ---------------------------------------------------------------------------
// T-slot path helpers — all produce CW paths (negative signed area = hole)
// Profil 8 system: neck depth 1.5 mm fixed
// ---------------------------------------------------------------------------

const MODULE = 40;    // ITEM Nut 8 module pitch (mm)
const NECK = 1.5;     // distance from face to T-expansion

function addSlotTop(s: THREE.Shape, cx: number, yf: number, sw: number, gw: number, sd: number) {
  const p = new THREE.Path();
  p.moveTo(cx + sw / 2, yf);          p.lineTo(cx + sw / 2, yf - NECK);
  p.lineTo(cx + gw / 2, yf - NECK);   p.lineTo(cx + gw / 2, yf - sd);
  p.lineTo(cx - gw / 2, yf - sd);     p.lineTo(cx - gw / 2, yf - NECK);
  p.lineTo(cx - sw / 2, yf - NECK);   p.lineTo(cx - sw / 2, yf);
  p.closePath(); s.holes.push(p);
}
function addSlotBottom(s: THREE.Shape, cx: number, yf: number, sw: number, gw: number, sd: number) {
  const p = new THREE.Path();
  p.moveTo(cx - sw / 2, yf);          p.lineTo(cx - sw / 2, yf + NECK);
  p.lineTo(cx - gw / 2, yf + NECK);   p.lineTo(cx - gw / 2, yf + sd);
  p.lineTo(cx + gw / 2, yf + sd);     p.lineTo(cx + gw / 2, yf + NECK);
  p.lineTo(cx + sw / 2, yf + NECK);   p.lineTo(cx + sw / 2, yf);
  p.closePath(); s.holes.push(p);
}
function addSlotRight(s: THREE.Shape, xf: number, cy: number, sw: number, gw: number, sd: number) {
  const p = new THREE.Path();
  p.moveTo(xf, cy - sw / 2);          p.lineTo(xf - NECK, cy - sw / 2);
  p.lineTo(xf - NECK, cy - gw / 2);   p.lineTo(xf - sd, cy - gw / 2);
  p.lineTo(xf - sd, cy + gw / 2);     p.lineTo(xf - NECK, cy + gw / 2);
  p.lineTo(xf - NECK, cy + sw / 2);   p.lineTo(xf, cy + sw / 2);
  p.closePath(); s.holes.push(p);
}
function addSlotLeft(s: THREE.Shape, xf: number, cy: number, sw: number, gw: number, sd: number) {
  const p = new THREE.Path();
  p.moveTo(xf, cy + sw / 2);          p.lineTo(xf + NECK, cy + sw / 2);
  p.lineTo(xf + NECK, cy + gw / 2);   p.lineTo(xf + sd, cy + gw / 2);
  p.lineTo(xf + sd, cy - gw / 2);     p.lineTo(xf + NECK, cy - gw / 2);
  p.lineTo(xf + NECK, cy - sw / 2);   p.lineTo(xf, cy - sw / 2);
  p.closePath(); s.holes.push(p);
}

// ---------------------------------------------------------------------------
// Profile cross-section shape builder
// Multi-module: 80×40 → numW=2/numH=1 → 2 slots on wide face, 1 on narrow
// ---------------------------------------------------------------------------

function buildProfileShape(section: ProfileSection): THREE.Shape {
  const { w, h, slotWidth: sw, slotDepth: sd, grooveWidth: gw, cornerR, boreRadius, webThickness: wt } = section;
  const PITCH = getModulePitch(section);
  const hw = w / 2;
  const hh = h / 2;
  const numW = Math.max(1, Math.round(w / PITCH));
  const numH = Math.max(1, Math.round(h / PITCH));

  // Outer rounded rectangle (CCW)
  const shape = new THREE.Shape();
  shape.moveTo(-hw + cornerR, -hh);
  shape.lineTo( hw - cornerR, -hh);
  shape.quadraticCurveTo( hw, -hh,  hw, -hh + cornerR);
  shape.lineTo( hw,  hh - cornerR);
  shape.quadraticCurveTo( hw,  hh,  hw - cornerR,  hh);
  shape.lineTo(-hw + cornerR,  hh);
  shape.quadraticCurveTo(-hw,  hh, -hw,  hh - cornerR);
  shape.lineTo(-hw, -hh + cornerR);
  shape.quadraticCurveTo(-hw, -hh, -hw + cornerR, -hh);

  // T-slots: one per module on each face
  for (let i = 0; i < numW; i++) {
    const cx = -hw + PITCH * (i + 0.5);
    addSlotTop(shape, cx, hh, sw, gw, sd);
    addSlotBottom(shape, cx, -hh, sw, gw, sd);
  }
  for (let j = 0; j < numH; j++) {
    const cy = -hh + PITCH * (j + 0.5);
    addSlotRight(shape, hw, cy, sw, gw, sd);
    addSlotLeft(shape, -hw, cy, sw, gw, sd);
  }

  // Center bore + inner hollow per module cell
  for (let i = 0; i < numW; i++) {
    for (let j = 0; j < numH; j++) {
      const cx = -hw + PITCH * (i + 0.5);
      const cy = -hh + PITCH * (j + 0.5);

      const bore = new THREE.Path();
      bore.absarc(cx, cy, boreRadius, 0, Math.PI * 2, true);
      shape.holes.push(bore);

      const ie = PITCH / 2 - sd - wt * 0.3;
      if (ie > boreRadius + 2.5) {
        const ic = ie * 0.72;
        const inn = new THREE.Path();
        inn.moveTo(cx + ie, cy - ic); inn.lineTo(cx + ic, cy - ie);
        inn.lineTo(cx - ic, cy - ie); inn.lineTo(cx - ie, cy - ic);
        inn.lineTo(cx - ie, cy + ic); inn.lineTo(cx - ic, cy + ie);
        inn.lineTo(cx + ic, cy + ie); inn.lineTo(cx + ie, cy + ic);
        inn.closePath();
        shape.holes.push(inn);
      }
    }
  }

  return shape;
}

// ---------------------------------------------------------------------------
// Profile Mesh
// ---------------------------------------------------------------------------

interface ProfileMeshProps {
  section: ProfileSection;
  length: number;
  angleStart: number;
  angleEnd: number;
  holes: ProfileHole[];
  connectors: ProfileConnector[];
}

function ProfileMesh({ section, length, angleStart, angleEnd, holes, connectors }: ProfileMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  const geometry = useMemo(() => {
    const shape = buildProfileShape(section);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: length, bevelEnabled: false, steps: 1 });

    // Miter cuts: shift Z by X-position (tilt around Y-axis)
    const tanS = Math.tan((angleStart * Math.PI) / 180);
    const tanE = Math.tan((angleEnd   * Math.PI) / 180);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    for (let i = 0; i < arr.length; i += 3) {
      const x = arr[i];
      const z = arr[i + 2];
      if (z < length * 0.5) {
        arr[i + 2] = Math.max(0, z + x * tanS);
      } else {
        arr[i + 2] = Math.min(length, z - x * tanE);
      }
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    return geo;
  }, [section, length, angleStart, angleEnd]);

  // Bore / hole cylinders — drilled THROUGH the profile from the chosen slot.
  // The hole orientation depends on which slot it sits on:
  //   A/C → drilled vertically (Y axis), positioned along width (X)
  //   B/D → drilled horizontally (X axis), positioned along height (Y)
  const holeMeshes = useMemo(() => {
    const { w, h } = section;
    const PITCH = getModulePitch(section);
    const hw = w / 2;
    const hh = h / 2;
    const numW = Math.max(1, Math.round(w / PITCH));
    const numH = Math.max(1, Math.round(h / PITCH));
    return holes.map((hole, idx) => {
      const r = hole.diameter / 2;
      const slot: SlotId = hole.slot ?? 'A';
      const dir = SLOT_DIR[slot];
      const through = (Math.abs(dir.nx) > 0 ? w : h) + 4;
      const cylGeo = new THREE.CylinderGeometry(r, r, through, 24);
      const isThread = hole.type === 'm8-thread' || hole.type === 'm6-thread';
      const isStep   = hole.type === 'step-m6' || hole.type === 'step-m8';
      const color = isThread ? '#a07830' : isStep ? '#4a6fa5' : '#1e293b';
      const mat = new THREE.MeshStandardMaterial({ color, roughness: isThread ? 0.45 : 0.7, metalness: isThread ? 0.7 : 0.1 });

      // Multi-Modul: Position der Bohrung anhand moduleIndex auf der jeweiligen Achse
      const mi = hole.moduleIndex ?? 0;
      let cx = 0, cy = 0;
      if (slot === 'A' || slot === 'C') {
        const idx = Math.min(mi, numW - 1);
        cx = -hw + PITCH * (idx + 0.5);
        cy = dir.ny * (hh - r * 0.1);
      } else {
        const idx = Math.min(mi, numH - 1);
        cy = -hh + PITCH * (idx + 0.5);
        cx = dir.nx * (hw - r * 0.1);
      }
      const m = new THREE.Mesh(cylGeo, mat);
      m.position.set(cx, cy, Math.max(0, Math.min(length, hole.zPosition)));
      if (slot === 'A' || slot === 'C') {
        // axis = Y (default)
      } else {
        m.rotation.z = Math.PI / 2;
      }
      return <primitive key={idx} object={m} />;
    });
  }, [holes, section, length]);

  // Connector (T-nut) meshes — silver blocks seated inside the T-slot at one of the two ends
  const connectorMeshes = useMemo(() => {
    const { w, h, slotWidth: sw, slotDepth: sd } = section;
    const PITCH = getModulePitch(section);
    const hw = w / 2;
    const hh = h / 2;
    const numW = Math.max(1, Math.round(w / PITCH));
    const numH = Math.max(1, Math.round(h / PITCH));
    return connectors.map((conn, idx) => {
      const tW = sw * 0.88;
      const tD = sd * 0.80;
      const tL = 22;
      const z = conn.end === 'start' ? tL / 2 : length - tL / 2;
      const slot: SlotId = conn.slot ?? 'A';
      const dir = SLOT_DIR[slot];
      const mi = conn.moduleIndex ?? 0;

      let pos: [number, number, number];
      let rot: [number, number, number] = [0, 0, 0];
      if (slot === 'A' || slot === 'C') {
        const idxM = Math.min(mi, numW - 1);
        const xOff = -hw + PITCH * (idxM + 0.5);
        const yOff = dir.ny * (hh - tD / 2);
        pos = [xOff, yOff, z];
      } else {
        const idxM = Math.min(mi, numH - 1);
        const yOff = -hh + PITCH * (idxM + 0.5);
        const xOff = dir.nx * (hw - tD / 2);
        pos = [xOff, yOff, z];
        rot = [0, 0, Math.PI / 2];
      }
      return (
        <mesh key={idx} position={pos} rotation={rot}>
          <boxGeometry args={[tW, tD, tL]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.85} roughness={0.2} />
        </mesh>
      );
    });
  }, [connectors, section, length]);

  return (
    <group position={[0, 0, -length / 2]}>
      <mesh ref={meshRef} geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial color="#b8c8d8" metalness={0.88} roughness={0.15} envMapIntensity={1.4} />
      </mesh>
      {holeMeshes}
      {connectorMeshes}
    </group>
  );
}

// ---------------------------------------------------------------------------
// Scene
// ---------------------------------------------------------------------------

interface SceneProps {
  section: ProfileSection;
  length: number;
  angleStart: number;
  angleEnd: number;
  holes: ProfileHole[];
  connectors: ProfileConnector[];
}

function Scene({ section, length, angleStart, angleEnd, holes, connectors }: SceneProps) {
  const maxDim = Math.max(section.w, section.h, length);
  return (
    <>
      <ambientLight intensity={0.45} />
      <directionalLight position={[200, 400, 300]} intensity={1.5} castShadow />
      <directionalLight position={[-150, -80, -200]} intensity={0.45} />
      <pointLight position={[0, 300, 0]} intensity={0.5} />
      <Environment preset="studio" />

      <ProfileMesh
        section={section}
        length={length}
        angleStart={angleStart}
        angleEnd={angleEnd}
        holes={holes}
        connectors={connectors}
      />

      <OrbitControls
        enablePan={false}
        minDistance={maxDim * 0.4}
        maxDistance={maxDim * 5}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------

export interface ProfileViewer3DProps {
  section: ProfileSection;
  length: number;
  angleStart: number;
  angleEnd: number;
  holes: ProfileHole[];
  connectors: ProfileConnector[];
}

export function ProfileViewer3D({ section, length, angleStart, angleEnd, holes, connectors }: ProfileViewer3DProps) {
  return (
    <div className="relative w-full h-full">
      <div className="absolute top-3 left-3 z-10 pointer-events-none flex items-center gap-1.5 rounded-full bg-white/85 backdrop-blur px-3 py-1.5 text-[11px] text-muted-foreground shadow-sm border border-slate-200">
        <span>🖱️ Ziehen = Drehen</span>
        <span className="text-slate-300">·</span>
        <span>Scrollen/Pinch = Zoomen</span>
      </div>
      <Canvas
      shadows
      camera={{ position: [length * 0.9, length * 0.55, length * 1.3], fov: 38, near: 0.5, far: length * 30 }}
      style={{ background: 'linear-gradient(160deg, #f0f4f8 0%, #e2e8f0 100%)' }}
    >
      <Suspense fallback={null}>
        <Scene
          section={section}
          length={length}
          angleStart={angleStart}
          angleEnd={angleEnd}
          holes={holes}
          connectors={connectors}
        />
      </Suspense>
      </Canvas>
    </div>
  );
}
