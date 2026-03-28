'use client';

import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrthographicCamera, Edges } from '@react-three/drei';
import * as THREE from 'three';

/* ── grid: 12×8 towers, wider spread ─────────────────────────────────────── */
const COLS = 12;
const ROWS = 8;
const GAP  = 1.05;

function seededRand(seed: number) {
  const x = Math.sin(seed + 1) * 43758.5453;
  return x - Math.floor(x);
}

const TOWERS = Array.from({ length: COLS * ROWS }, (_, i) => {
  const col = i % COLS;
  const row = Math.floor(i / COLS);
  const r   = seededRand(i * 7.3 + 13.1);
  const maxH = 0.4 + r * 4.2;
  const dist = Math.sqrt((col - COLS / 2) ** 2 + (row - ROWS / 2) ** 2);
  const boost = Math.max(0, 1 - dist / 5) * 2.0;
  return {
    x: (col - COLS / 2) * GAP,
    z: (row - ROWS / 2) * GAP,
    maxH: Math.min(maxH + boost, 5.2),
    phase: seededRand(i * 3.7) * Math.PI * 2,
    waveCol: col,
    waveRow: row,
  };
});

function Tower({ x, z, maxH, phase, waveCol, waveRow }: typeof TOWERS[number]) {
  const mesh = useRef<THREE.Mesh>(null!);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const wave = Math.sin(t * 0.8 + (waveCol + waveRow) * 0.45 + phase * 0.3);
    const solo = Math.sin(t * 0.4 + phase);
    const frac = 0.22 + 0.78 * (0.5 + 0.35 * wave + 0.15 * solo);
    const h = Math.max(0.08, maxH * frac);
    mesh.current.scale.y = h;
    mesh.current.position.y = h / 2;
  });

  return (
    <mesh ref={mesh} position={[x, 0, z]}>
      <boxGeometry args={[0.84, 1, 0.84]} />
      {/* Transparent fill — light violet */}
      <meshStandardMaterial
        color="#ede9fe"
        transparent
        opacity={0.28}
        roughness={0.2}
        metalness={0.0}
        depthWrite={false}
      />
      {/* Dark purple edges via Edges helper */}
      <Edges threshold={15} color="#5b21b6" />
    </mesh>
  );
}

/* ── ground grid ─────────────────────────────────────────────────────────── */
function GroundGrid() {
  const SIZE = 12;
  const points: THREE.Vector3[] = [];
  for (let i = -SIZE; i <= SIZE; i++) {
    points.push(new THREE.Vector3(-SIZE, -0.01, i), new THREE.Vector3(SIZE, -0.01, i));
    points.push(new THREE.Vector3(i, -0.01, -SIZE), new THREE.Vector3(i, -0.01, SIZE));
  }
  const geo = new THREE.BufferGeometry().setFromPoints(points);
  return (
    <lineSegments geometry={geo}>
      <lineBasicMaterial color="#c4b5fd" transparent opacity={0.3} />
    </lineSegments>
  );
}

/* ── scene ───────────────────────────────────────────────────────────────── */
function Scene() {
  return (
    <>
      <OrthographicCamera
        makeDefault
        position={[10, 10, 10]}
        zoom={52}
        near={0.1}
        far={300}
      />
      <ambientLight intensity={1.2} />
      <directionalLight position={[8, 14, 6]} intensity={0.6} />

      <GroundGrid />
      {TOWERS.map((t, i) => <Tower key={i} {...t} />)}
    </>
  );
}

export default function IsometricCubes() {
  return (
    <Canvas
      style={{ background: 'transparent' }}
      gl={{ antialias: true, alpha: true }}
    >
      <Scene />
    </Canvas>
  );
}
