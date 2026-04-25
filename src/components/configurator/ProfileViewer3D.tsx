import { useRef, useMemo, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import * as THREE from 'three';
import type { ProfileSection, ProfileHole } from '@/lib/profile-configurator-types';

// ---------------------------------------------------------------------------
// Profile cross-section shape builder
// Produces an accurate T-slot aluminum profile cross-section.
// All hole paths are CW (negative signed area) so Three.js treats them as
// subtractions from the CCW outer shape.
// ---------------------------------------------------------------------------

function buildProfileShape(section: ProfileSection): THREE.Shape {
  const { w, h, slotDepth: sd, slotWidth: sw, cornerR, webThickness: wt } = section;
  const hw = w / 2;
  const hh = h / 2;
  // T-groove is wider than the slot opening (the "T" expansion)
  const gw = sw * 1.72;
  // Neck depth: narrow channel before the T expands
  const nk = Math.min(1.8, sd * 0.28);

  // ---- Outer rounded rectangle (CCW) ------------------------------------
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

  // ---- T-slot hole helper (all produce CW paths = negative signed area) --
  // Top slot: opens at y=+hh, extends downward
  const top = new THREE.Path();
  top.moveTo( sw/2,  hh);
  top.lineTo( sw/2,  hh - nk);
  top.lineTo( gw/2,  hh - nk);
  top.lineTo( gw/2,  hh - sd);
  top.lineTo(-gw/2,  hh - sd);
  top.lineTo(-gw/2,  hh - nk);
  top.lineTo(-sw/2,  hh - nk);
  top.lineTo(-sw/2,  hh);
  top.closePath();
  shape.holes.push(top);

  // Bottom slot: 180° rotation of top (preserves CW orientation)
  const bot = new THREE.Path();
  bot.moveTo(-sw/2, -hh);
  bot.lineTo(-sw/2, -(hh - nk));
  bot.lineTo(-gw/2, -(hh - nk));
  bot.lineTo(-gw/2, -(hh - sd));
  bot.lineTo( gw/2, -(hh - sd));
  bot.lineTo( gw/2, -(hh - nk));
  bot.lineTo( sw/2, -(hh - nk));
  bot.lineTo( sw/2, -hh);
  bot.closePath();
  shape.holes.push(bot);

  // Right slot: 90° CW rotation of top (using hw)
  const rgt = new THREE.Path();
  rgt.moveTo( hw,  -sw/2);
  rgt.lineTo( hw - nk, -sw/2);
  rgt.lineTo( hw - nk, -gw/2);
  rgt.lineTo( hw - sd, -gw/2);
  rgt.lineTo( hw - sd,  gw/2);
  rgt.lineTo( hw - nk,  gw/2);
  rgt.lineTo( hw - nk,  sw/2);
  rgt.lineTo( hw,       sw/2);
  rgt.closePath();
  shape.holes.push(rgt);

  // Left slot: 270° CW rotation of top (using hw)
  const lft = new THREE.Path();
  lft.moveTo(-hw,       sw/2);
  lft.lineTo(-hw + nk,  sw/2);
  lft.lineTo(-hw + nk,  gw/2);
  lft.lineTo(-hw + sd,  gw/2);
  lft.lineTo(-hw + sd, -gw/2);
  lft.lineTo(-hw + nk, -gw/2);
  lft.lineTo(-hw + nk, -sw/2);
  lft.lineTo(-hw,      -sw/2);
  lft.closePath();
  shape.holes.push(lft);

  // Center bore (CW arc)
  const boreR = Math.min(hw, hh) * 0.22;
  const bore = new THREE.Path();
  bore.absarc(0, 0, boreR, 0, Math.PI * 2, true); // true = CW
  shape.holes.push(bore);

  // Inner hollow connecting T-slot backs (shows hollow web structure)
  // Octagon fits between the T-slot back faces, reversed to be CW
  const ie = Math.min(hw, hh) - sd - wt * 0.3;
  if (ie > boreR + 3) {
    const ic = ie * 0.72;
    const inn = new THREE.Path();
    // CW octagon (reversed CCW order):
    inn.moveTo( ie, -ic);
    inn.lineTo( ic, -ie);
    inn.lineTo(-ic, -ie);
    inn.lineTo(-ie, -ic);
    inn.lineTo(-ie,  ic);
    inn.lineTo(-ic,  ie);
    inn.lineTo( ic,  ie);
    inn.lineTo( ie,  ic);
    inn.closePath();
    shape.holes.push(inn);
  }

  return shape;
}

// ---------------------------------------------------------------------------
// Profile Mesh with miter cuts
// ---------------------------------------------------------------------------

interface ProfileMeshProps {
  section: ProfileSection;
  length: number;
  angleStart: number;
  angleEnd: number;
  holes: ProfileHole[];
}

function ProfileMesh({ section, length, angleStart, angleEnd, holes }: ProfileMeshProps) {
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

  // Hole markers: dark cylinders on the top face
  const holeMeshes = useMemo(() => {
    return holes.map((hole, idx) => {
      const r = hole.diameter / 2;
      const cylGeo = new THREE.CylinderGeometry(r, r, section.w * 2, 20);
      const mat = new THREE.MeshStandardMaterial({ color: '#111827', roughness: 0.85, metalness: 0.05 });
      const m = new THREE.Mesh(cylGeo, mat);
      m.rotation.z = Math.PI / 2;
      m.position.set(0, section.h / 2, Math.max(0, Math.min(length, hole.zPosition)));
      return <primitive key={idx} object={m} />;
    });
  }, [holes, section, length]);

  return (
    <group position={[0, 0, -length / 2]}>
      <mesh ref={meshRef} geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial color="#b8c8d8" metalness={0.88} roughness={0.15} envMapIntensity={1.4} />
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
}

export function ProfileViewer3D({ section, length, angleStart, angleEnd, holes }: ProfileViewer3DProps) {
  return (
    <Canvas
      shadows
      camera={{ position: [length * 0.9, length * 0.55, length * 1.3], fov: 38 }}
      style={{ background: 'linear-gradient(160deg, #f0f4f8 0%, #e2e8f0 100%)' }}
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
