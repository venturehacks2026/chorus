'use client';

import { useEffect, useRef } from 'react';

// ── isometric constants ──────────────────────────────────────────────────────
const HW = 52, HH = 26; // half-tile width / height
const COLS = 6, ROWS = 4;
const OX = 480, OY = 210; // scene origin

// ── helpers ──────────────────────────────────────────────────────────────────
const scx = (c: number, r: number) => OX + (c - r) * HW;
const scy = (c: number, r: number) => OY + (c + r) * HH;

const topFace  = (x: number, y: number, H: number) =>
  `${x},${y-HH-H} ${x+HW},${y-H} ${x},${y+HH-H} ${x-HW},${y-H}`;
const leftFace = (x: number, y: number, H: number) =>
  `${x-HW},${y-H} ${x},${y+HH-H} ${x},${y+HH} ${x-HW},${y}`;
const rightFace = (x: number, y: number, H: number) =>
  `${x},${y+HH-H} ${x+HW},${y-H} ${x+HW},${y} ${x},${y+HH}`;

// ── seeded random ─────────────────────────────────────────────────────────────
const rand = (seed: number) => { const x = Math.sin(seed + 1) * 43758.5453; return x - Math.floor(x); };

// ── cube data ─────────────────────────────────────────────────────────────────
type CubeColors = { top: string; left: string; right: string };
function palette(maxH: number): CubeColors {
  if (maxH > 130) return { top: '#a78bfa', left: '#6d28d9', right: '#4c1d95' };
  if (maxH > 75)  return { top: '#c4b5fd', left: '#7c3aed', right: '#5b21b6' };
  return               { top: '#ddd6fe', left: '#a78bfa', right: '#7c3aed' };
}

const CUBES = Array.from({ length: COLS * ROWS }, (_, i) => {
  const col = i % COLS;
  const row = Math.floor(i / COLS);
  const r   = rand(i * 7.3 + 13.1);
  const maxH = 55 + r * 95; // uniform range — no center boost
  return { col, row, maxH, phase: rand(i * 3.7) * Math.PI * 2, colors: palette(maxH) };
}).sort((a, b) => (a.col + a.row) - (b.col + b.row));

// ── floor grid ────────────────────────────────────────────────────────────────
const GRID_EXT = 3; // tiles to extend beyond cube area
const GRID_CX = COLS / 2, GRID_CY = ROWS / 2; // grid center
const MAX_DIST = Math.max(COLS / 2 + GRID_EXT, ROWS / 2 + GRID_EXT);

const GRID: { x1: number; y1: number; x2: number; y2: number; opacity: number }[] = [];
// shift by +0.5 so lines pass through tile corners (cube base edges) not tile centers
for (let r = -GRID_EXT; r <= ROWS + GRID_EXT; r++) {
  const rr = r + 0.5;
  const dist = Math.abs(r - GRID_CY) / MAX_DIST;
  const opacity = Math.max(0.04, 0.7 * (1 - dist * dist));
  GRID.push({ x1: scx(-GRID_EXT - 0.5, rr), y1: scy(-GRID_EXT - 0.5, rr), x2: scx(COLS + GRID_EXT + 0.5, rr), y2: scy(COLS + GRID_EXT + 0.5, rr), opacity });
}
for (let c = -GRID_EXT; c <= COLS + GRID_EXT; c++) {
  const cc = c + 0.5;
  const dist = Math.abs(c - GRID_CX) / MAX_DIST;
  const opacity = Math.max(0.04, 0.7 * (1 - dist * dist));
  GRID.push({ x1: scx(cc, -GRID_EXT - 0.5), y1: scy(cc, -GRID_EXT - 0.5), x2: scx(cc, ROWS + GRID_EXT + 0.5), y2: scy(cc, ROWS + GRID_EXT + 0.5), opacity });
}

// ── component ─────────────────────────────────────────────────────────────────
export default function IsometricSVG() {
  const topRefs   = useRef<(SVGPolygonElement | null)[]>([]);
  const leftRefs  = useRef<(SVGPolygonElement | null)[]>([]);
  const rightRefs = useRef<(SVGPolygonElement | null)[]>([]);

  useEffect(() => {
    let raf: number;
    const t0 = performance.now();

    function frame(now: number) {
      const t = (now - t0) / 1000;
      CUBES.forEach((c, i) => {
        const x = scx(c.col, c.row);
        const y = scy(c.col, c.row);
        const wave = Math.sin(t * 0.8 + (c.col + c.row) * 0.45 + c.phase * 0.3);
        const solo = Math.sin(t * 0.4 + c.phase);
        const frac = 0.22 + 0.78 * (0.5 + 0.35 * wave + 0.15 * solo);
        const H = Math.max(4, c.maxH * frac);
        topRefs.current[i]?.setAttribute('points', topFace(x, y, H));
        leftRefs.current[i]?.setAttribute('points', leftFace(x, y, H));
        rightRefs.current[i]?.setAttribute('points', rightFace(x, y, H));
      });
      raf = requestAnimationFrame(frame);
    }

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <svg
      viewBox="0 0 900 560"
      width="100%"
      height="100%"
      style={{ display: 'block' }}
      overflow="visible"
    >
      {/* floor grid */}
      {GRID.map((l, i) => (
        <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
          stroke="#ddd6fe" strokeWidth="0.9" opacity={l.opacity} />
      ))}

      {/* cubes — back to front via painter's algorithm */}
      {CUBES.map((c, i) => (
        <g key={i} opacity={0.82}>
          <polygon ref={el => { rightRefs.current[i] = el; }} fill={c.colors.right} />
          <polygon ref={el => { leftRefs.current[i] = el; }}  fill={c.colors.left} />
          <polygon ref={el => { topRefs.current[i] = el; }}   fill={c.colors.top} />
        </g>
      ))}
    </svg>
  );
}
