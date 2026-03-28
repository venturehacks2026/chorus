import Link from 'next/link';
import IsometricCubesClient from '@/components/IsometricCubesClient';

export default function LandingPage() {
  return (
    <>
      <style>{`
        @keyframes in {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: none; }
        }
        .i0 { animation: in 0.8s ease both 0.0s; }
        .i1 { animation: in 0.8s ease both 0.12s; }
        .i2 { animation: in 0.8s ease both 0.26s; }
      `}</style>

      <main
        className="h-screen w-full overflow-hidden flex flex-col"
        style={{ background: '#07071a' }}
      >
        {/* Nav */}
        <nav className="flex items-center justify-between px-10 h-16 shrink-0 relative z-10">
          <span className="text-base font-semibold tracking-tight" style={{ color: '#e8e8ff' }}>
            Chorus<span style={{ color: '#7c6af5' }}>.</span>
          </span>
          <Link
            href="/agents"
            className="text-sm transition-colors"
            style={{ color: 'rgba(232,232,255,0.4)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'rgba(232,232,255,0.9)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(232,232,255,0.4)')}
          >
            Go to app →
          </Link>
        </nav>

        {/* Body */}
        <div className="flex-1 flex overflow-hidden relative">

          {/* Left: text */}
          <div className="relative z-10 flex flex-col justify-center px-10 lg:px-20 shrink-0 w-[460px]">
            <h1 className="i0 text-5xl lg:text-[58px] font-bold tracking-tight leading-[1.08] mb-5"
              style={{ color: '#e8e8ff' }}>
              Orchestrate<br />with<br />precision.
            </h1>
            <p className="i1 text-[15px] leading-relaxed mb-9"
              style={{ color: 'rgba(232,232,255,0.38)' }}>
              Agent pipelines, behavioral contracts,<br />full observability.
            </p>
            <div className="i2">
              <Link
                href="/agents"
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg text-white transition-all"
                style={{
                  background: 'linear-gradient(135deg,#5b4fe8,#4338ca)',
                  boxShadow: '0 0 28px rgba(91,79,232,0.40)',
                }}
              >
                Open the app →
              </Link>
            </div>
          </div>

          {/* Right: Three.js canvas */}
          <div className="flex-1 relative">
            <IsometricCubesClient />
          </div>
        </div>

        {/* Footer */}
        <div className="px-10 pb-5 shrink-0 relative z-10">
          <span className="text-xs" style={{ color: 'rgba(232,232,255,0.18)' }}>© 2026 Chorus</span>
        </div>
      </main>
    </>
  );
}
