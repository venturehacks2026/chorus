import Link from 'next/link';

/* ─── SVG node/edge data ──────────────────────────────────────────────── */

const NODES = [
  { id: 'S',  x: 62,  y: 210, r: 12, color: '#22d3ee', glow: '#06b6d4', label: 'trigger' },
  { id: 'A',  x: 210, y: 120, r: 9,  color: '#a78bfa', glow: '#7c3aed', label: 'research' },
  { id: 'B',  x: 210, y: 300, r: 9,  color: '#a78bfa', glow: '#7c3aed', label: 'ingest' },
  { id: 'C',  x: 370, y: 70,  r: 9,  color: '#a78bfa', glow: '#7c3aed', label: 'analyze' },
  { id: 'D',  x: 370, y: 210, r: 9,  color: '#f472b6', glow: '#db2777', label: 'reason' },
  { id: 'E',  x: 370, y: 350, r: 9,  color: '#a78bfa', glow: '#7c3aed', label: 'generate' },
  { id: 'F',  x: 530, y: 130, r: 9,  color: '#a78bfa', glow: '#7c3aed', label: 'validate' },
  { id: 'G',  x: 530, y: 290, r: 9,  color: '#a78bfa', glow: '#7c3aed', label: 'format' },
  { id: 'End',x: 680, y: 210, r: 12, color: '#34d399', glow: '#059669', label: 'output' },
];

const EDGES: { from: string; to: string; speed: number; delay: number }[] = [
  { from: 'S',  to: 'A',   speed: 2.4, delay: 0    },
  { from: 'S',  to: 'B',   speed: 2.4, delay: 0.4  },
  { from: 'A',  to: 'C',   speed: 2.2, delay: 0.6  },
  { from: 'A',  to: 'D',   speed: 2.2, delay: 0.8  },
  { from: 'B',  to: 'D',   speed: 2.2, delay: 1.0  },
  { from: 'B',  to: 'E',   speed: 2.2, delay: 1.2  },
  { from: 'C',  to: 'F',   speed: 2.0, delay: 1.4  },
  { from: 'D',  to: 'F',   speed: 2.0, delay: 1.6  },
  { from: 'D',  to: 'G',   speed: 2.0, delay: 1.8  },
  { from: 'E',  to: 'G',   speed: 2.0, delay: 2.0  },
  { from: 'F',  to: 'End', speed: 2.4, delay: 2.2  },
  { from: 'G',  to: 'End', speed: 2.4, delay: 2.4  },
];

function getNode(id: string) {
  return NODES.find(n => n.id === id)!;
}

function cubicPath(x1: number, y1: number, x2: number, y2: number) {
  const dx = Math.abs(x2 - x1) * 0.5;
  return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
}

/* ─── 3D Cube helper ────────────────────────────────────────────────── */

