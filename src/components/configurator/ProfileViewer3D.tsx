import { useRef, useMemo, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { getModulePitch, type ProfileSection, type ProfileHole, type ProfileConnector, type SlotId, type AngleAxis } from '@/lib/profile-configurator-types';

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
// T-slot path helpers — dieselbe abgerundete "Ohren"-Mündung wie die 2D-Querschnitte
// (tSlotPathDown/tSlotPathHorizontal in profile-cross-section-shapes.ts), nur als
// THREE.Path statt SVG-Pfad. So zeigt das 3D-Modell dieselbe Nutkontur wie die
// 2D-Werkbank/der Durchbiegungsrechner, statt einer eigenen, gröberen Näherung.
// ---------------------------------------------------------------------------

function addSlotTop(s: THREE.Shape, cx: number, yf: number, sw: number, gw: number, sd: number) {
  const wHalf = sw / 2, gHalf = gw / 2;
  const lip = Math.min(1.2, sd * 0.22);
  const flare = Math.min(1.8, sd * 0.32);
  const yLip = yf - lip;
  const yFlare = yLip - flare;
  const yBottom = yf - sd;
  const p = new THREE.Path();
  p.moveTo(cx + wHalf, yf);
  p.lineTo(cx + wHalf, yLip);
  p.quadraticCurveTo(cx + wHalf, yFlare, cx + gHalf, yFlare);
  p.lineTo(cx + gHalf, yBottom);
  p.lineTo(cx - gHalf, yBottom);
  p.lineTo(cx - gHalf, yFlare);
  p.quadraticCurveTo(cx - wHalf, yFlare, cx - wHalf, yLip);
  p.lineTo(cx - wHalf, yf);
  p.closePath(); s.holes.push(p);
}
function addSlotBottom(s: THREE.Shape, cx: number, yf: number, sw: number, gw: number, sd: number) {
  const wHalf = sw / 2, gHalf = gw / 2;
  const lip = Math.min(1.2, sd * 0.22);
  const flare = Math.min(1.8, sd * 0.32);
  const yLip = yf + lip;
  const yFlare = yLip + flare;
  const yBottom = yf + sd;
  const p = new THREE.Path();
  p.moveTo(cx - wHalf, yf);
  p.lineTo(cx - wHalf, yLip);
  p.quadraticCurveTo(cx - wHalf, yFlare, cx - gHalf, yFlare);
  p.lineTo(cx - gHalf, yBottom);
  p.lineTo(cx + gHalf, yBottom);
  p.lineTo(cx + gHalf, yFlare);
  p.quadraticCurveTo(cx + wHalf, yFlare, cx + wHalf, yLip);
  p.lineTo(cx + wHalf, yf);
  p.closePath(); s.holes.push(p);
}
function addSlotRight(s: THREE.Shape, xf: number, cy: number, sw: number, gw: number, sd: number) {
  const wHalf = sw / 2, gHalf = gw / 2;
  const lip = Math.min(1.2, sd * 0.22);
  const flare = Math.min(1.8, sd * 0.32);
  const xLip = xf - lip;
  const xFlare = xLip - flare;
  const xDeep = xf - sd;
  const p = new THREE.Path();
  p.moveTo(xf, cy - wHalf);
  p.lineTo(xLip, cy - wHalf);
  p.quadraticCurveTo(xFlare, cy - wHalf, xFlare, cy - gHalf);
  p.lineTo(xDeep, cy - gHalf);
  p.lineTo(xDeep, cy + gHalf);
  p.lineTo(xFlare, cy + gHalf);
  p.quadraticCurveTo(xFlare, cy + wHalf, xLip, cy + wHalf);
  p.lineTo(xf, cy + wHalf);
  p.closePath(); s.holes.push(p);
}
function addSlotLeft(s: THREE.Shape, xf: number, cy: number, sw: number, gw: number, sd: number) {
  const wHalf = sw / 2, gHalf = gw / 2;
  const lip = Math.min(1.2, sd * 0.22);
  const flare = Math.min(1.8, sd * 0.32);
  const xLip = xf + lip;
  const xFlare = xLip + flare;
  const xDeep = xf + sd;
  const p = new THREE.Path();
  p.moveTo(xf, cy + wHalf);
  p.lineTo(xLip, cy + wHalf);
  p.quadraticCurveTo(xFlare, cy + wHalf, xFlare, cy + gHalf);
  p.lineTo(xDeep, cy + gHalf);
  p.lineTo(xDeep, cy - gHalf);
  p.lineTo(xFlare, cy - gHalf);
  p.quadraticCurveTo(xFlare, cy - wHalf, xLip, cy - wHalf);
  p.lineTo(xf, cy - wHalf);
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

  // Bohrungen (Kernzüge) — die eigentliche Verstärkung um sie herum kommt als separate
  // Boss-Ring-Extrusion (buildBoreBossShapes), da sie hier ohnehin im Hohlraum liegt.
  for (let i = 0; i < numW; i++) {
    for (let j = 0; j < numH; j++) {
      const cx = -hw + PITCH * (i + 0.5);
      const cy = -hh + PITCH * (j + 0.5);
      const bore = new THREE.Path();
      bore.absarc(cx, cy, boreRadius, 0, Math.PI * 2, true);
      shape.holes.push(bore);
    }
  }

  // Hohle Wandung statt Vollmaterial — echte Strangpressprofile sind innen hohl
  // (vgl. roundedRectPath(PAD+wall, …) in den 2D-Querschnitten), nicht massiv mit
  // einer winzigen Aussparung pro Zelle wie zuvor.
  const wall = Math.min(wt, Math.min(w, h) / 2 - 1.5);
  const innerR = Math.max(0, cornerR - wall);
  const ihw = hw - wall, ihh = hh - wall;
  const inner = new THREE.Path();
  inner.moveTo(-ihw + innerR, -ihh);
  inner.lineTo(ihw - innerR, -ihh);
  inner.quadraticCurveTo(ihw, -ihh, ihw, -ihh + innerR);
  inner.lineTo(ihw, ihh - innerR);
  inner.quadraticCurveTo(ihw, ihh, ihw - innerR, ihh);
  inner.lineTo(-ihw + innerR, ihh);
  inner.quadraticCurveTo(-ihw, ihh, -ihw, ihh - innerR);
  inner.lineTo(-ihw, -ihh + innerR);
  inner.quadraticCurveTo(-ihw, -ihh, -ihw + innerR, -ihh);
  shape.holes.push(inner);

  return shape;
}

/**
 * Verstärkungsringe um jeden Kernzug (liegen als eigene Extrusion innerhalb des
 * Hohlraums, vgl. Bohrungskreis in den 2D-Querschnitten). Volle Steg-Nachbildung wie
 * getCellStruts (2D) ist hier bewusst ausgespart — die Ringe geben schon einen klaren,
 * einfach zu bauenden Hinweis auf die Verstärkung ohne komplexe Boolesche Vereinigung.
 */
function buildBoreBossShapes(section: ProfileSection): THREE.Shape[] {
  const { w, h, boreRadius } = section;
  const PITCH = getModulePitch(section);
  const hw = w / 2;
  const hh = h / 2;
  const numW = Math.max(1, Math.round(w / PITCH));
  const numH = Math.max(1, Math.round(h / PITCH));
  const bossR = boreRadius + 1.6;
  const shapes: THREE.Shape[] = [];
  for (let i = 0; i < numW; i++) {
    for (let j = 0; j < numH; j++) {
      const cx = -hw + PITCH * (i + 0.5);
      const cy = -hh + PITCH * (j + 0.5);
      const s = new THREE.Shape();
      s.absarc(cx, cy, bossR, 0, Math.PI * 2, false);
      const hole = new THREE.Path();
      hole.absarc(cx, cy, boreRadius, 0, Math.PI * 2, true);
      s.holes.push(hole);
      shapes.push(s);
    }
  }
  return shapes;
}

/** Wendet denselben Gehrungsschnitt (Kippung um eine Achse, s. SideRow/2D) auf eine fertig
 *  extrudierte Geometrie an — von Hauptkörper und Boss-Ringen gemeinsam genutzt. axis='AC'
 *  kippt um die Y-Achse (Nut 1/3 laufen diagonal aus), 'BD' um die X-Achse (Nut 2/4).
 *
 *  Die eingegebene Länge bleibt dabei IMMER exakt an einer festen Referenzkante erhalten
 *  (Nut B bzw. A — Long Point, so wird in der Fertigung gemessen, s. SideRow/2D); nur die
 *  gegenüberliegende Kante (Nut D bzw. C) läuft um den vollen Eckversatz länger oder kürzer
 *  aus. Muss exakt dieselbe Referenzkante/denselben Betrag wie die 2D-Werkbank verwenden. */
function applyMiterCut(geo: THREE.ExtrudeGeometry, length: number, angleStart: number, angleEnd: number, axis: AngleAxis = 'AC') {
  const tanS = Math.tan((angleStart * Math.PI) / 180);
  const tanE = Math.tan((angleEnd * Math.PI) / 180);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const arr = pos.array as Float32Array;
  const coordIdx = axis === 'BD' ? 1 : 0; // y statt x, wenn Nut 2/4 diagonal auslaufen sollen
  geo.computeBoundingBox();
  const refCoord = axis === 'BD' ? geo.boundingBox!.max.y : geo.boundingBox!.max.x;
  for (let i = 0; i < arr.length; i += 3) {
    const c = refCoord - arr[i + coordIdx];
    const z = arr[i + 2];
    arr[i + 2] = z < length * 0.5 ? z + c * tanS : z - c * tanE;
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
}

// ---------------------------------------------------------------------------
// Profile Mesh
// ---------------------------------------------------------------------------

interface ProfileMeshProps {
  section: ProfileSection;
  length: number;
  angleStart: number;
  angleEnd: number;
  angleAxis?: AngleAxis;
  holes: ProfileHole[];
  connectors: ProfileConnector[];
}

function ProfileMesh({ section, length, angleStart, angleEnd, angleAxis = 'AC', holes, connectors }: ProfileMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  const geometry = useMemo(() => {
    const shape = buildProfileShape(section);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: length, bevelEnabled: false, steps: 1 });
    applyMiterCut(geo, length, angleStart, angleEnd, angleAxis);
    return geo;
  }, [section, length, angleStart, angleEnd, angleAxis]);

  // Verstärkungsringe um jeden Kernzug — eigene Extrusionen, derselbe Gehrungsschnitt.
  const bossGeometries = useMemo(() => {
    return buildBoreBossShapes(section).map((shape) => {
      const geo = new THREE.ExtrudeGeometry(shape, { depth: length, bevelEnabled: false, steps: 1 });
      applyMiterCut(geo, length, angleStart, angleEnd, angleAxis);
      return geo;
    });
  }, [section, length, angleStart, angleEnd, angleAxis]);

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
      {bossGeometries.map((geo, i) => (
        <mesh key={`boss-${i}`} geometry={geo} castShadow receiveShadow>
          <meshStandardMaterial color="#b8c8d8" metalness={0.88} roughness={0.15} envMapIntensity={1.4} />
        </mesh>
      ))}
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
  angleAxis?: AngleAxis;
  holes: ProfileHole[];
  connectors: ProfileConnector[];
}

function Scene({ section, length, angleStart, angleEnd, angleAxis, holes, connectors }: SceneProps) {
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
        angleAxis={angleAxis}
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
  angleAxis?: AngleAxis;
  holes: ProfileHole[];
  connectors: ProfileConnector[];
}

export function ProfileViewer3D({ section, length, angleStart, angleEnd, angleAxis, holes, connectors }: ProfileViewer3DProps) {
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
          angleAxis={angleAxis}
          holes={holes}
          connectors={connectors}
        />
      </Suspense>
      </Canvas>
    </div>
  );
}
