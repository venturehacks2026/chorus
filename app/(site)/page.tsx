import Link from 'next/link';
import IsometricSVG from '@/components/IsometricSVG';

export default function LandingPage() {
  return (
    <>
      <style>{`
        @keyframes in {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: none; }
        }
        .i0 { animation: in 0.75s cubic-bezier(.22,1,.36,1) both 0.00s; }
        .i1 { animation: in 0.75s cubic-bezier(.22,1,.36,1) both 0.10s; }
        .i2 { animation: in 0.75s cubic-bezier(.22,1,.36,1) both 0.20s; }
        .i3 { animation: in 0.75s cubic-bezier(.22,1,.36,1) both 0.32s; }
        .i4 { animation: in 0.75s cubic-bezier(.22,1,.36,1) both 0.44s; }
      `}</style>

      <main
        className="h-screen w-full overflow-hidden bg-white relative flex flex-col"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.055) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      >
        {/* ── Top bar ──────────────────────────────────────────────────────── */}
        <div className="relative z-20 flex items-start justify-between px-8 pt-6 shrink-0">
          {/* Chorus. — top left, pushed a touch left and higher */}
          <span className="i0 text-[28px] font-bold tracking-tight text-gray-900 leading-none select-none">
            Chorus<span className="text-violet-600">.</span>
          </span>

          {/* Open the app — top right */}
          <Link
            href="/agents"
            className="i0 inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-violet-600 hover:text-violet-700 border border-violet-200 hover:border-violet-400 rounded-lg bg-white/80 backdrop-blur-sm transition-all"
          >
            Open the app
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
              <path d="M2.5 7H11.5M11.5 7L7.5 3M11.5 7L7.5 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
        </div>

        {/* ── Body ─────────────────────────────────────────────────────────── */}
        <div className="flex-1 flex overflow-hidden">

          {/* Left text — narrower so canvas gets more room */}
          <div className="relative z-10 flex flex-col justify-center w-[440px] shrink-0 px-16 pb-10">
            <h1 className="i1 text-[46px] font-bold tracking-tight text-gray-900 leading-[1.06] mb-2 whitespace-nowrap">
              Build AI
            </h1>
            <h1 className="i2 text-[46px] font-bold tracking-tight leading-[1.06] mb-6 whitespace-nowrap">
              workflows <span className="text-violet-600">easily.</span>
            </h1>

            <p className="i3 text-[15px] text-gray-400 leading-relaxed mb-8 max-w-[300px]">
              Agent pipelines, behavioral contracts,<br />
              and full observability in one place.
            </p>

            <div className="i4">
              <Link
                href="/agents"
                className="inline-flex items-center gap-2.5 px-6 py-3 bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm shadow-violet-200"
              >
                Get started
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2.5 7H11.5M11.5 7L7.5 3M11.5 7L7.5 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>
            </div>
          </div>

          {/* Right canvas — takes the rest of the space */}
          <div className="flex-1 relative">
            {/* fade left edge into white */}
            <div
              className="absolute inset-y-0 left-0 w-24 z-10 pointer-events-none"
              style={{ background: 'linear-gradient(to right, white, transparent)' }}
            />
            <IsometricSVG />
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 px-8 pb-5 shrink-0">
          <span className="text-xs text-gray-300">© 2026 Chorus</span>
        </div>
      </main>
    </>
  );
}
