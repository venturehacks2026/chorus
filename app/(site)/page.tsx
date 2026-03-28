import Link from 'next/link';

/* ─── Graph data ─────────────────────────────────────────────────────────── */

// lx/ly = position as % of the right-panel container
const NODES = [
  { id: 0, lx: 36, ly: 14, size: 80, dur: 16, alt: false, amp: 24, fdur: 7.0, fdel: 0.0 },
  { id: 1, lx: 72, ly: 20, size: 56, dur: 22, alt: true,  amp: 18, fdur: 9.0, fdel: 1.5 },
  { id: 2, lx: 16, ly: 43, size: 52, dur: 13, alt: false, amp: 22, fdur: 6.5, fdel: 0.8 },
  { id: 3, lx: 85, ly: 41, size: 44, dur: 11, alt: true,  amp: 14, fdur: 8.0, fdel: 2.2 },
  { id: 4, lx: 50, ly: 54, size: 68, dur: 19, alt: false, amp: 28, fdur: 7.5, fdel: 1.0 },
  { id: 5, lx: 76, ly: 67, size: 42, dur: 15, alt: true,  amp: 12, fdur: 10,  fdel: 3.0 },
  { id: 6, lx: 24, ly: 73, size: 38, dur: 9,  alt: false, amp: 16, fdur: 5.5, fdel: 0.5 },
  { id: 7, lx: 58, ly: 83, size: 46, dur: 25, alt: true,  amp: 14, fdur: 8.5, fdel: 1.8 },
  { id: 8, lx: 91, ly: 76, size: 28, dur: 8,  alt: false, amp: 10, fdur: 6.0, fdel: 2.8 },
];

const EDGES = [
  [0, 1], [0, 2], [0, 4],
  [1, 3], [1, 4],
  [2, 4], [2, 6],
  [3, 5],
  [4, 5], [4, 6], [4, 7],
  [5, 8],
  [6, 7],
  [7, 8],
];

/* ─── Cube component ─────────────────────────────────────────────────────── */

function Cube({ size, dur, alt, amp, fdur, fdel }: {
  size: number; dur: number; alt: boolean; amp: number; fdur: number; fdel: number;
}) {
  const h = size / 2;
  const face: React.CSSProperties = {
    position: 'absolute',
    width: size,
    height: size,
    border: '1px solid rgba(109,40,217,0.16)',
    background: 'rgba(109,40,217,0.02)',
  };
  const transforms = [
    `translateZ(${h}px)`,
    `rotateY(180deg) translateZ(${h}px)`,
    `rotateY(-90deg) translateZ(${h}px)`,
    `rotateY(90deg) translateZ(${h}px)`,
    `rotateX(90deg) translateZ(${h}px)`,
    `rotateX(-90deg) translateZ(${h}px)`,
  ];

  return (
    <div style={{
      animation: `float ${fdur}s ease-in-out ${fdel}s infinite`,
      // @ts-expect-error css custom property
      '--amp': `-${amp}px`,
    }}>
      <div style={{ perspective: 900 }}>
        <div style={{
          width: size,
          height: size,
          position: 'relative',
          transformStyle: 'preserve-3d',
          animation: `${alt ? 'spin-b' : 'spin-a'} ${dur}s linear infinite`,
        }}>
          {transforms.map((t, i) => (
            <div key={i} style={{ ...face, transform: t }} />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────── */

export default function LandingPage() {
  return (
    <>
      <style>{`
        @keyframes spin-a {
          from { transform: rotateX(18deg) rotateY(0deg); }
          to   { transform: rotateX(18deg) rotateY(360deg); }
        }
        @keyframes spin-b {
          0%   { transform: rotateX(0deg)   rotateY(0deg)   rotateZ(0deg); }
          33%  { transform: rotateX(120deg) rotateY(90deg)  rotateZ(30deg); }
          66%  { transform: rotateX(60deg)  rotateY(270deg) rotateZ(180deg); }
          100% { transform: rotateX(360deg) rotateY(360deg) rotateZ(360deg); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(var(--amp, -20px)); }
        }
        @keyframes in {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: none; }
        }
        .i0 { animation: in 0.7s ease both 0.0s; }
        .i1 { animation: in 0.7s ease both 0.1s; }
        .i2 { animation: in 0.7s ease both 0.22s; }
      `}</style>

      <main
        className="h-screen w-full bg-white overflow-hidden flex flex-col"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.07) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      >
        {/* Nav */}
        <nav className="flex items-center justify-between px-10 h-16 shrink-0">
          <span className="text-base font-semibold text-gray-900 tracking-tight">
            Chorus<span className="text-violet-600">.</span>
          </span>
          <Link href="/agents" className="text-sm text-gray-400 hover:text-gray-900 transition-colors">
            Go to app →
          </Link>
        </nav>

        {/* Body */}
        <div className="flex-1 flex overflow-hidden">

          {/* Left: text */}
          <div className="flex flex-col justify-center px-10 lg:px-20 shrink-0 w-[420px]">
            <h1 className="i0 text-5xl lg:text-[56px] font-bold tracking-tight text-gray-900 leading-[1.08] mb-4">
              Orchestrate<br />with<br />precision.
            </h1>
            <p className="i1 text-[15px] text-gray-400 leading-relaxed mb-8">
              Agent pipelines, behavioral contracts,<br />full observability.
            </p>
            <div className="i2">
              <Link
                href="/agents"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                Open the app →
              </Link>
            </div>
          </div>

          {/* Right: floating cube graph */}
          <div className="flex-1 relative">

            {/* SVG edges */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              preserveAspectRatio="none"
              viewBox="0 0 100 100"
            >
              {EDGES.map(([a, b], i) => (
                <line
                  key={i}
                  x1={NODES[a].lx} y1={NODES[a].ly}
                  x2={NODES[b].lx} y2={NODES[b].ly}
                  stroke="rgba(109,40,217,0.10)"
                  strokeWidth="0.4"
                />
              ))}
            </svg>

            {/* Cubes */}
            {NODES.map((n) => (
              <div
                key={n.id}
                className="absolute"
                style={{
                  left: `${n.lx}%`,
                  top: `${n.ly}%`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <Cube
                  size={n.size}
                  dur={n.dur}
                  alt={n.alt}
                  amp={n.amp}
                  fdur={n.fdur}
                  fdel={n.fdel}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-10 pb-5 shrink-0">
          <span className="text-xs text-gray-300">© 2026 Chorus</span>
        </div>
      </main>
    </>
  );
}
