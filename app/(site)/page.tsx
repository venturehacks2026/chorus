import Link from 'next/link';
import IsometricCubesClient from '@/components/IsometricCubesClient';

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
        className="h-screen w-full overflow-hidden bg-white relative flex"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.055) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      >
        {/* ── Left panel ─────────────────────────────────────────────────── */}
        <div className="relative z-10 flex flex-col justify-between w-[480px] shrink-0 px-14 py-12">

          {/* Big Chorus. branding — low on the left */}
          <div className="i0">
            {/* small top label */}
            <span className="text-[11px] font-semibold tracking-[0.18em] uppercase text-violet-400">
              AI Agent Orchestration
            </span>
          </div>

          {/* Main text block — vertically centered */}
          <div className="flex flex-col gap-6">
            <div>
              <h1 className="i1 text-[52px] font-bold tracking-tight text-gray-900 leading-[1.06] mb-0">
                Build AI workflows
              </h1>
              <h1 className="i2 text-[52px] font-bold tracking-tight leading-[1.06]">
                <span className="text-violet-600">easily.</span>
              </h1>
            </div>

            <p className="i3 text-[15px] text-gray-400 leading-relaxed max-w-[320px]">
              Agent pipelines, behavioral contracts,<br />
              and full observability — in one place.
            </p>

            <div className="i4">
              <Link
                href="/agents"
                className="inline-flex items-center gap-2.5 px-6 py-3 bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm shadow-violet-200"
              >
                Open the app
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M2.5 7H11.5M11.5 7L7.5 3M11.5 7L7.5 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>
            </div>
          </div>

          {/* Bottom: big Chorus. logo */}
          <div className="i0">
            <span className="text-[42px] font-bold tracking-tight text-gray-900 leading-none select-none">
              Chorus<span className="text-violet-600">.</span>
            </span>
            <p className="text-xs text-gray-300 mt-1">© 2026 Chorus</p>
          </div>
        </div>

        {/* ── Right panel: 3-D canvas ────────────────────────────────────── */}
        <div className="flex-1 relative">
          {/* subtle left-edge fade so canvas blends into white */}
          <div
            className="absolute inset-y-0 left-0 w-32 z-10 pointer-events-none"
            style={{ background: 'linear-gradient(to right, white, transparent)' }}
          />
          <IsometricCubesClient />
        </div>
      </main>
    </>
  );
}
