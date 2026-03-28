'use client';

import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrthographicCamera } from '@react-three/drei';
import * as THREE from 'three';

/* ── palette ─────────────────────────────────────────────────────────────── */
const C_MAIN   = new THREE.Color('#7c3aed'); // violet-700
const C_MID    = new THREE.Color('#a78bfa'); // violet-400
const C_LIGHT  = new THREE.Color('#ddd6fe'); // violet-200

/* ── grid layout: 8×6 towers on a flat isometric plane ──────────────────── */
const COLS = 8;
const ROWS = 6;
const GAP  = 1.05; // spacing between towers

function towerColor(maxH: number): THREE.Color {
  if (maxH > 3.5) return C_MAIN;
  if (maxH > 2.0) return C_MID;
  return C_LIGHT;
}

function seededRand(seed: number) {
  const x = Math.sin(seed + 1) * 43758.5453;
  return x - Math.floor(x);
}

// Build towers: each has a height profile driven by a wave + individual phase
const TOWERS = Array.from({ length: COLS * ROWS }, (_, i) => {
  const col = i % COLS;
  const row = Math.floor(i / COLS);
  const r   = seededRand(i * 7.3 + 13.1);
  const maxH = 0.4 + r * 3.8;
  // wave group: towers closer to center-front are taller on average
  const dist = Math.sqrt((col - COLS / 2) ** 2 + (row - ROWS / 2) ** 2);
  const boost = Math.max(0, 1 - dist / 4) * 1.8;
  return {
    x: (col - COLS / 2) * GAP,
    z: (row - ROWS / 2) * GAP,
    maxH: Math.min(maxH + boost, 4.8),
    phase: seededRand(i * 3.7) * Math.PI * 2,
    waveCol: col,
    waveRow: row,
    color: towerColor(maxH + boost),
  };
});

function Tower({ x, z, maxH, phase, waveCol, waveRow, color }: typeof TOWERS[number]) {
  const mesh = useRef<THREE.Mesh>(null!);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    // diagonal wave sweeping across the grid
    const wave = Math.sin(t * 0.8 + (waveCol + waveRow) * 0.45 + phase * 0.3);
    // each tower also has a slow individual oscillation
    const solo = Math.sin(t * 0.4 + phase);
    const frac = 0.22 + 0.78 * (0.5 + 0.35 * wave + 0.15 * solo);
    const h = Math.max(0.08, maxH * frac);
    mesh.current.scale.y = h;
    mesh.current.position.y = h / 2;
  });

  return (
    <mesh ref={mesh} position={[x, 0, z]} castShadow>
      <boxGeometry args={[0.82, 1, 0.82]} />
      <meshStandardMaterial color={color} roughness={0.4} metalness={0.08} />
    </mesh>
  );
}

/* ── ground grid ─────────────────────────────────────────────────────────── */
function GroundGrid() {
  const SIZE = 9;
  const points: THREE.Vector3[] = [];
  for (let i = -SIZE; i <= SIZE; i++) {
    points.push(new THREE.Vector3(-SIZE, -0.01, i), new THREE.Vector3(SIZE, -0.01, i));
    points.push(new THREE.Vector3(i, -0.01, -SIZE), new THREE.Vector3(i, -0.01, SIZE));
  }
  const geo = new THREE.BufferGeometry().setFromPoints(points);
  return (
    <lineSegments geometry={geo}>
      <lineBasicMaterial color="#ddd6fe" transparent opacity={0.45} />
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
        zoom={58}
        near={0.1}
        far={300}
      />

      <ambientLight intensity={0.55} />
      <directionalLight position={[8, 14, 6]}  intensity={1.5} castShadow shadow-mapSize={[1024, 1024]} />
      <directionalLight position={[-6, 5, -5]} intensity={0.35} color="#a78bfa" />
      <directionalLight position={[0, -3, 0]}  intensity={0.08} />

      <GroundGrid />

      {TOWERS.map((t, i) => (
        <Tower key={i} {...t} />
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
