import { useRef, useMemo, useEffect, useState, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { getModulePitch, type ProfileSection, type ProfileHole, type ProfileConnector, type SlotId, type AngleAxis } from '@/lib/profile-configurator-types';
import { getDxfProfileShape, type DxfProfileShapeResult } from '@/lib/dxf-profile-shape';
import { Brush, Evaluator, SUBTRACTION } from 'three-bvh-csg';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
import { Download } from 'lucide-react';

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
 *  Die eingegebene Länge darf an keinem Eckpunkt überschritten werden — pro Ende (Anfang/
 *  Ende, unabhängig voneinander) bleibt daher immer GENAU eine der beiden Kanten (Nut B/A
 *  bzw. D/C) exakt auf Länge (Long Point), die andere läuft um den vollen Eckversatz nach
 *  innen aus. Welche das ist, hängt vom Vorzeichen des jeweiligen Winkels ab — bei negativem
 *  Winkel spiegelbildlich um den jeweils anderen Eckpunkt. Muss exakt dieselbe Logik wie
 *  SideRow (2D-Werkbank) verwenden. */
function applyMiterCut(geo: THREE.ExtrudeGeometry, length: number, angleStart: number, angleEnd: number, axis: AngleAxis = 'AC') {
  const tanS = Math.tan((angleStart * Math.PI) / 180);
  const tanE = Math.tan((angleEnd * Math.PI) / 180);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const arr = pos.array as Float32Array;
  const coordIdx = axis === 'BD' ? 1 : 0; // y statt x, wenn Nut 2/4 diagonal auslaufen sollen
  geo.computeBoundingBox();
  const bbox = geo.boundingBox!;
  const refCoord = axis === 'BD' ? bbox.max.y : bbox.max.x;    // Nut B bzw. A
  const movingCoord = axis === 'BD' ? bbox.min.y : bbox.min.x; // Nut D bzw. C
  const pivotS = tanS >= 0 ? refCoord : movingCoord;
  const pivotE = tanE >= 0 ? refCoord : movingCoord;
  for (let i = 0; i < arr.length; i += 3) {
    const c = arr[i + coordIdx];
    const z = arr[i + 2];
    arr[i + 2] = z < length * 0.5 ? z + (pivotS - c) * tanS : z - (pivotE - c) * tanE;
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
}

// ---------------------------------------------------------------------------
// Bohrungen — echtes Herausschneiden (CSG) statt aufgesetzter Farb-Zylinder.
// ---------------------------------------------------------------------------

// Pilotloch-Ø unterhalb der Ansenkung, aus den Bezeichnungen in HOLE_TYPES übernommen
// ("Stufenbohrung M5 (Ø10/5,5)" → Ansenkung Ø10 = hole.diameter, Pilotloch Ø5,5 hier).
const STEP_PILOT_DIAMETER: Partial<Record<ProfileHole['type'], number>> = {
  'step-m5': 5.5,
  'step-m6': 6.6,
  'step-m8': 9,
};

// Tiefe der Ansenkung (für den Schraubenkopf) — kein offizielles Alvaris-Maß hinterlegt,
// grobe Näherung an gängige Zylinderkopfschrauben-Kopfhöhen (M5≈5, M6≈6, M8≈8 mm).
const STEP_COUNTERBORE_DEPTH: Partial<Record<ProfileHole['type'], number>> = {
  'step-m5': 5,
  'step-m6': 6,
  'step-m8': 8,
};

const STEPPED_TYPES: ProfileHole['type'][] = ['step-m5', 'step-m6', 'step-m8'];

// Etwas über die eigentliche Grenze hinaus bohren, damit sich die Werkzeug-Flächen mit
// der Bauteiloberfläche bzw. miteinander überschneiden statt sie nur zu berühren — sonst
// kann die Boolesche Operation an der Nahtstelle numerisch unsauber werden.
const CSG_EPS = 1;

/** Mittelpunkt + Länge eines Bohrwerkzeug-Segments entlang der Bohrachse, als Abstand
 *  `d0`..`d1` von der Bauteil-Außenfläche aus nach innen gemessen. */
function drillSegment(dirSign: number, halfExtent: number, d0: number, d1: number) {
  const worldAtD0 = dirSign * (halfExtent - d0);
  const worldAtD1 = dirSign * (halfExtent - d1);
  return { center: (worldAtD0 + worldAtD1) / 2, len: Math.abs(worldAtD1 - worldAtD0) };
}

function makeDrillBrush(radius: number, len: number, axisCenter: number, slot: SlotId, lateral: number, z: number): Brush {
  const cyl = new THREE.CylinderGeometry(radius, radius, len, 20, 1);
  const brush = new Brush(cyl);
  if (slot === 'A' || slot === 'C') {
    brush.position.set(lateral, axisCenter, z);
  } else {
    brush.rotation.z = Math.PI / 2;
    brush.position.set(axisCenter, lateral, z);
  }
  brush.updateMatrixWorld(true);
  return brush;
}

/** Schneidet alle Bohrungen als echte Boolesche Subtraktion aus der extrudierten
 *  Profilgeometrie heraus. "Durchgangsbohrung"-Typen (d45/d75/custom) durchdringen die
 *  ganze Wandstärke bis zur Gegenseite (wie ihr Name sagt); Stufen- und Gewindebohrungen
 *  gehen nur durch die nahe Wandung + etwas Luft in den Hohlraum, nicht bis zur Gegenseite. */
function cutHoles(geo: THREE.BufferGeometry, holes: ProfileHole[], section: ProfileSection, length: number): THREE.BufferGeometry {
  if (holes.length === 0) return geo;
  const { w, h, webThickness } = section;
  const PITCH = getModulePitch(section);
  const hw = w / 2;
  const hh = h / 2;
  const numW = Math.max(1, Math.round(w / PITCH));
  const numH = Math.max(1, Math.round(h / PITCH));

  const evaluator = new Evaluator();
  let brush = new Brush(geo);
  brush.updateMatrixWorld(true);

  for (const hole of holes) {
    const slot: SlotId = hole.slot ?? 'A';
    const dir = SLOT_DIR[slot];
    const mi = hole.moduleIndex ?? 0;
    let lateral: number; // Position quer zur Bohrachse (X bei A/C, Y bei B/D)
    let dirSign: number; // Vorzeichen der Bohrachse (welche Seite ist "außen")
    let halfExtent: number;
    if (slot === 'A' || slot === 'C') {
      const idx = Math.min(mi, numW - 1);
      lateral = -hw + PITCH * (idx + 0.5);
      dirSign = dir.ny;
      halfExtent = hh;
    } else {
      const idx = Math.min(mi, numH - 1);
      lateral = -hh + PITCH * (idx + 0.5);
      dirSign = dir.nx;
      halfExtent = hw;
    }
    const z = Math.max(0, Math.min(length, hole.zPosition));
    const axisLen = slot === 'A' || slot === 'C' ? h : w;
    const r = hole.diameter / 2;

    if (STEPPED_TYPES.includes(hole.type)) {
      // Ansenkung (großer Ø) bleibt auf ihre eigene Tiefe begrenzt — bis zu ihrem
      // "Grund" für den Schraubenkopf. Das Pilotloch (kleiner Ø) geht wie eine normale
      // Durchgangsbohrung ganz durch, nicht nur durch die nahe Wandung.
      const counterDepth = Math.min(STEP_COUNTERBORE_DEPTH[hole.type] ?? 6, webThickness + 1);
      const pilotR = (STEP_PILOT_DIAMETER[hole.type] ?? hole.diameter * 0.55) / 2;

      const cb = drillSegment(dirSign, halfExtent, -CSG_EPS, counterDepth);
      brush = evaluator.evaluate(brush, makeDrillBrush(r, cb.len, cb.center, slot, lateral, z), SUBTRACTION);

      const pilot = drillSegment(dirSign, halfExtent, counterDepth - CSG_EPS, axisLen + CSG_EPS);
      brush = evaluator.evaluate(brush, makeDrillBrush(pilotR, pilot.len, pilot.center, slot, lateral, z), SUBTRACTION);
    } else if (hole.type === 'custom-thread') {
      const drillDepth = Math.min(webThickness + 2, axisLen);
      const seg = drillSegment(dirSign, halfExtent, -CSG_EPS, drillDepth);
      brush = evaluator.evaluate(brush, makeDrillBrush(r, seg.len, seg.center, slot, lateral, z), SUBTRACTION);
    } else {
      // Durchgangsbohrung (d45 / d75 / custom): ganz durch, wie der Name sagt.
      const seg = drillSegment(dirSign, halfExtent, -CSG_EPS, axisLen + CSG_EPS);
      brush = evaluator.evaluate(brush, makeDrillBrush(r, seg.len, seg.center, slot, lateral, z), SUBTRACTION);
    }
  }

  return brush.geometry;
}

// ---------------------------------------------------------------------------
// Verbinder-Position — nur noch Platzhalter-Quader (kein STEP-Geometrie-Ladepfad
// mehr, siehe git-Historie: die reale Ausrichtung ließ sich ohne verlässliche
// Referenz nicht sauber genug treffen, mehrere Iterationen dazu blieben ohne
// stabiles Ergebnis).
// ---------------------------------------------------------------------------

interface ConnectorPlacement {
  pos: [number, number, number];
  rot: [number, number, number];
}

function connectorPlacement(conn: ProfileConnector, section: ProfileSection, length: number): ConnectorPlacement {
  const { w, h, slotDepth: sd } = section;
  const PITCH = getModulePitch(section);
  const hw = w / 2;
  const hh = h / 2;
  const numW = Math.max(1, Math.round(w / PITCH));
  const numH = Math.max(1, Math.round(h / PITCH));
  const slot: SlotId = conn.slot ?? 'A';
  const dir = SLOT_DIR[slot];
  const mi = conn.moduleIndex ?? 0;
  const tD = sd * 0.80;
  const tL = 22;
  const z = conn.end === 'start' ? tL / 2 : length - tL / 2;

  if (slot === 'A' || slot === 'C') {
    const idxM = Math.min(mi, numW - 1);
    const xOff = -hw + PITCH * (idxM + 0.5);
    const yOff = dir.ny * (hh - tD / 2);
    return { pos: [xOff, yOff, z], rot: [0, 0, 0] };
  }
  const idxM = Math.min(mi, numH - 1);
  const yOff = -hh + PITCH * (idxM + 0.5);
  const xOff = dir.nx * (hw - tD / 2);
  return { pos: [xOff, yOff, z], rot: [0, 0, Math.PI / 2] };
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
  exportGroupRef?: React.RefObject<THREE.Group>;
}

function ProfileMesh({ section, length, angleStart, angleEnd, angleAxis = 'AC', holes, connectors, exportGroupRef }: ProfileMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  // Echte Kontur aus der Shop-DXF statt der von Hand angenäherten Form (buildProfileShape)
  // — siehe dxf-profile-shape.ts. Lädt asynchron pro section (gecached); bis dahin bzw. wenn
  // keine passende Shop-Artikelnummer/DXF gefunden wird, bleibt es bei der Näherung.
  const [dxfResult, setDxfResult] = useState<DxfProfileShapeResult | null>(null);
  useEffect(() => {
    let cancelled = false;
    setDxfResult(null);
    getDxfProfileShape(section).then((result) => {
      if (cancelled || !result) return;
      // Grobe Plausibilitätsprüfung — falsch zugeordnete DXF lieber verwerfen als eine
      // Kontur mit falschen Außenmaßen zeigen.
      if (Math.abs(result.width - section.w) > 2 || Math.abs(result.height - section.h) > 2) return;
      setDxfResult(result);
    });
    return () => {
      cancelled = true;
    };
  }, [section]);
  const usingDxf = dxfResult !== null;

  const geometry = useMemo(() => {
    const shape = dxfResult?.shape ?? buildProfileShape(section);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: length, bevelEnabled: false, steps: 1 });
    applyMiterCut(geo, length, angleStart, angleEnd, angleAxis);
    return cutHoles(geo, holes, section, length);
  }, [section, length, angleStart, angleEnd, angleAxis, dxfResult, holes]);

  // Verstärkungsringe um jeden Kernzug — nur für die Näherung nötig (kein echtes
  // Wandmaterial um die Bohrung). Die reale DXF-Kontur hat das Material dort schon.
  const bossGeometries = useMemo(() => {
    if (usingDxf) return [];
    return buildBoreBossShapes(section).map((shape) => {
      const geo = new THREE.ExtrudeGeometry(shape, { depth: length, bevelEnabled: false, steps: 1 });
      applyMiterCut(geo, length, angleStart, angleEnd, angleAxis);
      return geo;
    });
  }, [section, length, angleStart, angleEnd, angleAxis, usingDxf]);

  // Bohrungen sind jetzt echte Aussparungen in `geometry` (siehe cutHoles oben) statt
  // aufgesetzter Farb-Zylinder — kein separates holeMeshes-Array mehr nötig.

  // Connector (T-nut) meshes — silver blocks seated inside the T-slot at one of the
  // two ends. Nur Platzhalter, keine reale Verbinder-Geometrie (siehe Kommentar bei
  // connectorPlacement).
  const connectorMeshes = useMemo(() => {
    const { slotWidth: sw, slotDepth: sd } = section;
    return connectors.map((conn, idx) => {
      const { pos, rot } = connectorPlacement(conn, section, length);
      return (
        <mesh key={idx} position={pos} rotation={rot}>
          <boxGeometry args={[sw * 0.88, sd * 0.80, 22]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.85} roughness={0.2} />
        </mesh>
      );
    });
  }, [connectors, section, length]);

  return (
    <group ref={exportGroupRef} position={[0, 0, -length / 2]}>
      <mesh ref={meshRef} geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial color="#b8c8d8" metalness={0.88} roughness={0.15} envMapIntensity={1.4} />
      </mesh>
      {bossGeometries.map((geo, i) => (
        <mesh key={`boss-${i}`} geometry={geo} castShadow receiveShadow>
          <meshStandardMaterial color="#b8c8d8" metalness={0.88} roughness={0.15} envMapIntensity={1.4} />
        </mesh>
      ))}
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
  exportGroupRef?: React.RefObject<THREE.Group>;
}

function Scene({ section, length, angleStart, angleEnd, angleAxis, holes, connectors, exportGroupRef }: SceneProps) {
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
        exportGroupRef={exportGroupRef}
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

// Dateiname-sicherer Ausschnitt aus Label/Länge, z. B. "40-x-40-Leicht_500mm.stl".
function stlFileName(section: ProfileSection, length: number): string {
  const slug = section.label.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '');
  return `${slug}_${Math.round(length)}mm.stl`;
}

export function ProfileViewer3D({ section, length, angleStart, angleEnd, angleAxis, holes, connectors }: ProfileViewer3DProps) {
  const exportGroupRef = useRef<THREE.Group>(null);
  const [downloading, setDownloading] = useState(false);

  // Exportiert exakt das, was gerade zu sehen ist (Länge, Gehrungsschnitt, echte
  // Bohrungen, Verbinder) als STL-Mesh — kein editierbares CAD/STEP, aber für
  // 3D-Druck/Sichtprüfung in jedem gängigen Viewer nutzbar. Ein "echtes" STEP der
  // fertigen Konfiguration bräuchte einen CAD-Kernel, den wir client-seitig nicht
  // haben — siehe Absprache mit dem Kunden dazu.
  const handleDownload = () => {
    const group = exportGroupRef.current;
    if (!group) return;
    setDownloading(true);
    try {
      const exporter = new STLExporter();
      const result = exporter.parse(group, { binary: true }) as unknown as DataView;
      const blob = new Blob([result], { type: 'application/vnd.ms-pki.stl' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = stlFileName(section, length);
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="relative w-full h-full">
      <div className="absolute top-3 left-3 z-10 pointer-events-none flex items-center gap-1.5 rounded-full bg-white/85 backdrop-blur px-3 py-1.5 text-[11px] text-muted-foreground shadow-sm border border-slate-200">
        <span>🖱️ Ziehen = Drehen</span>
        <span className="text-slate-300">·</span>
        <span>Scrollen/Pinch = Zoomen</span>
      </div>
      <button
        type="button"
        onClick={handleDownload}
        disabled={downloading}
        className="absolute top-3 right-3 z-10 flex items-center gap-1.5 rounded-full bg-white/85 backdrop-blur px-3 py-1.5 text-[11px] font-medium text-foreground shadow-sm border border-slate-200 hover:bg-white disabled:opacity-60"
        title="3D-Modell der aktuellen Konfiguration als STL herunterladen"
      >
        <Download className="h-3.5 w-3.5" />
        3D-Modell (STL)
      </button>
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
          exportGroupRef={exportGroupRef}
        />
      </Suspense>
      </Canvas>
    </div>
  );
}
