'use client';

import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrthographicCamera } from '@react-three/drei';
import * as THREE from 'three';

/* ── colour palette matching the reference image ─────────────────────── */
const VIOLET = new THREE.Color('#3b3bbd');

/* ── cube definitions: grid position + max height + phase offset ─────── */
const CUBES: { x: number; z: number; maxH: number; phase: number }[] = [
  { x: -1.5, z:  0.5, maxH: 2.4, phase: 0.0  },
  { x: -0.5, z: -0.5, maxH: 3.8, phase: 0.7  },
  { x:  0.5, z:  0.0, maxH: 2.0, phase: 1.3  },
  { x: -1.5, z: -0.5, maxH: 1.6, phase: 0.4  },
  { x:  0.5, z: -1.0, maxH: 3.0, phase: 1.8  },
  { x:  1.5, z:  0.0, maxH: 2.6, phase: 0.9  },
  { x: -0.5, z:  0.5, maxH: 4.4, phase: 0.2  },
  { x:  1.5, z: -1.0, maxH: 1.4, phase: 2.2  },
];

function AnimatedCube({ x, z, maxH, phase }: typeof CUBES[number]) {
  const mesh = useRef<THREE.Mesh>(null!);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * 0.55 + phase;
    // smooth 0→1→0 oscillation, never fully collapses
    const frac = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t));
    const h = maxH * frac;
    mesh.current.scale.y = h;
    mesh.current.position.y = h / 2;
  });

  return (
    <mesh ref={mesh} position={[x, 0, z]} castShadow receiveShadow>
      <boxGeometry args={[0.88, 1, 0.88]} />
      <meshStandardMaterial
        color={VIOLET}
        roughness={0.45}
        metalness={0.05}
      />
    </mesh>
  );
}

/* ── isometric grid drawn as line segments on the floor ──────────────── */
function IsoGrid() {
  const SIZE = 12;
  const STEP = 1;
  const points: THREE.Vector3[] = [];

  for (let i = -SIZE; i <= SIZE; i += STEP) {
    points.push(new THREE.Vector3(-SIZE, 0, i), new THREE.Vector3(SIZE, 0, i));
    points.push(new THREE.Vector3(i, 0, -SIZE), new THREE.Vector3(i, 0, SIZE));
  }

  const geo = new THREE.BufferGeometry().setFromPoints(points);
  return (
    <lineSegments geometry={geo}>
      <lineBasicMaterial color="#2a2a7a" transparent opacity={0.4} />
    </lineSegments>
  );
}

/* ── scene ────────────────────────────────────────────────────────────── */
function Scene() {
  return (
    <>
      {/* isometric orthographic camera */}
      <OrthographicCamera
        makeDefault
        position={[9, 9, 9]}
        zoom={72}
        near={0.1}
        far={200}
      />

      {/* lighting: top key + front fill (blue-tinted) to shade faces */}
      <ambientLight intensity={0.25} />
      <directionalLight
        position={[6, 12, 4]}
        intensity={1.1}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight position={[-6, 4, -6]} intensity={0.35} color="#6060ff" />
      <directionalLight position={[0, -4, 0]}  intensity={0.08} color="#2222aa" />

      <IsoGrid />

      {CUBES.map((c, i) => (
        <AnimatedCube key={i} {...c} />
      ))}
    </>
  );
}

export default function IsometricCubes() {
  return (
    <Canvas
      shadows
      style={{ background: 'transparent' }}
      gl={{ antialias: true, alpha: true }}
    >
      <Scene />
    </Canvas>
  );
}