function Cube({
  size,
  style,
  dur = 12,
  floatDur = 6,
  floatDelay = 0,
  opacity = 0.9,
  color = '139,92,246',
}: {
  size: number;
  style: React.CSSProperties;
  dur?: number;
  floatDur?: number;
  floatDelay?: number;
  opacity?: number;
  color?: string;
}) {
  const h = size / 2;
  const faceStyle: React.CSSProperties = {
    position: 'absolute',
    width: size,
    height: size,
    border: `1px solid rgba(${color},0.30)`,
    background: `rgba(${color},0.04)`,
    boxShadow: `inset 0 0 ${h}px rgba(${color},0.08), 0 0 ${h * 0.6}px rgba(${color},0.06)`,
  };
  const faces: React.CSSProperties[] = [
    { transform: `translateZ(${h}px)` },
    { transform: `rotateY(180deg) translateZ(${h}px)` },
    { transform: `rotateY(-90deg) translateZ(${h}px)` },
    { transform: `rotateY(90deg) translateZ(${h}px)` },
    { transform: `rotateX(90deg) translateZ(${h}px)` },
    { transform: `rotateX(-90deg) translateZ(${h}px)` },
  ];

  return (
    <div
      style={{
        ...style,
        position: 'absolute',
        opacity,
        animation: `cube-float ${floatDur}s ease-in-out ${floatDelay}s infinite`,
      }}
    >
      <div style={{ perspective: 600 }}>
        <div
          style={{
            width: size,
            height: size,
            transformStyle: 'preserve-3d',
            animation: `cube-spin ${dur}s linear infinite`,
            position: 'relative',
          }}
        >
          {faces.map((f, i) => (
            <div key={i} style={{ ...faceStyle, ...f }} />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────────────────── */

export default function LandingPage() {
  return (
    <>
      <style>{`
        @keyframes cube-spin {
          from { transform: rotateX(18deg) rotateY(0deg); }
          to   { transform: rotateX(18deg) rotateY(360deg); }
        }
        @keyframes cube-float {
          0%,100% { transform: translateY(0px);   }
          50%      { transform: translateY(-16px); }
        }
        @keyframes edge-flow {
          to { stroke-dashoffset: -80; }
        }
        @keyframes node-pulse {
          0%,100% { opacity: 0.35; }
          50%      { opacity: 0.65; }
        }
        @keyframes hero-in {
          from { opacity:0; transform: translateY(18px); }
          to   { opacity:1; transform: none; }
        }
        @keyframes scan-x {
          0%   { transform: translateX(-100%); opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 1; }
          100% { transform: translateX(120%); opacity: 0; }
        }
        @keyframes badge-in {
          from { opacity:0; transform: translateY(8px); }
          to   { opacity:1; transform: none; }
        }
        .hero-in  { animation: hero-in  0.9s cubic-bezier(.22,1,.36,1) both; }
        .badge-in { animation: badge-in 0.7s cubic-bezier(.22,1,.36,1) 0.15s both; }
        .hero-in-1 { animation: hero-in 0.9s cubic-bezier(.22,1,.36,1) 0.1s both; }
        .hero-in-2 { animation: hero-in 0.9s cubic-bezier(.22,1,.36,1) 0.2s both; }
        .hero-in-3 { animation: hero-in 0.9s cubic-bezier(.22,1,.36,1) 0.35s both; }
        .hero-in-4 { animation: hero-in 0.9s cubic-bezier(.22,1,.36,1) 0.5s both; }
      `}</style>

      <main
        className="relative h-screen w-full overflow-hidden flex flex-col"
        style={{ background: '#07070f' }}
      >
        {/* ── Dot grid ── */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(139,92,246,0.20) 1px, transparent 1px)',
            backgroundSize: '30px 30px',
          }}
        />

        {/* ── Atmospheric glow ── */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse 70% 55% at 62% 52%, rgba(109,40,217,0.14) 0%, transparent 70%)',
        }} />
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse 40% 45% at 8% 85%, rgba(6,182,212,0.07) 0%, transparent 60%)',
        }} />
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse 30% 35% at 95% 10%, rgba(244,114,182,0.06) 0%, transparent 55%)',
        }} />

        {/* ── Scan line ── */}
        <div
          className="absolute top-0 bottom-0 w-px pointer-events-none"
          style={{
            background: 'linear-gradient(to bottom, transparent, rgba(167,139,250,0.5), transparent)',
            animation: 'scan-x 8s ease-in-out 1.2s infinite',
          }}
        />

        {/* ── 3D Cubes ── */}
        <Cube size={90}  style={{ top: '6%',  right: '22%' }} dur={18} floatDur={7}  floatDelay={0}   opacity={0.80} />
        <Cube size={55}  style={{ top: '18%', left: '4%'  }} dur={14} floatDur={9}  floatDelay={1.5} opacity={0.65} color="6,182,212" />
        <Cube size={40}  style={{ bottom: '12%', right: '8%'  }} dur={10} floatDur={6}  floatDelay={0.8} opacity={0.55} color="244,114,182" />
        <Cube size={28}  style={{ bottom: '28%', left: '12%' }} dur={8}  floatDur={5}  floatDelay={2.5} opacity={0.45} />
        <Cube size={20}  style={{ top: '42%', right: '3%'  }} dur={7}  floatDur={4}  floatDelay={1.2} opacity={0.35} color="52,211,153" />

        {/* ── Nav ── */}
        <nav className="relative z-10 flex items-center justify-between px-8 h-16 shrink-0">
          <span className="text-xl font-bold tracking-tight text-white">
            Chorus<span style={{ color: '#a78bfa' }}>.</span>
          </span>
          <Link
            href="/agents"
            className="text-sm font-medium px-4 py-1.5 rounded-full text-white/60 border border-white/10 hover:border-white/25 hover:text-white transition-all"
          >
            Go to app →
          </Link>
        </nav>

        {/* ── Hero ── */}
        <div className="relative z-10 flex flex-1 items-center px-8 lg:px-20 gap-0">

          {/* Left: text */}
          <div className="max-w-xl shrink-0">
            <div className="badge-in inline-flex items-center gap-2 px-3 py-1 mb-6 rounded-full border text-xs font-medium"
              style={{ borderColor: 'rgba(167,139,250,0.25)', background: 'rgba(139,92,246,0.08)', color: '#c4b5fd' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
              Agent orchestration platform
            </div>

            <h1
              className="hero-in-1 text-5xl lg:text-[60px] font-bold leading-[1.08] tracking-tight mb-5"
              style={{ color: '#f8f8ff' }}
            >
              Intelligent agents,
              <br />
              <span style={{
                background: 'linear-gradient(135deg, #a78bfa 0%, #60a5fa 50%, #f472b6 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                in harmony.
              </span>
            </h1>

            <p className="hero-in-2 text-[15px] leading-relaxed mb-9 max-w-[420px]" style={{ color: 'rgba(248,248,255,0.45)' }}>
              Transform your SOPs into agent pipelines. Chorus enforces behavioral contracts,
              surfaces automation gaps, and gives you full observability over every run.
            </p>

            <div className="hero-in-3 flex items-center gap-4">
              <Link
                href="/agents"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-all"
                style={{
                  background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
                  boxShadow: '0 0 24px rgba(124,58,237,0.40), 0 1px 3px rgba(0,0,0,0.4)',
                }}
              >
                Open the app
                <span style={{ color: 'rgba(255,255,255,0.6)' }}>→</span>
              </Link>
            </div>

            {/* Stats row */}
            <div className="hero-in-4 flex items-center gap-6 mt-10" style={{ color: 'rgba(248,248,255,0.25)' }}>
              {[
                { val: 'SOPs → ASDs', lbl: 'auto-compiled' },
                { val: 'Contracts', lbl: 'enforced at runtime' },
                { val: 'Full audit', lbl: 'every execution' },
              ].map(({ val, lbl }) => (
                <div key={val} className="text-xs">
                  <span className="block font-semibold" style={{ color: 'rgba(248,248,255,0.55)' }}>{val}</span>
                  <span>{lbl}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: agent graph */}
          <div className="flex-1 relative hidden lg:block" style={{ minHeight: 420 }}>
            <svg
              viewBox="0 0 760 420"
              className="w-full h-full"
              style={{ overflow: 'visible' }}
            >
              <defs>
                {/* Glow filters per color */}
                <filter id="glow-violet" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="5" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
                <filter id="glow-cyan" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="6" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
                <filter id="glow-green" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="6" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
                <filter id="glow-pink" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="5" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
                {/* Edge gradient */}
                {EDGES.map((e, i) => {
                  const a = getNode(e.from), b = getNode(e.to);
                  return (
                    <linearGradient key={i} id={`eg-${i}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} gradientUnits="userSpaceOnUse">
                      <stop offset="0%"   stopColor={a.color} stopOpacity="0.6" />
                      <stop offset="100%" stopColor={b.color} stopOpacity="0.6" />
                    </linearGradient>
                  );
                })}
              </defs>

              {/* Edges */}
              {EDGES.map((e, i) => {
                const a = getNode(e.from), b = getNode(e.to);
                const d = cubicPath(a.x, a.y, b.x, b.y);
                const len = Math.hypot(b.x - a.x, b.y - a.y) * 1.1;
                return (
                  <g key={i}>
                    {/* Base track */}
                    <path d={d} fill="none" stroke="rgba(139,92,246,0.08)" strokeWidth="1" />
                    {/* Animated flow */}
                    <path
                      d={d}
                      fill="none"
                      stroke={`url(#eg-${i})`}
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeDasharray={`${len * 0.18} ${len * 0.82}`}
                      style={{
                        animation: `edge-flow ${e.speed}s linear ${e.delay}s infinite`,
                      }}
                    />
                  </g>
                );
              })}

              {/* Nodes */}
              {NODES.map((n) => {
                const isStart = n.id === 'S';
                const isEnd   = n.id === 'End';
                const isKey   = n.id === 'D';
                const filterId = isStart ? 'glow-cyan' : isEnd ? 'glow-green' : isKey ? 'glow-pink' : 'glow-violet';
                const pulseDelay = (n.x * 0.007 + n.y * 0.003).toFixed(2);

                return (
                  <g key={n.id} filter={`url(#${filterId})`}>
                    {/* Outer pulse ring */}
                    <circle
                      cx={n.x} cy={n.y}
                      r={n.r + 10}
                      fill="none"
                      stroke={n.glow}
                      strokeWidth="1"
                      style={{
                        opacity: 0.4,
                        animation: `node-pulse 3s ease-in-out ${pulseDelay}s infinite`,
                      }}
                    />
                    {/* Node fill */}
                    <circle cx={n.x} cy={n.y} r={n.r} fill={n.glow} fillOpacity="0.18" />
                    {/* Node border */}
                    <circle cx={n.x} cy={n.y} r={n.r} fill="none" stroke={n.color} strokeWidth="1.5" />
                    {/* Center dot */}
                    <circle cx={n.x} cy={n.y} r={n.r * 0.28} fill={n.color} />
                    {/* Label */}
                    <text
                      x={n.x}
                      y={n.y + n.r + 14}
                      textAnchor="middle"
                      fontSize="9"
                      fontFamily="var(--font-sans), system-ui, sans-serif"
                      fill="rgba(248,248,255,0.30)"
                      letterSpacing="0.06em"
                    >
                      {n.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* ── Bottom tagline ── */}
        <div className="relative z-10 px-8 pb-6 flex items-center justify-between">
          <p className="text-[11px] tracking-widest uppercase" style={{ color: 'rgba(248,248,255,0.18)' }}>
            Built for enterprise automation
          </p>
          <p className="text-[11px]" style={{ color: 'rgba(248,248,255,0.18)' }}>
            © 2026 Chorus
          </p>
        </div>
      </main>
    </>
  );
}
