import { useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import * as THREE from 'three';
import type { ProfileSection, ProfileHole } from '@/lib/profile-configurator-types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildProfileShape(section: ProfileSection): THREE.Shape {
  const { w, h, slotDepth, slotWidth, cornerR, webThickness } = section;
  const hw = w / 2;
  const hh = h / 2;

  const shape = new THREE.Shape();

  // Outer rounded rectangle
  shape.moveTo(-hw + cornerR, -hh);
  shape.lineTo(hw - cornerR, -hh);
  shape.quadraticCurveTo(hw, -hh, hw, -hh + cornerR);
  shape.lineTo(hw, hh - cornerR);
  shape.quadraticCurveTo(hw, hh, hw - cornerR, hh);
  shape.lineTo(-hw + cornerR, hh);
  shape.quadraticCurveTo(-hw, hh, -hw, hh - cornerR);
  shape.lineTo(-hw, -hh + cornerR);
  shape.quadraticCurveTo(-hw, -hh, -hw + cornerR, -hh);

  // Punching out the hollow interior: inner rectangle
  const wallT = webThickness;
  const inner = new THREE.Path();
  const iw = hw - wallT;
  const ih = hh - wallT;
  inner.moveTo(-iw, -ih);
  inner.lineTo(iw, -ih);
  inner.lineTo(iw, ih);
  inner.lineTo(-iw, ih);
  inner.lineTo(-iw, -ih);
  shape.holes.push(inner);

  // T-slots on 4 faces
  const addSlot = (path: THREE.Path, axis: 'x' | 'y', dir: 1 | -1) => {
    const sw = slotWidth / 2;
    const sd = slotDepth;
    const outer = axis === 'y' ? hh : hw;
    const inner2 = outer - sd;
    if (axis === 'y') {
      path.moveTo(-sw, dir * outer);
      path.lineTo(-sw, dir * inner2);
      path.lineTo(-sw * 1.6, dir * inner2);
      path.lineTo(-sw * 1.6, dir * (inner2 - 1.5));
      path.lineTo(sw * 1.6, dir * (inner2 - 1.5));
      path.lineTo(sw * 1.6, dir * inner2);
      path.lineTo(sw, dir * inner2);
      path.lineTo(sw, dir * outer);
      path.lineTo(-sw, dir * outer);
    } else {
      path.moveTo(dir * outer, -sw);
      path.lineTo(dir * inner2, -sw);
      path.lineTo(dir * inner2, -sw * 1.6);
      path.lineTo(dir * (inner2 - 1.5), -sw * 1.6);
      path.lineTo(dir * (inner2 - 1.5), sw * 1.6);
      path.lineTo(dir * inner2, sw * 1.6);
      path.lineTo(dir * inner2, sw);
      path.lineTo(dir * outer, sw);
      path.lineTo(dir * outer, -sw);
    }
  };

  const topSlot = new THREE.Path();
  addSlot(topSlot, 'y', 1);
  shape.holes.push(topSlot);

  const botSlot = new THREE.Path();
  addSlot(botSlot, 'y', -1);
  shape.holes.push(botSlot);

  const rightSlot = new THREE.Path();
  addSlot(rightSlot, 'x', 1);
  shape.holes.push(rightSlot);

  const leftSlot = new THREE.Path();
  addSlot(leftSlot, 'x', -1);
  shape.holes.push(leftSlot);

  return shape;
}

// ---------------------------------------------------------------------------
// Profile Mesh with miter cuts
// ---------------------------------------------------------------------------

interface ProfileMeshProps {
  section: ProfileSection;
  length: number;
  angleStart: number; // degrees
  angleEnd: number;   // degrees
  holes: ProfileHole[];
}

function ProfileMesh({ section, length, angleStart, angleEnd, holes }: ProfileMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  // Slowly rotate for presentation feel (only if no user interaction — OrbitControls override)
  useFrame(() => {/* static */});

  const geometry = useMemo(() => {
    const shape = buildProfileShape(section);

    const extrudeSettings: THREE.ExtrudeGeometryParameters = {
      depth: length,
      bevelEnabled: false,
      steps: 1,
    };

    const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);

    // Apply miter cut at start (z=0) and end (z=length)
    const tanStart = Math.tan((angleStart * Math.PI) / 180);
    const tanEnd   = Math.tan((angleEnd   * Math.PI) / 180);

    const pos = geo.attributes.position as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;

    for (let i = 0; i < arr.length; i += 3) {
      const x = arr[i];
      const z = arr[i + 2];
      if (z < length * 0.5) {
        // start face — tilt along X axis
        arr[i + 2] = Math.max(0, z + x * tanStart);
      } else {
        // end face — tilt
        arr[i + 2] = Math.min(length, z - x * tanEnd);
      }
    }

    pos.needsUpdate = true;
    geo.computeVertexNormals();
    return geo;
  }, [section, length, angleStart, angleEnd]);

  // Hole visualisation (cylinders punched through profile faces)
  const holeMeshes = useMemo(() => {
    return holes.map((hole, idx) => {
      const r = hole.diameter / 2;
      const geo = new THREE.CylinderGeometry(r, r, section.w * 2, 24);
      const mat = new THREE.MeshStandardMaterial({ color: '#1a1a2e', roughness: 0.8, metalness: 0.1 });
      // Holes are placed at a Z position along the length
      // face: 'top' | 'side' — placed on top face for now
      const zPos = Math.max(0, Math.min(length, hole.zPosition));
      const m = new THREE.Mesh(geo, mat);
      m.rotation.z = Math.PI / 2;
      m.position.set(0, section.h / 2, zPos);
      return <primitive key={idx} object={m} />;
    });
  }, [holes, section, length]);

  return (
    <group position={[0, 0, -length / 2]}>
      <mesh ref={meshRef} geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial
          color="#c8d4e0"
          metalness={0.85}
          roughness={0.18}
          envMapIntensity={1.2}
        />
      </mesh>
      {holeMeshes}
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
}

function Scene({ section, length, angleStart, angleEnd, holes }: SceneProps) {
  const maxDim = Math.max(section.w, section.h, length);

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[200, 400, 300]} intensity={1.4} castShadow />
      <directionalLight position={[-200, -100, -200]} intensity={0.5} />
      <pointLight position={[0, 300, 0]} intensity={0.6} />
      <Environment preset="studio" />

      <group rotation={[Math.PI / 8, Math.PI / 5, 0]}>
        <ProfileMesh
          section={section}
          length={length}
          angleStart={angleStart}
          angleEnd={angleEnd}
          holes={holes}
        />
      </group>

      <OrbitControls
        enablePan={false}
        minDistance={maxDim * 0.5}
        maxDistance={maxDim * 4}
        autoRotate
        autoRotateSpeed={0.6}
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
}

export function ProfileViewer3D({ section, length, angleStart, angleEnd, holes }: ProfileViewer3DProps) {
  return (
    <Canvas
      shadows
      camera={{ position: [length * 0.8, length * 0.5, length * 1.2], fov: 40 }}
      style={{ background: 'linear-gradient(135deg, #0f1923 0%, #1a2840 100%)' }}
    >
      <Suspense fallback={null}>
        <Scene
          section={section}
          length={length}
          angleStart={angleStart}
          angleEnd={angleEnd}
          holes={holes}
        />
      </Suspense>
    </Canvas>
  );
}
